import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

const regex = /src=["']([^"']+\.js[^"']*)["']/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log(match[1]);
}
