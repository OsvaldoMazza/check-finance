import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMarketData } from '../src/calculate/inputAdapter.js';

test('normalizeMarketData normaliza objetos con claves en espanol y numeros con coma', () => {
  const input = [
    {
      Fecha: '2026-04-17',
      Apertura: '1.200,50',
      'Máximo': '1.250,75',
      'Mínimo': '1.180,25',
      'Último': '1.230,40',
      'Vol.': '10.500'
    }
  ];

  const out = normalizeMarketData(input);

  assert.equal(out.length, 1);
  assert.equal(out[0].date, '2026-04-17');
  assert.equal(out[0].open, 1200.5);
  assert.equal(out[0].high, 1250.75);
  assert.equal(out[0].low, 1180.25);
  assert.equal(out[0].close, 1230.4);
  assert.equal(out[0].volume, 10.5);
});

test('normalizeMarketData invierte series descending por fecha', () => {
  const input = [
    { date: '2026-04-19', open: 10, high: 11, low: 9, close: 10.5 },
    { date: '2026-04-18', open: 9, high: 10, low: 8, close: 9.5 }
  ];

  const out = normalizeMarketData(input);

  assert.equal(out.length, 2);
  assert.equal(out[0].date, '2026-04-18');
  assert.equal(out[1].date, '2026-04-19');
});

test('normalizeMarketData soporta velas tipo CoinGecko [ts, o, h, l, c]', () => {
  const input = [
    [1713400000000, 100, 110, 95, 108]
  ];

  const out = normalizeMarketData(input);

  assert.equal(out.length, 1);
  assert.equal(out[0].open, 100);
  assert.equal(out[0].high, 110);
  assert.equal(out[0].low, 95);
  assert.equal(out[0].close, 108);
});
