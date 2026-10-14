#!/bin/sh
set -e

echo "[GenieACS] Conectando a MongoDB en ${GENIEACS_MONGODB_CONNECTION_URL:-mongodb://genieacs_mongo:27017/genieacs}..."

echo "[GenieACS] Iniciando servidor CWMP TR-069 en puerto 7547..."
genieacs-cwmp &
PID_CWMP=$!

echo "[GenieACS] Iniciando Northbound API (NBI) en puerto 7557..."
genieacs-nbi &
PID_NBI=$!

echo "[GenieACS] Iniciando File Server (FS) en puerto 7567..."
genieacs-fs &
PID_FS=$!

echo "[GenieACS] Iniciando UI Panel en puerto 7558..."
genieacs-ui --port 7558 &
PID_UI=$!

echo "[GenieACS] Todos los servicios de TR-069 activos correctamente."

# Manejo de señales de terminación
trap "kill $PID_CWMP $PID_NBI $PID_FS $PID_UI; exit 0" SIGINT SIGTERM

wait -n $PID_CWMP $PID_NBI $PID_FS $PID_UI
