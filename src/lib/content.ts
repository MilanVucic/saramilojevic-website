import { getCollection, type CollectionEntry } from 'astro:content';
import site from '../../content/site.json';
export { site };
export type Artwork = CollectionEntry<'artwork'>['data'];
export type PortfolioCollection = CollectionEntry<'portfolioCollection'>['data'];
export type ArtworkImage = Artwork['images'][number];
export type Exhibition = CollectionEntry<'exhibition'>['data'];

export async function getPortfolio() {
  const collections = (await getCollection('portfolioCollection')).map(e => e.data).sort((a,b) => a.order-b.order);
  const all = (await getCollection('artwork')).map(e => e.data).sort((a,b) => a.order-b.order);
  for (const entries of [collections, all]) {
    const slugs = new Set<string>();
    for (const entry of entries) {
      if (slugs.has(entry.slug)) throw new Error(`Duplicate slug: ${entry.slug}`);
      slugs.add(entry.slug);
    }
  }
  for (const artwork of all) {
    if (!collections.some(c => c.slug === artwork.collection)) throw new Error(`Unknown collection for ${artwork.slug}`);
  }
  return { collections, works: all.filter(a => a.published) };
}

export async function getExhibitions() {
  return (await getCollection('exhibition'))
    .map(entry => entry.data)
    .filter(exhibition => exhibition.published)
    .sort((a, b) => a.order - b.order);
}

export function exhibitionImagePath(exhibition: Exhibition, index: number) {
  return `exhibitions/${exhibition.slug}/${index}.${exhibition.imageExtension}`;
}

export function imageUrl(src: string) {
  if (src.startsWith('https://') || src.startsWith('/assets/')) return src;
  return `${site.imageBaseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`;
}
