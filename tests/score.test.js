import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateScore } from '../src/calculate/score.js';

test('calculateScore aplica trendStrong y bonus de volumen sin penalizacion', () => {
  const cond = {
    trend: true,
    trendStrong: true,
    cloud: true,
    bounce: true,
    chikou: true
  };

  const res = calculateScore(
    cond,
    'SUPERFICIAL',
    { pattern: 'HAMMER/PIN', ok: true },
    false,
    0.01,
    0.003
  );

  // Core: 25 + 25 + 20 + 15 + 15 = 100
  assert.equal(res.coreScore, 100);
  // Bonus: reversal +10, volumen alto sin penalizacion => 10
  assert.equal(res.bonusScore, 10);
  assert.equal(res.totalScore, 110);

  const vol = res.bonusDetail.find(x => x.name.includes('Volumen alto'));
  assert.equal(Boolean(vol?.warn), true);
  assert.equal(vol?.pts, 0);
});

test('calculateScore da +10 por volumen saludable y 0 con nodata', () => {
  const baseCond = {
    trend: true,
    trendStrong: false,
    cloud: false,
    bounce: false,
    chikou: false
  };

  const withVol = calculateScore(baseCond, 'NO_PULLBACK', { pattern: 'NINGUNO', ok: false }, true, 0.002, 0.003);
  assert.equal(withVol.bonusScore, 10);

  const noVol = calculateScore(baseCond, 'NO_PULLBACK', { pattern: 'NINGUNO', ok: false }, null, 0.002, 0.003);
  assert.equal(noVol.bonusScore, 0);
  const nodata = noVol.bonusDetail.find(x => x.nodata);
  assert.equal(Boolean(nodata), true);
});
