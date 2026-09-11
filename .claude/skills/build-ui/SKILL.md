---
name: build-ui
description: Build or change anything visual on xalians.com (a page, a component, a game screen, a modal, a chart color) under the version 4 design system on the shadcn and Tailwind stack. Use before touching a className, any stylesheet, designTokens.js, colorConstants.js, or the style guide, and when adding a new page or area. Walks the tier decision, the component check, the accent and status rules, accessibility, and ends with the paint check.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Build UI under the version 4 system

Read `docs/DESIGN_SYSTEM.md` in full first; it is the contract for what things look like. `docs/design/frontend-stack-migration.md` is the contract for how they are built: Tailwind 4 tokens, shadcn components restyled to the system, Lucide icons, no Bootstrap. This skill is the order of operations.

## Step 0: the five descriptors

Instrument, warm, printed, physical, quiet. Before anything else, check the thing you are about to build against them: it is operated rather than read at, its neutrals carry a hue, its surfaces have grain rather than flat fill, it has thickness if and only if it can be pressed, and it does not compete with the content. See the top of `docs/DESIGN_SYSTEM.md`.

## Step 1: which tier

Answer before writing markup: **does this screen read, browse, configure or manage, or is it play in progress?**

- Reads, browses, configures, manages: **site chrome**. Navigation, home, account, encyclopedia, generator, every lobby, setup, results and reference screen.
- A rich piece inside a chrome page that gives the area character (a map, a plate, a reader, a chart, a splash): **featured component**. Built from the same tokens; it may not change the page around it.
- A game in progress: **immersive experience**. It may replace the chrome, keeps the core, and always has a way out. **The whole tier is parked (Nick, 2026-09-11):** the games are still being built as games, so none of them is being restyled and no brief is being written. Reclamation, the duel board and reference, Long Return and the training games keep their legacy stylesheets under `public/assets/css/legacy/` and you do not restyle them, do not delete a stylesheet they read, and do not report their version 3 look as a bug. Design effort goes to chrome and featured components. This restarts on Nick's word.

Write the answer as the first comment in the file and set it on the root:

```tsx
// Tier: chrome. Duel setup is configuration; the board you enter afterward is the immersive experience.
<main className="min-h-screen bg-room font-body text-ink" data-tier="chrome">
```

`src/__tests__/designSystem.test.js` fails without the attribute.

## Step 2: use what exists

Open `/styleguide` (`src/pages/styleGuidePage.tsx` plus `src/pages/styleguide/*.tsx`): every component in the system is rendered there once, from the real code. The full inventory is section 10.1 of the contract. Chrome uses only these:

- `src/components/ui/*`: shadcn, restyled. Actions: Button (`default` for the one forward action, `secondary`, `outline`, `ghost`, `destructive`, `link`), ButtonGroup, Toggle, ToggleGroup. Inputs: Input, Textarea, InputGroup, NativeSelect, Select, Checkbox, RadioGroup, Switch, Slider, Label, Form, the Field set. Choosing: Command and CommandDialog, Combobox, Tabs (and `tabTriggerClass` for router links). Content: Card (`panel`, `recessed`, `raised`, `glass`, `link`), Badge (`chip`, `chip-outline` for elements; `default`, `ok`, `warn`, `danger`, `info` for state), Avatar, AspectRatio, Separator, ScrollArea, Collapsible, Accordion, Alert, Kbd, Progress. Overlays: Dialog, AlertDialog, Sheet (desktop), Drawer (phone), Popover, HoverCard, DropdownMenu, Tooltip, sonner's `toast`. Data: Table, Chart, Pagination, Breadcrumb.
- `src/components/system/*`: the house pieces. Shell, Masthead, SectionHead; the page templates IndexPage, RecordPage, FormPage, ResultsPage (start a new page from one of these); NotFoundPage, ErrorPage, OfflinePage, ErrorBoundary; SkipLink, VisuallyHidden, LiveRegion; SpecPlate, RecordRow, Meter, MoveSet, EmptyState, Tile; Stepper; StatTile, KeyValueList, Timeline, Callout, DataBlock; SearchField, FilterBar; DataTable; IdentityRow; HelixMark, HelixSpinner, BrandLockup.
- Icons: `lucide-react`, sizes `size-3.5`, `size-4`, `size-5`, `size-6`; one icon per meaning (contract section 16).

If the component you need is not there, **add it to the system**: `npx shadcn@latest add <name>` then restyle it to the contract in `src/components/ui`, or a new file in `src/components/system` when it is a house pattern used three or more times; then a section in the matching file under `src/pages/styleguide/` and its path in `V4_IMPORTS`. `systemGuards.test.js` fails until the style guide imports it. Never style a one-off inline that a system piece should own. A featured component may be new, but every color, face, size and corner in it is a token class.

## Step 3: color by rule

- **Accent test.** Is this alive, or the one action that moves the person forward? Only then `viable`, `viable-hi`, `viable-lo`, `viable-tint`. One `Button` default per screen. Headings, icons, dividers and kickers never wear it.
- **Status by role.** `viable`, `plague`, `caution`, `neutral` appear only on interface state: badges, borders, toasts, validation.
- **Element by content.** Put `el-<element>` on a container and `bg-el`, `text-el`, `border-el` inside it follow the element. Interface state never uses an element hue.
- **No raw values.** A new color is a token in `src/styles/tokens.css` and `src/constants/designTokens.js`, paired in `src/__tests__/tokens.test.js`. No hex, rgba, px font size or font name anywhere else; no arbitrary Tailwind color values.

## Step 4: type, space, corners, motion

- Type roles are classes: `type-display`, `type-title`, `type-heading`, `type-subhead`, `type-legend`, `type-data`; prose is `font-body text-body` (or `text-lead`, `text-small`). Never `font-[…]` or a font name.
- Spacing on the 4px scale; prose capped at `max-w-[62ch]`. Breakpoints `sm` 520, `md` 720, `lg` 1000, `xl` 1440.
- Square corners. The chamfer is only on `Card variant="glass"` and the default `Button`, and they already carry it. `rounded-*` resolves to zero on purpose.
- Motion `duration-1`, `duration-2`, `duration-3` with `ease-out`; nothing loops or pulses; instant under reduced motion. Loading is `HelixSpinner`, never a skeleton.
- No CSS files for pages. Tailwind classes on elements; a shared pattern becomes a component in `src/components/system`. `src/styles/globals.css` is for the semantic layer only.

## Step 5: copy

Controls say what happens in plain words. States use the world's registry words (kept, released, unclaimed; won, lost, abandoned). In-world voice lives in content, not on buttons. Errors say what went wrong and how to fix it.

## Step 6: verify by paint

1. `cd apps/web && npm test -- --run && npx tsc --noEmit -p tsconfig.json`.
2. With the dev server up, from the repo root: `node scripts/design/snap.js --out untracked/snaps <route> ...`. Open the PNGs at both widths. Check: nothing overflows, no console errors, contrast holds, focus is visible, the accent appears only where the rule allows, the fonts are Saira, Atkinson Hyperlegible and Martian Mono and not a fallback.
3. If you changed anything in `src/components/ui` or `src/components/system`, also snap `/styleguide`.
4. Tab through the page once: the skip link appears first, every control takes the ring, every overlay traps and returns focus (contract section 15).
5. Only then report done. Never present visual work without a check that could have failed.

## Step 7: report friction

If the contract or a component fought the thing you were building, say so in the report with the case and the smallest change that would fix it. Nick decides.
