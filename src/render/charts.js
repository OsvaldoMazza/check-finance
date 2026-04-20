// src/render/charts.js
// Funciones para renderizar gráficos con Chart.js

let _equityChart = null;
let _volumeChart = null;

export function renderPriceChart(canvas, data, slow, fast, trades = []) {
  const n = data.length;
  const labels   = data.map(d => d.date || '');
  const prices   = data.map(d => d.close);
  const tenkan   = slow.map(d => d.tenkan   ?? null);
  const kijun    = slow.map(d => d.kijun    ?? null);
  const senkouA  = slow.map(d => d.senkouA  ?? null);
  const senkouB  = slow.map(d => d.senkouB  ?? null);
  const kijunPer = slow.findIndex(d => d.kijun !== undefined);
  const displacement = kijunPer > 0 ? kijunPer : 26;
  const chikou = new Array(n).fill(null);
  for (let i = 0; i + displacement < n; i++) chikou[i] = prices[i + displacement];

  const entries = new Array(n).fill(null);
  const exits   = new Array(n).fill(null);
  for (const trade of trades) {
    if (trade.entryIndex < n) entries[trade.entryIndex] = trade.entry;
    if (trade.exitIndex  < n) exits[trade.exitIndex]   = trade.exitPrice;
  }

  return new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Senkou A', data: senkouA, borderColor: 'rgba(0,255,136,0.55)', borderWidth: 1, pointRadius: 0, tension: 0, fill: '+1', backgroundColor: 'rgba(0,255,136,0.07)', order: 6 },
        { label: 'Senkou B', data: senkouB, borderColor: 'rgba(255,60,90,0.55)',  borderWidth: 1, pointRadius: 0, tension: 0, fill: false, order: 6 },
        { label: 'Kijun',    data: kijun,   borderColor: 'rgba(0,180,255,0.85)',  borderWidth: 1.5, pointRadius: 0, tension: 0, order: 4 },
        { label: 'Tenkan',   data: tenkan,  borderColor: 'rgba(255,200,0,0.75)',  borderWidth: 1, pointRadius: 0, tension: 0, order: 4 },
        { label: 'Chikou',   data: chikou,  borderColor: 'rgba(176,96,255,0.55)', borderWidth: 1, pointRadius: 0, tension: 0, order: 4 },
        { label: 'Precio',   data: prices,  borderColor: '#d0dce8', borderWidth: 2, pointRadius: 0, tension: 0, order: 2 },
        { label: 'Entrada ejecutada', data: entries, borderColor: '#00ff88', backgroundColor: '#00ff88', pointRadius: 7, pointStyle: 'triangle', showLine: false, order: 1 },
        { label: 'Salida',            data: exits,   borderColor: '#ff3c5a', backgroundColor: '#ff3c5a', pointRadius: 6, pointStyle: 'rectRot',  showLine: false, order: 1 },
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#3a4858', font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          backgroundColor: '#0c111a', borderColor: '#1a2030', borderWidth: 1,
          titleColor: '#00d4ff', bodyColor: '#b8c8d8',
          callbacks: { label: ctx => ctx.parsed.y === null ? null : ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}` }
        }
      },
      scales: {
        x: { ticks: { color: '#3a4858', maxTicksLimit: 14, maxRotation: 0 }, grid: { color: 'rgba(26,32,48,0.8)' } },
        y: { ticks: { color: '#3a4858' }, grid: { color: 'rgba(26,32,48,0.8)' } }
      }
    }
  });
}

export function renderEquityChart(canvas, equityArr) {
  if (_equityChart) { _equityChart.destroy(); _equityChart = null; }
  const labels = equityArr.map((_, i) => i === 0 ? 'Start' : `T${i}`);
  const lastVal = equityArr.at(-1) ?? 0;
  _equityChart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Equity (R)',
        data: equityArr,
        borderColor: lastVal >= 0 ? '#00ff88' : '#ff3c5a',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: equityArr.map(v => v >= 0 ? '#00ff88' : '#ff3c5a'),
        tension: 0.3,
        fill: { target: { value: 0 }, above: 'rgba(0,255,136,0.07)', below: 'rgba(255,60,90,0.07)' }
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 250 },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#3a4858', maxTicksLimit: 12 }, grid: { color: 'rgba(26,32,48,0.8)' } },
        y: { ticks: { color: '#3a4858', callback: v => `${v}R` }, grid: { color: 'rgba(26,32,48,0.8)' } }
      }
    }
  });
  return _equityChart;
}

export function renderVolumeChart(canvas, data) {
  if (_volumeChart) { _volumeChart.destroy(); _volumeChart = null; }
  const n = data.length;
  const labels  = data.map((bar, i) => bar.date || i);
  const volumes = data.map(bar => isNaN(bar.volume) ? null : bar.volume);

  // MA20
  const ma20 = new Array(n).fill(null);
  for (let i = 19; i < n; i++) {
    let sum = 0, count = 0;
    for (let j = i - 19; j <= i; j++) {
      if (!isNaN(data[j]?.volume)) { sum += data[j].volume; count++; }
    }
    if (count > 0) ma20[i] = sum / count;
  }

  const barColors = volumes.map((v, i) => {
    if (v === null || ma20[i] === null) return 'rgba(58,72,88,0.5)';
    if (v < ma20[i] * 0.8)  return 'rgba(0,255,136,0.55)';
    if (v > ma20[i] * 1.2)  return 'rgba(255,60,90,0.65)';
    return 'rgba(58,72,88,0.65)';
  });

  _volumeChart = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Volumen', data: volumes, backgroundColor: barColors, borderWidth: 0, order: 2 },
        { label: 'Media 20', data: ma20, borderColor: 'rgba(0,212,255,0.6)', borderWidth: 1.5, pointRadius: 0, type: 'line', tension: 0, fill: false, order: 1 }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 250 },
      plugins: { legend: { labels: { color: '#3a4858', font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#3a4858', maxTicksLimit: 14, maxRotation: 0 }, grid: { color: 'rgba(26,32,48,0.6)' } },
        y: { ticks: { color: '#3a4858' }, grid: { color: 'rgba(26,32,48,0.6)' } }
      }
    }
  });
  return _volumeChart;
}
