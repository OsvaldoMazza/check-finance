// src/components/dashboard/index.js
// Renders the main dashboard: metrics grid, price chart, diagnostic panel

import { ichimokuOptimized, calcATR, runBacktest, buildSignal, calibrateParams } from '../../calculate/index.js';
import { renderPriceChart } from '../../render/charts.js';

export function renderDashboard(data, chartArea, diagnosticPanel) {
  if (!data || data.length === 0) {
    chartArea.innerHTML = '<div class="placeholder"><p style="color:#ff3c5a;">No hay datos para mostrar.</p></div>';
    return;
  }

  const slowP = [9, 26, 52];
  const fastP = [7, 22, 44];
  const atrPer = 14;
  const SCORE_CONFIG = { coreMin: 70, totalMin: 80 };

  const slow = ichimokuOptimized(JSON.parse(JSON.stringify(data)), ...slowP);
  const fast = ichimokuOptimized(JSON.parse(JSON.stringify(data)), ...fastP);
  const atrArr = calcATR(data, atrPer);
  const prices = data.map(d => d.close);
  const N = prices.length;
  const kijunSlow = slowP[1];

  // v9 — AUTO-CALIBRACIÓN
  const calib = calibrateParams(slow, atrArr, N);

  const btLimit = N - kijunSlow - 61;

  const sigIndices = [];
  for (let i = 100; i < btLimit; i++) {
    const res = buildSignal(slow, fast, i, kijunSlow, atrArr, SCORE_CONFIG, data, calib);
    if (res && res.valid) sigIndices.push(i);
  }

  const bt = runBacktest(slow, fast, prices, sigIndices, data);
  const lastIdx = N - 1;
  const current = buildSignal(slow, fast, lastIdx, kijunSlow, atrArr, SCORE_CONFIG, data, calib);

  renderMetrics(bt, current, atrPer, SCORE_CONFIG, calib);

  chartArea.innerHTML = '<canvas id="chartPrice" height="300"></canvas>';
  setTimeout(() => {
    const canvas = document.getElementById('chartPrice');
    if (canvas) renderPriceChart(canvas, data, slow, fast);
  }, 0);

  renderDiagnostic(current, SCORE_CONFIG, diagnosticPanel);
}

// ─── Metrics grid ────────────────────────────────────────────────────────────

function renderMetrics(bt, current, atrPer, scoreConfig, calib) {
  const metricsGrid = document.getElementById('metricsGrid');
  if (!metricsGrid) return;

  const wr  = parseFloat(bt.winRate);
  const ex  = parseFloat(bt.expectancy);
  const mdd = parseFloat(bt.maxDD);
  const tr  = parseFloat(bt.totalR);
  const atrCurrent = current?.atrVal ? current.atrVal.toFixed(4) : '—';

  const cloudPctDisplay = current?.cloudThickness != null
    ? (current.cloudThickness * 100).toFixed(2) + '%'
    : '—';
  const calibMin = current?.cloudThicknessMin ?? calib.cloudThicknessMin;
  const cloudOk  = current?.cloudThickness != null && current.cloudThickness > calibMin;

  const calibAtrPct   = (calib.atrNormMedian    * 100).toFixed(2) + '%';
  const calibCloudPct = (calib.cloudThicknessMin * 100).toFixed(2) + '%';
  const calibTkPct    = (calib.tkSpreadMin       * 100).toFixed(2) + '%';

  const revBonus = current?.bonusDetail?.find(b => b.name.includes('reversal'));
  const pattern  = revBonus?.pattern || '—';

  let volStatus = '—';
  if (current) {
    const volBonus = current.bonusDetail.find(b => b.name.includes('Volumen'));
    if (volBonus?.nodata)       volStatus = 'SIN DATOS';
    else if (volBonus?.ok === true)  volStatus = 'OK ↓';
    else if (volBonus?.ok === false) volStatus = 'ALTO ↑';
  }

  const isActive  = current && current.valid;
  const signalBox = `
    <div class="signal-box ${isActive ? 'ON' : 'OFF'}">
      ${isActive ? '🟢 &nbsp;TRADE ON' : '🔴 &nbsp;TRADE OFF'}
    </div>
  `;

  metricsGrid.innerHTML = signalBox + `
    <div class="metric-card">
      <div class="metric-label">Señales históricas</div>
      <div class="metric-value accent">${bt.total}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Win Rate</div>
      <div class="metric-value ${wr >= 50 ? 'good' : 'bad'}">${bt.winRate}%</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Expectancy</div>
      <div class="metric-value ${ex > 0 ? 'good' : 'bad'}">${bt.expectancy} R</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Total acumulado</div>
      <div class="metric-value ${tr > 0 ? 'good' : 'bad'}">${bt.totalR} R</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Max Drawdown</div>
      <div class="metric-value ${mdd < 3 ? 'good' : mdd < 6 ? 'neutral' : 'bad'}">${bt.maxDD} R</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Régimen actual</div>
      <div class="metric-value ${current?.regime === 'TREND' ? 'good' : 'neutral'}">${current?.regime || '—'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Core score</div>
      <div class="metric-value ${(current?.coreScore || 0) >= scoreConfig.coreMin ? 'good' : 'bad'}">${current?.coreScore ?? '—'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Total score</div>
      <div class="metric-value ${(current?.totalScore || 0) >= scoreConfig.totalMin ? 'good' : 'neutral'}">${current?.totalScore ?? '—'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">ATR(${atrPer}) actual</div>
      <div class="metric-value accent" style="font-size:20px">${atrCurrent}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Espesor nube</div>
      <div class="metric-value ${cloudOk ? 'good' : 'bad'}" style="font-size:20px">${cloudPctDisplay}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Pullback (ATR)</div>
      <div class="metric-value ${current?.pbType === 'SUPERFICIAL' ? 'good' : current?.pbType === 'NORMAL' ? 'neutral' : 'bad'}" style="font-size:16px">${current?.pbType || '—'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Patrón reversal</div>
      <div class="metric-value purple" style="font-size:16px">${pattern}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Volumen pullback</div>
      <div class="metric-value ${volStatus === 'OK ↓' ? 'good' : volStatus === 'ALTO ↑' ? 'bad' : 'neutral'}" style="font-size:20px">${volStatus}</div>
    </div>
    <div class="metric-card" style="border-color:rgba(0,212,255,0.3)">
      <div class="metric-label" style="color:var(--accent)">Auto-calibración (p35/p40/p50)</div>
      <div style="font-size:11px;line-height:1.8;margin-top:4px;font-family:var(--mono);color:var(--text)">
        Nube mín: <span style="color:var(--accent)">${calibCloudPct}</span><br>
        ATR med:  <span style="color:var(--accent)">${calibAtrPct}</span><br>
        TK spread mín: <span style="color:var(--accent)">${calibTkPct}</span>
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
    if (d.penalty) {
      return `
        <div class="cond-row">
          <span class="cond-name">${d.name}</span>
          <span class="cond-fail">⊖ ${d.pts}</span>
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
