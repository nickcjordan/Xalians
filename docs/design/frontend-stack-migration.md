# Frontend stack migration: Bootstrap out, shadcn on Tailwind in

Ruled by Nick on 2026-09-09: strip all Bootstrap from the project and replace it with a modern stack, shadcn with Tailwind, Lucide icons, and whatever accompanies them. "Replace it all."

This is the contract for that migration. It changes the vehicle the design system rides in; it does not change the design system. `docs/DESIGN_SYSTEM.md` (version 4) remains the authority on color, type, space, corners, depth, controls, motion, brand and content. Every rule there maps onto a Tailwind token or a shadcn component variant below.

## Context

The frontend is a Vite app, React 17, React Router 5, 222 JavaScript files with JSX, 19 component stylesheets plus 14,500 lines of CSS under `public/assets/css`. Bootstrap is present three ways: the Bootstrap stylesheet and a 3,500-line BootstrapMade template loaded globally, React-Bootstrap components in 31 files (Modal, Row, Col, Container, Table, ListGroup, Form, Spinner, FloatingLabel, Stack, Badge, Navbar), and Bootstrap Icons plus two more icon fonts (Boxicons, Remixicon). The version 4 design system in `system.css` overrides Bootstrap on chrome pages with specificity hacks and `!important`, which is where a recurring class of bugs comes from.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | React upgrades 17 to 18 in the first phase. Every dependency allows 18 except `react-gsap`, which is used by one 13-line file and is replaced with direct GSAP calls. | 90% — peer ranges checked with `npm view` | `my-app/src/components/animations/fadeAnimation.js`, `package.json` |
| 2 | Tailwind 4 with the Vite plugin and CSS-first `@theme`; no `tailwind.config.js`. | 95% — current major, matches shadcn's current CLI | tailwindcss 4.3.3 on npm |
| 3 | shadcn components are generated as TypeScript (`.tsx`) under `src/components/ui`; the rest of the app stays JavaScript and converts only when a file is rewritten. `tsconfig.json` sets `allowJs` and the `@/` alias. | 85% — shadcn's JS mode is second-class; mixing is supported by Vite and Vitest | shadcn 4.21 docs; `vite.config.js` esbuild include |
| 4 | Tailwind's preflight is **not** loaded until Bootstrap's stylesheet is unlinked, so the two resets never fight. Phase 1 imports only the theme and utilities layers. | 90% | Tailwind 4 layered imports |
| 5 | One theme, dark, as the site already is. No `dark:` variant work, no light theme. | 95% — the design system is single-theme by contract | `docs/DESIGN_SYSTEM.md` section 3 |
| 6 | shadcn's semantic variables (`--background`, `--primary`, `--destructive`, `--ring`, `--radius`) are defined from the version 4 tokens, so stock shadcn components already come out in the house palette; variants are then restyled where the contract differs (square corners, chamfered primary, underline tabs, no shadows except floating). | 90% | `docs/DESIGN_SYSTEM.md` sections 3, 5, 6 |
| 7 | Element hues become Tailwind colors `el-fire` … `el-sand` and the `--g-el` scoping trick survives as a CSS variable set by an `el-*` scope class, so `bg-el` and `text-el` follow the element in scope exactly as `.g-el-fire` did. | 85% | `system.css` `.g-el-*` block; `colorConstants.js` |
| 8 | Icons: Lucide only, through `lucide-react`. Bootstrap Icons, Boxicons and Remixicon are unlinked and deleted from `public/assets/vendor`. | 95% — Nick: "lucide icons" | `index.html` vendor links |
| 9 | Forms use shadcn Form (react-hook-form and zod) for the auth modals; plain controlled inputs elsewhere. Toasts use sonner. | 80% — standard shadcn companions; the auth modals are the only real forms | `src/components/auth/*` |
| 10 | React Router stays on 5 for this migration. Upgrading to 7 is a separate change with its own risks (route API, `useHistory`). | 85% | 20 files call `useHistory`/`Switch` |
| 11 | Redux, boardgame.io, recharts, GSAP, Amplify and minisearch are untouched; they are logic or data, not styling. Recharts fills keep reading `designTokens.js`. | 95% | `package.json` |
| 12 | The token test that keeps CSS and JavaScript in step is rewritten to parse `src/styles/tokens.css` instead of `system.css`; the pairing rule stands. | 90% | `src/__tests__/designTokens.test.js` |
| 13 | Immersive pages (duel board, playground, Reclamation, training games, Long Return) lose React-Bootstrap and the icon fonts in this program so Bootstrap can leave the package, but keep their own stylesheets (`duel.css`, `duel-playground.css`, `reclamation.css`, `longReturn.css`) and the version 3 `.g-*` rules they read, which move into one `legacy-immersive.css` loaded until each page gets its immersive redesign. Rewriting that CSS onto Tailwind now would be thrown away by the redesign Nick has not started. | 85% — decided 2026-09-09 during phase 2 after measuring the surface: 12,000 lines of JavaScript and 6,500 of CSS, Reclamation with no Bootstrap at all | `src/components/games`, `public/assets/css` |
| 14 | The design skill, the style guide and `CLAUDE.md` are rewritten to the new vehicle in the final phase, and `system.css`, `style.css`, `tokens.css`, `typeColors.css`, the page CSS folder and the vendor folder are deleted. | 95% | `docs/DESIGN_SYSTEM.md` section 10 |

