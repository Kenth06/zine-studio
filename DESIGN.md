# Taller

The design system for small, local-first tools that make physical things: zines, prints, labels, booklets.
Zine Studio is the first product built on it.

Taller sits on top of [Kumo](https://kumo-ui.com) (components, Base UI accessibility) and only changes values and rules.
Components keep using Kumo's semantic classes (`bg-kumo-base`, `text-kumo-subtle`, …); the tokens in
[`src/styles/tokens.css`](src/styles/tokens.css) re-skin them.

## Principles

1. **The first screen is the tool.** No hero, no feature grid, no onboarding. Someone who lands here can start working in one action.
2. **Paper and ink.** The interface is warm neutrals. The user's work (their photos) is the only strong colour on screen.
3. **One accent, one place.** Vermilion marks the single primary action of a screen. Nothing else is accented.
4. **Say what it does, in numbers.** «8 páginas · Carta · se corta 1 vez», not «Crea zines increíbles».
5. **Privacy is a fact, stated once.** One plain sentence near the work: «Nada se sube. Las fotos se quedan en este navegador.» No shields, no badges.
6. **Motion explains or it doesn't happen.** A page settling into place, a sheet folding. Never decoration. Always respect `prefers-reduced-motion`.
7. **Everything draggable has a keyboard path.** Buttons to move, a click to assign, arrows to nudge.

## Colour

Two layers: **chrome** (the app around the work) follows the system light/dark mode; **paper** (the zine canvas) never changes, because paper is paper.

### Chrome — light

| Token | Value | Use |
| --- | --- | --- |
| `--color-kumo-canvas` | `#f1efe9` | Page background |
| `--color-kumo-base` | `#fbfaf7` | Panels, cards, header |
| `--color-kumo-elevated` | `#f6f4ef` | Card headers, hover |
| `--color-kumo-recessed` | `#e8e5dd` | Work area behind the paper, segmented tracks |
| `--color-kumo-hairline` | `#e2ded4` | Borders on flat surfaces |
| `--color-kumo-line` | `rgb(37 36 31 / .12)` | Borders on raised surfaces (with shadow) |
| `--text-color-kumo-default` | `#25241f` | Ink |
| `--text-color-kumo-subtle` | `#6b675e` | Secondary text (AA on canvas) |
| `--color-kumo-brand` | `#c2401f` | Vermilion. Primary action only |

### Chrome — dark

Warm near-black, never blue: canvas `#151411`, base `#1c1b17`, recessed `#100f0d`, ink `#ecebe5`, subtle `#a39f94`, accent `#d9542f`.

### Paper

| Token | Value |
| --- | --- |
| `--paper-sheet` | `#f8f6f1` |
| `--paper-ink` | `#25241f` |
| `--paper-guide` | `rgb(37 36 31 / .28)`, 1 px dashed: safe zone, empty slots |
| `--paper-shadow` | `0 1px 2px rgb(45 41 31 / .08), 0 8px 24px rgb(45 41 31 / .1)` |
| `--paper-radius` | `2px` |

### States

- **Selected** (a page, a slot, a format): 2 px ink ring (`ring-kumo-focus`), offset when it wraps paper.
- **Selected with accent** (rare, e.g. a chosen preset): `--accent-tint` background (accent at 10 %) with accent text.
- **Warnings** use Kumo's warning/danger tints, never the accent.

## Type

- **UI:** Inter Variable. Dense, tool-sized: 15 px wordmark, 14 px body (`text-sm`), 12–13 px secondary.
- **Slug:** the signature label. 10.5 px, weight 500, uppercase, `tracking 0.08em`, subtle ink, tabular numbers.
  Used for metadata a printer would write on a proof: page counts, sizes, «PORTADA», progress. Component: `<Slug>`.
- **Wordmark:** lowercase product name, semibold, `tracking-tight`. No logo lockups in the UI.
- **Content:** the zine's own type is separate from the UI (currently a serif). It is embedded in the PDF.
- Numbers that change (DPI, counts, zoom) use `tabular-nums`.

## Shape

| Token | Value | Use |
| --- | --- | --- |
| `--radius-control` | 6 px | Buttons, inputs, thumbnails |
| `--radius-panel` | 8 px | Cards, option tiles, drop zones |
| `--radius-card` | 12 px | Dialogs |
| `--radius-dock` | 18 px | Floating docks |
| `--paper-radius` | 2 px | Paper. Almost square, like a trimmed sheet |

Hairlines are 1 px rings (`ring-1 ring-kumo-hairline`) on flat surfaces; raised surfaces get `kumo-line` plus `--float-shadow`.
Shadows are warm (`rgb(45 41 31 / …)`) and small. No large diffuse glows.

## Motion

| Token | Value |
| --- | --- |
| `--dur-micro` / `quick` / `fast` / `medium` | 80 / 150 / 250 / 350 ms |
| `--dur-enter` / `--dur-exit` | 400 / 300 ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` — default |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` — something landing in place |
| `--ease-exit` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |

Hover and focus changes use `quick`. Press feedback is `scale(0.97)`.

## Layout

- **Tools:** one centred column, `max-w-3xl`, `px-4 sm:px-6`. The start screen, settings and dialogs live here.
- **Editors:** sticky 48 px header, tray on the left, work on a recessed surface in the centre, inspector on the right.
  Below `lg` everything stacks and the page scrolls: work first, inspector, then tray.
- Cards: Kumo `LayerCard` (`Secondary` header + `Primary` body). Empty states: Kumo `Empty` with one instruction.

## Components

| Need | Use |
| --- | --- |
| Primary action | `Button variant="primary"`, one per screen |
| Icon-only action | `Button variant="ghost" shape="square"` with `aria-label` |
| Choice between 2–3 values | `Tabs` segmented (`size="sm"` in headers) |
| Choice with explanation | Option tiles (`role="radio"`) with a schematic diagram and one line |
| Non-blocking feedback | Toast (`useKumoToastManager`) |
| Blocking problem | `Banner variant="alert"` with a fixing action |
| Metadata | `<Slug>` |
| Icons | Phosphor, 16–20 px, `text-kumo-subtle` |

Diagrams (how a sheet folds, what a template looks like) are drawn in `currentColor` SVG and explain something.
They are the only illustrations.

## Writing

- Spanish first. Sentence case. No exclamation marks.
- Verbs on buttons: «Exportar», «Descargar para imprimir», «Elegir fotos».
- Numbers before adjectives: «3 páginas en blanco», «212 ppp».
- Errors say what happened and what to do next, in one or two sentences.

## Don't

- Gradients, glassmorphism, neon glows, purple-on-black.
- A second accent colour, or accent on anything that isn't the primary action.
- Feature grids with coloured icon tiles; stock illustrations; emoji in headings.
- Onboarding modals, tours, «Get started» heroes.
- Marketing adjectives (increíble, potente, mágico).
- `dark:` Tailwind variants. Mode is `data-mode` on `<html>`; tokens handle it.
- Raw Tailwind colours (`bg-blue-500`). Use semantic tokens.
