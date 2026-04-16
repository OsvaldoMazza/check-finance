// src/calculate/dataLoader.js
// Carga datos desde CSV o API (CoinGecko)
import { API_CONFIG } from '../config.js';

export async function loadData(sourceConfig) {
  if (sourceConfig.type === 'csv') {
    return await loadCSV(sourceConfig.file);
  } else if (sourceConfig.type === 'api') {
    return await loadFromAPI(sourceConfig.apiConfig);
  }
  throw new Error('Fuente de datos no soportada');
}

// --- CSV ---
export async function loadCSV(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject('No se proporcionó archivo CSV');
    const reader = new FileReader();
    reader.onload = e => {
      // PapaParse debe estar disponible globalmente
      const parsed = window.Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
      resolve(parsed.data);
    };
    reader.onerror = () => reject('Error leyendo archivo CSV');
    reader.readAsText(file);
  });
}

// --- API (CoinGecko) ---
export async function loadFromAPI(apiConfig) {
  // apiConfig: { endpoint, params, apiKey }
  const { endpoint, params, apiKey } = apiConfig;
  let url = `${API_CONFIG.coingecko.baseUrl}${endpoint}`;
  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }
  const headers = {};
  if (apiKey) headers['x-cg-pro-api-key'] = apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Error al obtener datos de la API');
  return await res.json();
}
