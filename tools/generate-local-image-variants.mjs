import { access, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const assetRoot = join(root, 'public', 'assets');
const widths = [640, 1080, 1920];
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);

async function findOriginals(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await findOriginals(path));
    else if (supportedExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase())) found.push(path);
  }
  return found;
}

for (const source of await findOriginals(assetRoot)) {
  for (const width of widths) {
    const destination = source.replace(/\.[^.]+$/, `-${width}w.webp`);
    try { await access(destination); console.log(`Keeping ${relative(root, destination)}`); continue; } catch {}
    await mkdir(dirname(destination), { recursive: true });
    await sharp(source, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(destination);
    console.log(`Created ${relative(root, destination)}`);
  }
}

console.log('Local image variants are beside their originals under public/assets/.');
