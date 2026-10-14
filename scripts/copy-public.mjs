import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('olt-manager/public');
const destDir = path.resolve('dist/public');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied ${file} -> dist/public/`);
    }
  }
}
