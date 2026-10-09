/**
 * Hostinger & Production Node.js Entrypoint
 * Este archivo permite a Hostinger (hPanel / PM2 / CloudLinux) arrancar la aplicación
 * con 'node server.js' o seleccionando server.js como archivo de inicio en hPanel.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, 'dist', 'server.js');

if (fs.existsSync(distPath)) {
  await import('./dist/server.js');
} else {
  console.error('[Hostinger Entrypoint] Error: dist/server.js no fue encontrado.');
  console.error('Ejecuta primero: npm run build');
  process.exit(1);
}
