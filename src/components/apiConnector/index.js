// src/components/apiConnector/index.js
// Loads asset lists and fetches OHLC data from CoinGecko or TwelveData

import { API_CONFIG } from '../../config.js';
import { loadData }   from '../../calculate/dataLoader.js';

/**
 * Loads the asset list for the given connector.
 *
 * @param {string} connector - 'coingecko' | 'twelvedata'
 * @param {object} callbacks
 * @param {function} callbacks.onStatus          - (msg) => void
 * @param {function} callbacks.setSearchPlaceholder - (placeholder) => void
 * @param {function} [callbacks.disableSearch]   - () => void
 * @returns {Promise<Array>}
 */
export async function loadAssetList(connector, { onStatus, setSearchPlaceholder, disableSearch } = {}) {
  try {
    onStatus?.('Cargando lista de activos...');
    setSearchPlaceholder?.('⌛ Cargando activos...');

    if (connector === 'coingecko') {
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
      coins.forEach(c => c.type = 'crypto');
      setSearchPlaceholder?.('🔍 Buscar criptomoneda...');
      onStatus?.(`${coins.length} criptomonedas disponibles. Listo para conectar.`);
      console.log(`[OK] Cargadas ${coins.length} criptomonedas desde CoinGecko`);
      return coins;

    } else if (connector === 'twelvedata') {
      const stocks = await loadTwelveDataStocks();
      stocks.forEach(c => c.type = 'acciones');
      setSearchPlaceholder?.('🔍 Buscar acción/bono...');
      onStatus?.(`${stocks.length} activos disponibles. Listo para conectar.`);
      console.log(`[OK] Cargados ${stocks.length} activos desde TwelveData`);
      return stocks;
    }

    return [];

  } catch (err) {
    console.error('Error cargando lista de activos:', err);
    setSearchPlaceholder?.('❌ Error al cargar activos');
    disableSearch?.();
    onStatus?.('Error al cargar lista de activos. Intenta recargar la página.');
    return [];
  }
}

/**
 * Loads the curated TwelveData stocks list from the bundled JSON file.
 * @returns {Promise<Array>}
 */
export async function loadTwelveDataStocks() {
  try {
    const response = await fetch('./assets/twelvedata-stocks.json');
    const assets   = await response.json();
    console.log(`[OK] Cargados ${assets.length} activos desde JSON`);
    return assets;
  } catch (err) {
    console.error('[ERROR] Error cargando lista de activos desde JSON:', err);
    return [];
  }
}

/**
 * Fetches OHLC data for a single asset.
 *
 * @param {string} assetId        - Asset identifier (e.g. 'bitcoin' or 'AAPL')
 * @param {string} currentConnector - 'coingecko' | 'twelvedata'
 * @returns {Promise<Array|null>}  Normalized OHLC rows or null on error
 */
export async function fetchAssetData(assetId, currentConnector) {
  try {
    console.log(`🔍 Fetching data for ${assetId} using ${currentConnector}...`);

    if (currentConnector === 'coingecko') {
      const apiConfig = {
        endpoint: `/coins/${assetId}/ohlc`,
        params: { vs_currency: 'usd', days: '365' },
        apiKey: API_CONFIG.coingecko.apiKey
      };
      const raw = await loadData({ type: 'api', apiConfig });
      if (!raw || !Array.isArray(raw)) {
        console.error(`Invalid data format for ${assetId}:`, raw);
        return null;
      }
      const data = raw.map(candle => ({
        date:   new Date(candle[0]).toISOString().slice(0, 10),
        open:   candle[1],
        high:   candle[2],
        low:    candle[3],
        close:  candle[4],
        volume: null
      }));
      console.log(`✅ Processed ${data.length} bars for ${assetId}`);
      return data;

    } else if (currentConnector === 'twelvedata') {
      const { apiKey, baseUrl, endpoints: { timeSeries: endpoint }, defaults } = API_CONFIG.twelvedata;
      const url = `${baseUrl}${endpoint}?apikey=${apiKey}&symbol=${assetId}&interval=${defaults.interval}&outputsize=${defaults.outputsize}&format=${defaults.format}`;
      const response = await fetch(url);
      const raw      = await response.json();

      if (raw.status === 'error') throw new Error(raw.message || 'Error en TwelveData API');
      if (!raw.values || !Array.isArray(raw.values)) {
        console.error(`Invalid TwelveData format for ${assetId}:`, raw);
        return null;
      }

      const data = raw.values.map(item => ({
        date:   item.datetime,
        open:   parseFloat(item.open),
        high:   parseFloat(item.high),
        low:    parseFloat(item.low),
        close:  parseFloat(item.close),
        volume: parseFloat(item.volume)
      })).reverse();

      console.log(`✅ Processed ${data.length} bars for ${assetId}`);
      return data;
    }

    return null;
  } catch (err) {
    console.error(`❌ Error fetching ${assetId}:`, err);
    return null;
  }
}
