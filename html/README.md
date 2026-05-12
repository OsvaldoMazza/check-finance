# 🚀 Check Finance - Versión HTML

## ✅ Cómo ejecutar correctamente

### Opción 1: Servidor automático (Recomendado)
```bash
# Desde la carpeta html/
./start-server.bat
```
Esto automáticamente:
- Inicia servidor HTTP en puerto 8000
- Abre tu navegador predeterminado
- Muestra instrucciones en pantalla

### Opción 2: Servidor manual
```bash
# Desde la carpeta html/
python -m http.server 8000

# Luego abrir manualmente:
# http://localhost:8000
```

### Opción 3: Otros servidores
```bash
# Node.js
npx http-server html -p 8000

# PHP
cd html && php -S localhost:8000
```

## 🔧 Solución de problemas

### Error: "Access to fetch blocked by CORS policy"
**Causa**: Estás abriendo `index.html` directamente desde el explorador de archivos (file://)
**Solución**: Usa un servidor HTTP local como se indica arriba

**Solución alternativa**: Si no puedes usar servidor, la app incluye datos mock para desarrollo

### Error: "Unsafe attempt to load URL file://"
**Causa**: Navegadores modernos bloquean file:// URLs por seguridad
**Solución**: Usa http://localhost:8000

### Error: "429 Too Many Requests"
**Causa**: Límite de API excedido
**Solución**:
- Espera unos minutos
- Obtén tu propia API key gratuita
- La app automáticamente usa datos mock si las APIs fallan

## 📋 Configuración de APIs

Para usar las APIs sin límites:

1. **CoinGecko**: https://www.coingecko.com/en/api
   - Obtén API key gratuita
   - Edita `API_CONFIG.coingecko.apiKey` en `index.html`

2. **TwelveData**: https://twelvedata.com
   - Obtén API key gratuita (500 requests/día)
   - Edita `API_CONFIG.twelvedata.apiKey` en `index.html`

## 🎯 Funcionalidades disponibles

- ✅ **Carga CSV**: Arrastra o selecciona archivos
- ✅ **API CoinGecko**: Datos de criptomonedas
- ✅ **API TwelveData**: Datos de acciones y ETFs
- ✅ **Modo offline**: Datos mock incluidos para desarrollo
- ✅ **Análisis Ichimoku**: Señales TRADE ON/OFF
- ✅ **Backtesting**: Equity curves y métricas
- ✅ **Scanner**: Escaneo masivo de activos
- ✅ **Gráficos**: Price, Equity y Volume charts

## 🌐 Navegadores compatibles

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## ⚠️ Limitaciones

- Requiere conexión a internet para APIs
- No puede guardar archivos localmente
- Funciona solo con servidor HTTP local
- No tiene acceso al sistema de archivos

## 🆘 Si aún no funciona

1. Verifica que Python esté instalado: `python --version`
2. Verifica que el puerto 8000 no esté ocupado
3. Intenta con otro navegador
4. Revisa la consola del navegador (F12) para errores específicos

¿Sigues teniendo problemas? Comparte el error específico de la consola del navegador.

---

**Nota**: Esta versión HTML incluye datos mock para desarrollo, por lo que funciona incluso sin conexión a internet o con problemas de CORS.