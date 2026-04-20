// src/calculate/backtest.js
// Backtest v8 con BUG FIXES y mejoras

/**
 * Backtest con trailing stop en Kijun fast TF
 * 
 * CHANGE 2 — Gap filter: entrada al Open de la barra siguiente (i+1).
 * CHANGE 3 — Trailing Stop en Kijun fast (reemplaza TP fijo 2R).
 *   Timeout: 60 barras. outcomeR puede superar 2 en tendencias fuertes.
 *
 * BUG 1 FIX v8 — Orden de operaciones en trailing stop:
 *   ANTES: se actualizaba trailStop ANTES de verificar si fue tocado.
 *          Si Kijun subía y el low de la misma barra quedaba bajo el
 *          nuevo Kijun, se registraba una salida al Kijun recién subido
 *          — un precio que nunca fue el stop vigente en esa barra.
 *   AHORA: se verifica si el low toca el stop VIGENTE (del período
 *          anterior), y solo si no fue tocado se actualiza para la
 *          próxima barra. Orden correcto: check → then update.
 *
 * MEJORA 1 v8 — Fallback en gap filter:
 *   Si idx+1 está fuera del array (trade en el borde), skip el trade.
 *   El fallback anterior (prices[idx]) usaba un precio imposible.
 * 
 * @param {Array} dFast - Datos con Ichimoku fast TF
 * @param {Array} prices - Array de precios close
 * @param {Array} sigIndices - Índices de señales válidas
 * @param {Array} rawData - Datos originales con open para gap filter
 * @returns {Object} Resultados del backtest
 */
export function runBacktest(dFast, prices, sigIndices, rawData) {
  let wins = 0, losses = 0, cumR = 0, maxCumR = 0, maxDD = 0;
  const equity = [0];
  
  for (const idx of sigIndices) {
    // MEJORA 1: saltar si no hay barra siguiente
    if (idx + 1 >= prices.length) continue;

    // CHANGE 2 — entrada al open del día siguiente (gap filter)
    const nextBar = rawData && rawData[idx + 1];
    const entry   = (nextBar && !isNaN(nextBar.open)) ? nextBar.open : prices[idx + 1];

    // Stop inicial = Kijun del fast TF en la barra de señal
    const initialStop = dFast[idx]?.kijun;
    if (!initialStop || initialStop >= entry) continue;

    const risk      = entry - initialStop;
    let   trailStop = initialStop;
    let   outcomeR  = null;
    let   exitPrice = null;

    // CHANGE 3 — trailing stop con BUG 1 FIX: check ANTES de update
    for (let j = idx + 1; j < Math.min(idx + 61, prices.length); j++) {
      const bar = dFast[j];
      if (!bar) break;

      // 1° VERIFICAR si el low toca el stop VIGENTE (del período anterior)
      if (bar.low !== undefined && bar.low <= trailStop) {
        exitPrice = trailStop;
        outcomeR  = (exitPrice - entry) / risk;
        break;
      }

      // 2° Solo si no fue tocado: actualizar el trailing stop para la próxima barra
      if (bar.kijun && bar.kijun > trailStop) trailStop = bar.kijun;
    }

    // Timeout: salida al close de la barra 60
    if (outcomeR === null) {
      const exitIdx = Math.min(idx + 61, prices.length - 1);
      exitPrice = prices[exitIdx];
      outcomeR  = (exitPrice - entry) / risk;
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
