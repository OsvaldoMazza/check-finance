import test from 'node:test';
import assert from 'node:assert/strict';

import chikouClear, { pullbackType } from '../src/calculate/signals.js';

test('chikouClear devuelve true cuando close actual supera high en i-disp', () => {
  const data = [
    { high: 100, close: 99 },
    { high: 101, close: 100 },
    { high: 102, close: 101 },
    { high: 103, close: 104 }
  ];

  const ok = chikouClear(data, 3, 3);
  assert.equal(ok, true);
});

test('chikouClear devuelve false cuando no supera high en i-disp', () => {
  const data = [
    { high: 110, close: 100 },
    { high: 111, close: 101 },
    { high: 112, close: 102 },
    { high: 113, close: 109 }
  ];

  const ok = chikouClear(data, 3, 3);
  assert.equal(ok, false);
});

test('pullbackType clasifica NO_PULLBACK, SUPERFICIAL, NORMAL, PROFUNDO con ATR', () => {
  assert.equal(pullbackType({ kijun: 100, low: 101 }, 10), 'NO_PULLBACK');
  assert.equal(pullbackType({ kijun: 100, low: 96 }, 10), 'SUPERFICIAL');
  assert.equal(pullbackType({ kijun: 100, low: 92 }, 10), 'NORMAL');
  assert.equal(pullbackType({ kijun: 100, low: 80 }, 10), 'PROFUNDO');
});
