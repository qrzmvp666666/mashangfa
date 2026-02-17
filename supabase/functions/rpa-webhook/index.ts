import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OctopusData {
  ColumnNames: string[];
  Values: string[][];
}

interface SignalData {
  signals: Array<{
    trader_name: string;
    currency: string;
    direction: string;
    entry_price?: string;
    stop_loss?: string;
    take_profit?: string;
    leverage?: string;
    signal_type?: string;
    status?: string;
    signal_time?: string;
  }>;
}

// 获取或创建交易员（修复版：添加错误重试和唯一性检查）
async function getOrCreateTrader(supabaseClient: any, traderName: string) {
  // 第一次查询：检查交易员是否存在
  const { data: existingTrader, error: selectError } = await supabaseClient
    .from('traders')
    .select('*')
    .eq('name', traderName)
    .maybeSingle(); // 使用 maybeSingle() 而不是 single() 避免在没有结果时报错

  if (selectError) {
    console.error(`查询交易员失败: ${selectError.message}`);
    throw new Error(`查询交易员失败: ${selectError.message}`);
  }

  if (existingTrader) {
    return { trader: existingTrader, created: false };
  }

  // 尝试创建新交易员
  const { data: newTrader, error: createError } = await supabaseClient
    .from('traders')
    .insert({
      name: traderName,
      avatar_url: null,
      description: `自动创建的交易员: ${traderName}`,
      followers_count: 0,
      win_rate: 0,
      total_signals: 0,
      is_online: false,
      is_online_today: false,
    })
    .select()
    .single();

  // 如果插入失败（可能因为唯一性约束冲突或其他并发问题），再次查询
  if (createError) {
    console.warn(`创建交易员失败（可能已存在），尝试再次查询: ${createError.message}`);
    
    // 重新查询以获取已存在的交易员
    const { data: retryTrader, error: retryError } = await supabaseClient
      .from('traders')
      .select('*')
      .eq('name', traderName)
      .maybeSingle();

    if (retryError || !retryTrader) {
      throw new Error(`创建和查询交易员均失败: ${createError.message}`);
    }

    return { trader: retryTrader, created: false };
  }

  return { trader: newTrader, created: true };
}

// 检查信号是否已存在
async function checkSignalExists(
  supabaseClient: any,
  traderId: string,
  currency: string,
  entryPrice: string,
  takeProfit: string,
  stopLoss: string,
  leverage: string
): Promise<boolean> {
  const { data } = await supabaseClient
    .from('signals')
    .select('id')
    .eq('trader_id', traderId)
    .eq('currency', currency)
    .eq('entry_price', entryPrice)
    .eq('take_profit', takeProfit)
    .eq('stop_loss', stopLoss)
    .eq('leverage', leverage)
    .limit(1);

  return data && data.length > 0;
}

