# Check Finance - HTML Version

Esta es la versión HTML de Check Finance, una aplicación de análisis técnico con Ichimoku Cloud para criptomonedas y acciones.

## Características

- **Análisis Ichimoku completo**: Tenkan, Kijun, Senkou A/B, Chikou
- **Señales TRADE ON/OFF**: Basadas en puntuaciones core y bonus
- **Backtesting automático**: Con trailing stops y gap filters
- **API integrada**: CoinGecko para criptos, TwelveData para acciones
- **Scanner**: Escanea múltiples activos buscando señales TRADE ON
- **Visualización**: Gráficos interactivos con Chart.js
- **Configuración**: Personalizable delay y límites del scanner

## Cómo usar

1. **Abrir la aplicación**: Abre `index.html` en tu navegador web
2. **Cargar datos**:
   - **CSV**: Haz clic en "📊 Subir CSV" y selecciona tu archivo
   - **API**: Selecciona conector (CoinGecko/TwelveData), busca un activo y conecta
3. **Analizar**: La app automáticamente calcula Ichimoku y muestra señales
4. **Scanner**: Configura activos seleccionados y ejecuta escaneo masivo

## Archivos incluidos

- `index.html`: Aplicación completa (HTML + CSS + JS)
- `assets/twelvedata-stocks.json`: Lista de acciones disponibles

## APIs utilizadas

- **CoinGecko**: Para datos de criptomonedas (OHLC histórico)
- **TwelveData**: Para datos de acciones y ETFs (OHLC histórico)

## Limitaciones de la versión HTML

- No puede ejecutar archivos locales (CORS restrictions)
- Para usar APIs, necesitas ejecutar un servidor local:
  ```bash
  # Desde la carpeta html/
  python -m http.server 8000
  # Luego abre http://localhost:8000
  ```
- No tiene acceso al sistema de archivos (no puede leer/escribir archivos locales)
- Funciona mejor en navegadores modernos con ES6+

## Configuración de APIs

Para usar las APIs, necesitas obtener tus propias claves:

1. **CoinGecko**: https://www.coingecko.com/en/api
2. **TwelveData**: https://twelvedata.com

Edita las claves en el código fuente de `index.html` en la sección `API_CONFIG`.

## Soporte de datos

### CSV
- Formatos soportados: español (coma decimal) e inglés (punto decimal)
- Columnas detectadas automáticamente por nombre
- Fechas: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY

### API
- CoinGecko: Datos OHLCV de criptos (último año)
- TwelveData: Datos OHLCV de acciones (hasta 1000 barras)

## Algoritmos implementados

- **Ichimoku Cloud**: Cálculo optimizado O(n) con rolling max/min
- **ATR**: Average True Range para volatilidad
- **Señales**: Pullback ATR, rebote, Chikou, volumen
- **Regime detection**: Trend vs Range basado en Kijun slope
- **Auto-calibración**: Parámetros adaptados al instrumento
- **Backtest**: Trailing stops con gap filter

## Navegadores soportados

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requiere JavaScript habilitado y CORS relajado para desarrollo local.