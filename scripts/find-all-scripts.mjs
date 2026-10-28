import fs from 'fs';

const html = fs.readFileSync('scratch_wan.html', 'utf8');

// Busquemos dónde está definido GetAddWanUrl o si está en un archivo que no vimos
const scriptTags = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('Total inline script tags:', scriptTags.length);

const allSrc = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
console.log('All script sources:');
allSrc.forEach(s => console.log(' - ' + s[1]));
