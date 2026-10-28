import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
conn.on('ready', () => {
  console.log('[VPS] Conectado. Subiendo dist/olt-server.js y public/app.js...');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    // Subir dist/server.js
    const serverJsStream = fs.createReadStream('dist/server.js');
    const remoteServerJs = sftp.createWriteStream('/tmp/server.js');
    serverJsStream.pipe(remoteServerJs);

    remoteServerJs.on('close', () => {
      console.log('[VPS] Subido /tmp/server.js');

      // Subir dist/olt-server.js
      const oltServerStream = fs.createReadStream('dist/olt-server.js');
      const remoteOltServer = sftp.createWriteStream('/tmp/olt-server.js');
      oltServerStream.pipe(remoteOltServer);

      remoteOltServer.on('close', () => {
        console.log('[VPS] Subido /tmp/olt-server.js');

        // Subir public/app.js
        const appJsStream = fs.createReadStream('olt-manager/public/app.js');
        const remoteAppJs = sftp.createWriteStream('/tmp/app.js');
        appJsStream.pipe(remoteAppJs);

        remoteAppJs.on('close', () => {
          console.log('[VPS] Subido /tmp/app.js');

          // Copiar dentro del contenedor chatbot_app y reiniciar el contenedor
          const cmd = `
            docker cp /tmp/server.js chatbot_app:/app/dist/server.js
            docker cp /tmp/olt-server.js chatbot_app:/app/dist/olt-server.js
            docker cp /tmp/app.js chatbot_app:/app/public/app.js
            docker cp /tmp/app.js chatbot_app:/app/dist/public/app.js
            docker cp /tmp/app.js chatbot_app:/app/olt-manager/public/app.js
            docker restart chatbot_app
            sleep 4
            docker logs --tail 25 chatbot_app
          `;

          conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.pipe(process.stdout);
            stream.stderr.pipe(process.stderr);
            stream.on('close', () => {
              console.log('[VPS] ¡Deploy directo finalizado con éxito!');
              conn.end();
            });
          });
        });
      });
    });
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
