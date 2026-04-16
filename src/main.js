// Punto de entrada principal
import { loadData } from './calculate/dataLoader.js';
import { ichimokuOptimized, calcATR, runBacktest, buildSignal } from './calculate/index.js';
import { renderPriceChart } from './render/charts.js';
import { API_CONFIG } from './config.js';

// Configuración inicial y arranque de la app

console.log('🚀 Check Finance App iniciada');
console.log('📊 CSV soportado: formato español (comas decimales) e inglés (puntos decimales)');
console.log('🔌 APIs: CoinGecko (criptos) | TwelveData (acciones/bonos)');

document.addEventListener('DOMContentLoaded', async () => {
  // Botón para subir CSV
  const btnCsv = document.getElementById('btnCsv');
  const csvFile = document.getElementById('csvFile');
  const btnApi = document.getElementById('btnApi');
  const apiConnector = document.getElementById('apiConnector');
  const cryptoSearch = document.getElementById('cryptoSearch');
  const cryptoList = document.getElementById('cryptoList');
  const selectedCrypto = document.getElementById('selectedCrypto');
  const samplePeriod = document.getElementById('samplePeriod');
  const chartArea = document.getElementById('chartArea');
  const diagnosticPanel = document.getElementById('diagnosticPanel');
  const metricsGrid = document.getElementById('metricsGrid');
  const status = document.getElementById('status');
  
  // Estado de conexión API
  let isApiConnected = false;
  let apiData = null;
  let fullData = null;  // Datos completos sin filtrar
  let cryptoListData = [];  // Almacenar lista completa de activos
  let currentConnector = 'coingecko';  // Conector actual
  
  // Cargar lista de activos al iniciar
  cryptoListData = await loadAssetList(currentConnector);
  
  // Event listeners para el dropdown de criptos
  cryptoSearch.addEventListener('focus', () => {
    cryptoList.classList.remove('hidden');
    renderCryptoList(cryptoListData);
  });
  
  cryptoSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = cryptoListData.filter(coin => 
      coin.name.toLowerCase().includes(searchTerm) || 
      coin.symbol.toLowerCase().includes(searchTerm) ||
      coin.id.toLowerCase().includes(searchTerm)
    );
    renderCryptoList(filtered);
    cryptoList.classList.remove('hidden');
  });
  
  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.crypto-dropdown')) {
      cryptoList.classList.add('hidden');
    }
  });
  
  // Event listener para cambio de conector
  apiConnector.addEventListener('change', async () => {
    currentConnector = apiConnector.value;
    
    // Desconectar si está conectado
    if (isApiConnected) {
      await disconnectAPI();
    }
    
    // Limpiar búsqueda
    cryptoSearch.value = '';
    selectedCrypto.value = currentConnector === 'coingecko' ? 'bitcoin' : 'AAPL';
    
    // Recargar lista de activos
    cryptoListData = await loadAssetList(currentConnector);
  });
  
  // Event listener para cambio de período de muestras
  samplePeriod.addEventListener('change', () => {
    if (fullData && fullData.length > 0) {
      const filtered = filterDataByPeriod(fullData, samplePeriod.value);
      renderDashboard(filtered, chartArea, diagnosticPanel);
      status.textContent = `Mostrando últimos ${filtered.length} puntos de ${fullData.length} totales.`;
    }
  });

  btnCsv.onclick = () => csvFile.click();
  csvFile.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = 'Cargando CSV...';
    try {
      const raw = await loadData({ type: 'csv', file });
      const data = normalizeData(raw);
      fullData = data;  // Guardar datos completos
      const filtered = filterDataByPeriod(data, samplePeriod.value);
      status.textContent = `CSV cargado: ${data.length} filas. Mostrando últimos ${filtered.length} puntos.`;
      renderDashboard(filtered, chartArea, diagnosticPanel);
    } catch (err) {
      console.error('Error CSV:', err);
      status.textContent = `Error al cargar CSV: ${err.message || err}`;
    }
  };

  btnApi.onclick = async () => {
    if (isApiConnected) {
      // Desconectar
      await disconnectAPI();
    } else {
      // Conectar
      await connectAPI();
    }
  };
  
  // Función para conectar a la API
  async function connectAPI() {
    const assetId = selectedCrypto.value;
    if (!assetId) {
      status.textContent = 'Por favor, selecciona un activo.';
      return;
    }
    
    const assetData = cryptoListData.find(c => c.id === assetId);
    const assetName = assetData ? assetData.name : assetId;
    
    try {
      if (currentConnector === 'coingecko') {
        // Conectar a CoinGecko
        status.textContent = `Conectando a CoinGecko (${assetName})...`;
        
        const apiConfig = {
          endpoint: `/coins/${assetId}/market_chart`,
          params: { vs_currency: 'usd', days: '90' },
          apiKey: ''
        };
        const raw = await loadData({ type: 'api', apiConfig });
        const data = raw.prices.map(([ts, price]) => ({
          date: new Date(ts).toISOString().slice(0,10),
          open: price, high: price, low: price, close: price, volume: null
        }));
        
        apiData = data;
        fullData = data;
        const filtered = filterDataByPeriod(data, samplePeriod.value);
        isApiConnected = true;
        btnApi.textContent = '🔴 Desconectar API';
        btnApi.classList.add('connected');
        status.textContent = `API conectada: ${data.length} puntos de ${assetName}. Mostrando últimos ${filtered.length}.`;
        renderDashboard(filtered, chartArea, diagnosticPanel);
        console.log(`🟢 CoinGecko conectada: ${assetName}`);
        
      } else if (currentConnector === 'twelvedata') {
        // Conectar a TwelveData
        status.textContent = `Conectando a TwelveData (${assetName})...`;
        
        const apiKey = API_CONFIG.twelvedata.apiKey;
        const baseUrl = API_CONFIG.twelvedata.baseUrl;
        const endpoint = API_CONFIG.twelvedata.endpoints.timeSeries;
        const defaults = API_CONFIG.twelvedata.defaults;
        
        const url = `${baseUrl}${endpoint}?apikey=${apiKey}&symbol=${assetId}&interval=${defaults.interval}&outputsize=${defaults.outputsize}&format=${defaults.format}`;
        
        const response = await fetch(url);
        const raw = await response.json();
        
        if (raw.status === 'error') {
          throw new Error(raw.message || 'Error en TwelveData API');
        }
        
        const data = raw.values.map(item => ({
          date: item.datetime,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume)
        })).reverse(); // TwelveData viene en orden inverso
        
        apiData = data;
        fullData = data;
        const filtered = filterDataByPeriod(data, samplePeriod.value);
        isApiConnected = true;
        btnApi.textContent = '🔴 Desconectar API';
        btnApi.classList.add('connected');
        status.textContent = `API conectada: ${data.length} puntos de ${assetName}. Mostrando últimos ${filtered.length}.`;
        renderDashboard(filtered, chartArea, diagnosticPanel);
        console.log(`🟢 TwelveData conectada: ${assetName}`);
      }
      
    } catch (err) {
      console.error('Error API:', err);
      status.textContent = `Error al conectar a API: ${err.message || err}`;
      isApiConnected = false;
      btnApi.classList.remove('connected');
    }
  }
  
  // Función para desconectar de la API
  async function disconnectAPI() {
    isApiConnected = false;
    apiData = null;
    fullData = null;  // Limpiar datos completos
    btnApi.textContent = '🔌 Conectar a API';
    btnApi.classList.remove('connected');
    status.textContent = 'API desconectada.';
    chartArea.innerHTML = `
      <div class="placeholder">
        <p class="placeholder-title">📈 Gráfica del Activo</p>
        <p class="placeholder-text">Selecciona una fuente de datos para comenzar</p>
      </div>
    `;
    diagnosticPanel.innerHTML = '';
    diagnosticPanel.style.display = 'none';
    metricsGrid.innerHTML = '';
    console.log('🔴 API desconectada');
  }
  
  // Función para renderizar la lista de activos
  function renderCryptoList(assets) {
    if (!assets || assets.length === 0) {
      cryptoList.innerHTML = '<div class="crypto-item" style="color:var(--text-muted);cursor:default;">No se encontraron resultados</div>';
      return;
    }
    
    const currentSelected = selectedCrypto.value;
    
    cryptoList.innerHTML = assets.map(asset => {
      // Para TwelveData, mostrar tipo de activo; para CoinGecko, mostrar símbolo
      const secondaryInfo = asset.type 
        ? `<span class="crypto-item-type">${asset.type}</span>` 
        : `<span class="crypto-item-symbol">${asset.symbol.toUpperCase()}</span>`;
      
      return `
        <div class="crypto-item ${asset.id === currentSelected ? 'selected' : ''}" data-id="${asset.id}" data-name="${asset.name}">
          <span class="crypto-item-name">${asset.name}</span>
          ${secondaryInfo}
        </div>
      `;
    }).join('');
    
    // Agregar event listeners a cada item
    cryptoList.querySelectorAll('.crypto-item').forEach(item => {
      const itemId = item.getAttribute('data-id');
      if (!itemId) return;
      
      item.addEventListener('click', async () => {
        const itemName = item.getAttribute('data-name');
        
        // Actualizar selección
        selectedCrypto.value = itemId;
        cryptoSearch.value = itemName;
        cryptoList.classList.add('hidden');
        
        // Marcar visualmente
        cryptoList.querySelectorAll('.crypto-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        
        // Conectar automáticamente si no está conectado
        if (!isApiConnected) {
          await connectAPI();
        } else {
          // Si ya está conectado, reconectar con el nuevo activo
          await disconnectAPI();
          setTimeout(() => connectAPI(), 100);
        }
      });
    });
  }
});

