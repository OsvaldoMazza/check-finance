@echo off
chcp 65001 >nul
title Check Finance HTML Server
cls
echo ========================================
echo    🚀 Check Finance - HTML Version
echo ========================================
echo.
echo Servidor local para desarrollo
echo.
echo URL: http://localhost:8000
echo.
echo Presiona Ctrl+C para detener
echo ========================================
echo.

REM Verificar que Python esté disponible
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python no está instalado o no está en PATH
    echo.
    echo Soluciones:
    echo 1. Instala Python desde https://python.org
    echo 2. Asegúrate que esté en tu PATH
    echo 3. O usa: py -m http.server 8000
    echo.
    pause
    exit /b 1
)

echo ✅ Python detectado
echo.

REM Verificar que estamos en la carpeta correcta
if not exist "index.html" (
    echo ❌ ERROR: index.html no encontrado
    echo.
    echo Ejecuta este script desde la carpeta html/
    echo.
    pause
    exit /b 1
)

echo ✅ Archivos encontrados
echo.

REM Verificar si el puerto 8000 está ocupado
netstat -an | find "8000" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  ADVERTENCIA: Puerto 8000 puede estar ocupado
    echo    Intentando usar el puerto de todos modos...
    echo.
)

echo 🚀 Iniciando servidor HTTP...
echo.
echo ========================================
python -m http.server 8000