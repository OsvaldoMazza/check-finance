// src/calculate/backtest.js
// Backtest simple basado en trailing stop Kijun

export function runBacktest(dSlow, dFast, prices, sigIndices) {
  let wins = 0, losses = 0, cumR = 0, maxCumR = 0, maxDD = 0;
  const equity = [0];
  for (const idx of sigIndices) {
    const entryRaw = prices[idx + 1] ?? prices[idx];
    const entry    = entryRaw;
    const initialStop = dFast[idx]?.kijun;
    if (!initialStop || initialStop >= entry) continue;
    const risk        = entry - initialStop;
    let   trailStop   = initialStop;
    let   outcomeR    = null;
    let   exitPrice   = null;
    for (let j = idx + 1; j < Math.min(idx + 61, prices.length); j++) {
      const bar = dFast[j];
      if (!bar) break;
      if (bar.kijun && bar.kijun > trailStop) trailStop = bar.kijun;
      if (bar.low !== undefined && bar.low <= trailStop) {
        exitPrice = trailStop;
        outcomeR = (exitPrice - entry) / risk;
        break;
      }
    }
    if (outcomeR === null) {
      exitPrice = prices[Math.min(idx + 60, prices.length - 1)];
      outcomeR = (exitPrice - entry) / risk;
    }
    if (outcomeR > 0) wins++; else losses++;
    cumR += outcomeR;
    equity.push(parseFloat(cumR.toFixed(2)));
    maxCumR = Math.max(maxCumR, cumR);
    maxDD   = Math.max(maxDD, maxCumR - cumR);
  }
  const total = wins + losses;
  return {
    wins, losses, total,
    winRate:    total > 0 ? (wins / total * 100).toFixed(1) : '—',
    expectancy: total > 0 ? (cumR / total).toFixed(2)       : '—',
    totalR:     cumR.toFixed(2),
    maxDD:      maxDD.toFixed(2),
    equity
  };
}
