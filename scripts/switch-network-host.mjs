import { Client } from 'ssh2';

const composeContent = `services:
  mc-bedrock:
    image: itzg/minecraft-bedrock-server:latest
    container_name: mc-bedrock
    restart: unless-stopped
    network_mode: host
    environment:
      - EULA=TRUE
      - SERVER_NAME=Jux Nube
      - GAMEMODE=survival
      - DIFFICULTY=normal
      - LEVEL_NAME=jux
      - ONLINE_MODE=false
      - ALLOW_LIST=false
      - WHITE_LIST=false
      - ALLOW_CHEATS=true
      - MAX_PLAYERS=10
      - VIEW_DISTANCE=10
    volumes:
      - /opt/minecraft-bedrock/data:/data

  mc-web:
    build: /opt/minecraft-bedrock/web
    container_name: mc-web
    restart: unless-stopped
    network_mode: host
    volumes:
      - /opt/minecraft-bedrock/data:/data
      - /opt/minecraft-bedrock/backups:/backups
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - PORT=8585
      - SERVER_IP=2.25.241.239
      - BEDROCK_PORT=19132
`;

const c = new Client();
c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) { console.error(err); c.end(); return; }
    const ws = sftp.createWriteStream('/opt/minecraft-bedrock/docker-compose.yml');
    ws.on('close', () => {
      console.log('docker-compose.yml updated with network_mode: host');
      c.exec('cd /opt/minecraft-bedrock && docker compose down && docker compose up -d', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', code => {
          console.log('\nDone with code:', code);
          c.end();
        });
      });
    });
    ws.end(composeContent);
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
