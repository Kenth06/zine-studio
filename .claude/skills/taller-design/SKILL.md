---
name: taller-design
description: Apply and review the Taller design system (warm paper-and-ink UI on Kumo) when building or changing any UI in this repo — new screens, components, copy, colours, motion. Use before writing UI code and as a checklist before finishing a UI change.
---

# Taller design

Read [DESIGN.md](../../../DESIGN.md) first. Tokens live in `src/styles/tokens.css`.

## Before writing UI

1. Is this screen the tool itself? If you are about to add a hero, a feature grid, or an onboarding step, stop.
2. Pick the one primary action of the screen. Only that button is `variant="primary"`.
3. Reach for Kumo first (`LayerCard`, `Empty`, `Tabs`, `Dialog`, `Banner`, `Badge`, toasts). Import per component:
   `import { Button } from '@cloudflare/kumo/components/button'`.
4. Write the copy with numbers and verbs, in Spanish, sentence case.

## Checklist before finishing

- [ ] Only semantic colours (`bg-kumo-*`, `text-kumo-*`, `ring-kumo-*`, `--paper-*`). No raw Tailwind palette, no hex in components.
- [ ] No `dark:` variants. Checked in both `data-mode="light"` and `data-mode="dark"`; the paper canvas looks the same in both.
- [ ] Accent appears once on the screen, on the primary action.
- [ ] Metadata uses `<Slug>`; changing numbers use `tabular-nums`.
- [ ] Icons are Phosphor at 16–20 px; every icon-only button has `aria-label`.
- [ ] Anything draggable can also be done with the keyboard or a click.
- [ ] Transitions use `--dur-*` and `--ease-*`; nothing moves just to move; reduced motion respected.
- [ ] Shadows are the warm tokens (`--paper-shadow`, `--float-shadow`), never large glows.
- [ ] Empty states use `Empty` with one instruction.
- [ ] Layout works from 360 px wide: no horizontal page scroll, 16 px side gutters.
- [ ] No gradients, glassmorphism, emoji in headings, or marketing adjectives.

## Verify visually

Run `npm run dev`, open the page in the browser, and look at it in light and dark mode
and at phone width before calling it done.
