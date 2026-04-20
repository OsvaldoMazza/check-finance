// src/components/dashboard/index.js
// Renders the main dashboard: metrics grid, price chart, diagnostic panel

import { ichimokuOptimized, calcATR, runBacktest, buildSignal, calibrateParams, normalizeMarketData } from '../../calculate/index.js';
import { renderPriceChart } from '../../render/charts.js';

export function renderDashboard(data, chartArea, diagnosticPanel, options = {}) {
  const normalizedData = normalizeMarketData(data);
  if (!normalizedData || normalizedData.length === 0) {
    chartArea.innerHTML = '<div class="placeholder"><p style="color:#ff3c5a;">No hay datos para mostrar.</p></div>';
    return;
  }

  const assetType = options.assetType === 'crypto' ? 'crypto' : 'acciones';
  const slowP = assetType === 'crypto' ? [10, 30, 60] : [9, 26, 52];
  const fastP = assetType === 'crypto' ? [5, 15, 30] : [7, 22, 44];
  const atrPer = 14;
  const SCORE_CONFIG = assetType === 'crypto'
    ? { coreMin: 70, totalMin: 80 }
    : { coreMin: 70, totalMin: 75 };

  const slow = ichimokuOptimized(JSON.parse(JSON.stringify(normalizedData)), ...slowP);
  const fast = ichimokuOptimized(JSON.parse(JSON.stringify(normalizedData)), ...fastP);
  const atrArr = calcATR(normalizedData, atrPer);
  const prices = normalizedData.map(d => d.close);
  const N = prices.length;
  const kijunSlow = slowP[1];

  // v9 — AUTO-CALIBRACIÓN
  const calib = calibrateParams(slow, atrArr, N);

  const btLimit = N - kijunSlow - 61;

  const sigIndices = [];
  for (let i = 100; i < btLimit; i++) {
    const res = buildSignal(slow, fast, i, kijunSlow, atrArr, SCORE_CONFIG, normalizedData, calib);
    if (res && res.valid) sigIndices.push(i);
  }

  const bt = runBacktest(fast, prices, sigIndices, normalizedData);
  const lastIdx = N - 1;
  const current = buildSignal(slow, fast, lastIdx, kijunSlow, atrArr, SCORE_CONFIG, normalizedData, calib);

  renderMetrics(bt, current, atrPer, SCORE_CONFIG, calib);

  chartArea.innerHTML = '<canvas id="chartPrice" height="300"></canvas>';
  setTimeout(() => {
    const canvas = document.getElementById('chartPrice');
    if (canvas) renderPriceChart(canvas, normalizedData, slow, fast);
  }, 0);

  renderDiagnostic(current, SCORE_CONFIG, diagnosticPanel);
}

// ─── Metrics grid ────────────────────────────────────────────────────────────

function renderMetrics(bt, current, atrPer, scoreConfig, calib) {
  const metricsGrid = document.getElementById('metricsGrid');
  if (!metricsGrid) return;

  const absNum = (value, decimals = 2) => {
    const n = Number(value);
    if (Number.isNaN(n)) return '0';
    return Math.abs(n).toFixed(decimals);
  };

  const totalSignals = Math.abs(Number(bt?.total || 0));
  const winRateAbs = absNum(bt?.winRate, 1);
  const expectancyAbs = absNum(bt?.expectancy, 2);
  const totalRAbs = absNum(bt?.totalR, 2);
  const maxDDAbs = absNum(bt?.maxDD, 2);
  const coreAbs = absNum(current?.coreScore, 0);
  const totalScoreAbs = absNum(current?.totalScore, 0);
  const atrAbs = absNum(current?.atrVal, 4);
  const cloudAbs = absNum((current?.cloudThickness ?? 0) * 100, 2);
  const tkAbs = absNum((current?.trendStrength ?? 0) * 100, 2);
  const pbAbs = current?.pbType || 'NO_PULLBACK';
  const regimeAbs = current?.regime || 'RANGE';

  const calibAtrPct   = absNum((calib?.atrNormMedian ?? 0) * 100, 2);
  const calibCloudPct = absNum((calib?.cloudThicknessMin ?? 0) * 100, 2);
  const calibTkPct    = absNum((calib?.tkSpreadMin ?? 0) * 100, 2);

  const revBonus = current?.bonusDetail?.find(b => b.name.includes('reversal'));
  const pattern  = revBonus?.pattern || 'NINGUNO';

  let volStatus = 'SIN DATOS';
  if (current) {
    const volBonus = current.bonusDetail.find(b => b.name.includes('Volumen'));
    if (volBonus?.nodata)       volStatus = 'SIN DATOS';
    else if (volBonus?.ok === true)  volStatus = 'OK ↓';
    else if (volBonus?.warn) volStatus = '⚠ ALTO';
  }

  const isActive  = current && current.valid;
  const signalBox = `
    <div class="signal-box ${isActive ? 'ON' : 'OFF'}" style="font-size:34px;padding:14px 22px;letter-spacing:4px;margin-bottom:12px;">
      ${isActive ? '🟢 &nbsp;TRADE ON' : '🔴 &nbsp;TRADE OFF'}
    </div>
  `;

  const absItems = [
    ['señales',    totalSignals],
    ['winRate',    `${winRateAbs}%`],
    ['expectancy', `${expectancyAbs}R`],
    ['totalR',     `${totalRAbs}R`],
    ['maxDD',      `${maxDDAbs}R`],
    ['régimen',    regimeAbs],
    ['core',       coreAbs],
    ['totalScore', totalScoreAbs],
    [`atr${atrPer}`, atrAbs],
    ['nube',       `${cloudAbs}%`],
    ['tk',         `${tkAbs}%`],
    ['pullback',   pbAbs],
    ['reversal',   pattern],
    ['volumen',    volStatus],
    ['calibNube',  `${calibCloudPct}%`],
    ['calibATR',   `${calibAtrPct}%`],
    ['calibTK',    `${calibTkPct}%`],
  ];

  const colSize = Math.ceil(absItems.length / 3);
  const cols = [absItems.slice(0, colSize), absItems.slice(colSize, colSize * 2), absItems.slice(colSize * 2)];

  const renderCol = (items) => items.map(([k, v]) => `
    <div class="abs-row">
      <span class="abs-key">${k}</span>
      <span class="abs-val">${v}</span>
    </div>
  `).join('');

  metricsGrid.innerHTML = signalBox + `
    <div class="abs-panel">
      <div class="metric-label">Valores absolutos (sin condicionales)</div>
      <div class="abs-grid">
        <div class="abs-col">${renderCol(cols[0])}</div>
        <div class="abs-col">${renderCol(cols[1])}</div>
        <div class="abs-col">${renderCol(cols[2])}</div>
      </div>
    </div>
  `;
}

