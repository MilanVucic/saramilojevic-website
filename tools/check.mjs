import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const base=path.join(root,'dist');
let pages=0,links=0;
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory()){await walk(file);continue;}if(!file.endsWith('.html'))continue;
 pages++;const html=await readFile(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)="(\/[^"#]*)"/g)){
  const pathname=match[1].split(/[?#]/,1)[0];
  let target=path.join(base,pathname);const info=await stat(target).catch(()=>null);
  if(!info)throw Error(`Broken local URL ${match[1]} in ${file}`);
  if(info.isDirectory())await stat(path.join(target,'index.html'));
  links++;
 }
}}
await walk(base);
console.log(`PASS: ${pages} pages, ${links} local URLs.`);
