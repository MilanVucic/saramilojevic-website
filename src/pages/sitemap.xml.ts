import { getPortfolio, getExhibitions, exhibitionImagePath, getSiteOrigin, imageUrl } from '../lib/content';

export const prerender = true;

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export async function GET() {
  const origin = getSiteOrigin();
  const { works, collections } = await getPortfolio();
  const exhibitions = await getExhibitions();
  const pages: Array<{ path: string; images?: Array<{ url: string; title: string }> }> = [
    ...['/', '/about/', '/contact/', '/artworks/', '/collections/', '/exhibitions/'].map(path => ({ path })),
    ...collections.map(collection => ({ path: `/collection/${collection.slug}/` })),
    ...works.map(artwork => ({
      path: `/artwork/${artwork.slug}/`,
      images: artwork.images.map(image => ({ url: imageUrl(image.src), title: image.alt })),
    })),
    ...exhibitions.map(exhibition => ({
      path: `/exhibition/${exhibition.slug}/`,
      images: Array.from({ length: exhibition.imageCount }, (_, offset) => {
        const index = offset + 1;
        return { url: imageUrl(exhibitionImagePath(exhibition, index)), title: `${exhibition.title} exhibition view ${index}` };
      }),
    })),
  ];

  const urls = pages.map(page => {
    const images = page.images?.map(image => `
      <image:image>
        <image:loc>${escapeXml(image.url)}</image:loc>
        <image:title>${escapeXml(image.title)}</image:title>
      </image:image>`).join('') || '';
    return `  <url><loc>${escapeXml(new URL(page.path, `${origin}/`).href)}</loc>${images}\n  </url>`;
  }).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
