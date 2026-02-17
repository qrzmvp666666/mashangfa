/**
 * 时区转换工具函数
 * 所有接口返回的时间都是 UTC+0 时区
 */

/**
 * 将UTC+0时间转换为指定时区的时间
 * @param utcDateString - UTC+0时间字符串（ISO格式或其他可解析格式）
 * @param timezoneOffset - 时区偏移量（小时）
 * @returns 转换后的Date对象
 */
export function convertUTCToTimezone(utcDateString: string, timezoneOffset: number): Date {
  const utcDate = new Date(utcDateString);
  const localTime = new Date(utcDate.getTime() + timezoneOffset * 60 * 60 * 1000);
  return localTime;
}

/**
 * 格式化日期时间（根据时区）
 * @param utcDateString - UTC+0时间字符串
 * @param timezoneOffset - 时区偏移量（小时）
 * @param format - 格式类型
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(
  utcDateString: string,
  timezoneOffset: number,
  format: 'full' | 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const date = convertUTCToTimezone(utcDateString, timezoneOffset);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'full':
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    case 'date':
      return `${year}/${month}/${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    default:
      return `${year}/${month}/${day} ${hours}:${minutes}`;
  }
}

/**
 * 格式化为相对时间（例如：刚刚、5分钟前、2小时前等）
 * @param utcDateString - UTC+0时间字符串
 * @param timezoneOffset - 时区偏移量（小时）
 * @param language - 语言
 * @returns 相对时间字符串
 */
export function formatRelativeTime(
  utcDateString: string,
  timezoneOffset: number,
  language: 'zh' | 'en' = 'zh'
): string {
  const date = convertUTCToTimezone(utcDateString, timezoneOffset);
  const now = new Date(Date.now() + timezoneOffset * 60 * 60 * 1000);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const translations = {
    zh: {
      justNow: '刚刚',
      minutesAgo: (n: number) => `${n}分钟前`,
      hoursAgo: (n: number) => `${n}小时前`,
      daysAgo: (n: number) => `${n}天前`,
      weeksAgo: (n: number) => `${n}周前`,
      monthsAgo: (n: number) => `${n}个月前`,
    },
    en: {
      justNow: 'just now',
      minutesAgo: (n: number) => `${n} minute${n > 1 ? 's' : ''} ago`,
      hoursAgo: (n: number) => `${n} hour${n > 1 ? 's' : ''} ago`,
      daysAgo: (n: number) => `${n} day${n > 1 ? 's' : ''} ago`,
      weeksAgo: (n: number) => `${n} week${n > 1 ? 's' : ''} ago`,
      monthsAgo: (n: number) => `${n} month${n > 1 ? 's' : ''} ago`,
    },
  };

  const t = translations[language];

  if (diffSeconds < 60) {
    return t.justNow;
  } else if (diffMinutes < 60) {
    return t.minutesAgo(diffMinutes);
  } else if (diffHours < 24) {
    return t.hoursAgo(diffHours);
  } else if (diffDays < 7) {
    return t.daysAgo(diffDays);
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return t.weeksAgo(weeks);
  } else {
    const months = Math.floor(diffDays / 30);
    return t.monthsAgo(months);
  }
}

/**
 * 获取当前时区的日期时间
 * @param timezoneOffset - 时区偏移量（小时）
 * @returns 当前时区的Date对象
 */
export function getCurrentTimezoneDate(timezoneOffset: number): Date {
  return new Date(Date.now() + timezoneOffset * 60 * 60 * 1000);
}

/**
 * 将本地时间转换为UTC+0时间字符串（用于发送给服务器）
 * @param localDate - 本地时间Date对象
 * @param timezoneOffset - 时区偏移量（小时）
 * @returns UTC+0时间的ISO字符串
 */
export function convertTimezoneToUTC(localDate: Date, timezoneOffset: number): string {
  const utcTime = new Date(localDate.getTime() - timezoneOffset * 60 * 60 * 1000);
  return utcTime.toISOString();
}
