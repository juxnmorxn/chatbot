import net from 'net';

function executeTelnet(host, port, user, pass, commands, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let output = '';
    let buffer = '';
    let stage = 'init';
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      try { client.destroy(); } catch {}
    };

    timer = setTimeout(() => {
      cleanup();
      if (output.trim()) resolve(output);
      else reject(new Error(`Timeout Telnet (${timeoutMs}ms)`));
    }, timeoutMs);

    client.connect(port || 23, host, () => {});

    client.on('data', (data) => {
      const chunk = data.toString('latin1');
      buffer += chunk;
      output += chunk;

      if (stage === 'init' && buffer.includes('User:')) {
        stage = 'pass_wait';
        client.write(user + '\r\n');
        buffer = '';
      } else if (stage === 'pass_wait' && buffer.includes('Password:')) {
        stage = 'login_wait';
        client.write(pass + '\r\n');
        buffer = '';
      } else if (stage === 'login_wait' && (buffer.includes('>') || buffer.includes('#'))) {
        if (buffer.includes('>')) {
          stage = 'enable_sent';
          client.write('enable\r\n');
          buffer = '';
        } else {
          stage = 'exec';
          runCommands();
        }
      } else if (stage === 'enable_sent' && buffer.includes('#')) {
        stage = 'exec';
        runCommands();
      }
    });

    function runCommands() {
      const cmds = ['terminal length 0', ...commands.trim().split('\n').map(c => c.trim()).filter(Boolean)];
      let delay = 100;
      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        setTimeout(() => {
          try { client.write(cmd + '\r\n'); } catch {}
          if (i === cmds.length - 1) {
            setTimeout(() => {
              try { client.write('exit\r\n'); } catch {}
              setTimeout(() => {
                cleanup();
                resolve(output);
              }, 800);
            }, 1500);
          }
        }, delay);
        delay += 350;
      }
    }

    client.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

async function main() {
  const res = await executeTelnet(
    '172.19.70.253',
    23,
    'admin',
    'CloudWare1991',
    'config\ninterface gpon 1/0/1\nont ?\nexit\nend\n'
  );
  console.log('--- COMMANDS UNDER INTERFACE GPON ---');
  console.log(res);
}

main().catch(console.error);
