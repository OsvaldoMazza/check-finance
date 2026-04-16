// src/calculate/regime.js
// Detección de régimen de mercado (TREND vs RANGE)

export function detectRegime(data, i, atrArr) {
  const c = data[i], prev = data[i-1];
  if (!c || !prev || !c.kijun || !prev.kijun) return 'RANGE';

  const atrNorm = (atrArr && atrArr[i] && c.close > 0)
                  ? atrArr[i] / c.close
                  : 0.01;

  const slope         = c.kijun > prev.kijun;
  const distance      = Math.abs((c.close - c.kijun) / c.close);
  const expansion     = c.senkouA && prev.senkouA && c.senkouA > prev.senkouA;
  
  // Fuerza de tendencia por separación Tenkan-Kijun
  const trendStrength = (c.tenkan !== undefined && c.kijun)
                        ? Math.abs(c.tenkan - c.kijun) / c.close
                        : 0;

  return (slope &&
          distance      > 0.5  * atrNorm &&
          trendStrength > atrNorm         &&
          expansion)
         ? 'TREND' : 'RANGE';
}
