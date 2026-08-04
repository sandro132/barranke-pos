@echo off
REM Arranca el backend de Barranke Rock POS, y si se cierra o falla por
REM cualquier motivo, lo vuelve a prender solo después de 5 segundos.
REM Pensado para usarse con el Programador de Tareas de Windows,
REM configurado para correr "Al iniciar sesión" o "Al iniciar el sistema".

cd /d "%~dp0"

:inicio
echo Iniciando Barranke Rock POS...
call npm run start

echo.
echo El servidor se detuvo. Reintentando en 5 segundos...
timeout /t 5 /nobreak > nul
goto inicio
