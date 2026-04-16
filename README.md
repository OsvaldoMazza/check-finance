# Check Finance App

Aplicación de escritorio para análisis financiero con gráficos de Ichimoku, basada en el sistema Quant Engine.

## Características

- 📊 **Carga de datos desde CSV** (formato español e inglés, con detección automática)
- 🔌 **Múltiples conectores API**:
  - **CoinGecko**: 100+ criptomonedas (Bitcoin, Ethereum, etc.)
  - **TwelveData**: Acciones, ETFs y bonos (AAPL, SPY, TLT, etc.)
- 🔍 **Buscador de activos** con filtrado en tiempo real
- ⏱️ **Filtro de período** (Muestras): 1-90 días para análisis enfocado
- �📈 **Análisis técnico con Ichimoku Cloud** (Tenkan, Kijun, Senkou A/B, Chikou)
- 🎯 **Sistema de scoring avanzado** (100 pts core + 20 pts bonus)
- 📉 **Backtest con trailing stop** basado en Kijun fast, timeout 60 barras
- 🔍 **Detección de régimen** de mercado (TREND vs RANGE)
- 🕯️ **Patrones de reversión** alcista (ENGULFING, HAMMER/PIN)
- 📊 **Confirmación de volumen** durante pullback
- 💹 **Panel de métricas**: Win Rate, Expectancy, Drawdown, señales históricas
- 🩺 **Panel de diagnóstico**: análisis detallado de la última barra con condiciones y scores
- 🎨 **Visualización gráfica** interactiva con Chart.js
- 💻 **Aplicación de escritorio** nativa con Electron
- 🎯 **Detección automática de formato** de números (punto/coma decimal)

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

## Generar Ejecutable

Check Finance puede empaquetarse como aplicación standalone para distribuir sin necesidad de Node.js o npm.

### Comando Rápido

```bash
# Generar ejecutable para tu plataforma actual
npm run build
```

### Comandos por Plataforma