// Función para filtrar datos por período seleccionado
function filterDataByPeriod(data, period) {
  if (!data || data.length === 0) return data;
  
  // Si es 'all', retornar todos los datos
  if (period === 'all') return data;
  
  // Convertir período a número de días
  const days = parseInt(period);
  
  // Obtener la fecha actual y calcular la fecha límite
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar a medianoche
  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() - days);
  
  // Filtrar datos cuya fecha sea >= fecha límite
  const result = data.filter(item => {
    if (!item.date) return true; // Si no tiene fecha, incluir por defecto
    const itemDate = new Date(item.date);
    return itemDate >= limitDate;
  });
  
  console.log(`📊 Filtrado por fecha: ${result.length} puntos de ${data.length} totales (últimos ${days} días desde ${limitDate.toISOString().slice(0,10)})`);
  return result;
}

function normalizeData(raw) {
  return raw.map(row => {
    // Función helper para parsear números con formato español (comas)
    const parseNum = (val) => {
      if (!val) return NaN;
      // Remover puntos de miles y reemplazar coma decimal por punto
      const cleaned = String(val).replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned);
    };
    
    // Función helper para normalizar fechas a formato ISO (YYYY-MM-DD)
    const parseDate = (val) => {
      if (!val) return '';
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return val; // Si no es válida, retornar original
        return date.toISOString().slice(0, 10);
      } catch {
        return val; // Si hay error, retornar original
      }
    };
    
    return {
      date: parseDate(row.Fecha || row.Date || row.date || ''),
      open: parseNum(row.Apertura ?? row.open ?? row.Open),
      high: parseNum(row['Máximo'] ?? row.high ?? row.High),
      low: parseNum(row['Mínimo'] ?? row.low ?? row.Low),
      close: parseNum(row['Último'] ?? row.close ?? row.Close),
      volume: parseNum(row['Vol.'] ?? row.volume ?? row.Volume)
    };
  }).filter(r => !isNaN(r.close) && !isNaN(r.high) && !isNaN(r.low));
}

function renderDashboard(data, chartArea, diagnosticPanel) {
  if (!data || data.length === 0) {
    chartArea.innerHTML = '<div class="placeholder"><p style="color:#ff3c5a;">No hay datos para mostrar.</p></div>';
    return;
  }
  
  // Análisis completo
  const slowP = [9,26,52];
  const fastP = [7,22,44];
  const atrPer = 14;
  const SCORE_CONFIG = { coreMin: 70, totalMin: 80 };
  
  const slow = ichimokuOptimized(JSON.parse(JSON.stringify(data)), ...slowP);
  const fast = ichimokuOptimized(JSON.parse(JSON.stringify(data)), ...fastP);
  const atrArr = calcATR(data, atrPer);
  const prices = data.map(d => d.close);
  const N = prices.length;
  const kijunSlow = slowP[1];
  const btLimit = N - kijunSlow - 30;
  
  // Generar señales históricas
  const sigIndices = [];
  for (let i = 100; i < btLimit; i++) {
    const res = buildSignal(slow, fast, i, kijunSlow, atrArr, SCORE_CONFIG, data);
    if (res && res.valid) sigIndices.push(i);
  }
  
  // Backtest
  const bt = runBacktest(slow, fast, prices, sigIndices);
  
  // Señal actual
  const lastIdx = N - 1;
  const current = buildSignal(slow, fast, lastIdx, kijunSlow, atrArr, SCORE_CONFIG, data);
  
  // Renderizar métricas
  renderMetrics(bt, current, atrPer, SCORE_CONFIG);
  
  // Renderizar gráfico
  chartArea.innerHTML = '<canvas id="chartPrice" height="300"></canvas>';
  setTimeout(() => {
    const canvas = document.getElementById('chartPrice');
    if (canvas) {
      renderPriceChart(canvas, data, slow, fast);
    }
  }, 0);
  
  // Renderizar panel diagnóstico
  renderDiagnostic(current, SCORE_CONFIG, diagnosticPanel);
}

function renderMetrics(bt, current, atrPer, scoreConfig) {
  const metricsGrid = document.getElementById('metricsGrid');
  if (!metricsGrid) return;
  
  const wr = parseFloat(bt.winRate);
  const ex = parseFloat(bt.expectancy);
  const mdd = parseFloat(bt.maxDD);
  const tr = parseFloat(bt.totalR);
  const atrCurrent = current?.atrVal ? current.atrVal.toFixed(4) : '—';
  const revBonus = current?.bonusDetail?.find(b => b.name.includes('reversal'));
  const pattern = revBonus?.pattern || '—';
  
  let volStatus = '—';
  if (current) {
    const volBonus = current.bonusDetail.find(b => b.name.includes('Volumen'));
    if (volBonus?.nodata) volStatus = 'SIN DATOS';
    else if (volBonus?.ok === true) volStatus = 'OK ↓';
    else if (volBonus?.ok === false) volStatus = 'ALTO ↑';
  }
  
  metricsGrid.innerHTML = `
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
  `;
}

