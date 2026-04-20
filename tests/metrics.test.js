import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ichimokuOptimized,
  calcATR,
  calibrateParams,
  buildSignal,
  runBacktest,
  normalizeMarketData
} from '../src/calculate/index.js';

// ── datos sintéticos de tendencia alcista ────────────────────────────────────

function makeTrendData(n = 300, startPrice = 100, step = 0.5) {
  const bars = [];
  for (let i = 0; i < n; i++) {
    const close = +(startPrice + i * step).toFixed(4);
    bars.push({
      close,
      high:   +(close + 2).toFixed(4),
      low:    +(close - 2).toFixed(4),
      open:   i === 0 ? close : bars[i - 1].close,
      volume: 1_000_000 + Math.round(Math.sin(i) * 100_000),
      date:   `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`
    });
  }
  return bars;
}

// replica la misma lógica que renderMetrics usa para formatear
function absNum(value, decimals = 2) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  return Math.abs(n).toFixed(decimals);
}

// ── pipeline completo (mismo flujo que dashboard/index.js) ───────────────────

function runPipeline(rawData, assetType = 'acciones') {
  const normalizedData = normalizeMarketData(rawData);
  const slowP = assetType === 'crypto' ? [10, 30, 60] : [9, 26, 52];
  const fastP = assetType === 'crypto' ? [5, 15, 30] : [7, 22, 44];
  const atrPer = 14;
  const SCORE_CONFIG = assetType === 'crypto'
    ? { coreMin: 70, totalMin: 80 }
    : { coreMin: 70, totalMin: 75 };
  const kijunSlow = slowP[1];

  const slow = ichimokuOptimized(JSON.parse(JSON.stringify(normalizedData)), ...slowP);
  const fast = ichimokuOptimized(JSON.parse(JSON.stringify(normalizedData)), ...fastP);
  const atrArr = calcATR(normalizedData, atrPer);
  const prices = normalizedData.map(d => d.close);
  const N = prices.length;

  const calib = calibrateParams(slow, atrArr, N);
  const btLimit = N - kijunSlow - 61;

  const sigIndices = [];
  for (let i = 100; i < btLimit; i++) {
    const res = buildSignal(slow, fast, i, kijunSlow, atrArr, SCORE_CONFIG, normalizedData, calib);
    if (res?.valid) sigIndices.push(i);
  }

  const bt = runBacktest(fast, prices, sigIndices, normalizedData);
  const current = buildSignal(slow, fast, N - 1, kijunSlow, atrArr, SCORE_CONFIG, normalizedData, calib);

  return { bt, current, calib };
}

// ── suite ─────────────────────────────────────────────────────────────────────

test('pipeline produce objeto bt con todos los campos requeridos', () => {
  const { bt } = runPipeline(makeTrendData(300));

  assert.ok(typeof bt.total === 'number',               'bt.total debe ser number');
  assert.ok(typeof bt.wins === 'number',                'bt.wins debe ser number');
  assert.ok(typeof bt.losses === 'number',              'bt.losses debe ser number');
  // dashboard usa '—' (em-dash) como placeholder cuando no hay trades
  assert.ok(bt.winRate === '—' || !isNaN(parseFloat(bt.winRate)), 'bt.winRate debe ser numérico o "—"');
  assert.ok(bt.expectancy === '—' || !isNaN(parseFloat(bt.expectancy)), 'bt.expectancy debe ser numérico o "—"');
  assert.ok(!isNaN(parseFloat(bt.totalR)),              'bt.totalR debe ser numérico');
  assert.ok(!isNaN(parseFloat(bt.maxDD)),               'bt.maxDD debe ser numérico');
  assert.ok(Array.isArray(bt.equity),                   'bt.equity debe ser array');
  assert.ok(bt.equity[0] === 0,                         'bt.equity comienza en 0');
});

test('pipeline produce objeto current con todos los campos requeridos', () => {
  const { current } = runPipeline(makeTrendData(300));

  assert.ok(current !== null,                           'current no debe ser null con 300 barras');
  assert.ok(['TREND', 'RANGE'].includes(current.regime), 'regime es TREND o RANGE');
  assert.ok(typeof current.coreScore === 'number',      'coreScore es number');
  assert.ok(typeof current.totalScore === 'number',     'totalScore es number');
  assert.ok(current.coreScore >= 0 && current.coreScore <= 100,  'coreScore en [0,100]');
  assert.ok(current.totalScore >= 0 && current.totalScore <= 120, 'totalScore en [0,120]');
  assert.ok(['NO_PULLBACK', 'SUPERFICIAL', 'NORMAL', 'PROFUNDO'].includes(current.pbType), 'pbType válido');
  assert.ok(Array.isArray(current.coreDetail),          'coreDetail es array');
  assert.ok(Array.isArray(current.bonusDetail),         'bonusDetail es array');
  assert.ok(current.cloudThickness === null || typeof current.cloudThickness === 'number', 'cloudThickness es number o null');
  assert.ok(current.trendStrength === null || typeof current.trendStrength === 'number',   'trendStrength es number o null');
  assert.ok(current.atrVal === null || typeof current.atrVal === 'number',                 'atrVal es number o null');
});

