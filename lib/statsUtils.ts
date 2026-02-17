import { Signal } from './signalService';

export interface TraderStats {
  totalRoi: number;       // 累计收益率 %
  totalPnl: number;       // 累计收益金额
  winRate: number;        // 胜率 %
  totalTrades: number;    // 总交易数
  winTrades: number;      // 盈利交易数
  lossTrades: number;     // 亏损交易数
  avgPnlRatio: string;    // 平均盈亏比 "1 : 1.5"
  profitFactor: number;   // 盈亏因子 (总盈利/总亏损)
  maxDrawdown: number;    // 最大回撤 %
  trendData: { date: string; value: number }[]; // 用于绘图的趋势数据
}

/**
 * 计算交易员的核心统计指标
 * @param signals 历史平仓订单列表 (Closed Signals)
 * @returns TraderStats 对象
 */
export const calculateTraderStats = (signals: Signal[]): TraderStats => {
  if (!signals || signals.length === 0) {
    return {
      totalRoi: 0,
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      avgPnlRatio: '0 : 0',
      profitFactor: 0,
      maxDrawdown: 0,
      trendData: []
    };
  }

  // 按时间正序排列 (旧 -> 新)，用于计算累积趋势
  const sortedSignals = [...signals].sort((a, b) => 
    new Date(a.signal_time).getTime() - new Date(b.signal_time).getTime()
  );

  let totalRoi = 0;
  let totalPnl = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalWinPnl = 0;
  let totalLossPnl = 0;

  // 趋势数据初始化
  const trendData: { date: string; value: number }[] = [];
  let currentAccumulatedRoi = 0;

  // 模拟最大回撤计算
  let peakRoi = -Infinity;
  let maxDrawdown = 0;

  sortedSignals.forEach(signal => {
    // ⚠️ 注意：由于 Signal 接口目前可能没有 exit_price，这里我们需要根据
    // take_profit 和 stop_loss 以及 status 来模拟计算真实的 PnL。
    // 在实际生产中，你的 Signal 对象应该包含 `exit_price` 和 `realized_pnl`。
    
    // --- 模拟计算逻辑 START ---
    // 假设：如果 closed 且没有真实价格，我们暂用 TP/SL 估算 (仅作演示)
    // 正常应该读取 signal.realized_pnl
    const entry = parseFloat(signal.entry_price);
    const leverage = parseFloat(signal.leverage) || 1;
    let exit = entry;
    
    // 简单模拟：随机假设它是止盈或止损离场 (仅用于演示效果，请替换为真实字段)
    // 实际项目中请使用: const pnl = signal.realized_pnl; const roi = signal.roi;
    const isWin = Math.random() > 0.4; // 假设 60% 概率盈利
    
    if (signal.direction === 'long') {
      exit = isWin ? parseFloat(signal.take_profit) : parseFloat(signal.stop_loss);
    } else {
      exit = isWin ? parseFloat(signal.take_profit) : parseFloat(signal.stop_loss);
    }

    const priceDiffPct = (exit - entry) / entry;
    const roi = signal.direction === 'long' 
      ? priceDiffPct * leverage * 100 
      : -priceDiffPct * leverage * 100;

    // 假设本金 $1000/单
    const pnl = 1000 * (roi / 100); 
    // --- 模拟计算逻辑 END ---

    // 累加数据
    totalRoi += roi;
    totalPnl += pnl;
    currentAccumulatedRoi += roi;

    if (pnl > 0) {
      winCount++;
      totalWinPnl += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalLossPnl += Math.abs(pnl);
    }

    // 计算回撤
    if (currentAccumulatedRoi > peakRoi) {
      peakRoi = currentAccumulatedRoi;
    }
    const drawdown = peakRoi - currentAccumulatedRoi;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    // 添加趋势点 (按天聚合可以是优化的下一步)
    trendData.push({
      date: new Date(signal.signal_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      value: currentAccumulatedRoi
    });
  });

  // 收尾计算
  const totalTrades = signals.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  
  const avgWin = winCount > 0 ? totalWinPnl / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossPnl / lossCount : 1; // 避免除以0
  const ratioValue = avgLoss === 0 ? avgWin : (avgWin / avgLoss);
  
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl;

  return {
    totalRoi,
    totalPnl,
    winRate,
    totalTrades,
    winTrades,
    lossTrades,
    avgPnlRatio: `1 : ${ratioValue.toFixed(2)}`,
    profitFactor,
    maxDrawdown,
    trendData
  };
};