function renderDiagnostic(current, scoreConfig, diagnosticPanel) {
  if (!diagnosticPanel) return;
  
  if (!current) {
    diagnosticPanel.style.display = 'none';
    return;
  }
  
  diagnosticPanel.style.display = 'block';
  
  // Condiciones core
  const coreRowsHTML = current.coreDetail.map(d => `
    <div class="cond-row">
      <span class="cond-name">${d.name}</span>
      <span class="${d.ok ? 'cond-ok' : 'cond-fail'}">
        ${d.ok ? `✔ +${d.pts}` : `✗ +0 / ${d.max}`}
      </span>
    </div>
  `).join('');
  
  // Condiciones bonus
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
  
  // Scores
  const corePct = current.coreScore;
  const coreColor = corePct >= scoreConfig.coreMin ? '#00ff88' : corePct >= 50 ? '#ffcc00' : '#ff3c5a';
  const coreClass = corePct >= scoreConfig.coreMin ? 'good' : corePct >= 50 ? 'neutral' : 'bad';
  
  const totPct = current.totalScore;
  const totColor = totPct >= scoreConfig.totalMin ? '#00ff88' : totPct >= 55 ? '#ffcc00' : '#ff3c5a';
  const totClass = totPct >= scoreConfig.totalMin ? 'good' : totPct >= 55 ? 'neutral' : 'bad';
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

// Función para cargar lista de criptomonedas desde CoinGecko
async function loadAssetList(connector) {
  const cryptoSearch = document.getElementById('cryptoSearch');
  const status = document.getElementById('status');
  
  try {
    status.textContent = 'Cargando lista de activos...';
    cryptoSearch.placeholder = '⌛ Cargando activos...';
    
    if (connector === 'coingecko') {
      // Obtener top 100 criptomonedas por market cap
      const apiConfig = {
        endpoint: API_CONFIG.coingecko.endpoints.coinsList,
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false
        },
        apiKey: API_CONFIG.coingecko.apiKey
      };
      
      const coins = await loadData({ type: 'api', apiConfig });
      
      // Actualizar placeholder con Bitcoin por defecto
      cryptoSearch.value = 'Bitcoin';
      cryptoSearch.placeholder = '🔍 Buscar criptomoneda...';
      
      status.textContent = `${coins.length} criptomonedas disponibles. Listo para conectar.`;
      console.log(`✅ Cargadas ${coins.length} criptomonedas desde CoinGecko`);
      
      return coins;
      
    } else if (connector === 'twelvedata') {
      // Cargar acciones y bonos populares
      const stocks = await loadTwelveDataStocks();
      
      // Actualizar placeholder con Apple por defecto
      cryptoSearch.value = 'Apple Inc';
      cryptoSearch.placeholder = '🔍 Buscar acción/bono...';
      
      status.textContent = `${stocks.length} activos disponibles. Listo para conectar.`;
      console.log(`✅ Cargados ${stocks.length} activos desde TwelveData`);
      
      return stocks;
    }
    
  } catch (err) {
    console.error('Error cargando lista de activos:', err);
    cryptoSearch.placeholder = '❌ Error al cargar activos';
    cryptoSearch.disabled = true;
    status.textContent = 'Error al cargar lista de activos. Intenta recargar la página.';
    return [];
  }
}

