// src/calculate/signals.js
// Funciones para detección de señales y condiciones

// Chikou: close actual sobre máximos previos
export default function chikouClear(data, i, disp) {
  const close = data[i]?.close;
  if (!close) return false;
  const start = Math.max(0, i - disp);
  for (let j = start; j < i; j++) {
    if (data[j] && close <= data[j].high) return false;
  }
  return true;
}

// Pullback type
export function pullbackType(f, atrVal) {
  if (!f || !f.kijun) return 'PROFUNDO';
  if (f.low > f.kijun) return 'NO_PULLBACK';
  const depthPrice = f.kijun - f.low;
  if (atrVal && atrVal > 0) {
    if (depthPrice < 0.5 * atrVal) return 'SUPERFICIAL';
    if (depthPrice < 1.5 * atrVal) return 'NORMAL';
    return 'PROFUNDO';
  } else {
    const depthPct = depthPrice / f.kijun;
    if (depthPct < 0.01) return 'SUPERFICIAL';
    if (depthPct < 0.03) return 'NORMAL';
    return 'PROFUNDO';
  }
}
