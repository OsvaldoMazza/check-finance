// src/calculate/index.js
// Exporta todas las funciones de análisis

export { ichimokuOptimized } from './ichimoku.js';
export { calcATR } from './atr.js';
export { default as chikouClear, pullbackType } from './signals.js';
export { runBacktest } from './backtest.js';
export { detectRegime } from './regime.js';
export { detectReversal } from './reversal.js';
export { volumeConfirm } from './volume.js';
export { calculateScore, buildSignal } from './score.js';
export { calibrateParams } from './calibrate.js';
export { normalizeMarketData } from './inputAdapter.js';
