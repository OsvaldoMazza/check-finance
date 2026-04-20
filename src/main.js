// src/main.js - Punto de entrada principal (orquestación)
import { loadData }   from './calculate/dataLoader.js';
import { API_CONFIG } from './config.js';

import { filterDataByPeriod, normalizeData }            from './components/dataUtils/index.js';
import { renderDashboard }                               from './components/dashboard/index.js';
import { initSettings }                                  from './components/settings/index.js';
import { renderCryptoList, initAssetSearch }             from './components/assetSearch/index.js';
import { loadAssetList }                                 from './components/apiConnector/index.js';
import { runScan, renderTradeOnResults }                 from './components/scanner/index.js';

console.log('[INFO] Check Finance App iniciada');
console.log('[INFO] CSV soportado: formato español (comas decimales) e inglés (puntos decimales)');
console.log('[INFO] APIs: CoinGecko (criptos) | TwelveData (acciones/bonos)');

document.addEventListener('DOMContentLoaded', async () => {
  // ── DOM elements ─────────────────────────────────────────────────────────────
  const btnCsv         = document.getElementById('btnCsv');
  const csvFile        = document.getElementById('csvFile');
  const btnApi         = document.getElementById('btnApi');
  const btnScanTradeOn = document.getElementById('btnScanTradeOn');
  const tradeOnResults = document.getElementById('tradeOnResults');
  const apiConnector   = document.getElementById('apiConnector');
  const cryptoSearch   = document.getElementById('cryptoSearch');
  const cryptoList     = document.getElementById('cryptoList');
  const selectedCrypto = document.getElementById('selectedCrypto');
  const samplePeriod   = document.getElementById('samplePeriod');
  const chartArea      = document.getElementById('chartArea');
  const diagnosticPanel = document.getElementById('diagnosticPanel');
  const metricsGrid    = document.getElementById('metricsGrid');
  const status         = document.getElementById('status');

  // Settings modal elements
  const btnSettings        = document.getElementById('btnSettings');
  const settingsModal      = document.getElementById('settingsModal');
  const closeSettings      = document.getElementById('closeSettings');
  const saveSettings       = document.getElementById('saveSettings');
  const cancelSettings     = document.getElementById('cancelSettings');
  const scanDelay          = document.getElementById('scanDelay');
  const scanLimit          = document.getElementById('scanLimit');
  const selectedAssetsCount = document.getElementById('selectedAssetsCount');
  const selectAllAssets    = document.getElementById('selectAllAssets');
  const clearAllAssets     = document.getElementById('clearAllAssets');

  // ── App state ─────────────────────────────────────────────────────────────────
  let isApiConnected   = false;
  let apiData          = null;
  let fullData         = null;
  let cryptoListData   = [];
  let currentConnector = 'coingecko';
  let tradeOnAssets    = [];

  // Scanner config — load from localStorage or fall back to defaults
  let scannerConfig = {
    delayBetweenRequests: API_CONFIG.scanner.delayBetweenRequests,
    maxAssetsToScan:      API_CONFIG.scanner.maxAssetsToScan
  };
  const savedConfig = localStorage.getItem('scannerConfig');
  if (savedConfig) {
    try {
      scannerConfig = JSON.parse(savedConfig);
      console.log('[INFO] Configuración del scanner cargada desde localStorage:', scannerConfig);
    } catch (e) {
      console.warn('[WARN] Error al cargar configuración guardada, usando valores por defecto');
    }
  } else {
    console.log('[INFO] Configuración del scanner (valores por defecto):', scannerConfig);
  }

  // Selected assets for scan — persist in localStorage
  let selectedAssetsForScan = [];
  const savedAssets = localStorage.getItem('selectedAssetsForScan');
  if (savedAssets) {
    try {
      selectedAssetsForScan = JSON.parse(savedAssets);
      console.log(`[INFO] Activos seleccionados para scan: ${selectedAssetsForScan.length}`);
    } catch (e) {
      console.warn('[WARN] Error al cargar activos seleccionados');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const setStatus = (msg) => { status.textContent = msg; };

  function updateUIState() {
    cryptoSearch.disabled    = !isApiConnected;
    samplePeriod.disabled    = !isApiConnected;
    btnScanTradeOn.disabled  = !isApiConnected;
    cryptoSearch.placeholder = isApiConnected ? '🔍 Buscar activo...' : '🔒 Conecta API primero...';
  }

  function getFilteredAssets() {
    const term = (cryptoSearch.value || '').toLowerCase();
    return cryptoListData.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.symbol.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  }

  const doRenderList = () => renderCryptoList(
    cryptoList,
    getFilteredAssets(),
    selectedCrypto.value,
    selectedAssetsForScan,
    {
      onCheckboxToggle(assetId, checked) {
        if (checked) {
          if (!selectedAssetsForScan.includes(assetId)) selectedAssetsForScan.push(assetId);
        } else {
          selectedAssetsForScan = selectedAssetsForScan.filter(id => id !== assetId);
        }
        localStorage.setItem('selectedAssetsForScan', JSON.stringify(selectedAssetsForScan));
        console.log(`📌 Activos seleccionados: ${selectedAssetsForScan.length}`);
      },
      async onAssetClick(itemId) {
        selectedCrypto.value = itemId;
        cryptoSearch.value   = '';
        cryptoList.classList.add('hidden');
        if (!isApiConnected) {
          await connectAPI();
        } else {
          await disconnectAPI();
          setTimeout(() => connectAPI(), 100);
        }
      }
    }
  );

  // ── API connect / disconnect ────────────────────────────────────────────────
  async function connectAPI() {
    setStatus('Recargando lista de activos...');
    cryptoListData = await loadAssetList(currentConnector, {
      onStatus: setStatus,
      setSearchPlaceholder: (p) => { cryptoSearch.placeholder = p; },
      disableSearch: () => { cryptoSearch.disabled = true; }
    });
    doRenderList();

    const assetId = selectedCrypto.value;
    if (!assetId) { setStatus('Por favor, selecciona un activo.'); return; }

    const assetData = cryptoListData.find(c => c.id === assetId);
    const assetName = assetData ? assetData.name : assetId;

    try {
      let data;
      if (currentConnector === 'coingecko') {
        setStatus(`Conectando a CoinGecko (${assetName})...`);
        const raw = await loadData({
          type: 'api',
          apiConfig: {
            endpoint: `/coins/${assetId}/ohlc`,
            params: { vs_currency: 'usd', days: '365' },
            apiKey: API_CONFIG.coingecko.apiKey
          }
        });
        data = raw.map(c => ({
          date: new Date(c[0]).toISOString().slice(0, 10),
          open: c[1], high: c[2], low: c[3], close: c[4], volume: null
        }));
        console.log(`[OK] CoinGecko conectada: ${assetName}`);

      } else if (currentConnector === 'twelvedata') {
        setStatus(`Conectando a TwelveData (${assetName})...`);
        const { apiKey, baseUrl, endpoints: { timeSeries: ep }, defaults } = API_CONFIG.twelvedata;
        const url      = `${baseUrl}${ep}?apikey=${apiKey}&symbol=${assetId}&interval=${defaults.interval}&outputsize=${defaults.outputsize}&format=${defaults.format}`;
        const response = await fetch(url);
        const raw      = await response.json();
        if (raw.status === 'error') throw new Error(raw.message || 'Error en TwelveData API');
        data = raw.values.map(item => ({
          date:   item.datetime,
          open:   parseFloat(item.open),
          high:   parseFloat(item.high),
          low:    parseFloat(item.low),
          close:  parseFloat(item.close),
          volume: parseFloat(item.volume)
        })).reverse();
        console.log(`[OK] TwelveData conectada: ${assetName}`);
      }

      apiData  = data;
      fullData = data;
      const filtered = filterDataByPeriod(data, samplePeriod.value);
      isApiConnected = true;
      btnApi.textContent = '🔴 Desconectar API';
      btnApi.classList.add('connected');
      updateUIState();
      setStatus(`API conectada: ${data.length} puntos de ${assetName}. Mostrando últimos ${filtered.length}.`);
      renderDashboard(filtered, chartArea, diagnosticPanel, {
        assetType: currentConnector === 'coingecko' ? 'crypto' : 'acciones'
      });

    } catch (err) {
      console.error('[ERROR] Error API:', err);
      setStatus(`Error al conectar a API: ${err.message || err}`);
      isApiConnected = false;
      btnApi.classList.remove('connected');
      updateUIState();
    }
  }

  async function disconnectAPI() {
    isApiConnected = false;
    apiData        = null;
    fullData       = null;
    btnApi.textContent = '🔌 Conectar a API';
    btnApi.classList.remove('connected');
    updateUIState();
    setStatus('API desconectada.');
    chartArea.innerHTML = `
      <div class="placeholder">
        <p class="placeholder-title">📈 Gráfica del Activo</p>
        <p class="placeholder-text">Selecciona una fuente de datos para comenzar</p>
      </div>
    `;
    diagnosticPanel.innerHTML  = '';
    diagnosticPanel.style.display = 'none';
    metricsGrid.innerHTML      = '';
    console.log('[INFO] API desconectada');
  }

  // ── Initialisation ───────────────────────────────────────────────────────────
  cryptoListData = await loadAssetList(currentConnector, {
    onStatus: setStatus,
    setSearchPlaceholder: (p) => { cryptoSearch.placeholder = p; },
    disableSearch: () => { cryptoSearch.disabled = true; }
  });
  doRenderList();
  updateUIState();

  // ── Wire components ──────────────────────────────────────────────────────────
  initAssetSearch({ cryptoSearch, cryptoList, onRenderList: doRenderList });

  initSettings({
    btnSettings, settingsModal, closeSettings, saveSettings, cancelSettings,
    scanDelay, scanLimit, selectedAssetsCount, selectAllAssets, clearAllAssets,
    getState: () => ({ scannerConfig, selectedAssetsForScan, cryptoListData }),
    setState(updates) {
      if (updates.scannerConfig      !== undefined) scannerConfig      = updates.scannerConfig;
      if (updates.selectedAssetsForScan !== undefined) selectedAssetsForScan = updates.selectedAssetsForScan;
    },
    onStatus: setStatus
  });

  // ── Event listeners ───────────────────────────────────────────────────────
  btnCsv.onclick = () => csvFile.click();
  csvFile.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Cargando CSV...');
    try {
      const raw  = await loadData({ type: 'csv', file });
      const data = normalizeData(raw);
      fullData   = data;
      const filtered = filterDataByPeriod(data, samplePeriod.value);
      setStatus(`CSV cargado: ${data.length} filas. Mostrando últimos ${filtered.length} puntos.`);
      renderDashboard(filtered, chartArea, diagnosticPanel, {
        assetType: currentConnector === 'coingecko' ? 'crypto' : 'acciones'
      });
    } catch (err) {
      console.error('[ERROR] Error CSV:', err);
      setStatus(`Error al cargar CSV: ${err.message || err}`);
    }
  };

  btnApi.onclick = async () => {
    if (isApiConnected) {
      await disconnectAPI();
    } else {
      await connectAPI();
    }
  };

  samplePeriod.addEventListener('change', () => {
    if (fullData && fullData.length > 0) {
      const filtered = filterDataByPeriod(fullData, samplePeriod.value);
      renderDashboard(filtered, chartArea, diagnosticPanel, {
        assetType: currentConnector === 'coingecko' ? 'crypto' : 'acciones'
      });
      setStatus(`Mostrando últimos ${filtered.length} puntos de ${fullData.length} totales.`);
    }
  });

  apiConnector.addEventListener('change', async () => {
    currentConnector = apiConnector.value;
    if (isApiConnected) await disconnectAPI();
    cryptoSearch.value   = '';
    selectedCrypto.value = currentConnector === 'coingecko' ? 'bitcoin' : 'AAPL';
    cryptoListData = await loadAssetList(currentConnector, {
      onStatus: setStatus,
      setSearchPlaceholder: (p) => { cryptoSearch.placeholder = p; },
      disableSearch: () => { cryptoSearch.disabled = true; }
    });
  });

  btnScanTradeOn.onclick = async () => {
    console.log('[INFO] Scan button clicked!');
    if (cryptoListData.length === 0) {
      setStatus('No hay activos cargados. Selecciona un conector API primero.');
      return;
    }

    let assetsToScan;
    if (selectedAssetsForScan.length > 0) {
      assetsToScan = cryptoListData.filter(a => selectedAssetsForScan.includes(a.id));
      console.log(`[INFO] Usando ${assetsToScan.length} activos seleccionados`);
    } else {
      assetsToScan = cryptoListData.slice(0, scannerConfig.maxAssetsToScan);
      console.log(`[INFO] Usando primeros ${assetsToScan.length}`);
    }

    const scanSource  = selectedAssetsForScan.length > 0 ? 'seleccionados manualmente' : `primeros ${scannerConfig.maxAssetsToScan} de la lista`;
    const confirmScan = confirm(
      `¿Escanear ${assetsToScan.length} activos buscando señales TRADE ON?\n\n` +
      `Esto puede tomar varios minutos y consumir límites de API.\n\n` +
      `Activos: ${scanSource}\nDelay: ${scannerConfig.delayBetweenRequests}ms`
    );
    if (!confirmScan) return;

    btnScanTradeOn.disabled = true;
    btnScanTradeOn.classList.add('scanning');
    btnScanTradeOn.textContent = '⏳ Escaneando...';

    const assetTypeForScan = currentConnector === 'coingecko' ? 'crypto' : 'acciones';
    tradeOnAssets = await runScan({
      assetsToScan,
      scannerConfig,
      currentConnector,
      assetType: assetTypeForScan,
      onProgress(scanned, total, name, found, errors) {
        setStatus(`Escaneando ${scanned}/${total}: ${name}... (Encontrados: ${found}, Errores: ${errors})`);
      },
      onTooManyErrors: () => setStatus('⚠️ Demasiados errores de API. Escaneo detenido.')
    });

    btnScanTradeOn.disabled = false;
    btnScanTradeOn.classList.remove('scanning');
    btnScanTradeOn.textContent = '🔍 Scan trade ON';

    if (tradeOnAssets.length > 0) {
      setStatus(`✅ Escaneo completo: ${tradeOnAssets.length} activos con TRADE ON`);
      renderTradeOnResults(tradeOnResults, tradeOnAssets);
      tradeOnResults.classList.remove('hidden');
    } else {
      setStatus('⚠️ Escaneo completo: ningún activo con TRADE ON');
      tradeOnResults.classList.add('hidden');
    }
  };

  tradeOnResults.addEventListener('change', async () => {
    const selectedAssetId = tradeOnResults.value;
    if (!selectedAssetId) return;
    const asset = tradeOnAssets.find(a => a.id === selectedAssetId);
    if (!asset) return;
    selectedCrypto.value = selectedAssetId;
    cryptoSearch.value   = asset.name;
    if (isApiConnected) await disconnectAPI();
    await connectAPI();
  });
});

