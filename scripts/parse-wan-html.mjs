import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

// Busquemos las llamadas a set.cgi o form submit
const lines = html.split('\n');
const relevant = lines.filter(l => l.includes('set.cgi') || l.includes('onttoken') || l.includes('Submit') || l.includes('Apply'));
console.log('Total lines:', lines.length);
console.log('Matches:');
relevant.slice(0, 30).forEach(l => console.log(l.trim()));