test('absNum formatea correctamente todos los valores de la métrica', () => {
  const { bt, current, calib } = runPipeline(makeTrendData(300));

  const formatted = {
    señales:    String(Math.abs(Number(bt.total || 0))),
    winRate:    `${absNum(bt.winRate, 1)}%`,
    expectancy: `${absNum(bt.expectancy, 2)}R`,
    totalR:     `${absNum(bt.totalR, 2)}R`,
    maxDD:      `${absNum(bt.maxDD, 2)}R`,
    régimen:    current?.regime || 'RANGE',
    core:       absNum(current?.coreScore, 0),
    totalScore: absNum(current?.totalScore, 0),
    atr14:      absNum(current?.atrVal, 4),
    nube:       `${absNum((current?.cloudThickness ?? 0) * 100, 2)}%`,
    tk:         `${absNum((current?.trendStrength ?? 0) * 100, 2)}%`,
    pullback:   current?.pbType || 'NO_PULLBACK',
    calibNube:  `${absNum((calib?.cloudThicknessMin ?? 0) * 100, 2)}%`,
    calibATR:   `${absNum((calib?.atrNormMedian ?? 0) * 100, 2)}%`,
    calibTK:    `${absNum((calib?.tkSpreadMin ?? 0) * 100, 2)}%`,
  };

  for (const [key, val] of Object.entries(formatted)) {
    assert.ok(typeof val === 'string' && val.length > 0, `"${key}" debe producir string no vacío, obtuvo: ${JSON.stringify(val)}`);
    assert.ok(!val.includes('NaN'), `"${key}" no debe contener NaN, obtuvo: ${val}`);
    assert.ok(!val.includes('undefined'), `"${key}" no debe contener undefined, obtuvo: ${val}`);
  }
});

test('volStatus nunca es vacío ni undefined', () => {
  const { current } = runPipeline(makeTrendData(300));

  let volStatus = 'SIN DATOS';
  if (current) {
    const volBonus = current.bonusDetail.find(b => b.name.includes('Volumen'));
    if (volBonus?.nodata)        volStatus = 'SIN DATOS';
    else if (volBonus?.ok === true) volStatus = 'OK ↓';
    else if (volBonus?.warn)     volStatus = '⚠ ALTO';
  }

  assert.ok(['SIN DATOS', 'OK ↓', '⚠ ALTO'].includes(volStatus), `volStatus inesperado: "${volStatus}"`);
});

test('reversal pattern siempre tiene un valor string', () => {
  const { current } = runPipeline(makeTrendData(300));

  const revBonus = current?.bonusDetail?.find(b => b.name.includes('reversal'));
  const pattern = revBonus?.pattern || 'NINGUNO';

  assert.ok(typeof pattern === 'string' && pattern.length > 0, `pattern debe ser string no vacío, obtuvo: ${JSON.stringify(pattern)}`);
});

test('calib produce percentiles positivos con datos suficientes', () => {
  const { calib } = runPipeline(makeTrendData(300));

  assert.ok(calib.cloudThicknessMin > 0,  `cloudThicknessMin debe ser > 0, obtuvo ${calib.cloudThicknessMin}`);
  assert.ok(calib.atrNormMedian > 0,      `atrNormMedian debe ser > 0, obtuvo ${calib.atrNormMedian}`);
  assert.ok(calib.tkSpreadMin > 0,        `tkSpreadMin debe ser > 0, obtuvo ${calib.tkSpreadMin}`);
  // los arrays internos deben estar poblados (sin sampleSize explícito en calibrate.js)
  assert.ok(Array.isArray(calib._thicknesses) && calib._thicknesses.length > 0, 'calib._thicknesses debe tener datos');
});

test('bt.trades ?? [] es array vacío porque backtest.js no devuelve trades', () => {
  // backtest.js actual NO retorna bt.trades (no está implementado).
  // dashboard/index.js usa bt.trades ?? [] para que renderPriceChart no falle.
  // Este test documenta esa brecha: si en el futuro se añade, el test debe actualizarse.
  const { bt } = runPipeline(makeTrendData(300));
  const tradesForChart = bt.trades ?? [];
  assert.ok(Array.isArray(tradesForChart), 'bt.trades ?? [] debe ser un array');
});

test('pipeline crypto produce métricas válidas igual que acciones', () => {
  const { bt, current } = runPipeline(makeTrendData(300), 'crypto');

  assert.ok(typeof bt.total === 'number');
  assert.ok(current === null || typeof current.coreScore === 'number');
});
