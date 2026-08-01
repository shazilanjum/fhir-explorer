# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (--host; honors a PORT env var, else 5173)
npm run build    # tsc -b && vite build — the real gate, run this before claiming done
npm run lint     # oxlint
npm run preview  # serve the production build
```

**There is no test suite** — no vitest/jest/playwright, no `test` script. `npm run build` is the only automated verification, so changes are validated by (a) building and (b) driving the running app against a live FHIR server.

`tsc -b` is **incremental** and has masked real parse/type errors after edits. When something looks wrong but the build passes, force a clean check:

```bash
rm -f node_modules/.tmp/tsconfig.app.tsbuildinfo && npx tsc -b --force
```

`tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly` — an unused import or a value-position `import` of a type will fail the build.

### Verifying in the browser

`.claude/launch.json` defines a `dev` preview config with `autoPort: true`. Vite reads `process.env.PORT` (see `vite.config.ts`) so the preview proxy can reach it — don't remove that.

Dev-server HMR in this project produces **stale, misleading console errors** after multi-step edits (e.g. `X is not defined`, `Failed to reload`, transient parse errors). Before chasing one: check the timestamp, confirm `npm run build` passes, then restart the preview server and re-read the console. Repeatedly, these have been artifacts rather than defects.

## Architecture

A client-only FHIR R4 explorer ("Postman for FHIR"). The browser talks to the FHIR server **directly** — no backend, no proxy. Default target is the public HAPI test server.

### Everything goes through one HTTP function

`src/fhir/client.ts` exposes `fhirClient` and a private `request()`. Every network call funnels through `request()`, which:

- sets `Accept: application/fhir+json` and, when a token exists, `Authorization: Bearer`
- normalizes all failures into a single `FhirError` with `kind: 'network' | 'operation-outcome' | 'http' | 'parse'` (components branch on `kind`, never on raw fetch state)
- records **every** exit path — success and all four failure modes — into `src/fhir/requestLog.ts`

Never call `fetch` directly elsewhere; you'd bypass auth, error normalization, and the request inspector.

`requestLog.ts` is a hand-rolled external store (subscribe/getSnapshot) because `client.ts` is a plain module, not React. `RequestInspector.tsx` reads it via `useSyncExternalStore`. Its `toCurl()` deliberately emits `$FHIR_TOKEN` rather than the real credential — keep it that way.

### Server-driven, not hardcoded

The app derives behavior from the server's `CapabilityStatement` wherever possible:

- **Resource types** (sidebar, ⌘K palette) come from `rest.resource[].type`
- **Search parameters** come from `rest.resource[].searchParam` — real names, FHIR types, and the server's own documentation (`src/fhir/searchParams.ts`), with a static fallback only when a server advertises none
- **SMART OAuth endpoints** come from the `oauth-uris` security extension

`searchParams.ts` owns the FHIR search encoding/decoding rules — comparison prefixes (`ge`/`le`), `system|code` tokens, `Type/id` references, `:contains`/`:exact` modifiers — plus two things the CapabilityStatement *cannot* tell us:

- `REFERENCE_TARGETS` — `searchParam` omits `SearchParameter.target`, so target types for well-known reference params are encoded here. One target renders a fixed label (no picker); several render a narrowed dropdown; unknown falls back to the full list.
- `formatParamDocumentation()` — servers document shared params as one blob covering every resource type (`"Multiple Resources: * [Condition](url): … * [Observation](url): …"`). This strips markdown and keeps only the entry for the type being searched.

**`SearchParamForm` derives state rather than snapshotting it.** Param *types* only arrive with the CapabilityStatement, so values and visible rows are `useMemo`'d over `(query, serverParams)` with user edits/additions layered on top. Snapshotting into `useState` on first render decodes values with the wrong types (a `date` param keeps its prefix glued to its value) — that bug has already been fixed once.

### Rendering follows the resource type

Three modules interpret FHIR semantics so a body temperature doesn't render identically to an insurance claim:

- `src/fhir/instruments.ts` → `deriveInstrument()` returns a typed descriptor (gauge, multibar, readout, span, identity, dosage); `components/instruments/` draws it. **Only claims low/normal/high when the server supplied a `referenceRange`** — never invent clinical ranges.
- `src/fhir/references.ts` → walks a resource for every `Reference`, parses relative/absolute/`#contained`/`urn:` forms. Absolute refs are navigable only when their base matches the connected server.
- `src/fhir/codings.ts` → walks for every `Coding`; `TerminologyLens.tsx` resolves them on demand via `CodeSystem/$lookup`.