```bash
npm run build:win    # Windows (EXE + instalador NSIS)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

### Salida

Los ejecutables se generan en la carpeta `/release`:
- **Windows**: `Check Finance Setup 1.0.0.exe` (instalador)
- **macOS**: `Check Finance-1.0.0.dmg`
- **Linux**: `Check Finance-1.0.0.AppImage`

### Documentación Completa

Ver [BUILD_GUIDE.md](BUILD_GUIDE.md) para:
- Configuración de iconos personalizados
- Opciones avanzadas de empaquetado
- Troubleshooting
- Distribución y despliegue

## Uso

### Cargar CSV

1. Haz clic en **"📊 Subir CSV"**
2. Selecciona un archivo CSV con datos históricos de precios
3. El archivo debe contener columnas: Fecha, Apertura/Open, Máximo/High, Mínimo/Low, Último/Close
4. Se mostrará la gráfica con Ichimoku y una tabla con los primeros 10 registros

**Formato soportado:**
- CSV con comas como separador
- Números con punto o coma decimal
- Columnas en español (Fecha, Último, Apertura, Máximo, Mínimo) o inglés (Date, Open, High, Low, Close)

### Conectar a API (CoinGecko)

1. Al cargar la aplicación, automáticamente se descarga la lista de **Top 100 criptomonedas** por capitalización de mercado
2. **Busca la criptomoneda deseada** escribiendo en el campo de búsqueda:
   - Escribe el nombre, símbolo o ID de la cripto (ej: "eth", "ethereum", "solana")
   - La lista se filtra automáticamente mientras escribes
   - Haz clic en el campo para ver la lista completa
3. **Selección automática**: Al hacer clic en una criptomoneda de la lista:
   - Se conecta automáticamente a la API
   - Descarga datos de los últimos 90 días
   - Renderiza el análisis completo con Ichimoku
4. **El botón API cambiará a color celeste** cuando esté conectado
5. Para cambiar de criptomoneda, simplemente selecciona otra del dropdown (se reconectará automáticamente)
6. Haz clic en **"🔴 Desconectar API"** para limpiar los datos

**Criptomonedas disponibles:**
- Top 100 por capitalización de mercado según CoinGecko
- Incluye: Bitcoin (BTC), Ethereum (ETH), XRP, Solana (SOL), Cardano (ADA), y más
- Actualizado en tiempo real al cargar la aplicación
- **Buscador integrado** con filtrado en tiempo real

**Endpoint utilizado:**
- `/coins/markets` - Lista de criptomonedas con datos de mercado
- `/coins/{id}/market_chart` - Datos históricos OHLC de la criptomoneda seleccionada

**Configuración:**
- API keys y parámetros se configuran en [`src/config.js`](src/config.js)
- CoinGecko tiene una API key incluida. Para uso intensivo, obtén tu propia key en [coingecko.com](https://www.coingecko.com/en/api) y configúrala en `API_CONFIG.coingecko.apiKey`

### Conectar a API (TwelveData)

1. Selecciona **"API: TwelveData (Acciones/Bonos)"** en el dropdown de conectores
2. Automáticamente se carga una lista curada de **activos populares**:
   - Acciones: AAPL, MSFT, GOOGL, AMZN, TSLA, etc.
   - ETFs: SPY, QQQ, DIA, VTI, etc.
   - Bonos (ETFs): TLT, IEF, SHY, AGG, LQD, etc.
   - Commodities: GLD (oro), SLV (plata), USO (petróleo)
3. **Busca el activo deseado** escribiendo en el campo de búsqueda:
   - Escribe el nombre o símbolo (ej: "AAPL", "Apple", "SPY")
   - La lista se filtra automáticamente mientras escribes
4. **Selección automática**: Al hacer clic en un activo:
   - Se conecta automáticamente a TwelveData API
   - Descarga datos de los últimos 90 días (1 día por barra)
   - Renderiza el análisis completo con Ichimoku
5. El botón API cambiará a color celeste cuando esté conectado
6. Para cambiar de activo, simplemente selecciona otro del dropdown

**Activos disponibles:**
- **Tech Giants**: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, NFLX
- **Finance**: JPM, BAC, GS, V, MA
- **Industrial**: BA, CAT, GE
- **Healthcare**: JNJ, PFE, UNH
- **Consumer**: WMT, HD, DIS, MCD, NKE, SBUX
- **Energy**: XOM, CVX
- **ETFs**: SPY, QQQ, DIA, IWM, VTI
- **Bonos (ETFs)**: TLT, IEF, SHY, AGG, LQD
- **Commodities**: GLD, SLV, USO

**Endpoint utilizado:**
- `https://api.twelvedata.com/time_series?symbol={SYMBOL}&interval=1day&outputsize=90`

