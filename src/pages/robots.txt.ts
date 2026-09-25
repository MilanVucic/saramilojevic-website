import { getSiteOrigin } from '../lib/content';

export const prerender = true;

export function GET() {
  const origin = getSiteOrigin();
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
