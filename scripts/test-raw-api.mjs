import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://olt.cloudwaremx.com/api/olts/test-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: '172.19.60.2',
        port: 22,
        username: 'admin',
        password: '',
        tunnelId: '1' // or whatever tunnelId
      })
    });
    const data = await res.json();
    console.log('Respuesta test-raw:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
