// src/calculate/ichimoku.js
// Funciones para cálculo de Ichimoku optimizado

class MonotonicQueue {
  constructor(comparator) {
    this.queue = [];
    this.comparator = comparator;
  }
  push(idx, getValue) {
    const val = getValue(idx);
    while (this.queue.length && this.comparator(val, getValue(this.queue[this.queue.length - 1]))) {
      this.queue.pop();
    }
    this.queue.push(idx);
  }
  pop(idx) {
    if (this.queue.length && this.queue[0] === idx) this.queue.shift();
  }
  max(getValue) {
    if (!this.queue.length) return null;
    return getValue(this.queue[0]);
  }
}

// Rolling max/min con deque monotono O(n)
function rollingMaxMin(high, low, period) {
  const n = high.length;
  const maxQueue = new MonotonicQueue((a, b) => a >= b);
  const minQueue = new MonotonicQueue((a, b) => a <= b);
  const resultHigh = new Array(n).fill(null);
  const resultLow = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    maxQueue.push(i, idx => high[idx]);
    minQueue.push(i, idx => low[idx]);

    if (i >= period) {
      maxQueue.pop(i - period);
      minQueue.pop(i - period);
    }

    if (i >= period - 1) {
      resultHigh[i] = maxQueue.max(idx => high[idx]);
      resultLow[i] = minQueue.max(idx => low[idx]);
    }
  }

  return { maxHigh: resultHigh, minLow: resultLow };
}

// Ichimoku optimizado
export function ichimokuOptimized(data, tenkanPer, kijunPer, senkouPer) {
  const N = data.length;
  const highs = data.map(x => x.high);
  const lows  = data.map(x => x.low);
  const tenkanHL = rollingMaxMin(highs, lows, tenkanPer);
  const kijunHL  = rollingMaxMin(highs, lows, kijunPer);
  const senkouHL = rollingMaxMin(highs, lows, senkouPer);
  const disp = kijunPer;
  for (let i = 0; i < N; i++) {
    if (i >= tenkanPer-1) {
      data[i].tenkan = (tenkanHL.maxHigh[i] + tenkanHL.minLow[i]) / 2;
    }
    if (i >= kijunPer-1) {
      data[i].kijun = (kijunHL.maxHigh[i] + kijunHL.minLow[i]) / 2;
    }
    if (i >= senkouPer-1 && i + disp < N) {
      data[i+disp].senkouB = (senkouHL.maxHigh[i] + senkouHL.minLow[i]) / 2;
    }
    if (data[i].tenkan !== undefined && data[i].kijun !== undefined && i+disp < N) {
      data[i+disp].senkouA = (data[i].tenkan + data[i].kijun) / 2;
    }
  }
  return data;
}
