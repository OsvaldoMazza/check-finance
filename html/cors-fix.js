// Función mejorada para desarrollo local
async function loadFromAPI(apiConfig) {
  const { endpoint, params, apiKey } = apiConfig;
  let url = `${API_CONFIG.coingecko.baseUrl}${endpoint}`;
  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }

  const headers = {};
  if (apiKey) headers['x-cg-pro-api-key'] = apiKey;

  try {
    // Intentar fetch normal primero
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn('[WARN] Fetch directo falló:', err.message);

    // Fallback: intentar con CORS proxy (solo para desarrollo)
    try {
      console.log('[INFO] Intentando con CORS proxy...');
      const corsProxy = 'https://cors-anywhere.herokuapp.com/';
      const proxyUrl = corsProxy + url;
      const res = await fetch(proxyUrl, { headers });

      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (proxyErr) {
      console.error('[ERROR] CORS proxy también falló:', proxyErr.message);

      // Último fallback: datos mock para desarrollo
      console.warn('[WARN] Usando datos mock para desarrollo');
      return [
        {
          id: 'bitcoin',
          name: 'Bitcoin',
          symbol: 'BTC',
          current_price: 45000,
          market_cap: 850000000000
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          symbol: 'ETH',
          current_price: 2800,
          market_cap: 330000000000
        },
        {
          id: 'tether',
          name: 'Tether',
          symbol: 'USDT',
          current_price: 1,
          market_cap: 95000000000
        }
      ];
    }
  }
}