import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

const regex = /<li\s+id="([^"]+)"[^>]*BindField="([^"]+)"/g;
let m;
while ((m = regex.exec(html)) !== null) {
  if (m[2] !== 'Empty') {
    console.log(`${m[1].padEnd(25)} -> ${m[2]}`);
  }
}