// ─── Diagnostic panel ────────────────────────────────────────────────────────

function renderDiagnostic(current, scoreConfig, diagnosticPanel) {
  if (!diagnosticPanel) return;

  if (!current) {
    diagnosticPanel.style.display = 'none';
    return;
  }

  diagnosticPanel.style.display = 'block';

  const regimeRowHTML = `
    <div class="cond-row">
      <span class="cond-name">Régimen — slope Kijun & distancia > 0.5×ATR</span>
      <span class="${current.regime === 'TREND' ? 'cond-ok' : 'cond-fail'}">
        ${current.regime === 'TREND' ? '✔ TREND' : '✗ RANGE'}
      </span>
    </div>
  `;

  const coreRowsHTML = current.coreDetail.map(d => `
    <div class="cond-row">
      <span class="cond-name">${d.name}</span>
      <span class="${d.ok ? 'cond-ok' : 'cond-fail'}">
        ${d.ok ? `✔ +${d.pts}` : `✗ +0 / ${d.max}`}
      </span>
    </div>
  `).join('');

  const bonusRowsHTML = current.bonusDetail.map(d => {
    if (d.nodata) {
      return `
        <div class="cond-row">
          <span class="cond-name">${d.name}</span>
          <span class="cond-nodata">— sin datos</span>
        </div>
      `;
    }
    if (d.warn) {
      return `
        <div class="cond-row">
          <span class="cond-name">${d.name}</span>
          <span class="cond-bonus-fail" style="color:var(--yellow)">⚠ revisar</span>
        </div>
      `;
    }
    return `
      <div class="cond-row">
        <span class="cond-name">${d.name}</span>
        <span class="${d.ok ? 'cond-bonus-ok' : 'cond-bonus-fail'}">
          ${d.ok ? `⊕ +${d.pts}` : `○ +0 / ${d.max}`}
        </span>
      </div>
    `;
  }).join('');

  const corePct   = current.coreScore;
  const coreColor = corePct >= scoreConfig.coreMin ? '#00ff88' : corePct >= 50 ? '#ffcc00' : '#ff3c5a';
  const coreClass = corePct >= scoreConfig.coreMin ? 'good'    : corePct >= 50 ? 'neutral' : 'bad';

  const totPct   = current.totalScore;
  const totColor = totPct >= scoreConfig.totalMin ? '#00ff88' : totPct >= 55 ? '#ffcc00' : '#ff3c5a';
  const totClass = totPct >= scoreConfig.totalMin ? 'good'    : totPct >= 55 ? 'neutral' : 'bad';
  const totWidth = Math.min(Math.max(totPct, 0) / 120 * 100, 100);

  diagnosticPanel.innerHTML = `
    <div class="panel-title">Diagnóstico — última barra</div>
    <div class="section-label">◆ Condiciones core (max 100 pts)</div>
    ${regimeRowHTML}
    ${coreRowsHTML}
    <div class="section-label" style="margin-top:14px">⊕ Confirmaciones adicionales (bonus, max +20 pts)</div>
    ${bonusRowsHTML}
    <div class="score-section">
      <div class="score-row">
        <span class="score-label">Core score</span>
        <div class="score-track">
          <div class="score-fill" style="width:${Math.min(corePct, 100)}%;background:${coreColor}"></div>
        </div>
        <span class="score-num ${coreClass}">${corePct}/100</span>
      </div>
      <div class="score-row">
        <span class="score-label">Total (core + bonus)</span>
        <div class="score-track">
          <div class="score-fill" style="width:${totWidth}%;background:${totColor}"></div>
        </div>
        <span class="score-num ${totClass}">${totPct}/120</span>
      </div>
      <div class="fix-note">
        Umbrales: core ≥ ${scoreConfig.coreMin}/100 && total ≥ ${scoreConfig.totalMin}/120 && régimen=TREND
      </div>
    </div>
  `;
}
