@echo off
REM Automatiza la publicación de un nuevo release en GitHub Actions
cd /d "%~dp0"
node scripts\release.mjs
if errorlevel 1 (
    echo.
    echo Ocurrio un error al publicar el release.
    pause
    exit /b 1
)
pause
