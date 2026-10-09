#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'ssh2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar configuración
const configPath = path.join(__dirname, '..', 'deploy.config.json');
let deployConfig = {
  host: process.env.DEPLOY_HOST || '2.25.241.239',
  port: parseInt(process.env.DEPLOY_PORT || '22', 10),
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASSWORD || 'CloudWare1991@',
  remoteDir: process.env.DEPLOY_DIR || '/root/chatbot',
  gitBranch: process.env.DEPLOY_BRANCH || 'main',
};

if (fs.existsSync(configPath)) {
  try {
    const fileConf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    deployConfig = { ...deployConfig, ...fileConf };
  } catch (err) {
    console.warn('⚠️ No se pudo leer deploy.config.json, usando valores por defecto.');
  }
}

console.log('\n🚀 ==========================================');
console.log('   DESPLIEGUE AUTOMÁTICO A HOSTINGER VPS');
console.log('==========================================\n');

// 1. Git push local
console.log('📦 1. Verificando y subiendo cambios a GitHub...');
try {
  execSync(`git push origin ${deployConfig.gitBranch}`, { stdio: 'inherit' });
  console.log('✅ Cambios subidos a GitHub correctamente.\n');
} catch (gitErr) {
  console.log('ℹ️ Git push ya estaba al día o no requirió cambios.\n');
}

// 2. Conectar por SSH a Hostinger
console.log(`🌐 2. Conectando por SSH a Hostinger (${deployConfig.host})...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida con éxito.');
  console.log(`📥 3. Actualizando repositorio en ${deployConfig.remoteDir} y reconstruyendo Docker...\n`);

  const remoteCommand = `
    set -e
    cd ${deployConfig.remoteDir}
    echo "--- GIT PULL ---"
    git fetch origin ${deployConfig.gitBranch}
    git reset --hard origin/${deployConfig.gitBranch}
    echo "--- DOCKER BUILD & RESTART ---"
    docker compose up -d --build chatbot_app
    echo "--- ESTADO DE CONTENEDORES ---"
    docker ps --filter "name=chatbot_app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  `;

  conn.exec(remoteCommand, (err, stream) => {
    if (err) {
      console.error('❌ Error al ejecutar comando en VPS:', err);
      conn.end();
      process.exit(1);
    }

    stream.on('close', (code, signal) => {
      console.log('\n==========================================');
      if (code === 0) {
        console.log('🎉 ¡DESPLIEGUE EN HOSTINGER COMPLETADO CON ÉXITO!');
        console.log(`🌐 App activa en: http://${deployConfig.host}:3000`);
      } else {
        console.error(`❌ El despliegue terminó con código de salida: ${code}`);
      }
      console.log('==========================================\n');
      conn.end();
      process.exit(code || 0);
    });

    stream.on('data', (data) => {
      process.stdout.write(data);
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Error de conexión SSH a Hostinger:', err.message || err);
  process.exit(1);
});

conn.connect({
  host: deployConfig.host,
  port: deployConfig.port,
  username: deployConfig.username,
  password: deployConfig.password,
  readyTimeout: 30000,
});
