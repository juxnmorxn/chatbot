import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

const idx = html.indexOf('id="ConfigForm"');
console.log('ConfigForm index:', idx);
if (idx !== -1) {
  const formHtml = html.slice(idx, idx + 8000);
  const inputs = [...formHtml.matchAll(/id=["']([^"']+)["'][^>]*name=["']([^"']+)["']/g)];
  console.log('Inputs found:');
  inputs.forEach(i => console.log(`id: ${i[1]} | name: ${i[2]}`));
}
