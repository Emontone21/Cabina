@echo off
title tiesme MAQUETA DE MUNDOS - servidor (no cerrar mientras se usa)
cd /d "%~dp0"
rem Cabina de 3 actos (carton). Usa el mismo servidor que el tracking (sirve toda la carpeta SPOT CABINA).
rem Si ABRIR_TEST.bat ya esta abierto, el servidor ya corre: igual se abre la pagina de los 3 actos.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8090/3.%%20experiencia/mundos_3actos.html'"
node "..\2. tracking webcam\servidor.js" --no-open
pause
