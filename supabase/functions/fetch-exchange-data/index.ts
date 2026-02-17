import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import ccxt from 'https://esm.sh/ccxt@4.2.71?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { exchangeAccountId, symbol } = await req.json()

    if (!exchangeAccountId) {
      throw new Error('Missing exchangeAccountId')
    }

    // 1. Get exchange account details
    const { data: account, error: accountError } = await supabaseClient
      .from('exchange_accounts')
      .select('*, exchanges(name)')
      .eq('id', exchangeAccountId)
      .single()

    if (accountError || !account) {
      throw new Error('Exchange account not found')
    }

    const exchangeId = account.exchanges?.name?.toLowerCase()
    if (!exchangeId || !ccxt[exchangeId]) {
      throw new Error(`Exchange ${exchangeId} not supported`)
    }

    // 2. Initialize CCXT
    const exchangeClass = ccxt[exchangeId]
    const exchange = new exchangeClass({
      apiKey: account.api_key,
      secret: account.secret_key,
      password: account.passphrase, // Some exchanges need this (e.g. OKX, KuCoin)
      // enableRateLimit: true, 
    })

    // Proxy configuration
    // Hardcoded fallback as requested. Ideally set this in Supabase Secrets.
    const proxyUrl = Deno.env.get('CCXT_PROXY_URL') ?? "http://x8kuh7re546o:soJsMLwj1zrR1Rnj@proxy.smartproxycn.com:1000"
    if (proxyUrl) {
      console.log(`Using proxy: ${proxyUrl}`)
      // For Deno, we need to use a custom fetch client for forward proxies
      // @ts-ignore: Deno.createHttpClient might not be in standard types
      if (typeof Deno.createHttpClient === 'function') {
          // @ts-ignore
          const client = Deno.createHttpClient({ proxy: { url: proxyUrl } })
          exchange.fetchImplementation = (url: string, options: any) => {
              return fetch(url, { ...options, client })
          }
      } else {
          console.warn('Deno.createHttpClient not found, cannot configure forward proxy correctly.')
      }
    }

    // Set sandbox mode if needed
    if (account.account_mode === 'sandbox' || account.account_mode === 'test' || account.account_mode === 'demo') {
      exchange.setSandboxMode(true)
      console.log('Enabled sandbox mode')
    } 

    // 3. Fetch data
    const promises: Promise<any>[] = []
    
    // Balance
    promises.push(
      exchange.fetchBalance()
        .then(res => ({ type: 'balance', data: res }))
        .catch(err => ({ type: 'balance', error: err.message }))
    )

    // Positions
    // Check if the exchange supports fetchPositions
    if (exchange.has['fetchPositions']) {
       promises.push(
         exchange.fetchPositions(symbol ? [symbol] : undefined)
           .then(res => ({ type: 'positions', data: res }))
           .catch(err => ({ type: 'positions', error: err.message }))
       )
    }

    // Open Orders
    if (exchange.has['fetchOpenOrders']) {
        // Some exchanges require symbol. If symbol is not provided, we might skip or try without it.
        // For safety, if no symbol is provided, we only fetch if the exchange doesn't strictly require it.
        // But for now, let's try fetching.
        promises.push(
            exchange.fetchOpenOrders(symbol)
                .then(res => ({ type: 'openOrders', data: res }))
                .catch(err => ({ type: 'openOrders', error: err.message }))
        )
    }
    
    // History Orders (Closed)
    if (exchange.has['fetchClosedOrders']) {
         if (symbol) {
             promises.push(
                 exchange.fetchClosedOrders(symbol)
                    .then(res => ({ type: 'historyOrders', data: res }))
                    .catch(err => ({ type: 'historyOrders', error: err.message }))
             )
         }
    }

    const resultsArray = await Promise.all(promises)
    
    const results: any = {}
    resultsArray.forEach(res => {
        results[res.type] = res.error ? { error: res.error } : res.data
    })

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