## Target stack

| Concern | Choice |
|---|---|
| Build | Vite 7, `@tailwindcss/vite`, `@vitejs/plugin-react`, svgr for species art |
| UI runtime | React 18, React Router 5 (unchanged) |
| Styling | Tailwind 4, tokens in `src/styles/tokens.css` (`@theme`), semantic layer in `src/styles/globals.css` |
| Components | shadcn (new-york style) in `src/components/ui/*.tsx`, Radix primitives via `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons | `lucide-react`, one `Icon` size scale: 14, 16, 20, 24 |
| Forms | `react-hook-form` + `zod` + shadcn Form |
| Toasts | `sonner`, restyled to the notice contract |
| Types | TypeScript for `src/components/ui`, `src/lib`, `src/styles`; `allowJs` for the rest |
| Tests | Vitest + Testing Library (unchanged); token test rewritten |
| Fonts | Google Fonts link unchanged: Saira, Atkinson Hyperlegible, Martian Mono, Iceland |

## Token mapping

`src/styles/tokens.css` is the only place a raw value lives. It declares, under `@theme`:

- Colors: `room`, `s0` to `s3`, `glass`, `ink` (text), `ink-2`, `ink-3`, `edge`, `edge-strong`, `rule`, `viable-hi`, `viable`, `viable-lo`, `viable-tint`, `viable-ink`, `plague`, `plague-tint`, `caution`, `caution-tint`, `neutral`, and the fourteen `el-*` hues from `colorConstants.js`.
- Fonts: `legend` (Saira), `body` (Atkinson Hyperlegible), `data` (Martian Mono), `brand` (Iceland).
- Sizes: `display` 44, `title` 40, `heading` 24, `subhead` 19, `lead` 17, `body` 15, `small` 13, `legend` 11.5.
- Spacing: Tailwind's 4px scale, which matches `--g-1` … `--g-9` exactly.
- Radius: 0 everywhere; the chamfer is a utility (`chamfer-8`, `chamfer-12`) that draws the two-layer clip.
- Shadow: `float` only.
- Breakpoints: `sm` 520, `md` 720, `lg` 1000, `xl` 1440. Every hand-written media query in the old CSS maps onto one of these.

`src/styles/globals.css` then sets the shadcn semantic variables from those tokens (`--background: var(--color-room)`, `--primary: var(--color-viable)`, `--primary-foreground: var(--color-viable-ink)`, `--destructive: var(--color-plague)`, `--ring: var(--color-viable)`, `--radius: 0`), defines the `el-*` scope classes, the chamfer utilities, the helix spinner keyframes, and the page ground.

`src/constants/designTokens.js` keeps the same values for recharts, GSAP and SVG attributes, and the token test asserts both files agree.

## Component mapping

| Design system piece | New implementation |
|---|---|
| Button ranks primary, secondary, quiet, destructive, icon | shadcn `Button` variants `default` (chamfered, viable), `secondary`, `ghost`, `destructive` (outline at rest), `icon` |
| Input, select, textarea, checkbox, toggle, range, segmented | shadcn `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `Slider`, `ToggleGroup` |
| Tabs | shadcn `Tabs` restyled to the underline mark; router-linked tabs use the same classes on `NavLink` |
| Chip, badge | shadcn `Badge` variants `chip` (element-filled), `chip-outline`, `badge`, `ok`, `warn`, `danger`, `info` |
| Panel, glass, card link | shadcn `Card` variants `panel`, `glass` (chamfer-12), `link` |
| Record row, spec plate, meter, move set, masthead, shell, empty state | House components in `src/components/system/*.tsx`, Tailwind classes, no CSS files |
| Notice, toast | `sonner` with the notice classes; inline `Alert` from shadcn |
| Modal, confirm, drawer, menu, popover, tooltip, fold | shadcn `Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu`, `Popover`, `Tooltip`, `Accordion` |
| Table, pagination, breadcrumb, progress, separator, kbd | shadcn `Table`, `Pagination`, `Breadcrumb`, `Progress`, `Separator`, `Kbd` |
| Spinner, brand lockup, helix mark, morph | Existing components, restyled with Tailwind classes; the GSAP morph is untouched |
| Icons | `lucide-react` |

