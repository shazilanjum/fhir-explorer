# FHIR Resource Explorer

A developer-facing single-page app — a "Postman for FHIR" — that connects to any
FHIR R4 server, browses the resource types it supports, runs parameterized
searches, and renders results both as human-friendly cards and as
syntax-highlighted raw JSON.

The browser talks to the FHIR server **directly** — there is no backend. This
keeps the app trivial to deploy (any static host) and works out of the box with
public test servers that support CORS. It defaults to the public HAPI test
server at `https://hapi.fhir.org/baseR4`.

### Design system

Four complete themes ship together and switch at runtime from the command bar:

- **Hum** *(default)* — playful. Cream paper, multi-accent: **pear** for actions
  and in-range values, **sky-cyan** for links and references, **coral** for the
  one high-energy moment. Rounded surfaces, buttons that physically press down.
  Plus Jakarta Sans + JetBrains Mono.
- **Lumen · Night Foundry** — atmospheric. Cool-violet near-black canvas, molten
  **brass** accent, coral chord, a 4% blueprint grid, and cards that are
  hairline + lit from within rather than drop-shadowed. Instrument Serif + Geist
  + JetBrains Mono, with lowercase UI chrome.
- **Manifesto** — editorial poster. Warm bone paper, one **signal red** accent,
  heavy geometric caps, square corners and 2px rules. Flat: no shadows anywhere.
  Geist + JetBrains Mono.
- **Terminal** — atmospheric. Green-tilted near-black, **phosphor green** primary
  with amber as the second phosphor, a faint 32px scan grid. Monospace
  everywhere — the single family *is* the design.

`src/tokens.css` keeps only shared structure in `:root` and puts every expressive
value in a `[data-theme]` block, so **components never branch on the theme** —
adding one is a token block plus a `THEMES` entry, with no component edits.

Bright accents are **fill-only** in both themes — anything you read uses a deeper
text-safe variant. Measured: **9/9 pairs pass** WCAG AA in Hum, **8/8 in Lumen**.

The system is documented in [design.md](design.md) and implemented as OKLCH
tokens in [src/tokens.css](src/tokens.css) (mapped to Tailwind utilities).
Components reference tokens by name — no inline colours.

### Interactive layer

A small, deliberate set of libraries carries the "fun and interactive" feel
(rather than a full design system):

