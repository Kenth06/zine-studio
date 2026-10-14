# Zine Studio

Make zines and photobooks you can print. Your photos never leave your device.

Drop in photos, pick a format, lay out pages from templates, and download a PDF that is already
imposed: print it, fold it, and the pages come out in the right order.

- **Mini-zine** — 8 pages from one Letter or A4 sheet, one cut.
- **Saddle-stitched booklet** — half-letter or A5 pages, printed double-sided, folded and stapled.
- **Loose pages** — with bleed and crop marks, for a print shop.

## Private by construction

There is no server that accepts files. The site is static assets; decoding, cropping and PDF
generation run in your browser, in Web Workers. Drafts and photos stay in this browser's IndexedDB
until you press «Borrar todo de este navegador». Photos are re-encoded for the PDF, which strips
EXIF data including location. The Content Security Policy only allows connections to the site's own origin.

## Print quality

- Photos are cropped and rasterised once at 300 DPI (never upscaled) and embedded as JPEG.
- Each placed photo shows its effective DPI; under 200 is flagged, under 150 is flagged red.
- Booklets are padded to a multiple of 4 with blank pages before the back cover.
- Output is RGB.

## Develop

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm test` | Unit tests (imposition, crop, DPI) |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | oxlint |
| `pnpm check` | Typecheck, lint and tests |
| `pnpm build` | Production build to `dist/` |
| `pnpm run deploy` | Build and deploy to Cloudflare Workers (static assets) |
| `pnpm run deploy:preview` | Build and deploy a Preview for the current branch |

## Deploys

The repository is connected to Cloudflare Workers Builds:

- Every push runs `pnpm install`, then `pnpm check && pnpm build`. A failing check stops the deploy.
- Pushes to `main` deploy to production with `pnpm wrangler deploy`.
- Every other branch gets a Preview (`pnpm wrangler preview`) with a stable URL per branch, posted as a
  comment on its pull request.

Stack: React, Vite, Tailwind CSS v4, [Kumo](https://kumo-ui.com), Phosphor icons, [pdf-lib](https://pdf-lib.js.org),
deployed as Cloudflare Workers static assets. The design system is documented in [DESIGN.md](DESIGN.md).

## Project layout

```
src/
  lib/          pure logic: formats, templates, crop/DPI, imposition, PDF, storage
  workers/      photo decoding and PDF export, off the main thread
  state/        project reducer and autosave
  components/   UI
  styles/       design tokens
public/         static files, headers (CSP), service worker
```

## License

[MIT](LICENSE)
