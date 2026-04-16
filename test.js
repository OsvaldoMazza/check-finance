// test.js - Script de prueba para verificar funciones principales
import { ichimokuOptimized } from './src/calculate/ichimoku.js';
import { calcATR } from './src/calculate/atr.js';

// Datos de prueba
const testData = [
  { open: 100, high: 105, low: 98, close: 103 },
  { open: 103, high: 107, low: 102, close: 106 },
  { open: 106, high: 110, low: 105, close: 108 },
  { open: 108, high: 112, low: 107, close: 111 },
  { open: 111, high: 115, low: 110, close: 113 },
  { open: 113, high: 117, low: 112, close: 115 },
  { open: 115, high: 119, low: 114, close: 117 },
  { open: 117, high: 121, low: 116, close: 119 },
  { open: 119, high: 123, low: 118, close: 121 },
  { open: 121, high: 125, low: 120, close: 123 },
];

console.log('🧪 Test: Ichimoku');
const result = ichimokuOptimized(JSON.parse(JSON.stringify(testData)), 3, 5, 7);
console.log('Última barra:', result[result.length - 1]);

console.log('\n🧪 Test: ATR');
const atr = calcATR(testData, 5);
console.log('ATR últimas 3 barras:', atr.slice(-3));

console.log('\n✅ Tests completados');
