# Zine Studio

Local-first web app that turns photos into printable, correctly imposed zine PDFs. Static site on
Cloudflare Workers; all processing in the browser.

## Commands

- `npm run dev` — dev server
- `npm test` — vitest (pure logic in `src/lib`)
- `npm run check` — typecheck + lint + tests; run before finishing a change
- `npm run build` — must pass

## CI and deploys

Cloudflare Workers Builds is the CI (no GitHub Actions). Build command `npm run check && npm run build`;
`main` deploys with `npx wrangler deploy`; other branches deploy a Preview with `npx wrangler preview` and the
Preview URL is posted on the PR. Work on a branch and open a PR to get a Preview; don't push untested work to `main`.
The Worker name in `wrangler.jsonc` (`zine-studio`) must match the Worker in the dashboard.

## Hard rules

- **Nothing the user makes leaves the device.** No upload endpoints, no Worker script, no bindings (R2/D1/KV),
  no third-party requests. `public/_headers` sets `connect-src 'self'`; don't loosen it.
- **Imposition is the product.** Any change to `src/lib/imposition.ts`, `src/lib/pdf.ts`, `src/lib/templates.ts`
  or `src/lib/crop.ts` needs tests in `src/lib/*.test.ts`. Page order must stay:
  - Mini-zine sheet: top row `5 4 3 2` rotated 180°, bottom row `6 7 8 1`.
  - Saddle stitch sheet `i`: front `[N−2i, 2i+1]`, back `[2i+2, N−2i−1]`; pad with blanks before the back cover.
- **Geometry in mm, one source.** `slotsFor()` drives both the editor (as %) and the PDF (as pt).
  Never hard-code positions in components.
- Heavy work (decode, resize, PDF) runs in `src/workers/`. Keep the main thread free.
- pdf-lib writes embedded images lazily: to re-embed a document's pages, `save()` it and `embedPdf(bytes, indices)`.

## UI

Follow [DESIGN.md](DESIGN.md) — use the `taller-design` skill when touching UI. In short:
the work fills the screen on the cutting mat; chrome floats (corner buttons, bottom dock, contextual bars from
`src/components/Chrome.tsx`), never panels of cards. Semantic tokens only (`bg-kumo-*`, `text-kumo-*`, `--paper-*`),
no raw Tailwind colours, no `dark:` variants, one vermilion call-to-action per screen, `<Slug>` for metadata, Phosphor icons, every icon-only button has an `aria-label`,
every drag interaction has a keyboard alternative. Import Kumo per component (`@cloudflare/kumo/components/button`).
UI copy is Spanish.

## Layout

- `src/lib` — pure, framework-free logic; `src/workers` — Web Workers; `src/state` — reducer and autosave;
  `src/components` — React UI; `src/styles/tokens.css` — design tokens.
- `notes/` is local-only and gitignored. Don't reference it from tracked files.
