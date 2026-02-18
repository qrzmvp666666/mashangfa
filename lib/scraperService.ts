/**
 * 天地中特爬虫服务
 * 用于 Supabase Edge Function 定时爬取数据
 *
 * Edge Function 地址:
 *   https://owdpmdgtnuacmjedgywu.supabase.co/functions/v1/tiandi-crawler
 *   手动触发加 ?force=true 跳过时间窗口检查
 *
 * 配置表 platform_config:
 *   crawler_hour / crawler_minute — 爬虫开始执行时间（北京时间）
 *   prediction_hour / prediction_minute — 网站发布预测时间
 */

const TARGET_URL = 'https://fuxingdy002.resource-centerplce.com/tiezi/bf/xin-aomen/12.html';
const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 60 * 1000; // 1分钟

export interface TiandiSpecialData {
  issue_no: string;
  prediction_content: string;
  result_text: string;
}

interface CrawlerResult {
  success: boolean;
  message: string;
  data?: TiandiSpecialData;
  attempt: number;
}

/** 去除HTML标签 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 从 platform_config 读取爬虫配置
 */
export async function getCrawlerConfig(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ predictionHour: number; predictionMinute: number; crawlerHour: number; crawlerMinute: number }> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/platform_config?key=in.(prediction_hour,prediction_minute,crawler_hour,crawler_minute)`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`读取配置失败: ${response.status}`);
  }

  const configs: { key: string; value: string }[] = await response.json();
  const get = (key: string, def: number) => {
    const c = configs.find((c) => c.key === key);
    return c ? parseInt(c.value, 10) : def;
  };

  const predictionHour = get('prediction_hour', 11);
  const predictionMinute = get('prediction_minute', 0);

  return {
    predictionHour,
    predictionMinute,
    crawlerHour: get('crawler_hour', predictionHour),
    crawlerMinute: get('crawler_minute', predictionMinute - 5),
  };
}

/**
 * 检查当前是否在允许的爬取时间窗口内
 * 窗口：从 crawler_hour:crawler_minute 开始，持续 35 分钟
 */
export function isWithinCrawlWindow(crawlerHour: number, crawlerMinute: number): boolean {
  const now = new Date();
  const bjHour = (now.getUTCHours() + 8) % 24;
  const bjMinute = now.getUTCMinutes();
  const currentMinutes = bjHour * 60 + bjMinute;

  const startMinutes = crawlerHour * 60 + crawlerMinute;
  const endMinutes = startMinutes + 35; // 窗口 35 分钟

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * 爬取网页并解析最新一条数据
 * 解析方式：匹配 <tr> 行 → 提取 <td> 列 → 去除 HTML 标签
 */
export async function scrapeLatestTiandiSpecial(): Promise<TiandiSpecialData> {
  const response = await fetch(TARGET_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败: HTTP ${response.status}`);
  }

  const html = await response.text();

  // 解析 <tr> 行，找到包含期号的第一行
  const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(trRegex);
  if (!rows || rows.length === 0) {
    throw new Error('未找到表格行');
  }

  for (const row of rows) {
    const issueMatch = row.match(/(\d{3}期)/);
    if (!issueMatch) continue;

    const tdRegex = /<td[^>]*>[\s\S]*?<\/td>/gi;
    const tds = row.match(tdRegex);
    if (!tds || tds.length < 3) continue;

    const issue_no = stripHtml(tds[0]).trim();
    const prediction_content = stripHtml(tds[1]).trim();
    const result_text = stripHtml(tds[2]).trim();

    return { issue_no, prediction_content, result_text };
  }

  throw new Error('未找到包含期号的数据行');
}

/**
 * 检查 issue_no 是否已存在
 */
export async function checkDuplicate(
  supabaseUrl: string,
  supabaseKey: string,
  issueNo: string
): Promise<boolean> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/featured_tiandi_specials?issue_no=eq.${encodeURIComponent(issueNo)}&select=id`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`查重失败: ${response.status}`);
  }

  const data = await response.json();
  return data.length > 0;
}

/**
 * 插入数据到 featured_tiandi_specials
 */
export async function insertRecord(
  supabaseUrl: string,
  supabaseKey: string,
  data: TiandiSpecialData
): Promise<void> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/featured_tiandi_specials`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        issue_no: data.issue_no,
        prediction_content: data.prediction_content,
        result_text: data.result_text,
        is_show: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`入库失败: ${response.status} - ${errorText}`);
  }
}

/**
 * 写入爬虫日志
 */
export async function writeCrawlerLog(
  supabaseUrl: string,
  supabaseKey: string,
  log: {
    task_name: string;
    status: 'success' | 'failed' | 'skipped';
    message: string;
    issue_no?: string;
    attempt_count?: number;
  }
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/crawler_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(log),
  });
}

/**
 * 主流程：带重试的爬取 + 入库
 * @param forceRun 手动触发时传 true，跳过时间窗口检查
 */
export async function runCrawler(
  supabaseUrl: string,
  supabaseKey: string,
  forceRun: boolean = false
): Promise<CrawlerResult> {
  const taskName = 'tiandi_special_crawler';

  // 1. 读取配置
  const config = await getCrawlerConfig(supabaseUrl, supabaseKey);

  // 2. 检查时间窗口（手动触发时跳过）
  if (!forceRun && !isWithinCrawlWindow(config.crawlerHour, config.crawlerMinute)) {
    const msg = `当前不在爬取窗口内（配置: ${config.crawlerHour}:${String(config.crawlerMinute).padStart(2, '0')}），跳过`;
    await writeCrawlerLog(supabaseUrl, supabaseKey, {
      task_name: taskName,
      status: 'skipped',
      message: msg,
    });
    return { success: false, message: msg, attempt: 0 };
  }

  // 3. 带重试的爬取逻辑（最多3次，间隔1分钟）
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await scrapeLatestTiandiSpecial();

      const exists = await checkDuplicate(supabaseUrl, supabaseKey, data.issue_no);
      if (exists) {
        const msg = `${data.issue_no} 已存在，跳过入库`;
        await writeCrawlerLog(supabaseUrl, supabaseKey, {
          task_name: taskName,
          status: 'skipped',
          message: msg,
          issue_no: data.issue_no,
          attempt_count: attempt,
        });
        return { success: true, message: msg, data, attempt };
      }

      await insertRecord(supabaseUrl, supabaseKey, data);

      const msg = `成功入库: ${data.issue_no}`;
      await writeCrawlerLog(supabaseUrl, supabaseKey, {
        task_name: taskName,
        status: 'success',
        message: msg,
        issue_no: data.issue_no,
        attempt_count: attempt,
      });
      return { success: true, message: msg, data, attempt };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`第 ${attempt}/${MAX_RETRIES} 次尝试失败: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      }
    }
  }

  const msg = `${MAX_RETRIES} 次重试均失败，最后错误: ${lastError}`;
  await writeCrawlerLog(supabaseUrl, supabaseKey, {
    task_name: taskName,
    status: 'failed',
    message: msg,
    attempt_count: MAX_RETRIES,
  });
  return { success: false, message: msg, attempt: MAX_RETRIES };
}
