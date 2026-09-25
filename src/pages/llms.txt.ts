import { getPortfolio, getExhibitions, getSiteOrigin, site } from '../lib/content';

export const prerender = true;

export async function GET() {
  const origin = getSiteOrigin();
  const { works, collections } = await getPortfolio();
  const exhibitions = await getExhibitions();
  const link = (path: string) => `${origin}${path}`;
  const content = [
    `# ${site.name}`,
    '',
    `> ${site.seoDescription}`,
    '',
    'An artist portfolio for Sara Milojević, a Belgrade-based visual artist and painter. The site presents original paintings, artist biography, portfolio collections, and exhibition documentation.',
    '',
    '## Main pages',
    '',
    `- [Home](${link('/')})`,
    `- [About Sara Milojević](${link('/about/')})`,
    `- [All artworks](${link('/artworks/')})`,
    `- [Collections](${link('/collections/')})`,
    `- [Exhibitions](${link('/exhibitions/')})`,
    `- [Contact](${link('/contact/')})`,
    '',
    '## Collections',
    '',
    ...collections.map(collection => `- [${collection.title}](${link(`/collection/${collection.slug}/`)}) — ${collection.description}`),
    '',
    '## Published artworks',
    '',
    ...works.map(artwork => `- [${artwork.title}](${link(`/artwork/${artwork.slug}/`)}) — ${artwork.year ? `${artwork.year}; ` : ''}${artwork.medium}. ${artwork.description}`),
    '',
    '## Exhibitions',
    '',
    ...exhibitions.map(exhibition => `- [${exhibition.title}](${link(`/exhibition/${exhibition.slug}/`)}) — ${exhibition.year}, ${exhibition.venue}, ${exhibition.location}. ${exhibition.summary}`),
    '',
    '## Site information',
    '',
    `- [XML sitemap](${link('/sitemap.xml')})`,
    `- [Robots instructions](${link('/robots.txt')})`,
    '',
  ].join('\n');

  return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
