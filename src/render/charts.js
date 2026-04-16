// src/render/charts.js
// Funciones para renderizar gráficos con Chart.js

export function renderPriceChart(canvas, data, slow, fast) {
  const labels = data.map(d => d.date || '');
  const prices = data.map(d => d.close);
  const tenkan = slow.map(d => d.tenkan ?? null);
  const kijun = slow.map(d => d.kijun ?? null);
  const senkouA = slow.map(d => d.senkouA ?? null);
  const senkouB = slow.map(d => d.senkouB ?? null);

  return new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Precio', data: prices, borderColor: '#00d4ff', borderWidth: 2, pointRadius: 0 },
        { label: 'Tenkan', data: tenkan, borderColor: '#ffcc00', borderWidth: 1, pointRadius: 0 },
        { label: 'Kijun', data: kijun, borderColor: '#00ff88', borderWidth: 1, pointRadius: 0 },
        { label: 'Senkou A', data: senkouA, borderColor: '#00ff88', borderDash: [5,5], borderWidth: 1, pointRadius: 0 },
        { label: 'Senkou B', data: senkouB, borderColor: '#ff3c5a', borderDash: [5,5], borderWidth: 1, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#b8c8d8' } } },
      scales: {
        x: { ticks: { color: '#3a4858' } },
        y: { ticks: { color: '#3a4858' } }
      }
    }
  });
}

export function renderEquityChart(canvas, equityArr) {
  const labels = equityArr.map((_, i) => i === 0 ? 'Start' : `T${i}`);
  return new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Equity (R)', data: equityArr, borderColor: '#00ff88', borderWidth: 2, pointRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#b8c8d8' } } },
      scales: {
        x: { ticks: { color: '#3a4858' } },
        y: { ticks: { color: '#3a4858' } }
      }
    }
  });
}
