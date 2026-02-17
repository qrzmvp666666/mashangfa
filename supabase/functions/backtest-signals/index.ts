// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import ccxt from 'https://esm.sh/ccxt@4.2.71'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ⏳ TIME BUDGET SETTINGS
const MAX_EXECUTION_TIME_MS = 50 * 1000; // 50 seconds (Supabase default limit is usually 60s)
const FETCH_LIMIT_CANDLES = 1000;        // Max candles per fetch to avoid heavy payload

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = performance.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('Backtest worker started...')

    // 1. Initialize Exchange (Binance)
    // Note: In Deno Edge runtime, we rely on the global network. 
    // If running locally via `supabase functions serve`, it uses your machine's VPN/Network.
    // Configure for FUTURES (Contract) trading as requested.
    const exchange = new ccxt.binance({
        'enableRateLimit': true,
        'timeout': 10000,
        'options': {
            'defaultType': 'future', // or 'swap' for perpetuals
        }
    })

    // 2. Fetch Active Signals
    // Only fetch signals that correspond to supported exchanges (currently just processing all as Binance for demo)
    // In production, you might join with a `traders` table to get the exchange type
    const { data: signals, error: fetchError } = await supabase
      .from('signals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError;
    
    const initialActiveCount = signals?.length || 0;
    
    if (!signals || signals.length === 0) {
      console.log('原激活中信号：0，已更新信号：0条，现激活中信号：0条')
      console.log('Backtest worker end...')
      return new Response(
        JSON.stringify({ message: 'No active signals to process', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0;
    const results = [];

    // 3. Process Loops with Time Budget
    for (const signal of signals) {
      
      // --- Time Budget Check ---
      const currentTime = performance.now();
      if (currentTime - startTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`⏳ Time budget exhausted. Stopping securely.`);
        break; 
      }

      const res = await processSignal(supabase, exchange, signal);
      results.push(res);
      processedCount++;
    }

    // Query remaining active signals
    const { count: remainingActiveCount } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    const triggeredCount = initialActiveCount - (remainingActiveCount || 0);
    
    console.log(`原激活中信号：${initialActiveCount}，已触发信号：${triggeredCount}条，现激活中信号：${remainingActiveCount || 0}条`)
    console.log('Backtest worker end...')
    
    const duration = Math.round((performance.now() - startTime) / 1000);
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount}/${signals.length} signals`, 
        duration: `${duration}s`,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Worker failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// --- Core Helper Function ---

async function processSignal(supabase: any, exchange: any, signal: any) {
    // Use symbol directly from database (already in BTC/USDT format)
    const symbol = signal.currency;

    // If we checked before, start from last_checked_at. Otherwise start from signal creation.
    let since = signal.last_checked_at 
        ? new Date(signal.last_checked_at).getTime() 
        : new Date(signal.created_at).getTime();
        
    // Safety buffer: add 1s to avoid duplicate overlap, or keep same to be safe against gap
    // However, fetchOHLCV 'since' is inclusive.

    // Don't fetch the future
    if (since >= Date.now()) {
        console.log(`⏭️ Signal ${signal.id} (${symbol}) is up to date.`);
        return { id: signal.id, status: 'skipped_up_to_date' };
    }

    console.log(`🔍 Processing ${symbol} (ID: ${signal.id}) since ${new Date(since).toISOString()}`);

    try {
        // Fetch Candles
        // Timeframe 1m provides granular checking for SL/TP
        const timeframe = '1m'; 
        // Note: CCXT Binance Future symbols often effectively work with standard 'BTC/USDT' 
        // if defaultType is set to 'future'.
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, FETCH_LIMIT_CANDLES);

        if (!ohlcv || ohlcv.length === 0) {
            console.log(`__ No new data for ${symbol}`);
            return { id: signal.id, status: 'no_data', symbol };
        }

        let hitTP = false;
        let hitSL = false;
        let exitPrice = 0;
        let exitTime = null;

        // Iterate candles to simulate price movement
        // ohlcv format: [timestamp, open, high, low, close, volume]
        for (const candle of ohlcv) {
            const [ts, open, high, low, close] = candle;

            // Logic for LONG
            if (signal.direction === 'long') {
                // Check Low for Stop Loss first (Pessimistic approach: assume SL hit before TP if both in same candle)
                if (low <= signal.stop_loss) {
                    hitSL = true;
                    exitPrice = signal.stop_loss;
                    exitTime = new Date(ts).toISOString();
                    break;
                }
                // Check High for Take Profit
                if (high >= signal.take_profit) {
                    hitTP = true;
                    exitPrice = signal.take_profit;
                    exitTime = new Date(ts).toISOString();
                    break;
                }
            } 
            // Logic for SHORT
            else if (signal.direction === 'short') {
                // Check High for Stop Loss (Pessimistic)
                if (high >= signal.stop_loss) {
                    hitSL = true;
                    exitPrice = signal.stop_loss;
                    exitTime = new Date(ts).toISOString();
                    break;
                }
                // Check Low for Take Profit
                if (low <= signal.take_profit) {
                    hitTP = true;
                    exitPrice = signal.take_profit;
                    exitTime = new Date(ts).toISOString();
                    break;
                }
            }
        }

        // Update State
        if (hitTP || hitSL) {
            // Calculation based on direction
            // Long ROI = (Exit - Entry) / Entry
            // Short ROI = (Entry - Exit) / Entry
            let roi = 0;
            if (signal.direction === 'long') {
                roi = (exitPrice - signal.entry_price) / signal.entry_price;
            } else {
                roi = (signal.entry_price - exitPrice) / signal.entry_price;
            }

            // Determine status based on PnL derived from ROI
            // If ROI is positive, it's a profit (even if triggered by SL - e.g. trailing stop)
            // If ROI is negative, it's a loss
            // If ROI is zero, it's break-even (closed)
            let status = 'closed'; // Default to break-even
            if (roi > 0) {
                status = 'closed_profit';
            } else if (roi < 0) {
                status = 'closed_loss';
            }

            // Calculate PnL based on default capital of 1000 USDT
            const pnl = 1000 * roi;

            console.log(`🛑 Signal ${signal.id} CLOSED. Status: ${status}, ROI: ${(roi*100).toFixed(2)}%`);

            // Update Signal in DB
            const { error } = await supabase.from('signals').update({
                status: status,
                exit_price: exitPrice,
                exit_reason: hitTP ? 'tp' : 'sl',
                realized_pnl: pnl, 
                roi: roi, 
                last_checked_at: exitTime,
                closed_at: exitTime
            }).eq('id', signal.id);
            
            if (error) throw error;
            return { id: signal.id, status: 'closed', exit_status: status, roi };

        } else {
            // No exit triggered, just update watermark
            const lastCandle = ohlcv[ohlcv.length - 1];
            const lastTs = new Date(lastCandle[0]).toISOString();
            
            console.log(`__ Signal ${signal.id} still active. Updated watermark to ${lastTs}`);

            const { error } = await supabase.from('signals').update({
                last_checked_at: lastTs
            }).eq('id', signal.id);

            if (error) throw error;
            return { id: signal.id, status: 'updated_watermark', last_ts: lastTs };
        }

    } catch (err) {
        console.error(`Error processing signal ${signal.id}:`, err.message);
        return { id: signal.id, status: 'error', message: err.message };
    }
}
