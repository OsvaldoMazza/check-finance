// src/calculate/reversal.js
// Detección de patrones de reversión (Engulfing, Hammer/Pin)

export function detectReversal(data, i, lb = 0) {
  const barIdx = i - lb;
  const c = data[barIdx], prev = data[barIdx - 1];
  if (!c || !prev) return { pattern: 'NINGUNO', ok: false };
  
  const range = c.high - c.low;
  if (range < 1e-8) return { pattern: 'NINGUNO', ok: false };
  
  const hasOpen = c.open !== undefined && !isNaN(c.open);
  const prevHasOpen = prev.open !== undefined && !isNaN(prev.open);
  if (!hasOpen) return { pattern: 'NINGUNO', ok: false };

  const bodyBottom = Math.min(c.close, c.open);
  const bodyTop = Math.max(c.close, c.open);
  const body = bodyTop - bodyBottom;
  const lowerWick = bodyBottom - c.low;
  const upperWick = c.high - bodyTop;
  
  // Patrón Engulfing
  if (hasOpen && prevHasOpen) {
    const prevBearish = prev.close < prev.open;
    if (prevBearish && c.close > prev.open && c.open < prev.close) {
      return { pattern: 'ENGULFING', ok: true };
    }
  }
  
  // Patrón Hammer/Pin
  const minBody = Math.max(body, range * 0.04);
  if (lowerWick >= 2 * minBody && upperWick <= minBody && c.close >= c.low + range * 0.5) {
    return { pattern: 'HAMMER/PIN', ok: true };
  }
  
  return { pattern: 'NINGUNO', ok: false };
}
