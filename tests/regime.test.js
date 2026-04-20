import test from 'node:test';
import assert from 'node:assert/strict';

import { detectRegime } from '../src/calculate/regime.js';

test('detectRegime devuelve TREND con pendiente positiva y distancia suficiente', () => {
  const data = [
    { close: 100, kijun: 90 },
    { close: 110, kijun: 95 }
  ];
  const atr = [null, 2]; // atrNorm = 2/110 = 0.01818; 0.5*atrNorm=0.00909

  const regime = detectRegime(data, 1, atr, { atrNormMedian: 0.01 });
  assert.equal(regime, 'TREND');
});

test('detectRegime devuelve RANGE cuando falla slope o distancia', () => {
  const dataSlopeFail = [
    { close: 100, kijun: 95 },
    { close: 101, kijun: 94 }
  ];
  const r1 = detectRegime(dataSlopeFail, 1, [null, 1], { atrNormMedian: 0.01 });
  assert.equal(r1, 'RANGE');

  const dataDistanceFail = [
    { close: 100, kijun: 99.8 },
    { close: 100.05, kijun: 99.9 }
  ];
  const r2 = detectRegime(dataDistanceFail, 1, [null, 5], { atrNormMedian: 0.01 });
  assert.equal(r2, 'RANGE');
});
