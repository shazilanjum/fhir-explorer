# Design — FHIR Resource Explorer

A locked design system for this app. Every surface reads this file before it
changes. Do not regenerate per page — extend or amend this file when the system
needs to grow. The runtime values live in [`src/tokens.css`](src/tokens.css);
this document is the intent behind them.

Hallmark · designed-as-app · **two themes, switchable at runtime**

> **Amended 2026-07-31 (a)** — retheme from *modern-minimal / Graphite & Jade* to
> *playful / Hum*. The macrostructure families, information architecture, and all
> app logic are unchanged; only the colour + type + shape layer moved.
>
> **Amended 2026-07-31 (b)** — added a second theme, *Lumen · Drop 01 Night
> Foundry*, alongside Hum. See [§ Variants](#variants). Both ship together; the
> active one is an attribute, not a build.
>
> **Amended 2026-07-31 (c)** — added *Manifesto* and *Terminal*, bringing the
> project to four switchable themes.

### Provenance — read before editing a palette

Hum and Lumen are **transcribed** from the per-theme spec files bundled with the
hallmark skill (`references/themes/hum.md`, `.../lumen.md`).

Manifesto and Terminal have **no bundled spec** — their canonical token blocks
live in the skill's `site/css/tokens.css`, which is not part of the installed
package. Both palettes here are therefore **constructed** from hallmark's
documented axis values (paper band / display style / accent hue), its font
canon, and the rules in `references/color.md`: OKLCH only, one-to-two accents,
no pure black or white, neutrals tinted toward the anchor hue, accent chroma
held in 0.12–0.22. They are faithful to the *documented* character of each
theme, but they are not byte-identical to hallmark's originals. If you obtain
the real token blocks, replace the two `[data-theme]` blocks and nothing else.

## Variants

This project is **multi-theme**. `src/tokens.css` holds only shared structure in
`:root` (4-pt space scale, type scale, motion) and puts everything expressive in
a `[data-theme]` block. `ThemeProvider` sets `data-theme` on `<html>`; components
never branch on the theme — they reference semantic tokens and the active theme
resolves them.

| | **Hum** *(default)* | **Lumen · Night Foundry** | **Manifesto** | **Terminal** |
| --- | --- | --- | --- | --- |
| Genre | playful | atmospheric | editorial | atmospheric |
| Axes | light / rounded-sans / multi | dark / classical-serif / brass | light / geometric-sans / red | dark / mono / phosphor |
| Paper | cream `oklch(97% .012 95)` | violet-black `oklch(13% .014 265)` | bone `oklch(96% .008 40)` | green-black `oklch(13% .014 155)` |
| Accent | pear `oklch(86% .18 95)` | brass `oklch(76% .17 50)` | signal red `oklch(52% .21 30)` | phosphor `oklch(82% .20 145)` |
| Secondary | sky-cyan `oklch(66% .18 235)` | coral `oklch(68% .16 18)` | ink (neutral) | amber `oklch(80% .16 75)` |
| Display | Plus Jakarta Sans 700 | Instrument Serif 400 | Geist 800 (caps) | JetBrains Mono 700 |
| Body | Plus Jakarta Sans | Geist | Geist | JetBrains Mono |
| Radii | card 20px | card 6px | card **0px** | card 2px |
| Border | 1.5px | 1px | **2px** | 1px |
| Cards | layered drop shadow | hairline + inner emission | flat, thick rule | flat hairline |
| Buttons | chunky — press is feedback | flat, precise | square, UPPERCASE | flat, square |
| Background | plain | 4% blueprint grid @48px | plain | 3.5% scan grid @32px |
| Prose case | sentence case | lowercase UI chrome | UPPERCASE h1 only | sentence case |

Measured contrast (worst pair per theme, AA needs 4.5:1): Hum **4.85** · Lumen
**4.68** · Manifesto **5.37** · Terminal **4.56**. No failures in any theme.

**Adding a theme** = one `[data-theme='…']` block in `tokens.css` defining the
full semantic token set, plus an entry in `THEMES` in
[`src/context/ThemeContext.tsx`](src/context/ThemeContext.tsx). No component edits.

### Lumen — deliberate departures from its spec

- **Lowercase is scoped, not global.** Lumen's spec makes *all* prose lowercase.
  Here it applies via `.ui-lower` to static UI copy and `.btn` labels only —
  **never to data**. FHIR resource types, ids, codes, names, and JSON are
  case-sensitive; rendering `Patient/137203786` as `patient/…` would be wrong.
  Markup stays sentence case for screen readers; CSS does the transform.
- **No hero apparatus or meter strip.** Those are page-level marketing devices
  for a landing hero; this is an app shell with no hero. Kept: the blueprint
  grid, hairline inner-emit cards, the verb landmark, UPPERCASE mono labels.
- **Person names keep their capitals** — same reason as the first point.

### The verb landmark

Both themes carry emphasis on one word via `.verb`, and neither uses italic:
Hum paints a pear highlight band that tracks across line wraps; Lumen colours
the word coral and draws a 1px underline in over 320 ms.

## Genre

playful — warm and alive, but still an instrument. Cream paper, multi-accent,
rounded surfaces, buttons that physically press. Mono still carries the data
(URLs, ids, params, JSON); colour carries meaning, not decoration.

**Deliberate departures from Hum's spec**, because this is a dense clinical data
tool rather than a consumer marketing page:

- **Bright accents are fill-only.** Pear/cyan/coral sit at L 66–86%, which cannot
  carry text on cream. Readable text uses `--color-link`, `--color-danger`,
  `--color-accent-text`. All nine measured pairs clear WCAG AA 4.5:1.
- **No marketing apparatus** — no mascot hero, no marquee footer, no star-burst.
  Hum's button physics, radii, and accent bands are kept; its ornament is not.
- **One character mark only** — the pear dot in the wordmark.

## Macrostructure families

App-type product. No hero/footer marketing apparatus.

- **App shell** — Workbench: fixed left rail (resource types) + top command bar +
  working canvas. `Layout` owns it.
- **Search** — Workbench canvas: a compact query "instrument panel" over a dense,
  hairline-separated results list (not floaty rounded cards).
- **Detail** — Spec-sheet split: human-readable as a labeled spec sheet (left),
  raw JSON as the code pane (right).
- **Welcome** — quiet connection summary (server identity + counts).

## Theme (Hum)

Axes: **light** (cream L97) / **rounded-sans** / **multi-accent**.

| Token | OKLCH | Role |
| --- | --- | --- |
| `--color-paper` | `oklch(97% 0.012 95)` | cream page surface (never pure white) |
| `--color-paper-2` | `oklch(94% 0.016 95)` | app background |
| `--color-paper-3` | `oklch(91% 0.02 95)` | wells / hover |
| `--color-ink` | `oklch(20% 0.012 250)` | primary text (never pure black) |
| `--color-ink-2` | `oklch(40% 0.02 250)` | secondary text — 8.4:1 |
| `--color-ink-3` | `oklch(50% 0.015 250)` | tertiary text — 5.5:1 |
| `--color-rule` | `oklch(88% 0.02 95)` | warm hairlines |
| `--color-accent` | `oklch(86% 0.18 95)` | **pear** — primary action, in-range (fill only) |
| `--color-accent-deep` | `oklch(72% 0.19 92)` | the button's solid edge |
| `--color-accent-text` | `oklch(48% 0.12 85)` | readable pear for text — 6.0:1 |
| `--color-accent-2` | `oklch(66% 0.18 235)` | **sky-cyan** — links/refs (fill only) |
| `--color-link` | `oklch(52% 0.17 245)` | readable cyan for text — 4.9:1 |
| `--color-accent-3` | `oklch(68% 0.24 18)` | **coral** — the one pop (fill only) |
| `--color-danger` | `oklch(52% 0.21 22)` | failures, out-of-range text — 5.6:1 |
| `--color-focus` | `oklch(52% 0.17 245)` | focus ring |
| `--color-code-bg` | `oklch(24% 0.02 260)` | JSON pane |

**Accent ownership (Hum's three-rule).** Each accent owns a kind of surface and
they never blend into gradients:

- **pear** → primary action, selected rail item, in-range value, highlight band
- **cyan** → links, references, resource-type badges, trend lines
- **coral** → the single high-energy moment: out-of-range value, failure

## Typography

Rounded sans + mono. **No serif anywhere** (Hum disqualifier).

- **Display / Body** · Plus Jakarta Sans Variable, 400/500/600/700, roman.
  Display weight 600–700, tracking −0.025em.
- **Mono** · JetBrains Mono Variable. URLs, ids, params, JSON, ⌘K hints, field
  keys, micro-labels (`.label-mono`, uppercase, tracking +0.1em).
- Type scale: `--text-xs … --text-3xl` in `tokens.css`.

## Shape

No square corners anywhere. `--radius-card: 20px` · `--radius-input: 12px` ·
`--radius-pill: 999px`. Cards carry a layered contact + ambient shadow
(`--shadow-card`) and a 1.5px `ring-rule`, not a hairline border.

## Spacing

4-point named scale (`--space-3xs … --space-2xl`). Use named tokens or the
Tailwind scale that mirrors them — never raw px in components.

## Motion

- Easings: `--ease-out cubic-bezier(0.16,1,0.3,1)`, `--ease-press
  cubic-bezier(0.2,0.7,0.3,1)`, `--ease-spring cubic-bezier(0.34,1.56,0.64,1)`.
  Never the browser default `ease`.
- **The press is the feedback.** Buttons lift 2px on hover (colour edge grows to
  5px) and press **down** 3px on `:active` (edge shrinks to 1px). No `scale()`,
  no overshoot on buttons — spring is reserved for card hover-lift.
- Cards lift 4px on hover with a shadow brighten (`--ease-spring`).
- Reveal: one orchestrated entrance on the results list (fade + 6px rise). No
  scroll-triggered reveals anywhere else.
- Reduced-motion: transforms drop out, colour/shadow only, ≤ 150ms.
- Focus rings appear **instantly** — never transition the ring.

## Microinteractions stance

- **Silent success.** No success toasts. Copy confirms inline ("Copied"); a live
  connection shows a jade dot + server identity. Toasts fire on **failure only**.
- Spinners delay-show 150ms; skeletons where layout is known.
- Hover tooltips (native `title`) 800ms; focus 0ms.

## CTA voice

One button system, two variations — the canonical `.btn` block lives in
[`src/index.css`](src/index.css); do not re-improvise button CSS per component.

- **Primary** (`.btn`) — pear face, ink label, pill radius, a solid
  `--color-accent-deep` edge plus a soft ground shadow. One per primary moment.
- **Secondary** (`.btn--soft`) — paper face, 1.5px rule border, flat lift, no
  colour edge.
- **Quiet** — text-only link in `--color-link`, underline on hover.

## What every surface MUST share

- The wordmark (rounded "fhir explorer" + the pear dot — the one character mark).
- The accent ownership map (pear = action, cyan = links, coral = the one pop).
- Plus Jakarta Sans + JetBrains Mono. No serif.
- The `.btn` system — never a hand-rolled button.
- Rounded surfaces: no square corners anywhere.

## What surfaces MAY differ on

- Macrostructure within the app family (Workbench vs Spec-sheet split).
- Density of the results list vs the detail spec sheet.

## Exports

Drop-in formats for reusing this system elsewhere.

### tokens.css

Canonical — see [`src/tokens.css`](src/tokens.css).

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97% 0.012 95);
  --color-ink: oklch(20% 0.012 250);
  --color-accent: oklch(86% 0.18 95);      /* pear */
  --color-accent-2: oklch(66% 0.18 235);   /* cyan */
  --color-accent-3: oklch(68% 0.24 18);    /* coral */
  --font-display: 'Plus Jakarta Sans Variable', sans-serif;
  --font-body: 'Plus Jakarta Sans Variable', sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
  --spacing-md: 1.5rem;
  --text-md: 0.9375rem;
  --radius-card: 20px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":    { "$value": "oklch(97% 0.012 95)", "$type": "color" },
    "ink":      { "$value": "oklch(20% 0.012 250)", "$type": "color" },
    "accent":   { "$value": "oklch(86% 0.18 95)", "$type": "color" },
    "accent-2": { "$value": "oklch(66% 0.18 235)", "$type": "color" },
    "accent-3": { "$value": "oklch(68% 0.24 18)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Plus Jakarta Sans Variable", "$type": "fontFamily" },
    "body":    { "$value": "Plus Jakarta Sans Variable", "$type": "fontFamily" },
    "mono":    { "$value": "JetBrains Mono Variable", "$type": "fontFamily" }
  },
  "space": { "md": { "$value": "1.5rem", "$type": "dimension" } }
}
```
