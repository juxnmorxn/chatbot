import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

const start = html.indexOf('function OnAddApply()');
if (start !== -1) {
  console.log(html.slice(start, start + 3000));
} else {
  console.log('function OnAddApply() not found');
}
