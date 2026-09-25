import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const outputRoot = join(root, 'generated-images');
const contentRoot = join(root, 'content', 'artworks');
const site = JSON.parse(await readFile(join(root, 'content', 'site.json'), 'utf8'));
const widths = [640, 1080, 1920];
const entries = [];

for (const file of await readdir(contentRoot, { withFileTypes: true })) {
  if (!file.name.endsWith('.json')) continue;
  const artwork = JSON.parse(await readFile(join(contentRoot, file.name), 'utf8'));
  entries.push(...artwork.images.map(image => image.src));
}

for (const src of [...new Set(entries)]) {
  if (src.startsWith('/assets/') || src.startsWith('https://')) continue;
  const url = `${site.imageBaseUrl.replace(/\/$/, '')}/${src.split('/').map(encodeURIComponent).join('/')}`;
  console.log(`Downloading ${src}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${src}: ${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  const extensionless = src.replace(/\.[^.]+$/, '');
  for (const width of widths) {
    const destination = join(outputRoot, `${extensionless}-${width}w.webp`);
    try { await access(destination); console.log(`Keeping ${relative(root, destination)}`); continue; } catch {}
    await mkdir(dirname(destination), { recursive: true });
    const pipeline = sharp(original, { failOn: 'none' }).rotate().resize({ width, withoutEnlargement: true });
    await pipeline.webp({ quality: 80, effort: 5 }).toFile(destination);
    console.log(`Created ${relative(root, destination)}`);
  }
}

await writeFile(join(outputRoot, 'README.txt'), "Upload this folder's contents to the R2 bucket while preserving its folders. Then set responsiveImagesEnabled to true in content/site.json and deploy the website.\n");
