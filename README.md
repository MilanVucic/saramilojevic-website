# Sara Milojević — painting portfolio

Astro generates static HTML from schema-validated JSON content collections. Node 22.12+ and npm are needed locally; the deployed site requires only a static web server. GSAP, Three.js, and PhotoSwipe are npm dependencies bundled into local assets, with no browser requests to a JavaScript CDN.

## Start locally

From this folder:

```sh
npm install
npm run dev
```

Open http://localhost:4321 . Astro watches source and content edits and updates the preview. This Astro version can start a background server; stop it with `npm exec -- astro dev stop` (or `npm exec -- astro preview stop` for preview). Do not open HTML via file://. Use `npm run check` for type/schema diagnostics, `npm run build` for static output, and `npm run preview` to serve that production output locally. After cloning the repository with its lockfile, use `npm ci` for reproducible installation.

Routes: `/`, `/collections/`, `/collection/inner-landscapes/`, `/artwork/quiet-earth/`, `/artwork/blue-hour/`, `/artwork/soft-return/`. Unknown routes return a proper 404. Each artwork is a generated HTML page, not a client-side router.

## First upload: three artworks in one collection

The titles, dimensions, biography, collection, and local SVG illustrations are DEMO CONTENT, not claims about Sara's actual work. Replace them before launch. Two image slots per artwork demonstrate the gallery; add as many images as needed.

Prepare JPEG or WebP web images locally. A good starting point is a 1200px long edge for page images and 2400px for optional fullscreen images. Inspect paint texture and colour before accepting compression. Keep archival originals elsewhere. Each image should retain the same aspect ratio across sizes.

Upload these object keys to your R2 bucket (folders are part of the key):

```text
artworks/quiet-earth/01.webp       full painting
artworks/quiet-earth/02.webp       detail photograph
artworks/quiet-earth/03.webp       another view
artworks/blue-hour/01.webp
artworks/blue-hour/02.webp
artworks/blue-hour/03.webp
artworks/soft-return/01.webp
artworks/soft-return/02.webp
artworks/soft-return/03.webp
```

These slugs are examples: use your real painting slugs if you prefer. Names are case-sensitive. Use lowercase and hyphens. Confirm a file opens directly, for example:

https://pub-0cd4ec3155d8403885715be1046a4e68.r2.dev/artworks/quiet-earth/01.webp

In `content/artworks/quiet-earth.json`, replace its `images` array with:

```json
"images": [
  { "src": "artworks/quiet-earth/01.webp", "width": 960, "height": 1200, "alt": "Quiet Earth, full painting", "caption": "Full composition" },
  { "src": "artworks/quiet-earth/02.webp", "width": 1200, "height": 800, "alt": "Detail of the layered paint surface", "caption": "Surface detail" },
  { "src": "artworks/quiet-earth/03.webp", "width": 960, "height": 1200, "alt": "Quiet Earth viewed from the side", "caption": "Side view" }
]
```

IMPORTANT: Replace example width/height values with the actual pixel dimensions, especially when your images have different orientations. These are image pixels; the artwork's physical dimensions are separately stored under `dimensions` in centimetres. The first image is used for collection cards. Array order is the fullscreen carousel order. Give each photograph meaningful alt text.

Do the same for `blue-hour.json` and `soft-return.json`. All three have `collection: "inner-landscapes"`, which links them to `content/collections/inner-landscapes.json`.

You can use complete HTTPS URLs in `src` instead. Relative object keys are recommended because they use the single `imageBaseUrl` in `content/site.json`. Local demo images starting `/assets/` are served from this site.

For a larger fullscreen variant, add `full` to an image:

```json
{ "src": "artworks/quiet-earth/01.webp", "full": "artworks/quiet-earth/01-full.webp", "width": 1920, "height": 2400, "alt": "Quiet Earth, full painting", "caption": "Full composition" }
```

When `full` is present, width/height must describe that fullscreen file. The preview must have the same aspect ratio. The large version loads through PhotoSwipe when needed. No image resizing takes place on the Droplet or automatically in R2.

For the optional Three.js desktop hero, configure R2 CORS to allow GET/HEAD from `http://localhost:4321`, and later your production origin. Cross-origin images work in regular img tags without this, but a WebGL texture needs CORS. If the texture cannot load, the hero remains a normal image. In Cloudflare's R2 CORS editor a starting configuration is:

```json
[{ "AllowedOrigins": ["http://localhost:4321"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"] }]
```

The `r2.dev` URL is for development and is rate limited. At launch, connect the public R2 bucket to your custom domain and change only `imageBaseUrl` to `https://images.yourdomain.com`. Public access exposes the bucket's objects; keep private originals in a separate private bucket, not a prefix in this public bucket.

### Responsive image delivery

