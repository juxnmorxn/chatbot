import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.shell({ term: 'vt100' }, (err, stream) => {
    let out = '';
    stream.on('data', d => {
      out += d.toString('utf8');
      if (out.includes('--More--')) stream.write(' ');
    });
    setTimeout(() => {
      stream.write('enable\r\nterminal length 0\r\nshow running-config\r\n');
    }, 1000);
    setTimeout(() => {
      console.log('OLT Running Config:\n', out);
      conn.end();
    }, 6000);
  });
}).connect({
  host: '2.25.241.239',
  port: 22,
  username: 'root',
  password: 'CloudWare1991@'
});
