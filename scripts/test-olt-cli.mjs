import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const script = `
    import { Client } from 'ssh2';
    const c = new Client();
    c.on('ready', () => {
      console.log('SSH READY TO OLT');
      c.shell({ term: 'vt100', cols: 160, rows: 40 }, (err, stream) => {
        let out = '';
        stream.on('data', d => {
          out += d.toString();
          if (out.includes('>') || out.includes('#')) {
            console.log('GOT PROMPT:', out);
            c.end();
          }
        });
        stream.write('\\r\\n');
      });
    });
    c.on('error', e => console.error('SSH ERR:', e.message));
    c.connect({ host: '172.19.70.253', port: 22, username: 'admin', password: 'CloudWare1991', readyTimeout: 7000 });
  `;
  const cmd = `docker exec chatbot_app node --input-type=module -e "${script.replace(/\n/g, ' ')}"`;
  conn.exec(cmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