// 转换八爪鱼数据格式为标准格式
function convertOctopusToSignals(octopusData: OctopusData): SignalData {
  const { ColumnNames, Values } = octopusData;
  
  const fieldMapping: Record<string, string> = {
    'KOL名称': 'trader_name',
    '方向': 'direction',
    '交易对': 'currency',
    '入场价': 'entry_price',
    '止盈价': 'take_profit',
    '止损价': 'stop_loss',
    '杠杆': 'leverage',
    '创建时间': 'signal_time',
    '描述': 'description',
  };

  const signals = Values.map(row => {
    const signal: any = {};
    
    ColumnNames.forEach((colName, index) => {
      const mappedField = fieldMapping[colName];
      if (mappedField) {
        let value = row[index];
        
        if (mappedField === 'direction') {
          if (value === '做多') value = 'long';
          else if (value === '做空') value = 'short';
          else if (value === '现货') value = 'spot';
        } else if (mappedField === 'signal_time') {
          if (value && !value.includes('-')) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            value = `${year}-${month}-${day} ${value}:00`;
          }
          if (value) {
            try {
              const date = new Date(value);
              value = date.toISOString();
            } catch (e) {
              value = new Date().toISOString();
            }
          }
        }
        
        signal[mappedField] = value || '未提供';
      }
    });
    
    signal.signal_type = signal.signal_type || 'futures';
    signal.status = signal.status || 'active';
    
    if (signal.leverage === '未提供') {
      signal.leverage = '10x';
    }
    
    return signal;
  });

  return { signals };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let rawText = '';
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    rawText = await req.text();
    
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch (parseError: any) {
      throw new Error(`JSON解析失败: ${parseError.message}. 请检查八爪鱼请求体配置。`);
    }

    let signalData: SignalData;

    if (body.ColumnNames && body.Values) {
      signalData = convertOctopusToSignals(body as OctopusData);
    } else if (body.signals) {
      signalData = body as SignalData;
    } else {
      throw new Error('无效的请求格式。需要 {ColumnNames, Values} 或 {signals}');
    }

    const { signals } = signalData;

    if (!signals || !Array.isArray(signals)) {
      throw new Error('signals 必须是数组');
    }

    const results = {
      traders_auto_created: 0,
      signals_processed: 0,
      signals_created: 0,
      signals_skipped_spot: 0,
      signals_skipped_duplicate: 0,
      errors: [] as string[],
    };

    for (const signal of signals) {
      try {
        results.signals_processed++;

        if (!signal.trader_name || !signal.currency || !signal.direction) {
          results.errors.push(`信号 ${results.signals_processed}: 缺少必填字段`);
          continue;
        }

        if (signal.direction === 'spot') {
          results.signals_skipped_spot++;
          continue;
        }

        const validDirections = ['long', 'short'];
        if (!validDirections.includes(signal.direction)) {
          results.errors.push(`信号 ${results.signals_processed}: direction 值无效 "${signal.direction}"`);
          continue;
        }

        const { trader, created } = await getOrCreateTrader(supabaseClient, signal.trader_name);

        if (created) {
          results.traders_auto_created++;
        }

        const isDuplicate = await checkSignalExists(
          supabaseClient,
          trader.id,
          signal.currency,
          signal.entry_price || '未提供',
          signal.take_profit || '未提供',
          signal.stop_loss || '未提供',
          signal.leverage || '10x'
        );

        if (isDuplicate) {
          results.signals_skipped_duplicate++;
          continue;
        }

        const { error: signalError } = await supabaseClient
          .from('signals')
          .insert({
            trader_id: trader.id,
            currency: signal.currency,
            direction: signal.direction,
            entry_price: signal.entry_price || '未提供',
            stop_loss: signal.stop_loss || '未提供',
            take_profit: signal.take_profit || '未提供',
            leverage: signal.leverage || '10x',
            signal_type: signal.signal_type || 'futures',
            status: signal.status || 'active',
            signal_time: signal.signal_time || new Date().toISOString(),
          });

        if (signalError) {
          results.errors.push(`信号 ${results.signals_processed}: 插入失败`);
        } else {
          results.signals_created++;
        }
      } catch (error: any) {
        results.errors.push(`信号 ${results.signals_processed}: 处理失败`);
      }
    }

    const duration = Date.now() - startTime;

    // 简洁日志输出
    const logLines = [
      '信号处理完成---',
      `- 收到 ${signals.length} 个信号`,
      `- 自动创建交易员: ${results.traders_auto_created} 个`,
      `- 成功创建信号: ${results.signals_created} 个`,
      `- 跳过现货: ${results.signals_skipped_spot} 个`,
      `- 跳过重复: ${results.signals_skipped_duplicate} 个`,
    ];
    
    if (results.errors.length > 0) {
      logLines.push(`- 错误: ${results.errors.length} 个`);
    }
    
    logLines.push(`- 耗时: ${duration}ms`);
    
    console.log(logLines.join('\n'));

    const response = {
      success: true,
      message: '数据处理完成',
      results,
      duration_ms: duration,
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error(`❌ 处理失败: ${error.message}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        debug: {
          raw_text_length: rawText.length,
          raw_text_preview: rawText.substring(0, 100),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