R2 stores files but does not resize them. This project generates WebP versions at 640, 1080, and 1920 pixels wide and serves the appropriate version through `srcset`. Originals remain the fallback and are used by the fullscreen viewer.

1. Run `npm run images:generate` for artwork, `npm run images:generate:exhibitions` for exhibition galleries, or `npm run images:generate:assets` for local images in `public/assets/`. The R2 commands download originals and write variants locally; the assets command reads local files and writes variants beside them. Existing variants are skipped, so each can be run again after adding images.
2. Upload the contents of the corresponding output folder to the public R2 bucket, keeping folders intact. For example, an exhibition original `exhibitions/root-of-bark/1.jpg` gets `exhibitions/root-of-bark/1-640w.webp`, `1-1080w.webp`, and `1-1920w.webp` beside it.
3. Review a few images, then set `responsiveImagesEnabled` to `true` in `content/site.json`, run `npm run build`, and deploy. Exhibition pages will use responsive variants automatically.

Keep `responsiveImagesEnabled` false until every generated file is uploaded; this prevents broken image URLs. The mobile hero deliberately does not auto-rotate, avoiding background downloads of several paintings on a phone.

You can use a Cloudflare custom domain while keeping Namecheap as the registrar. Add the domain as a Cloudflare zone, then at Namecheap replace its nameservers with the two Cloudflare nameservers shown in the zone setup. Once active, add a subdomain such as `images.yourdomain.com` to the R2 bucket's custom domains and set `imageBaseUrl` to that address. This gives you proper CDN delivery and lets you configure long browser cache times; it does not require transferring the domain registration to Cloudflare.

## Editing content

- Site name, introductory text, biography, contact email, hero artwork, and image base URL: `content/site.json`.
- One JSON file per artwork in `content/artworks/`. Copy an existing file; set unique slug, collection, title, dimensions, images. `published: false` removes it from generated public pages. `featured: true` includes it on the homepage. `order` controls sequence.
- One JSON file per collection in `content/collections/`. Artwork collection fields must match its slug.
- Set the contact email to show enquiry links; it is intentionally blank in the demo.
- Every build validates slugs, collection relationships, required images, alt text, and dimensions. Remote image existence is not checked automatically.
- Pages are in `src/pages/`, shared layout in `src/layouts/Layout.astro`, and reusable cards/images in `src/components/`. CSS is `src/styles/global.css`. Browser interactions are in `src/scripts/`. Content schemas live in `src/content.config.ts`; JSON files remain in `content/` for future Decap compatibility.

## Deployment

Run `npm run build` locally and deploy only the contents of `dist/` to the site's Nginx document root. `dist/` is generated and replaced each build: never edit it or keep uploads there. No source JSON, Git checkout, Node dependencies, or R2 images need live on the Droplet. A typical Nginx location is:

```nginx
location / { try_files $uri $uri/ =404; }
error_page 404 /404.html;
```

Cleanly replace prior deployed pages when publishing removals; copying new files over old output alone will leave deleted artwork URLs accessible. Keep a recoverable previous deployment if desired. No GitHub Actions required.

## SEO and analytics

Set `siteUrl` in `content/site.json` to the canonical public HTTPS origin (for example, `https://example.com`, without a path) before building. This is used for canonical links, social metadata, JSON-LD, `sitemap.xml`, `robots.txt`, and `llms.txt`; the build intentionally stops if it is missing or invalid. The sitemap includes published routes and image URLs. Submit `https://your-domain/sitemap.xml` in Google Search Console after deployment and verify the domain there.

`llms.txt` is a plain-text discovery aid for AI systems; it is an emerging convention, not a Google ranking factor. Google Analytics uses measurement ID `G-VRYGNNVET7` and loads on each page.

## Libraries and behavior

Installed through npm: GSAP 3.13.0 (moving artwork rows), Three.js 0.181.0 (subtle desktop hero shader), PhotoSwipe 5.4.4 (fullscreen overlay, swipe, zoom, arrow keys, Escape). Versions are recorded in `package.json` and `package-lock.json`. Astro bundles and splits the browser code into `dist/_astro/`. GSAP license: https://gsap.com/standard-license/ ; upstream notices are retained in package distributions.

CSS is local, handwritten, and responsive. No Bootstrap/Tailwind runtime. Hero WebGL is lazy-loaded only for fine-pointer devices without reduced-motion preference; artwork motion is likewise disabled on touch and reduced-motion devices. The public navigation and image links work without JavaScript. The PhotoSwipe overlay fills the viewport; this does not request operating-system fullscreen.

## Decap later

Keep this repository and these JSON files. Add `public/admin/index.html` and Decap config defining folder collections with JSON format. Use text fields for R2 object keys; the standard media uploader otherwise stores images in Git. Configure a GitHub OAuth callback service separately. Editors commit JSON to GitHub; pull changes locally and run `npm run build`, then deploy. There is no admin login or CMS in this first version.
