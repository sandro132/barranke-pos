@echo off
cd /d "%~dp0"

:inicio
echo Iniciando Barranke Rock POS...
call npm run start

echo.
echo El servidor se detuvo. Reintentando en 5 segundos...
timeout /t 5 /nobreak > nul
goto inicio