`src/fhir/types.ts` is hand-written and **partial** by design — only fields actually read are modeled; everything else falls through `UnknownResource`'s `[key: string]: unknown`. Adding a special-cased resource means adding a few fields by hand.

### Theming: four themes, zero component branching

`src/tokens.css` keeps only shared structure in `:root` (4-pt space scale, type scale, motion) and puts every expressive value in a `[data-theme='…']` block: `hum` (light/rounded/multi-accent), `lumen` (dark/serif/brass), `manifesto` (light/geometric/red/square), `terminal` (dark/mono/phosphor).

`tailwind.config.js` maps utilities to those CSS variables, so **components reference semantic tokens (`bg-paper`, `text-ink-2`, `border-rule`, `shadow-card`) and never branch on the theme.** Adding a theme = one token block + one `THEMES` entry in `ThemeContext.tsx`, with no component edits.

Cross-theme conventions worth preserving:
- Bright accents are **fill-only**; anything read as text uses a `-text`/`link`/`ink-*` variant. All four themes currently pass WCAG AA on every text pair — re-check if you change a palette.
- `.card`, `.btn`, `.blueprint`, `.label-mono`, `.verb` are defined once in `index.css` and specialize per theme via `[data-theme]` selectors. Extend those rather than re-improvising per component.
- Lumen's lowercase is applied via `.ui-lower` to **static UI copy only** — never to data. FHIR resource types, ids, codes, and names are case-sensitive; markup stays sentence case for screen readers and CSS does the transform.

`design.md` is the locked design system (a `hallmark`-managed file) and documents each theme plus provenance — Hum/Lumen are transcribed from bundled specs, Manifesto/Terminal are constructed from documented axes. Amend it rather than overriding a palette locally.

### State and persistence

Three lifetimes, chosen deliberately (`src/lib/storage.ts` wraps all access so unavailable storage degrades silently):

| State | Where | Lifetime |
| --- | --- | --- |
| Base URL, bearer token | `sessionStorage` (`ServerContext`) | survives reload, clears on tab close |
| Theme | `localStorage` (`ThemeContext`) | across sessions |
| Search history | React state only | disposable |

The token is never written to `localStorage` and never placed in a URL. `index.html` carries an inline boot script reading `fhir-explorer:theme` before first paint to avoid a light-theme flash — keep its key in sync with `THEME_STORAGE_KEY`.

**The committed search lives in the URL query string**, so searches are shareable and re-runnable from history. `SearchView` commits via `setSearchParams`; the form edits a draft.

### Data fetching

`src/hooks/useFhir.ts` wraps `fhirClient` in React Query. **The token is part of every query key** — changing it refetches. `useSearch` is a `useInfiniteQuery` that follows the Bundle `next` link, so paging cursors stay server-defined.

## Behavioral conventions

- **Silent success.** Toasts fire on *failure* only. Copy confirms inline; a live connection shows a dot plus server identity. (`--ease-press`, `--ease-out`, `--ease-spring` are the only easings; focus rings never animate.)
- **Degrade honestly, and say whose limitation it is.** Several features depend on optional server capabilities: `$lookup` (terminology), `_revinclude=*` (incoming references), `$everything`. When one is unsupported, report it as a *server* limitation — e.g. "this server doesn't have LOINC loaded, the code may still be valid" — not as invalid user data. `useIncomingReferences` demonstrates the pattern: try `_revinclude`, fall back to per-type `patient=` search, and label which method answered.
- **Known server quirks:** a broad unparameterized `Observation` search returns an empty first page on HAPI's public server (with a `next` link); HAPI hosts the HL7 terminology CodeSystems but *not* LOINC/SNOMED. Both are server behavior, not app bugs.
