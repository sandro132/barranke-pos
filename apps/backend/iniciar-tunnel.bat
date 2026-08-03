@echo off
:inicio
echo Iniciando tunel de Cloudflare...
cloudflared tunnel run barranke-pos

echo.
echo El tunel se detuvo. Reintentando en 5 segundos...
timeout /t 5 /nobreak > nul
goto inicio
