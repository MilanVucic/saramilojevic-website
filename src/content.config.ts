import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const imagePath = z.string().min(1).refine(value => {
  if (value.startsWith('https://')) {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }
  return !value.includes('..') && !value.includes(':') && !value.startsWith('//');
}, 'Use an HTTPS URL, local /assets/ path, or R2 object key');
const artwork = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/artworks' }),
  schema: z.object({
    slug, title: z.string().min(1), collection: slug,
    year: z.number().int().optional(), medium: z.string().min(1),
    dimensions: z.object({ widthCm: z.number().positive(), heightCm: z.number().positive() }),
    description: z.string(), order: z.number().default(0),
    featured: z.boolean().default(false), published: z.boolean().default(true),
    images: z.array(z.object({
      src: imagePath, full: imagePath.optional(), width: z.number().int().positive(),
      height: z.number().int().positive(), alt: z.string().min(1), caption: z.string().optional(),
    })).min(1),
  }),
});
const portfolioCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './content/collections' }),
  schema: z.object({ slug, title: z.string().min(1), description: z.string(), year: z.string().optional(), order: z.number().default(0) }),
});
export const collections = { artwork, portfolioCollection };
