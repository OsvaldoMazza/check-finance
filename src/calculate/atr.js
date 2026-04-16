// src/calculate/atr.js
// Cálculo de Average True Range (ATR)

export function calcATR(data, period) {
  const N = data.length;
  const atr = new Array(N).fill(null);
  let sum = 0;
  for (let i = 1; i < N; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i-1].close),
      Math.abs(data[i].low  - data[i-1].close)
    );
    if (i <= period) {
      sum += tr;
      if (i === period) atr[i] = sum / period;
    } else {
      atr[i] = (atr[i-1] * (period-1) + tr) / period;
    }
  }
  return atr;
}