- **[cmdk](https://cmdk.paco.me)** — the ⌘K / Ctrl+K command palette to
  fuzzy-jump to any of the server's resource types or re-run a recent search.
- **[base-ui](https://base-ui.com)** — accessible primitives: the preset-server
  `Select` and the mobile sidebar `Dialog` (focus trapping, keyboard nav, and
  dismissal handled for us).
- **[Shiki](https://shiki.style)** — real syntax highlighting for the raw-JSON
  pane, assembled from the fine-grained core (JSON grammar + one theme + JS
  regex engine, no WASM) and lazy-loaded into its own chunk.
- **[motion](https://motion.dev)** — spring-based enter animations for result
  cards, the detail two-pane, and the mobile drawer slide.
- **[NumberFlow](https://number-flow.barvian.me)** — animated transitions on the
  result-count / resource-type-count numbers.
- **[Sonner](https://sonner.emilkowal.ski)** — toasts for copy confirmation and
  connection success/failure.

## Setup

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # preview the production build
```

Open the dev server URL that Vite prints. The app connects to the default HAPI
server automatically; change the base URL in the top bar (or pick a preset) to
point at any other CORS-enabled R4 server.

## Deploy to Vercel with GitHub

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New > Project**, import the repository, and click
   **Deploy**. Vercel detects Vite and uses `npm run build` with `dist/` as the
   output directory.
3. Keep the included `vercel.json`: it sends direct visits to client-side routes
   such as `/Patient/123` through `index.html`.

No environment variables are required. The app connects from the browser to
FHIR servers, so those servers must permit requests from the deployed Vercel
domain through CORS.

## Features

- **Server connection bar** — set/change the FHIR base URL. On connect it
  fetches `/metadata` and shows the server's software name/version and FHIR
  version. The URL and an optional bearer token persist to `sessionStorage`, so
  a reload doesn't drop your connection — but both clear when the tab closes.
- **Resource type browser** — a filterable sidebar of the resource types
  advertised by the server's `CapabilityStatement`.
- **Server-driven search params** — the search form is built from the server's
  own `CapabilityStatement.rest.resource[].searchParam`: real parameter names,
  their FHIR search type, and the server's own documentation. Each type gets an
  appropriate editor — `date`/`number`/`quantity` get comparison prefixes
  (`ge`/`le`/…), `token` gets a `system|code` pair, `reference` gets a
  resource-type + id pair, `string` gets `contains`/`exact` modifiers. Values
  round-trip through the URL, so a search is shareable and re-runnable. Falls
  back to a built-in list when a server advertises nothing.
- **Terminology lens** — every `Coding` in a resource is listed and can be
  resolved on demand via `CodeSystem/$lookup`, showing the concept's display
  name, definition, and properties. An unresolvable code is reported as a
  *server* limitation ("this server doesn't have LOINC loaded"), never as an
  invalid code.
- **Request inspector** (⌘⇧I) — a log of every FHIR call: method, URL, status,
  duration, response size, and whether auth was attached, with **copy-as-cURL**
  per row. The token is emitted as `$FHIR_TOKEN`, never the literal credential.
- **Search execution** — runs `GET {base}/{ResourceType}?{params}`, shows the
  total count, and paginates via the Bundle `next` link.
- **Results list** — one card per entry with a few key fields chosen per
  resource type (Patient → name/gender/birthDate, Observation →
  code/value/effective, etc.), falling back to id + resourceType for unknown
  types.
- **Resource detail** — a two-pane view: a formatted human-readable panel (a
  summary plus a flattened field table) on the left, and copy-able raw JSON with
  lightweight syntax highlighting on the right.
- **Error handling** — FHIR `OperationOutcome` errors, network/CORS failures,
  and empty results all surface as clear, friendly messages.
- **Session query history** — recent searches are remembered for the session and
  can be re-run with one click from the sidebar.
- **Multi-server presets** — a dropdown of known CORS-friendly R4 servers (HAPI,
  SMART Health IT).

## Architecture

```
src/
  fhir/
    types.ts       Hand-written R4 interfaces for the special-cased resources
                   (Patient, Observation, Condition, MedicationRequest,
                   Encounter) plus Bundle/CapabilityStatement/OperationOutcome,
                   and a permissive UnknownResource fallback.
    client.ts      fhirClient — the single module that makes HTTP calls. Builds
                   URLs, sets FHIR headers, and normalizes failures into FhirError.
    display.ts     Per-type presentation helpers: summarizeResource() for cards
                   and commonSearchParams() for the search form.
  hooks/
    useFhir.ts     React Query hooks: useCapabilityStatement + useSearch
                   (useInfiniteQuery following Bundle `next` links).
  context/
    ServerContext.tsx  In-memory connection state + session search history.
  components/
    Layout.tsx           App shell (connection bar + responsive sidebar + main).
    ConnectionBar.tsx    Base-URL input, presets, connection status.
    ResourceSidebar.tsx  Filterable resource-type list + recent searches.
    WelcomeView.tsx      Landing / server summary (index route).
    SearchView.tsx       Search route; URL-driven committed params.
    SearchParamForm.tsx  Common + arbitrary parameter editor.
    ResultCard.tsx       One result summary card.
    ResourceDetail.tsx   Two-pane detail route.
    ui/                  Skeleton, Spinner, Badge, EmptyState, ErrorMessage,
                         CopyButton, JsonView.
  App.tsx          Providers (QueryClient, ServerProvider) + router.
```

**Data flow.** Components never call `fetch`. They call React Query hooks in
`hooks/useFhir.ts`, which delegate to `fhirClient`. Query keys include the base
URL and params so switching servers or searches is cached independently. The
committed search lives in the URL query string, which makes searches shareable
and lets history entries re-run by navigation.

## Design decisions and tradeoffs

- **No backend, direct browser calls.** Simplest possible deployment and matches
  the "explorer for CORS-enabled test servers" use case. Tradeoff: can't reach
  servers that lack CORS or require secret tokens. The fix — a thin proxy — is
  noted in the scope but intentionally out of scope here.
- **Layered persistence, chosen per lifetime.** Search history stays in React
  state only (gone on reload — it's disposable). The connection URL and bearer
  token persist to `sessionStorage`: they survive a reload, which matters for a
  tool you keep open all day, but clear when the tab closes, which matters
  because one of them is a credential. The theme choice persists to
  `localStorage` since it's a preference, not a secret — it survives across
  sessions. All three degrade silently to in-memory-only if storage is
  unavailable (see `src/lib/storage.ts`).
- **Hand-written, partial types.** Rather than pulling in the large generated
  `@types/fhir` package, we model only the fields we actually read and let
  everything else fall through `UnknownResource` (`[key: string]: unknown`). This
  keeps types honest and the bundle small; the cost is that special-casing a new
  resource type means adding a few fields by hand.
- **URL as the source of truth for searches.** Committed params are stored in the
  query string (not component state). This gives shareable/re-runnable searches
  and clean history for free, at the cost of a small amount of URL/state sync
  code in `SearchView`.
- **Cursor-based pagination via `next`.** We follow the server-provided `next`
  link (`useInfiniteQuery`) instead of computing `_offset`/`_count` ourselves, so
  the paging cursor stays opaque and server-defined.
- **Shiki, fine-grained + lazy.** The raw-JSON pane uses Shiki for real
  highlighting, but assembled from `shiki/core` with only the JSON grammar, one
  theme, and the JS regex engine (no Oniguruma WASM, no other languages), and
  dynamically imported so it lands in its own chunk loaded on first use rather
  than in the initial bundle. Tradeoff: the very first JSON render shows a plain
  fallback for a beat while the chunk loads.
- **Client-side routing on a static host.** Deep links like `/Patient/123` need
  the host to serve `index.html` for unknown paths (SPA fallback). Configure your
  static host accordingly, or the dev server handles it automatically.

## Possible extensions

- Create/update resource form (POST/PUT with `OperationOutcome` validation).
- Resource version diff via `_history`.
- A backend proxy for auth'd (non-CORS / token-protected) servers.
