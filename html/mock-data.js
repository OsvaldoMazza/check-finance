// Datos mock para desarrollo (sin APIs)
const MOCK_CRYPTO_DATA = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  { id: 'tether', name: 'Tether', symbol: 'USDT' },
  { id: 'bnb', name: 'BNB', symbol: 'BNB' },
  { id: 'solana', name: 'Solana', symbol: 'SOL' }
];

const MOCK_STOCK_DATA = [
  { id: 'AAPL', name: 'Apple Inc.', symbol: 'AAPL' },
  { id: 'MSFT', name: 'Microsoft Corporation', symbol: 'MSFT' },
  { id: 'GOOGL', name: 'Alphabet Inc.', symbol: 'GOOGL' },
  { id: 'TSLA', name: 'Tesla Inc.', symbol: 'TSLA' },
  { id: 'AMZN', name: 'Amazon.com Inc.', symbol: 'AMZN' }
];

// Modificar loadAssetList para usar datos mock si APIs fallan
async function loadAssetList(connector, { onStatus, setSearchPlaceholder, disableSearch } = {}) {
  try {
    onStatus?.('Cargando lista de activos...');
    setSearchPlaceholder?.('⌛ Cargando activos...');

    if (connector === 'coingecko') {
      try {
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
      } catch (apiErr) {
        console.warn('[WARN] API CoinGecko falló, usando datos mock:', apiErr.message);
        MOCK_CRYPTO_DATA.forEach(c => c.type = 'crypto');
        setSearchPlaceholder?.('🔍 Buscar criptomoneda (modo offline)...');
        onStatus?.(`⚠️ Modo offline: ${MOCK_CRYPTO_DATA.length} criptos mock disponibles.`);
        return MOCK_CRYPTO_DATA;
      }

    } else if (connector === 'twelvedata') {
      try {
        const stocks = await loadTwelveDataStocks();
        stocks.forEach(c => c.type = 'acciones');
        setSearchPlaceholder?.('🔍 Buscar acción/bono...');
        onStatus?.(`${stocks.length} activos disponibles. Listo para conectar.`);
        console.log(`[OK] Cargados ${stocks.length} activos desde TwelveData`);
        return stocks;
      } catch (apiErr) {
        console.warn('[WARN] API TwelveData falló, usando datos mock:', apiErr.message);
        MOCK_STOCK_DATA.forEach(c => c.type = 'acciones');
        setSearchPlaceholder?.('🔍 Buscar acción (modo offline)...');
        onStatus?.(`⚠️ Modo offline: ${MOCK_STOCK_DATA.length} acciones mock disponibles.`);
        return MOCK_STOCK_DATA;
      }
    }

    return [];

  } catch (err) {
    console.error('Error cargando lista de activos:', err);
    setSearchPlaceholder?.('❌ Error al cargar activos');
    disableSearch?.();
    onStatus?.('Error al cargar lista de activos. Usando modo offline.');

    // Fallback final: datos mock
    return connector === 'coingecko' ? MOCK_CRYPTO_DATA : MOCK_STOCK_DATA;
  }
}