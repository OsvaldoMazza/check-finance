/**
 * Configuración centralizada de APIs
 * 
 * Este archivo es un ejemplo de configuración. Para usarlo:
 * 1. Copia este archivo a config.js: cp src/config.example.js src/config.js
 * 2. Configura tus propias API keys en config.js
 * 
 * Para obtener API keys:
 * - CoinGecko: https://www.coingecko.com/en/api (opcional, hay límites sin key)
 * - TwelveData: https://twelvedata.com (requerido para acciones/ETFs/bonos)
 * 
 * ⚠️ IMPORTANTE: No subas config.js con tus API keys a repositorios públicos
 */

export const API_CONFIG = {
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    apiKey: 'YOUR_COINGECKO_API_KEY_HERE', // Opcional - Para uso intensivo, obtén tu key en coingecko.com
    endpoints: {
      // Lista de las principales criptomonedas (Top 100 por market cap)
      coinsList: '/coins/markets',
      // Datos históricos de precio (OHLC)
      ohlc: '/coins/{id}/ohlc'
    }
  },
  twelvedata: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: 'YOUR_TWELVEDATA_API_KEY_HERE', // Requerido - Obtén tu key gratuita en twelvedata.com
    endpoints: {
      // Datos históricos OHLC (time series)
      timeSeries: '/time_series'
    },
    // Configuración por defecto para requests
    defaults: {
      interval: '1h',      // Intervalo de tiempo: 1min, 5min, 15min, 30min, 1h, 1day, 1week, 1month
      outputsize: 1000,    // Cantidad de puntos de datos (default: 30, max: 5000)
      format: 'JSON'       // Formato de respuesta: JSON, CSV
    }
  }
  // Agregar aquí otros endpoints en el futuro (ej: Binance, Alpha Vantage, etc.)
};
