# Assets - Iconos de la Aplicación

Esta carpeta contiene los iconos necesarios para generar los ejecutables de la aplicación.

## Iconos Requeridos

Para generar los ejecutables correctamente, necesitas agregar los siguientes archivos de iconos:

### Windows
- **icon.ico** - Icono para Windows (debe ser un archivo .ico)
  - Resoluciones recomendadas: 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
  - Puedes crear un .ico desde un PNG usando herramientas online como [icoconvert.com](https://icoconvert.com/)

### macOS
- **icon.icns** - Icono para macOS (debe ser un archivo .icns)
  - Resoluciones recomendadas: 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16
  - Puedes crear un .icns usando [Image2icon](https://apps.apple.com/app/image2icon/id992115977) o desde terminal

### Linux
- **icon.png** - Icono para Linux (archivo PNG)
  - Resolución recomendada: 512x512 o 1024x1024
  - Formato: PNG con transparencia

## Cómo Crear Iconos

### Opción 1: Usar un Generador de Iconos Online

1. **Crea o descarga una imagen base** (PNG de 1024x1024 recomendado)
2. Usa herramientas online:
   - [icoconvert.com](https://icoconvert.com/) - Para generar .ico
   - [cloudconvert.com](https://cloudconvert.com/png-to-icns) - Para generar .icns
   - [favicon.io](https://favicon.io/) - Generador de iconos múltiples formatos

### Opción 2: Usar Electron-Icon-Builder

```bash
# Instalar electron-icon-builder globalmente
npm install -g electron-icon-builder

# Crear iconos desde una imagen PNG de 1024x1024
electron-icon-builder --input=./icon-source.png --output=./assets
```

### Opción 3: Crear Manualmente

**Para Windows (.ico):**
```bash
# Usando ImageMagick
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**Para macOS (.icns):**
```bash
# Crear iconset desde PNG
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Convertir a .icns
iconutil -c icns icon.iconset
```

## Iconos Placeholder

Si deseas generar el ejecutable sin iconos personalizados, Electron Builder usará iconos por defecto. Sin embargo, **se recomienda crear iconos personalizados** para una mejor presentación profesional.

Para evitar errores durante el build, puedes:
1. Comentar las líneas de `icon` en `package.json` → `build` config
2. O agregar iconos placeholder (cualquier imagen .ico, .icns, .png del tamaño correcto)

## Diseño Recomendado del Icono

Para Check Finance, considera:
- **Tema**: Gráficos financieros, velas japonesas, tendencias alcistas
- **Colores**: Verde/azul (asociado con finanzas y tecnología)
- **Estilo**: Moderno, minimalista, profesional
- **Fondo**: Transparente o sólido según preferencia

## Herramientas de Diseño Gratuitas

- [Figma](https://www.figma.com/) - Diseño vectorial online
- [GIMP](https://www.gimp.org/) - Editor de imágenes gratuito
- [Inkscape](https://inkscape.org/) - Editor vectorial gratuito
- [Canva](https://www.canva.com/) - Diseño rápido con templates

## Verificar Iconos

Después de agregar los iconos:
```bash
# Verificar que existen
ls -la assets/

# Deberías ver:
# icon.ico (Windows)
# icon.icns (macOS)
# icon.png (Linux)
```

Una vez agregados los iconos, ejecuta:
```bash
npm run build      # Build para la plataforma actual
npm run build:win  # Build específico para Windows
```

Los ejecutables se generarán en la carpeta `/release` con los iconos aplicados.
