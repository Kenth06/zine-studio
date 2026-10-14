# Taller

The design system for small, local-first tools that make physical things: zines, prints, labels, booklets.
Zine Studio is the first product built on it.

Taller sits on top of [Kumo](https://kumo-ui.com) (components, Base UI accessibility) and only changes values and rules.
Components keep using Kumo's semantic classes (`bg-kumo-base`, `text-kumo-subtle`, …); the tokens in
[`src/styles/tokens.css`](src/styles/tokens.css) re-skin them.

## Principles

1. **The first screen is the tool.** No hero, no feature grid, no onboarding. Someone who lands here can start working in one action.
2. **White paper, black ink.** The interface is white with near-neutral greys. The user's work (their photos) is the only strong colour on screen.
3. **One accent, one place.** Vermilion marks the single primary action of a screen. Nothing else is accented.
4. **Say what it does, in numbers.** «8 páginas · Carta · se corta 1 vez», not «Crea zines increíbles».
5. **No text that doesn't help the next action.** No taglines, no reassurance copy, no captions that repeat what the screen already shows. Privacy is a property of the architecture, documented in the README, not a line in the UI.
6. **Motion explains or it doesn't happen.** A page settling into place, a sheet folding. Never decoration. Always respect `prefers-reduced-motion`.
7. **Everything draggable has a keyboard path.** Buttons to move, a click to assign, arrows to nudge.

## Colour

One mode: **light**. The app stays white whatever the system appearance, like a sheet of paper on a table. `<html data-mode="light">` is fixed and there are no dark tokens.

### Chrome

| Token | Value | Use |
| --- | --- | --- |
| `--color-kumo-canvas` | `#ffffff` | Page background (with the cutting-mat dots) |
| `--color-kumo-elevated` / `recessed` / `tint` | `#fafaf9` / `#f5f5f4` / `#f5f5f4` | Hover, tracks, field backgrounds |
| `--color-kumo-fill` | `#e7e5e4` | Slider fill |
| `--color-kumo-hairline` | `#ecebea` | Dividers |
| `--color-kumo-line` | `rgb(0 0 0 / .1)` | Rings on raised surfaces |
| `--color-kumo-contrast` | `#1c1917` | Selected segment, selected ring |
| `--text-color-kumo-default` | `#1c1917` | Ink |
| `--text-color-kumo-subtle` | `#6f6a66` | Secondary text (AA on white) |
| `--color-kumo-brand` | `#c2401f` | Vermilion. Primary action only |
| `--focus-ring` | `#2563eb` | Keyboard focus only, never selection |

### Paper

| Token | Value |
| --- | --- |
| `--paper-sheet` | `#ffffff` |
| `--paper-ink` | `#1c1917` |
| `--paper-guide` | `rgb(0 0 0 / .24)`, 1 px dashed: safe zone, folds, empty slots |
| `--paper-placeholder` | `rgb(0 0 0 / .5)`: placeholder text on paper (AA) |
| `--paper-shadow` | `0 0 0 1px rgb(0 0 0 / .06), 0 1px 2px rgb(0 0 0 / .05), 0 10px 30px -10px rgb(0 0 0 / .14)` |
| `--paper-radius` | `2px` |
| `--mat-dot` | Cutting-mat dots behind the work |
| `--image-outline` | 1 px inset outline on photos, pure black at 10 % |

### States

- **Selected** (a page, a slot, a format): 2 px ink ring (`kumo-contrast`), offset when it wraps paper; on photos, drawn above the image with a white inner edge.
- **Focused** (keyboard): 2 px blue outline (`.focus-ring`), offset 2 px. Never the same look as selected.
- **Selected with accent** (rare, e.g. a chosen preset): `--accent-tint` background (accent at 10 %) with accent text.
- **Warnings** use Kumo's warning/danger tints, never the accent.

## Type

- **UI:** Inter Variable. Dense, tool-sized: 15 px wordmark, 14 px body (`text-sm`), 12–13 px secondary.
- **Slug:** the signature label. Mono, 10.5 px, uppercase, `tracking 0.06em`, subtle ink, tabular numbers.
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
Shadows are neutral and small. No large diffuse glows.

## Motion

| Token | Value |
| --- | --- |
| `--dur-micro` / `quick` / `fast` / `medium` | 80 / 150 / 250 / 350 ms |
| `--dur-enter` / `--dur-exit` | 300 / 150 ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` — default |
| `--ease-exit` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |

Hover and focus changes use `quick`. Press feedback is `scale(0.96)` over 150 ms. No overshoot or bounce.
Entrances move only `opacity` and `transform`; under reduced motion they become an opacity fade.

## Layout

The work is the interface. There are no panels, sidebars or header bars.

- **Work surface:** full screen on the cutting mat (`.mat`: canvas colour with a dot every 16 px). The user's pages,
  or the printed sheet, sit centred at true proportions.
- **Corners:** 40 px round buttons (`FloatButton`). Top-left: menu, with the wordmark and a slug beside it.
  Top-right: the one call-to-action pill (`CtaButton`).
- **Dock:** one floating bar at the bottom centre (`Dock`, 18 px radius, `--float-bg` + `--float-shadow`). It holds the
  content the user works with (photo thumbnails) and at most one or two segmented choices.
- **Contextual bar:** tools for the selected thing float right under it (`Bar`), never in a side panel.
- **Overlays** take the whole screen on the same mat (the print proof), with a round close button top-left.
- **Plain screens** (settings, about) use one centred column, `max-w-2xl`, `px-4 sm:px-6`.

## Controls

| Need | Use |
| --- | --- |
| The screen's main action | `CtaButton` — vermilion pill, `--cta-shadow`. One per screen |
| Corner action | `FloatButton` with `aria-label` |
| 2–4 options | `Segment`s in a row; the selected one is solid ink (`bg-kumo-contrast`) |
| Choosing a look | Previews of the user's own content in each option (templates show their page with their photos) |
| A value | `FieldSlider` — label inside, value in mono on the right, ticks behind |
| Icon action in a bar | `IconButton` (32 px) |
| Metadata, counts, captions | `<Slug>` — mono, uppercase, 10.5 px |
| Non-blocking feedback | Toast (`useKumoToastManager`) |
| Destructive confirmation | Kumo `Dialog size="sm"` |
| Menus | Kumo `DropdownMenu` from a `FloatButton` |
| Icons | Phosphor, 16–18 px |

Kumo provides the accessible primitives (dialog, menu, toast) and the semantic tokens. Do not use `LayerCard`, `Tabs`
or default `Button` styling for app chrome: they read as an admin console.

Diagrams that explain the physical result — the sheet with its folds, the cut, the page order — are drawn at scale and
are the only illustrations.

## Interaction

- **Frequency decides motion.** Things that happen tens of times a session (selecting, the contextual bar) fade in
  120 ms or less. Keyboard-triggered changes never animate. Only first-time or rare moments get an entrance.
- **Press** scales to 0.96 over 150 ms with `ease-out`. **Hover** changes colour only, with `ease`, and only on devices
  that hover (Tailwind v4's `hover:` already checks this).
- **Tooltips** come from Kumo `Tooltip` under one `TooltipProvider` (500 ms): the first waits, neighbours open
  instantly. Every icon-only control has one; never the native `title`.
- **Gestures on photos:** drag pans, wheel zooms, two fingers pinch. They apply only to the selected slot so the page
  still scrolls everywhere else; extra fingers are ignored mid-gesture.
- **Direct placement:** a file dropped on a slot goes into that slot; an empty selected slot opens the picker.
- **Escape** steps out one level: text field, then selected photo.
- **State is never lost silently:** autosave flushes when the tab hides, destructive actions offer «Deshacer», and
  limits (text that doesn't fit, low resolution, full storage) are shown where they happen.

## Writing

- Spanish first. Sentence case. No exclamation marks.
- Verbs on buttons: «Exportar», «Descargar para imprimir», «Elegir fotos».
- Numbers before adjectives: «3 páginas en blanco», «212 ppp».
- Errors say what happened and what to do next, in one or two sentences.
- Destructive actions are instant and undoable: a toast with «Deshacer», plus Ctrl+Z. Confirm only what can't be undone (replacing a draft, wiping storage).

## Don't

- Gradients, glassmorphism, neon glows, purple-on-black.
- A second accent colour, or accent on anything that isn't the primary action.
- Feature grids with coloured icon tiles; stock illustrations; emoji in headings.
- Panels of rounded cards around the work. If it looks like an admin dashboard, start again.
- Onboarding modals, tours, «Get started» heroes.
- Marketing adjectives (increíble, potente, mágico).
- A dark mode or a theme toggle. `dark:` Tailwind variants.
- Raw Tailwind colours (`bg-blue-500`). Use semantic tokens.