Skeletons remain banned; shadcn's `Skeleton` is not installed.

## Phases

1. **Toolchain and system layer** (one PR, done by hand). React 18. Tailwind 4 without preflight. TypeScript config. shadcn init and the full component set above, restyled to the contract. `tokens.css`, `globals.css`, `Icon`. The style guide page rewritten on the new stack as the proof, rendering every component. Token test rewritten. Nothing else changes; Bootstrap is still loaded, every old page still renders.
2. **Chrome pages** (four briefs in parallel, four worktrees). Shell: navbar, home, account, user details, the three auth modals, the release confirm. Generator: page, record, stat and move panels, charts on the new tokens. Encyclopedia: shell, every section and record, the galaxy map. Lobbies: duel setup, training menu, how to play. Each brief deletes its page stylesheet and its React-Bootstrap imports; the old `.g-*` classes are replaced by system components and Tailwind classes.
3. **Immersive pages** (two briefs). Duel board and playground; training games, the Long Return and the shared game views. Each removes React-Bootstrap, Bootstrap classes and the icon fonts from its files and keeps its page stylesheet. Reclamation already has no Bootstrap and needs nothing. These do not get their version 4 redesign here.
4. **Teardown** (one PR, by hand). Move the version 3 `.g-*` rules the immersive pages still read out of `system.css` into `public/assets/css/legacy-immersive.css` (with the `--g-*` tokens they need), then unlink and delete Bootstrap, the template, the three icon fonts, `system.css`, `style.css`, `tokens.css`, `typeColors.css`, the page CSS folder, the vendor folder; remove `bootstrap` and `react-bootstrap` from the package; turn on Tailwind preflight and drop the interop rules; rewrite the build-ui skill, the design contract's "where things live" section and `CLAUDE.md`. Paint check every route at 1440 and 390, the immersive pages included.

Each phase merges to `main` on its own so the site stays deployable throughout.

## Rules for the agents

- The design contract wins over shadcn defaults. Square corners, one accent, no shadows off the floating layer, no skeletons, the helix spinner for loading.
- No new CSS files. Tailwind classes on elements; a shared pattern becomes a component in `src/components/system`, a one-off stays inline.
- No raw hex or font names outside `tokens.css`.
- One component per concern from `src/components/ui`; do not hand-roll a modal, menu or tooltip.
- Verify by paint at 1440 and 390 before reporting, using `scripts/design/snap.js`.
