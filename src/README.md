
# src

Carpeta principal de código fuente de la app gráfica de análisis financiero.

- `render/`: Componentes de UI y gráficos.
- `calculate/`: Lógica de análisis y carga de datos.
- `main.js`: Punto de entrada de la aplicación.
- `config.js`: Configuración de endpoints y API-KEY.

## Dependencias externas

Para que los gráficos y el parseo de CSV funcionen, incluye en tu HTML principal:

```
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

Esto hará disponibles `window.Chart` y `window.Papa` para los módulos.
