@echo off
REM Arranca el tunel de Cloudflare para Barranke Rock POS, y si se cae por
REM cualquier motivo, lo vuelve a prender solo despues de 5 segundos.
REM Pensado para usarse con el Programador de Tareas de Windows,
REM configurado igual que iniciar-servidor.bat (Al iniciar sesion).

:inicio
echo Iniciando tunel de Cloudflare...
cloudflared tunnel run barranke-pos

echo.
echo El tunel se detuvo. Reintentando en 5 segundos...
timeout /t 5 /nobreak > nul
goto inicio
