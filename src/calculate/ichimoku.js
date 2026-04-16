// src/calculate/ichimoku.js
// Funciones para cálculo de Ichimoku optimizado

// Rolling max/min con deque
function rollingMaxMin(high, low, period) {
  const n = high.length;
  const resultHigh = new Array(n).fill(null);
  const resultLow  = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    let max = -Infinity, min = Infinity;
    for (let j = Math.max(0, i - period + 1); j <= i; j++) {
      if (high[j] > max) max = high[j];
      if (low[j] < min) min = low[j];
    }
    if (i >= period-1) {
      resultHigh[i] = max;
      resultLow[i]  = min;
    }
  }
  return { maxHigh: resultHigh, minLow: resultLow };
}

// Ichimoku optimizado
export function ichimokuOptimized(data, tenkanPer, kijunPer, senkouPer) {
  const N = data.length;
  const highs = data.map(x => x.high);
  const lows  = data.map(x => x.low);
  const tenkanHL = rollingMaxMin(highs, lows, tenkanPer);
  const kijunHL  = rollingMaxMin(highs, lows, kijunPer);
  const senkouHL = rollingMaxMin(highs, lows, senkouPer);
  const disp = kijunPer;
  for (let i = 0; i < N; i++) {
    if (i >= tenkanPer-1) {
      data[i].tenkan = (tenkanHL.maxHigh[i] + tenkanHL.minLow[i]) / 2;
    }
    if (i >= kijunPer-1) {
      data[i].kijun = (kijunHL.maxHigh[i] + kijunHL.minLow[i]) / 2;
    }
    if (i >= senkouPer-1 && i + disp < N) {
      data[i+disp].senkouB = (senkouHL.maxHigh[i] + senkouHL.minLow[i]) / 2;
    }
    if (data[i].tenkan !== undefined && data[i].kijun !== undefined && i+disp < N) {
      data[i+disp].senkouA = (data[i].tenkan + data[i].kijun) / 2;
    }
  }
  return data;
}