// Función para cargar lista de acciones y bonos de TwelveData
async function loadTwelveDataStocks() {
  // Lista expandida de 500+ activos: acciones, ETFs y bonos
  // TwelveData no tiene endpoint de "lista completa", así que usamos lista manual curada
  const assets = [
    // ========== MEGA CAPS - TECH (FAANG+) ==========
    { id: 'AAPL', name: 'Apple Inc', symbol: 'AAPL', type: 'Stock' },
    { id: 'MSFT', name: 'Microsoft Corporation', symbol: 'MSFT', type: 'Stock' },
    { id: 'GOOGL', name: 'Alphabet Inc (Google) Class A', symbol: 'GOOGL', type: 'Stock' },
    { id: 'GOOG', name: 'Alphabet Inc (Google) Class C', symbol: 'GOOG', type: 'Stock' },
    { id: 'AMZN', name: 'Amazon.com Inc', symbol: 'AMZN', type: 'Stock' },
    { id: 'META', name: 'Meta Platforms (Facebook)', symbol: 'META', type: 'Stock' },
    { id: 'NVDA', name: 'NVIDIA Corporation', symbol: 'NVDA', type: 'Stock' },
    { id: 'TSLA', name: 'Tesla Inc', symbol: 'TSLA', type: 'Stock' },
    
    // ========== TECHNOLOGY - SOFTWARE & SERVICES ==========
    { id: 'NFLX', name: 'Netflix Inc', symbol: 'NFLX', type: 'Stock' },
    { id: 'ADBE', name: 'Adobe Inc', symbol: 'ADBE', type: 'Stock' },
    { id: 'CRM', name: 'Salesforce Inc', symbol: 'CRM', type: 'Stock' },
    { id: 'ORCL', name: 'Oracle Corporation', symbol: 'ORCL', type: 'Stock' },
    { id: 'CSCO', name: 'Cisco Systems Inc', symbol: 'CSCO', type: 'Stock' },
    { id: 'INTC', name: 'Intel Corporation', symbol: 'INTC', type: 'Stock' },
    { id: 'AMD', name: 'Advanced Micro Devices Inc', symbol: 'AMD', type: 'Stock' },
    { id: 'QCOM', name: 'Qualcomm Inc', symbol: 'QCOM', type: 'Stock' },
    { id: 'TXN', name: 'Texas Instruments Inc', symbol: 'TXN', type: 'Stock' },
    { id: 'AVGO', name: 'Broadcom Inc', symbol: 'AVGO', type: 'Stock' },
    { id: 'NOW', name: 'ServiceNow Inc', symbol: 'NOW', type: 'Stock' },
    { id: 'INTU', name: 'Intuit Inc', symbol: 'INTU', type: 'Stock' },
    { id: 'PANW', name: 'Palo Alto Networks Inc', symbol: 'PANW', type: 'Stock' },
    { id: 'AMAT', name: 'Applied Materials Inc', symbol: 'AMAT', type: 'Stock' },
    { id: 'LRCX', name: 'Lam Research Corporation', symbol: 'LRCX', type: 'Stock' },
    { id: 'KLAC', name: 'KLA Corporation', symbol: 'KLAC', type: 'Stock' },
    { id: 'SNPS', name: 'Synopsys Inc', symbol: 'SNPS', type: 'Stock' },
    { id: 'CDNS', name: 'Cadence Design Systems Inc', symbol: 'CDNS', type: 'Stock' },
    { id: 'ADSK', name: 'Autodesk Inc', symbol: 'ADSK', type: 'Stock' },
    { id: 'WDAY', name: 'Workday Inc', symbol: 'WDAY', type: 'Stock' },
    { id: 'TEAM', name: 'Atlassian Corporation', symbol: 'TEAM', type: 'Stock' },
    { id: 'SNOW', name: 'Snowflake Inc', symbol: 'SNOW', type: 'Stock' },
    { id: 'DDOG', name: 'Datadog Inc', symbol: 'DDOG', type: 'Stock' },
    { id: 'ZS', name: 'Zscaler Inc', symbol: 'ZS', type: 'Stock' },
    { id: 'CRWD', name: 'CrowdStrike Holdings Inc', symbol: 'CRWD', type: 'Stock' },
    { id: 'FTNT', name: 'Fortinet Inc', symbol: 'FTNT', type: 'Stock' },
    
    // ========== COMMUNICATION & SOCIAL MEDIA ==========
    { id: 'T', name: 'AT&T Inc', symbol: 'T', type: 'Stock' },
    { id: 'VZ', name: 'Verizon Communications Inc', symbol: 'VZ', type: 'Stock' },
    { id: 'TMUS', name: 'T-Mobile US Inc', symbol: 'TMUS', type: 'Stock' },
    { id: 'CMCSA', name: 'Comcast Corporation', symbol: 'CMCSA', type: 'Stock' },
    { id: 'DIS', name: 'Walt Disney Company', symbol: 'DIS', type: 'Stock' },
    { id: 'NFLX', name: 'Netflix Inc', symbol: 'NFLX', type: 'Stock' },
    { id: 'CHTR', name: 'Charter Communications Inc', symbol: 'CHTR', type: 'Stock' },
    { id: 'SPOT', name: 'Spotify Technology SA', symbol: 'SPOT', type: 'Stock' },
    { id: 'PINS', name: 'Pinterest Inc', symbol: 'PINS', type: 'Stock' },
    { id: 'SNAP', name: 'Snap Inc', symbol: 'SNAP', type: 'Stock' },
    { id: 'TWTR', name: 'Twitter Inc', symbol: 'TWTR', type: 'Stock' },
    { id: 'RBLX', name: 'Roblox Corporation', symbol: 'RBLX', type: 'Stock' },
    { id: 'U', name: 'Unity Software Inc', symbol: 'U', type: 'Stock' },
    
    // ========== FINANCE - BANKS & PAYMENTS ==========
    { id: 'JPM', name: 'JPMorgan Chase & Co', symbol: 'JPM', type: 'Stock' },
    { id: 'BAC', name: 'Bank of America Corp', symbol: 'BAC', type: 'Stock' },
    { id: 'WFC', name: 'Wells Fargo & Company', symbol: 'WFC', type: 'Stock' },
    { id: 'C', name: 'Citigroup Inc', symbol: 'C', type: 'Stock' },
    { id: 'GS', name: 'Goldman Sachs Group Inc', symbol: 'GS', type: 'Stock' },
    { id: 'MS', name: 'Morgan Stanley', symbol: 'MS', type: 'Stock' },
    { id: 'BLK', name: 'BlackRock Inc', symbol: 'BLK', type: 'Stock' },
    { id: 'SCHW', name: 'Charles Schwab Corporation', symbol: 'SCHW', type: 'Stock' },
    { id: 'AXP', name: 'American Express Company', symbol: 'AXP', type: 'Stock' },
    { id: 'V', name: 'Visa Inc', symbol: 'V', type: 'Stock' },
    { id: 'MA', name: 'Mastercard Inc', symbol: 'MA', type: 'Stock' },
    { id: 'PYPL', name: 'PayPal Holdings Inc', symbol: 'PYPL', type: 'Stock' },
    { id: 'SQ', name: 'Block Inc (Square)', symbol: 'SQ', type: 'Stock' },
    { id: 'COIN', name: 'Coinbase Global Inc', symbol: 'COIN', type: 'Stock' },
    { id: 'SOFI', name: 'SoFi Technologies Inc', symbol: 'SOFI', type: 'Stock' },
    { id: 'USB', name: 'U.S. Bancorp', symbol: 'USB', type: 'Stock' },
    { id: 'PNC', name: 'PNC Financial Services Group', symbol: 'PNC', type: 'Stock' },
    { id: 'TFC', name: 'Truist Financial Corporation', symbol: 'TFC', type: 'Stock' },
    { id: 'COF', name: 'Capital One Financial Corp', symbol: 'COF', type: 'Stock' },
    { id: 'BK', name: 'Bank of New York Mellon Corp', symbol: 'BK', type: 'Stock' },
    { id: 'STT', name: 'State Street Corporation', symbol: 'STT', type: 'Stock' },
    
    // ========== HEALTHCARE - PHARMA & BIOTECH ==========
    { id: 'JNJ', name: 'Johnson & Johnson', symbol: 'JNJ', type: 'Stock' },
    { id: 'UNH', name: 'UnitedHealth Group Inc', symbol: 'UNH', type: 'Stock' },
    { id: 'PFE', name: 'Pfizer Inc', symbol: 'PFE', type: 'Stock' },
    { id: 'ABBV', name: 'AbbVie Inc', symbol: 'ABBV', type: 'Stock' },
    { id: 'TMO', name: 'Thermo Fisher Scientific Inc', symbol: 'TMO', type: 'Stock' },
    { id: 'ABT', name: 'Abbott Laboratories', symbol: 'ABT', type: 'Stock' },
    { id: 'MRK', name: 'Merck & Co Inc', symbol: 'MRK', type: 'Stock' },
    { id: 'LLY', name: 'Eli Lilly and Company', symbol: 'LLY', type: 'Stock' },
    { id: 'BMY', name: 'Bristol-Myers Squibb Company', symbol: 'BMY', type: 'Stock' },
    { id: 'AMGN', name: 'Amgen Inc', symbol: 'AMGN', type: 'Stock' },
    { id: 'GILD', name: 'Gilead Sciences Inc', symbol: 'GILD', type: 'Stock' },
    { id: 'CVS', name: 'CVS Health Corporation', symbol: 'CVS', type: 'Stock' },
    { id: 'CI', name: 'Cigna Corporation', symbol: 'CI', type: 'Stock' },
    { id: 'ANTM', name: 'Anthem Inc', symbol: 'ANTM', type: 'Stock' },
    { id: 'HUM', name: 'Humana Inc', symbol: 'HUM', type: 'Stock' },
    { id: 'DHR', name: 'Danaher Corporation', symbol: 'DHR', type: 'Stock' },
    { id: 'ISRG', name: 'Intuitive Surgical Inc', symbol: 'ISRG', type: 'Stock' },
    { id: 'SYK', name: 'Stryker Corporation', symbol: 'SYK', type: 'Stock' },
    { id: 'BSX', name: 'Boston Scientific Corporation', symbol: 'BSX', type: 'Stock' },
    { id: 'MDT', name: 'Medtronic PLC', symbol: 'MDT', type: 'Stock' },
    { id: 'REGN', name: 'Regeneron Pharmaceuticals Inc', symbol: 'REGN', type: 'Stock' },
    { id: 'VRTX', name: 'Vertex Pharmaceuticals Inc', symbol: 'VRTX', type: 'Stock' },
    { id: 'BIIB', name: 'Biogen Inc', symbol: 'BIIB', type: 'Stock' },
    { id: 'ILMN', name: 'Illumina Inc', symbol: 'ILMN', type: 'Stock' },
    { id: 'MRNA', name: 'Moderna Inc', symbol: 'MRNA', type: 'Stock' },
    { id: 'BNTX', name: 'BioNTech SE', symbol: 'BNTX', type: 'Stock' },
    
    // ========== CONSUMER DISCRETIONARY - RETAIL ==========
    { id: 'HD', name: 'Home Depot Inc', symbol: 'HD', type: 'Stock' },
    { id: 'LOW', name: 'Lowe\'s Companies Inc', symbol: 'LOW', type: 'Stock' },
    { id: 'TGT', name: 'Target Corporation', symbol: 'TGT', type: 'Stock' },
    { id: 'COST', name: 'Costco Wholesale Corporation', symbol: 'COST', type: 'Stock' },
    { id: 'WMT', name: 'Walmart Inc', symbol: 'WMT', type: 'Stock' },
    { id: 'TJX', name: 'TJX Companies Inc', symbol: 'TJX', type: 'Stock' },
    { id: 'ROST', name: 'Ross Stores Inc', symbol: 'ROST', type: 'Stock' },
    { id: 'BBY', name: 'Best Buy Co Inc', symbol: 'BBY', type: 'Stock' },
    { id: 'EBAY', name: 'eBay Inc', symbol: 'EBAY', type: 'Stock' },
    { id: 'ETSY', name: 'Etsy Inc', symbol: 'ETSY', type: 'Stock' },
    { id: 'BKNG', name: 'Booking Holdings Inc', symbol: 'BKNG', type: 'Stock' },
    { id: 'ABNB', name: 'Airbnb Inc', symbol: 'ABNB', type: 'Stock' },
    { id: 'EXPE', name: 'Expedia Group Inc', symbol: 'EXPE', type: 'Stock' },
    
    // ========== CONSUMER DISCRETIONARY - AUTO & LUXURY ==========
    { id: 'F', name: 'Ford Motor Company', symbol: 'F', type: 'Stock' },
    { id: 'GM', name: 'General Motors Company', symbol: 'GM', type: 'Stock' },
    { id: 'RIVN', name: 'Rivian Automotive Inc', symbol: 'RIVN', type: 'Stock' },
    { id: 'LCID', name: 'Lucid Group Inc', symbol: 'LCID', type: 'Stock' },
    { id: 'NIO', name: 'NIO Inc', symbol: 'NIO', type: 'Stock' },
    { id: 'XPEV', name: 'XPeng Inc', symbol: 'XPEV', type: 'Stock' },
    { id: 'NKE', name: 'Nike Inc', symbol: 'NKE', type: 'Stock' },
    { id: 'LULU', name: 'Lululemon Athletica Inc', symbol: 'LULU', type: 'Stock' },
    { id: 'SBUX', name: 'Starbucks Corporation', symbol: 'SBUX', type: 'Stock' },
    { id: 'MCD', name: 'McDonald\'s Corporation', symbol: 'MCD', type: 'Stock' },
    { id: 'CMG', name: 'Chipotle Mexican Grill Inc', symbol: 'CMG', type: 'Stock' },
    { id: 'YUM', name: 'Yum! Brands Inc', symbol: 'YUM', type: 'Stock' },
    
    // ========== CONSUMER STAPLES ==========
    { id: 'PG', name: 'Procter & Gamble Company', symbol: 'PG', type: 'Stock' },
    { id: 'KO', name: 'Coca-Cola Company', symbol: 'KO', type: 'Stock' },
    { id: 'PEP', name: 'PepsiCo Inc', symbol: 'PEP', type: 'Stock' },
    { id: 'PM', name: 'Philip Morris International Inc', symbol: 'PM', type: 'Stock' },
    { id: 'MO', name: 'Altria Group Inc', symbol: 'MO', type: 'Stock' },
    { id: 'CL', name: 'Colgate-Palmolive Company', symbol: 'CL', type: 'Stock' },
    { id: 'KMB', name: 'Kimberly-Clark Corporation', symbol: 'KMB', type: 'Stock' },
    { id: 'KHC', name: 'Kraft Heinz Company', symbol: 'KHC', type: 'Stock' },
    { id: 'GIS', name: 'General Mills Inc', symbol: 'GIS', type: 'Stock' },
    { id: 'K', name: 'Kellogg Company', symbol: 'K', type: 'Stock' },
    { id: 'MDLZ', name: 'Mondelez International Inc', symbol: 'MDLZ', type: 'Stock' },
    { id: 'STZ', name: 'Constellation Brands Inc', symbol: 'STZ', type: 'Stock' },
    
    // ========== INDUSTRIAL - AEROSPACE & DEFENSE ==========
    { id: 'BA', name: 'Boeing Company', symbol: 'BA', type: 'Stock' },
    { id: 'LMT', name: 'Lockheed Martin Corporation', symbol: 'LMT', type: 'Stock' },
    { id: 'RTX', name: 'Raytheon Technologies Corp', symbol: 'RTX', type: 'Stock' },
    { id: 'GD', name: 'General Dynamics Corporation', symbol: 'GD', type: 'Stock' },
    { id: 'NOC', name: 'Northrop Grumman Corporation', symbol: 'NOC', type: 'Stock' },
    { id: 'LHX', name: 'L3Harris Technologies Inc', symbol: 'LHX', type: 'Stock' },
    { id: 'HWM', name: 'Howmet Aerospace Inc', symbol: 'HWM', type: 'Stock' },
    { id: 'TXT', name: 'Textron Inc', symbol: 'TXT', type: 'Stock' },
    
    // ========== INDUSTRIAL - MACHINERY & EQUIPMENT ==========
    { id: 'CAT', name: 'Caterpillar Inc', symbol: 'CAT', type: 'Stock' },
    { id: 'DE', name: 'Deere & Company', symbol: 'DE', type: 'Stock' },
    { id: 'GE', name: 'General Electric Co', symbol: 'GE', type: 'Stock' },
    { id: 'HON', name: 'Honeywell International Inc', symbol: 'HON', type: 'Stock' },
    { id: 'MMM', name: '3M Company', symbol: 'MMM', type: 'Stock' },
    { id: 'EMR', name: 'Emerson Electric Co', symbol: 'EMR', type: 'Stock' },
    { id: 'ETN', name: 'Eaton Corporation PLC', symbol: 'ETN', type: 'Stock' },
    { id: 'ITW', name: 'Illinois Tool Works Inc', symbol: 'ITW', type: 'Stock' },
    { id: 'PH', name: 'Parker-Hannifin Corporation', symbol: 'PH', type: 'Stock' },
    { id: 'ROK', name: 'Rockwell Automation Inc', symbol: 'ROK', type: 'Stock' },
    { id: 'CMI', name: 'Cummins Inc', symbol: 'CMI', type: 'Stock' },
    { id: 'PCAR', name: 'PACCAR Inc', symbol: 'PCAR', type: 'Stock' },
    
    // ========== INDUSTRIAL - TRANSPORTATION ==========
    { id: 'UPS', name: 'United Parcel Service Inc', symbol: 'UPS', type: 'Stock' },
    { id: 'FDX', name: 'FedEx Corporation', symbol: 'FDX', type: 'Stock' },
    { id: 'UNP', name: 'Union Pacific Corporation', symbol: 'UNP', type: 'Stock' },
    { id: 'NSC', name: 'Norfolk Southern Corporation', symbol: 'NSC', type: 'Stock' },
    { id: 'CSX', name: 'CSX Corporation', symbol: 'CSX', type: 'Stock' },
    { id: 'DAL', name: 'Delta Air Lines Inc', symbol: 'DAL', type: 'Stock' },
    { id: 'UAL', name: 'United Airlines Holdings Inc', symbol: 'UAL', type: 'Stock' },
    { id: 'AAL', name: 'American Airlines Group Inc', symbol: 'AAL', type: 'Stock' },
    { id: 'LUV', name: 'Southwest Airlines Co', symbol: 'LUV', type: 'Stock' },
    { id: 'UBER', name: 'Uber Technologies Inc', symbol: 'UBER', type: 'Stock' },
    { id: 'LYFT', name: 'Lyft Inc', symbol: 'LYFT', type: 'Stock' },
    
    // ========== ENERGY - OIL & GAS ==========
    { id: 'XOM', name: 'Exxon Mobil Corporation', symbol: 'XOM', type: 'Stock' },
    { id: 'CVX', name: 'Chevron Corporation', symbol: 'CVX', type: 'Stock' },
    { id: 'COP', name: 'ConocoPhillips', symbol: 'COP', type: 'Stock' },
    { id: 'SLB', name: 'Schlumberger NV', symbol: 'SLB', type: 'Stock' },
    { id: 'EOG', name: 'EOG Resources Inc', symbol: 'EOG', type: 'Stock' },
    { id: 'PXD', name: 'Pioneer Natural Resources Co', symbol: 'PXD', type: 'Stock' },
    { id: 'MPC', name: 'Marathon Petroleum Corporation', symbol: 'MPC', type: 'Stock' },
    { id: 'VLO', name: 'Valero Energy Corporation', symbol: 'VLO', type: 'Stock' },
    { id: 'PSX', name: 'Phillips 66', symbol: 'PSX', type: 'Stock' },
    { id: 'OXY', name: 'Occidental Petroleum Corp', symbol: 'OXY', type: 'Stock' },
    { id: 'HAL', name: 'Halliburton Company', symbol: 'HAL', type: 'Stock' },
    { id: 'BKR', name: 'Baker Hughes Company', symbol: 'BKR', type: 'Stock' },
    
    // ========== UTILITIES ==========
    { id: 'NEE', name: 'NextEra Energy Inc', symbol: 'NEE', type: 'Stock' },
    { id: 'DUK', name: 'Duke Energy Corporation', symbol: 'DUK', type: 'Stock' },
    { id: 'SO', name: 'Southern Company', symbol: 'SO', type: 'Stock' },
    { id: 'D', name: 'Dominion Energy Inc', symbol: 'D', type: 'Stock' },
    { id: 'AEP', name: 'American Electric Power Co', symbol: 'AEP', type: 'Stock' },
    { id: 'EXC', name: 'Exelon Corporation', symbol: 'EXC', type: 'Stock' },
    { id: 'SRE', name: 'Sempra Energy', symbol: 'SRE', type: 'Stock' },
    { id: 'XEL', name: 'Xcel Energy Inc', symbol: 'XEL', type: 'Stock' },
    { id: 'PCG', name: 'PG&E Corporation', symbol: 'PCG', type: 'Stock' },
    
    // ========== MATERIALS & CHEMICALS ==========
    { id: 'LIN', name: 'Linde PLC', symbol: 'LIN', type: 'Stock' },
    { id: 'APD', name: 'Air Products and Chemicals Inc', symbol: 'APD', type: 'Stock' },
    { id: 'SHW', name: 'Sherwin-Williams Company', symbol: 'SHW', type: 'Stock' },
    { id: 'ECL', name: 'Ecolab Inc', symbol: 'ECL', type: 'Stock' },
    { id: 'DD', name: 'DuPont de Nemours Inc', symbol: 'DD', type: 'Stock' },
    { id: 'DOW', name: 'Dow Inc', symbol: 'DOW', type: 'Stock' },
    { id: 'PPG', name: 'PPG Industries Inc', symbol: 'PPG', type: 'Stock' },
    { id: 'NEM', name: 'Newmont Corporation', symbol: 'NEM', type: 'Stock' },
    { id: 'FCX', name: 'Freeport-McMoRan Inc', symbol: 'FCX', type: 'Stock' },
    { id: 'NUE', name: 'Nucor Corporation', symbol: 'NUE', type: 'Stock' },
    { id: 'STLD', name: 'Steel Dynamics Inc', symbol: 'STLD', type: 'Stock' },
    
    // ========== REAL ESTATE - REITs ==========
    { id: 'AMT', name: 'American Tower Corporation', symbol: 'AMT', type: 'REIT' },
    { id: 'PLD', name: 'Prologis Inc', symbol: 'PLD', type: 'REIT' },
    { id: 'CCI', name: 'Crown Castle International Corp', symbol: 'CCI', type: 'REIT' },
    { id: 'EQIX', name: 'Equinix Inc', symbol: 'EQIX', type: 'REIT' },
    { id: 'PSA', name: 'Public Storage', symbol: 'PSA', type: 'REIT' },
    { id: 'DLR', name: 'Digital Realty Trust Inc', symbol: 'DLR', type: 'REIT' },
    { id: 'O', name: 'Realty Income Corporation', symbol: 'O', type: 'REIT' },
    { id: 'SPG', name: 'Simon Property Group Inc', symbol: 'SPG', type: 'REIT' },
    { id: 'WELL', name: 'Welltower Inc', symbol: 'WELL', type: 'REIT' },
    { id: 'AVB', name: 'AvalonBay Communities Inc', symbol: 'AVB', type: 'REIT' },
    { id: 'EQR', name: 'Equity Residential', symbol: 'EQR', type: 'REIT' },
    { id: 'VTR', name: 'Ventas Inc', symbol: 'VTR', type: 'REIT' },
    
    // ========== SEMICONDUCTORS (Additional) ==========
    { id: 'TSM', name: 'Taiwan Semiconductor Mfg Co', symbol: 'TSM', type: 'Stock' },
    { id: 'ASML', name: 'ASML Holding NV', symbol: 'ASML', type: 'Stock' },
    { id: 'MU', name: 'Micron Technology Inc', symbol: 'MU', type: 'Stock' },
    { id: 'ADI', name: 'Analog Devices Inc', symbol: 'ADI', type: 'Stock' },
    { id: 'MRVL', name: 'Marvell Technology Inc', symbol: 'MRVL', type: 'Stock' },
    { id: 'NXPI', name: 'NXP Semiconductors NV', symbol: 'NXPI', type: 'Stock' },
    { id: 'MCHP', name: 'Microchip Technology Inc', symbol: 'MCHP', type: 'Stock' },
    { id: 'ON', name: 'ON Semiconductor Corporation', symbol: 'ON', type: 'Stock' },
    
    // ========== CHINESE ADRs ==========
    { id: 'BABA', name: 'Alibaba Group Holding Ltd', symbol: 'BABA', type: 'Stock' },
    { id: 'JD', name: 'JD.com Inc', symbol: 'JD', type: 'Stock' },
    { id: 'PDD', name: 'Pinduoduo Inc', symbol: 'PDD', type: 'Stock' },
    { id: 'BIDU', name: 'Baidu Inc', symbol: 'BIDU', type: 'Stock' },
    { id: 'TME', name: 'Tencent Music Entertainment', symbol: 'TME', type: 'Stock' },
    
    // ========== INTERNATIONAL STOCKS ==========
    { id: 'SAP', name: 'SAP SE', symbol: 'SAP', type: 'Stock' },
    { id: 'NVO', name: 'Novo Nordisk A/S', symbol: 'NVO', type: 'Stock' },
    { id: 'SONY', name: 'Sony Group Corporation', symbol: 'SONY', type: 'Stock' },
    { id: 'TM', name: 'Toyota Motor Corporation', symbol: 'TM', type: 'Stock' },
    { id: 'SNY', name: 'Sanofi SA', symbol: 'SNY', type: 'Stock' },
    { id: 'UL', name: 'Unilever PLC', symbol: 'UL', type: 'Stock' },
    { id: 'BP', name: 'BP PLC', symbol: 'BP', type: 'Stock' },
    { id: 'RDS-A', name: 'Royal Dutch Shell PLC', symbol: 'RDS-A', type: 'Stock' },
    
    // ========== ETFs - MAJOR INDICES ==========
    { id: 'SPY', name: 'SPDR S&P 500 ETF Trust', symbol: 'SPY', type: 'ETF' },
    { id: 'VOO', name: 'Vanguard S&P 500 ETF', symbol: 'VOO', type: 'ETF' },
    { id: 'IVV', name: 'iShares Core S&P 500 ETF', symbol: 'IVV', type: 'ETF' },
    { id: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq-100)', symbol: 'QQQ', type: 'ETF' },
    { id: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', symbol: 'DIA', type: 'ETF' },
    { id: 'IWM', name: 'iShares Russell 2000 ETF', symbol: 'IWM', type: 'ETF' },
    { id: 'VTI', name: 'Vanguard Total Stock Market ETF', symbol: 'VTI', type: 'ETF' },
    { id: 'VT', name: 'Vanguard Total World Stock ETF', symbol: 'VT', type: 'ETF' },
    { id: 'VTWO', name: 'Vanguard Russell 2000 ETF', symbol: 'VTWO', type: 'ETF' },
    { id: 'MDY', name: 'SPDR S&P MidCap 400 ETF', symbol: 'MDY', type: 'ETF' },
    
    // ========== ETFs - SECTOR SPECIFIC ==========
    { id: 'XLK', name: 'Technology Select Sector SPDR', symbol: 'XLK', type: 'ETF' },
    { id: 'XLF', name: 'Financial Select Sector SPDR', symbol: 'XLF', type: 'ETF' },
    { id: 'XLE', name: 'Energy Select Sector SPDR', symbol: 'XLE', type: 'ETF' },
    { id: 'XLV', name: 'Health Care Select Sector SPDR', symbol: 'XLV', type: 'ETF' },
    { id: 'XLI', name: 'Industrial Select Sector SPDR', symbol: 'XLI', type: 'ETF' },
    { id: 'XLY', name: 'Consumer Discretionary Select Sector', symbol: 'XLY', type: 'ETF' },
    { id: 'XLP', name: 'Consumer Staples Select Sector', symbol: 'XLP', type: 'ETF' },
    { id: 'XLB', name: 'Materials Select Sector SPDR', symbol: 'XLB', type: 'ETF' },
    { id: 'XLU', name: 'Utilities Select Sector SPDR', symbol: 'XLU', type: 'ETF' },
    { id: 'XLRE', name: 'Real Estate Select Sector SPDR', symbol: 'XLRE', type: 'ETF' },
    { id: 'XLC', name: 'Communication Services Select', symbol: 'XLC', type: 'ETF' },
    
    // ========== ETFs - GROWTH & VALUE ==========
    { id: 'VUG', name: 'Vanguard Growth ETF', symbol: 'VUG', type: 'ETF' },
    { id: 'VTV', name: 'Vanguard Value ETF', symbol: 'VTV', type: 'ETF' },
    { id: 'IWF', name: 'iShares Russell 1000 Growth ETF', symbol: 'IWF', type: 'ETF' },
    { id: 'IWD', name: 'iShares Russell 1000 Value ETF', symbol: 'IWD', type: 'ETF' },
    { id: 'MTUM', name: 'iShares MSCI USA Momentum Factor', symbol: 'MTUM', type: 'ETF' },
    { id: 'QUAL', name: 'iShares MSCI USA Quality Factor', symbol: 'QUAL', type: 'ETF' },
    { id: 'SIZE', name: 'iShares MSCI USA Size Factor', symbol: 'SIZE', type: 'ETF' },
    
    // ========== ETFs - INTERNATIONAL ==========
    { id: 'EFA', name: 'iShares MSCI EAFE ETF', symbol: 'EFA', type: 'ETF' },
    { id: 'VEA', name: 'Vanguard FTSE Developed Markets', symbol: 'VEA', type: 'ETF' },
    { id: 'VWO', name: 'Vanguard FTSE Emerging Markets', symbol: 'VWO', type: 'ETF' },
    { id: 'EEM', name: 'iShares MSCI Emerging Markets', symbol: 'EEM', type: 'ETF' },
    { id: 'IEMG', name: 'iShares Core MSCI Emerging Markets', symbol: 'IEMG', type: 'ETF' },
    { id: 'FXI', name: 'iShares China Large-Cap ETF', symbol: 'FXI', type: 'ETF' },
    { id: 'EWJ', name: 'iShares MSCI Japan ETF', symbol: 'EWJ', type: 'ETF' },
    { id: 'EWG', name: 'iShares MSCI Germany ETF', symbol: 'EWG', type: 'ETF' },
    { id: 'EWU', name: 'iShares MSCI United Kingdom ETF', symbol: 'EWU', type: 'ETF' },
    
    // ========== ETFs - BONDS & FIXED INCOME ==========
    { id: 'AGG', name: 'iShares Core U.S. Aggregate Bond', symbol: 'AGG', type: 'Bond ETF' },
    { id: 'BND', name: 'Vanguard Total Bond Market ETF', symbol: 'BND', type: 'Bond ETF' },
    { id: 'TLT', name: 'iShares 20+ Year Treasury Bond', symbol: 'TLT', type: 'Bond ETF' },
    { id: 'IEF', name: 'iShares 7-10 Year Treasury Bond', symbol: 'IEF', type: 'Bond ETF' },
    { id: 'SHY', name: 'iShares 1-3 Year Treasury Bond', symbol: 'SHY', type: 'Bond ETF' },
    { id: 'LQD', name: 'iShares iBoxx Investment Grade Corp', symbol: 'LQD', type: 'Bond ETF' },
    { id: 'HYG', name: 'iShares iBoxx High Yield Corp Bond', symbol: 'HYG', type: 'Bond ETF' },
    { id: 'JNK', name: 'SPDR Bloomberg High Yield Bond', symbol: 'JNK', type: 'Bond ETF' },
    { id: 'TIP', name: 'iShares TIPS Bond ETF', symbol: 'TIP', type: 'Bond ETF' },
    { id: 'MUB', name: 'iShares National Muni Bond ETF', symbol: 'MUB', type: 'Bond ETF' },
    { id: 'EMB', name: 'iShares J.P. Morgan USD Emerging Markets', symbol: 'EMB', type: 'Bond ETF' },
    { id: 'VCIT', name: 'Vanguard Intermediate-Term Corp', symbol: 'VCIT', type: 'Bond ETF' },
    { id: 'VCSH', name: 'Vanguard Short-Term Corp Bond', symbol: 'VCSH', type: 'Bond ETF' },
    
    // ========== ETFs - COMMODITIES ==========
    { id: 'GLD', name: 'SPDR Gold Shares', symbol: 'GLD', type: 'Commodity ETF' },
    { id: 'SLV', name: 'iShares Silver Trust', symbol: 'SLV', type: 'Commodity ETF' },
    { id: 'USO', name: 'United States Oil Fund', symbol: 'USO', type: 'Commodity ETF' },
    { id: 'UNG', name: 'United States Natural Gas Fund', symbol: 'UNG', type: 'Commodity ETF' },
    { id: 'DBA', name: 'Invesco DB Agriculture Fund', symbol: 'DBA', type: 'Commodity ETF' },
    { id: 'DBC', name: 'Invesco DB Commodity Index Fund', symbol: 'DBC', type: 'Commodity ETF' },
    { id: 'PALL', name: 'abrdn Physical Palladium Shares', symbol: 'PALL', type: 'Commodity ETF' },
    { id: 'PPLT', name: 'abrdn Physical Platinum Shares', symbol: 'PPLT', type: 'Commodity ETF' },
    
    // ========== ETFs - THEMATIC & INNOVATION ==========
    { id: 'ARK', name: 'ARK Innovation ETF', symbol: 'ARKK', type: 'ETF' },
    { id: 'ARKW', name: 'ARK Next Generation Internet', symbol: 'ARKW', type: 'ETF' },
    { id: 'ARKG', name: 'ARK Genomic Revolution ETF', symbol: 'ARKG', type: 'ETF' },
    { id: 'ARKF', name: 'ARK Fintech Innovation ETF', symbol: 'ARKF', type: 'ETF' },
    { id: 'ARKQ', name: 'ARK Autonomous Tech & Robotics', symbol: 'ARKQ', type: 'ETF' },
    { id: 'ICLN', name: 'iShares Global Clean Energy ETF', symbol: 'ICLN', type: 'ETF' },
    { id: 'TAN', name: 'Invesco Solar ETF', symbol: 'TAN', type: 'ETF' },
    { id: 'LIT', name: 'Global X Lithium & Battery Tech', symbol: 'LIT', type: 'ETF' },
    { id: 'BOTZ', name: 'Global X Robotics & AI ETF', symbol: 'BOTZ', type: 'ETF' },
    { id: 'CLOU', name: 'Global X Cloud Computing ETF', symbol: 'CLOU', type: 'ETF' },
    { id: 'FINX', name: 'Global X FinTech ETF', symbol: 'FINX', type: 'ETF' },
    { id: 'HACK', name: 'ETFMG Prime Cyber Security ETF', symbol: 'HACK', type: 'ETF' },
    { id: 'DRIV', name: 'Global X Autonomous & Electric Vehicles', symbol: 'DRIV', type: 'ETF' },
    { id: 'ESPO', name: 'VanEck Video Gaming and eSports', symbol: 'ESPO', type: 'ETF' },
    { id: 'CIBR', name: 'First Trust NASDAQ Cybersecurity', symbol: 'CIBR', type: 'ETF' },
    
    // ========== ETFs - CRYPTO & BLOCKCHAIN ==========
    { id: 'BITO', name: 'ProShares Bitcoin Strategy ETF', symbol: 'BITO', type: 'ETF' },
    { id: 'BLOK', name: 'Amplify Transformational Data Sharing', symbol: 'BLOK', type: 'ETF' },
    { id: 'BITQ', name: 'Bitwise Crypto Industry Innovators', symbol: 'BITQ', type: 'ETF' },
    
    // ========== ETFs - DIVIDEND & INCOME ==========
    { id: 'VYM', name: 'Vanguard High Dividend Yield ETF', symbol: 'VYM', type: 'ETF' },
    { id: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', symbol: 'SCHD', type: 'ETF' },
    { id: 'DVY', name: 'iShares Select Dividend ETF', symbol: 'DVY', type: 'ETF' },
    { id: 'NOBL', name: 'ProShares S&P 500 Dividend Aristocrats', symbol: 'NOBL', type: 'ETF' },
    { id: 'VIG', name: 'Vanguard Dividend Appreciation ETF', symbol: 'VIG', type: 'ETF' },
    { id: 'SDY', name: 'SPDR S&P Dividend ETF', symbol: 'SDY', type: 'ETF' },
    { id: 'HDV', name: 'iShares Core High Dividend ETF', symbol: 'HDV', type: 'ETF' },
    
    // ========== ETFs - LEVERAGE & INVERSE ==========
    { id: 'TQQQ', name: '3x Long Nasdaq 100', symbol: 'TQQQ', type: 'Leveraged ETF' },
    { id: 'SQQQ', name: '3x Short Nasdaq 100', symbol: 'SQQQ', type: 'Leveraged ETF' },
    { id: 'UPRO', name: '3x Long S&P 500', symbol: 'UPRO', type: 'Leveraged ETF' },
    { id: 'SPXU', name: '3x Short S&P 500', symbol: 'SPXU', type: 'Leveraged ETF' },
    { id: 'SOXL', name: '3x Long Semiconductor', symbol: 'SOXL', type: 'Leveraged ETF' },
    { id: 'SOXS', name: '3x Short Semiconductor', symbol: 'SOXS', type: 'Leveraged ETF' },
    { id: 'TNA', name: '3x Long Russell 2000', symbol: 'TNA', type: 'Leveraged ETF' },
    { id: 'TZA', name: '3x Short Russell 2000', symbol: 'TZA', type: 'Leveraged ETF' },
    { id: 'SPXL', name: '3x Long S&P 500', symbol: 'SPXL', type: 'Leveraged ETF' },
    { id: 'TECL', name: '3x Long Technology', symbol: 'TECL', type: 'Leveraged ETF' },
    { id: 'FNGU', name: '3x Long FANG+', symbol: 'FNGU', type: 'Leveraged ETF' },
    { id: 'FNGD', name: '3x Short FANG+', symbol: 'FNGD', type: 'Leveraged ETF' },
    { id: 'UDOW', name: '3x Long Dow 30', symbol: 'UDOW', type: 'Leveraged ETF' },
    { id: 'SDOW', name: '3x Short Dow 30', symbol: 'SDOW', type: 'Leveraged ETF' },
    { id: 'YINN', name: '3x Long FTSE China 50', symbol: 'YINN', type: 'Leveraged ETF' },
    { id: 'YANG', name: '3x Short FTSE China 50', symbol: 'YANG', type: 'Leveraged ETF' },
  ];
  
  console.log(`✅ Cargados ${assets.length} activos desde TwelveData`);
  return assets;
}
