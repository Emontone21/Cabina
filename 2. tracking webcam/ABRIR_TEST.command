#!/bin/bash
# Gemelo para Mac de ABRIR_TEST.bat: arranca el servidor del tracking (puerto 8090) y abre la pagina en Chrome.
# Doble clic para abrir. No cerrar esta ventana mientras se usa (cerrarla apaga el servidor).
# Plan B si el doble clic no anda: en la Terminal escribir "bash " (con espacio), arrastrar este archivo y Enter.
cd "$(dirname "$0")" || exit 1
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
if ! command -v node >/dev/null 2>&1; then
  echo "No encuentro Node. Hay que instalarlo (nodejs.org) y volver a abrir este archivo."
  read -n 1 -s -r -p "Toca una tecla para cerrar."
  exit 1
fi
# El servidor abre el navegador con un comando de Windows; en la Mac lo abre este archivo.
URL="http://localhost:8090/"
(sleep 2; open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL") &
node servidor.js --no-open
echo
read -n 1 -s -r -p "Toca una tecla para cerrar esta ventana."