**API Key incluida:** La aplicación incluye una API key de prueba. Para uso intensivo, obtén tu propia key en [twelvedata.com](https://twelvedata.com) y configúrala en `src/config.js` → `API_CONFIG.twelvedata.apiKey`

**Configuración:**
- API keys y parámetros se configuran en [`src/config.js`](src/config.js)
- Puedes modificar: `apiKey`, `interval` (1min, 1h, 1day, etc.), `outputsize` (cantidad de puntos)

### Filtrar Período de Muestras

Usa el dropdown **"Muestras"** para controlar cuántos datos se muestran en el gráfico y se usan en los cálculos:

**Opciones disponibles:**
- **Todos los datos** - Muestra todos los puntos cargados (CSV completo o 90 días de API)
- **1 día** - Sólo el último punto de datos
- **3 días** - Últimos 3 puntos
- **7 días** - Última semana
- **15 días** - Últimas 2 semanas
- **30 días** - Último mes (seleccionado por defecto)
- **60 días** - Últimos 2 meses
- **90 días** - Últimos 3 meses

**Cómo funciona:**
1. Selecciona un período del dropdown "Muestras"
2. El gráfico y todos los cálculos se actualizan automáticamente
3. Se muestran solo los **últimos N días** del conjunto de datos
4. Ichimoku, ATR, backtest y señales se recalculan con los datos filtrados

**Ventajas:**
- Análisis enfocado en períodos recientes
- Mayor velocidad de cálculo con menos datos
- Identificación de señales en diferentes timeframes

**Estados del botón:**
- 🔌 **Desconectado**: Botón gris con borde celeste - "Conectar a API"
- 🔴 **Conectado**: Botón celeste sólido con efecto glow - "Desconectar API"

## Panel de Métricas y Diagnóstico

### Grid de Métricas (12 tarjetas)

Después de cargar datos, se muestra un panel con 12 métricas clave:

1. **Señales históricas** - Total de señales detectadas en el backtest
2. **Win Rate** - Porcentaje de operaciones ganadoras (verde ≥50%)
3. **Expectancy** - R esperado por operación (verde si >0)
4. **Total acumulado** - R total del backtest
5. **Max Drawdown** - Máxima pérdida consecutiva en R
6. **Régimen actual** - TREND (alcista) o RANGE (lateral)
7. **Core score** - Puntuación de condiciones principales (/100)
8. **Total score** - Puntuación total con bonus (/120)
9. **ATR(14) actual** - Average True Range de la última barra
10. **Pullback (ATR)** - Tipo de retroceso: SUPERFICIAL, NORMAL, PROFUNDO
11. **Patrón reversal** - Patrón de vela detectado (ENGULFING, HAMMER/PIN)
12. **Volumen pullback** - Confirmación de volumen reducido

### Panel de Diagnóstico - Última Barra

Análisis detallado de la última barra con sistema de scoring:

**Condiciones Core (máx 100 pts):**
- ✔️ **Tendencia** (25 pts) - Tenkan > Kijun & precio > Kijun
- ✔️ **Nube** (25 pts) - Precio sobre nube alcista en expansión
- ✔️ **Pullback ATR** (20 pts) - SUPERFICIAL: 20 pts, NORMAL: 10 pts
- ✔️ **Rebote** (15 pts) - Close > Kijun fast TF
- ✔️ **Chikou** (15 pts) - Chikou despejado (sin cruce con precios)

**Confirmaciones Adicionales (bonus máx +20 pts):**
- ⊕ **Patrón reversal** (+10 pts) - Vela ENGULFING o HAMMER/PIN
- ⊕ **Volumen pullback** (+10 / -8 pts) - Volumen < 80% media (+) o alto (-)

**Barras de progreso:**
- **Core score**: Mínimo 70/100 requerido
- **Total score**: Mínimo 80/120 requerido
- Colores dinámicos: verde (cumple), amarillo (intermedio), rojo (no cumple)

**Umbrales de entrada:**
- Core ≥ 70/100
- Total ≥ 80/120
- Régimen = TREND

## Estructura del proyecto

```
check-finance/
├── src/
│   ├── calculate/        # Funciones de análisis (Ichimoku, ATR, backtest)
│   ├── render/           # Componentes de visualización (gráficos)
│   ├── main.js           # Punto de entrada de la app
│   └── config.js         # Configuración de APIs
├── reference/            # Archivos de referencia
├── index.html            # HTML principal para Electron
├── main.js               # Entry point de Electron
└── package.json
```

## Formato CSV soportado

### Formato español (Investing.com)
```csv
Fecha,Último,Apertura,Máximo,Mínimo,Vol.
14.04.2026,364,20,357,67,367,63,354,77,59,98M
```

### Formato inglés
```csv
Date,Open,High,Low,Close,Volume
2026-04-14,357.67,367.63,354.77,364.20,59980000
```

## Tecnologías

- Electron - Framework de aplicaciones de escritorio
- Chart.js - Librería de gráficos
- PapaParse - Parser de CSV
- ES6 Modules - Organización modular del código

## Licencia

ISC
