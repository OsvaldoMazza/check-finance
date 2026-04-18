// src/calculate/calibrate.js
// Auto-calibración v9: percentiles del instrumento cargado

/**
 * Auto-calibración de parámetros basados en percentiles del instrumento
 * 
 * Problema: parámetros fijos (cloudThickness > 0.005, etc.) no se adaptan
 * a la volatilidad estructural de cada activo. MELI tiene nubes más gruesas
 * que SPY por definición — no porque sea "mejor" sino porque su ATR es mayor.
 * 
 * Solución: un pase único sobre los datos históricos del instrumento calcula
 * percentiles de las métricas clave y deriva umbrales desde la distribución
 * real del activo. El sistema se calibra solo al cargar cada CSV/API.
 * 
 * Parámetros calibrados:
 *   cloudThicknessMin:  percentil 35 del espesor histórico de la nube
 *                       → exige que la nube esté en el 65% superior de su historia
 *   atrNormMedian:      mediana del ATR normalizado (ATR/precio)
 *                       → referencia de volatilidad "normal" del instrumento
 *   tkSpreadMin:        percentil 40 del spread |Tenkan-Kijun|/precio
 *                       → trendStrength mínimo para considerar tendencia real
 * 
 * Fallbacks: si hay menos de 100 barras válidas, se usan los valores fijos
 * anteriores para no crashear con datasets cortos.
 * 
 * @param {Array} slow - Datos con Ichimoku slow TF calculado
 * @param {Array} atrArr - Array de ATR calculados
 * @param {number} N - Longitud del dataset
 * @returns {Object} Parámetros calibrados
 */
export function calibrateParams(slow, atrArr, N) {
  const thicknesses = [];
  const atrNorms    = [];
  const tkSpreads   = [];

  for (let i = 60; i < N; i++) {
    const s = slow[i];
    if (!s || !s.senkouA || !s.senkouB || !s.close) continue;
    
    // Espesor de la nube normalizado
    const cloudThick = Math.abs(s.senkouA - s.senkouB) / s.close;
    if (cloudThick > 0) thicknesses.push(cloudThick);
    
    // ATR normalizado
    if (atrArr[i]) atrNorms.push(atrArr[i] / s.close);

    // Spread Tenkan-Kijun normalizado
    if (s.tenkan !== undefined && s.kijun) {
      const tkSpread = Math.abs(s.tenkan - s.kijun) / s.close;
      if (tkSpread > 0) tkSpreads.push(tkSpread);
    }
  }

  // Función de percentil (ordena y extrae)
  const pct = (arr, p) => {
    if (arr.length < 20) return null;          // insuficiente → fallback
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  };

  return {
    // cloudThicknessMin: p35 → exige nube en el 65% superior de la historia
    cloudThicknessMin: pct(thicknesses, 0.35) ?? 0.005,
    // atrNormMedian: mediana del ATR normalizado del instrumento
    atrNormMedian:     pct(atrNorms, 0.50)    ?? 0.01,
    // tkSpreadMin: p40 del spread TK → fuerza de tendencia mínima
    tkSpreadMin:       pct(tkSpreads, 0.40)   ?? 0.005,
    // Guardar los raw para mostrar en UI
    _thicknesses: thicknesses,
    _atrNorms:    atrNorms,
    _tkSpreads:   tkSpreads
  };
}
