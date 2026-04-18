// src/calculate/regime.js
// Detección de régimen de mercado (TREND vs RANGE)

/**
 * Detecta el régimen de mercado (TREND vs RANGE)
 * v9: usa tkSpreadMin calibrado del instrumento en lugar de atrNorm fijo.
 * Cada activo tiene su propio umbral derivado del percentil 40 de su spread TK histórico.
 * 
 * @param {Array} data - Datos con Ichimoku calculado
 * @param {number} i - Índice actual
 * @param {Array} atrArr - Array de ATR
 * @param {Object} calib - Parámetros calibrados del instrumento
 * @returns {string} 'TREND' o 'RANGE'
 */
export function detectRegime(data, i, atrArr, calib) {
  const c = data[i], prev = data[i-1];
  if (!c || !prev || !c.kijun || !prev.kijun) return 'RANGE';

  const atrNorm = (atrArr && atrArr[i] && c.close > 0)
                  ? atrArr[i] / c.close
                  : (calib?.atrNormMedian ?? 0.01);

  const slope         = c.kijun > prev.kijun;
  const distance      = Math.abs((c.close - c.kijun) / c.close);
  const expansion     = c.senkouA && prev.senkouA && c.senkouA > prev.senkouA;
  
  // Fuerza de tendencia por separación Tenkan-Kijun
  const trendStrength = (c.tenkan !== undefined && c.kijun)
                        ? Math.abs(c.tenkan - c.kijun) / c.close
                        : 0;

  // v9: umbral de trendStrength = tkSpreadMin calibrado (p40 del instrumento)
  // vs versiones anteriores donde usaba 1×atrNorm (mismo valor para todos)
  const tkThreshold = calib?.tkSpreadMin ?? atrNorm;

  return (slope &&
          distance      > 0.5 * atrNorm &&
          trendStrength > tkThreshold    &&
          expansion)
         ? 'TREND' : 'RANGE';
}
