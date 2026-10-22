# Skandha (MEAN)

An Angular site (standalone components, TypeScript), exported from UniversalIDE.

```sh
npm install
npm start        # http://localhost:4200
npm run build    # the site, in dist/ (works at any path)
```

## Layout

- One HTML file per page in `public/`, at the same path as on the published site, with that
  page's title, search and social tags in its `<head>`. Each loads the one app and names its page:
  - `public/index.html` → `src/app/pages/home/home.ts`
  - `public/digital-first-services/index.html` → `src/app/pages/digital-first-services/digital-first-services.ts`
  - `public/ai-ml-for-media/index.html` → `src/app/pages/aimlfor-media/aimlfor-media.ts`
  - `public/customized-solutions/index.html` → `src/app/pages/customized-solutions/customized-solutions.ts`
  - `public/digital-sports-operations/index.html` → `src/app/pages/digital-sports-operations/digital-sports-operations.ts`
  - `public/managed-media-fabric/index.html` → `src/app/pages/managed-media-fabric/managed-media-fabric.ts`
  - `public/vidre/index.html` → `src/app/pages/vid-re/vid-re.ts`
  - `public/media-capability-centres/index.html` → `src/app/pages/media-capability-centres/media-capability-centres.ts`
  - `public/media-verticals/index.html` → `src/app/pages/media-verticals/media-verticals.ts`
  - `public/about/index.html` → `src/app/pages/about/about.ts`
  - `public/news/index.html` → `src/app/pages/news/news.ts`
  - `public/contact/index.html` → `src/app/pages/contact/contact.ts`
- `src/app/pages/`: a standalone component per page, with its template (`.html`, a comment
  before each section) and its tablet and phone styles (`.css`).
- `src/main.ts`: starts the page the HTML file names, then the shared page behaviour it uses
  (`src/site-scripts.ts`: entrance animations, folding menus, sending forms).
- `src/site.css`: the site's shared styles.
- `public/`: also pictures (`files/`), exact copies of imported pages (`_embeds/`, shown in a
  sandboxed frame), robots.txt, llms.txt and the sitemap, copied as they are.

Pages render in the browser. Links between pages are ordinary links, as on the HTML site.
