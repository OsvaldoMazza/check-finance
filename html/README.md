# 🚀 Check Finance - Versión HTML

## ✅ Funciona completamente OFFLINE

Esta versión HTML incluye **datos mock integrados** que permiten usar la aplicación completa sin conexión a internet o problemas de CORS.

## 🎯 Funcionalidades disponibles OFFLINE

- ✅ **Carga CSV**: Arrastra o selecciona archivos
- ✅ **Análisis Ichimoku**: Señales TRADE ON/OFF completas
- ✅ **Backtesting**: Equity curves y métricas realistas
- ✅ **Scanner**: Escaneo masivo (simulado)
- ✅ **Gráficos**: Price, Equity y Volume charts
- ✅ **5 Criptomonedas**: BTC, ETH, USDT, BNB, SOL
- ✅ **5 Acciones**: AAPL, MSFT, GOOGL, TSLA, AMZN
- ✅ **150 días de datos**: Suficientes para análisis completo

## ✅ Cómo usar (sin servidor necesario)

### Opción 1: Abrir directamente
```bash
# Simplemente abre index.html en tu navegador
# Funciona completamente offline
```

### Opción 2: Servidor local (recomendado)
```bash
cd html
./start-server.bat
# O manualmente: python -m http.server 8000
```

## 🔧 APIs opcionales (para datos reales)

Si quieres usar datos reales, obtén API keys gratuitas:

1. **CoinGecko**: https://www.coingecko.com/en/api
   - Edita `API_CONFIG.coingecko.apiKey` en `index.html`

2. **TwelveData**: https://twelvedata.com
   - Edita `API_CONFIG.twelvedata.apiKey` en `index.html`

**Nota**: Si las APIs fallan, automáticamente usa datos mock.

## 🎮 Modo de uso

1. **Selecciona conector**: CoinGecko o TwelveData
2. **Busca activo**: Lista se carga automáticamente (mock si offline)
3. **Conecta**: Hace análisis completo con datos mock
4. **Explora**: Ver señales, backtest, gráficos
5. **Scanner**: Prueba escaneo masivo (usa datos mock)

## 🌟 Ventajas de la versión HTML

- ✅ **Sin instalación**: Solo abrir en navegador
- ✅ **Sin dependencias**: Todo incluido
- ✅ **Funciona offline**: Datos mock integrados
- ✅ **Código fuente visible**: Fácil de modificar
- ✅ **Compatible**: Todos los navegadores modernos
- ✅ **Sin CORS**: No necesita servidor para funcionar

## 📊 Datos incluidos

### Criptomonedas (150 días cada una)
- **BTC**: $45,000 base price
- **ETH**: $2,800 base price
- **USDT**: $1.00 (stable)
- **BNB**: $300 base price
- **SOL**: $120 base price

### Acciones (150 días cada una)
- **AAPL**: $180 base price
- **MSFT**: $380 base price
- **GOOGL**: $140 base price
- **TSLA**: $250 base price
- **AMZN**: $155 base price

Todos incluyen datos OHLCV realistas con volatilidad apropiada.

## 🆘 Si aún no funciona

1. Verifica que usas un navegador moderno (Chrome, Firefox, Edge)
2. Abre `index.html` directamente desde el explorador de archivos
3. Revisa la consola (F12) si hay errores
4. Los datos mock se cargan automáticamente

¿Sigues teniendo problemas? La aplicación debería funcionar completamente offline ahora.