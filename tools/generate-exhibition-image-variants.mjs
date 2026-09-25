import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const outputRoot = join(root, 'generated-exhibition-images');
const contentRoot = join(root, 'content', 'exhibitions');
const site = JSON.parse(await readFile(join(root, 'content', 'site.json'), 'utf8'));
const widths = [640, 1080, 1920];
const entries = [];

for (const file of await readdir(contentRoot, { withFileTypes: true })) {
  if (!file.name.endsWith('.json')) continue;
  const exhibition = JSON.parse(await readFile(join(contentRoot, file.name), 'utf8'));
  for (let index = 1; index <= exhibition.imageCount; index++) {
    entries.push(`exhibitions/${exhibition.slug}/${index}.${exhibition.imageExtension}`);
  }
}

for (const src of [...new Set(entries)]) {
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
    await sharp(original, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(destination);
    console.log(`Created ${relative(root, destination)}`);
  }
}

await writeFile(join(outputRoot, 'README.txt'), "Upload this folder's contents to the same R2 bucket, preserving folders. Exhibition pages already use the responsive WebP variants when responsiveImagesEnabled is true in content/site.json.\n");
