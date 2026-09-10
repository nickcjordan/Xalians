---
name: build-ui
description: Build or change anything visual on xalians.com (a page, a component, a game screen, a modal, a chart color) under the version 4 design system on the shadcn and Tailwind stack. Use before touching a className, any stylesheet, designTokens.js, colorConstants.js, or the style guide, and when adding a new page or area. Walks the tier decision, the component check, the accent and status rules, and ends with the paint check.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Build UI under the version 4 system

Read `docs/DESIGN_SYSTEM.md` in full first; it is the contract for what things look like. `docs/design/frontend-stack-migration.md` is the contract for how they are built: Tailwind 4 tokens, shadcn components restyled to the system, Lucide icons, no Bootstrap. This skill is the order of operations.

## Step 1: which tier

Answer before writing markup: **does this screen read, browse, configure or manage, or is it play in progress?**

- Reads, browses, configures, manages: **site chrome**. Navigation, home, account, encyclopedia, generator, every lobby, setup, results and reference screen.
- A rich piece inside a chrome page that gives the area character (a map, a plate, a reader, a chart, a splash): **featured component**. Built from the same tokens; it may not change the page around it.
- A game in progress: **immersive experience**. It may replace the chrome, keeps the core, always has a way out, and needs a short brief approved by Nick before it is built. Do not start an immersive experience from this skill alone. Until a game gets its brief it keeps its legacy stylesheet under `public/assets/css/legacy/` and you do not restyle it.

Write the answer as the first comment in the file and set it on the root:

```tsx
// Tier: chrome. Duel setup is configuration; the board you enter afterward is the immersive experience.
<main className="min-h-screen bg-room font-body text-ink" data-tier="chrome">
```

`src/__tests__/designSystem.test.js` fails without the attribute.

## Step 2: use what exists

Open `/styleguide` (`src/pages/styleGuidePage.tsx`): every component in the system is rendered there once, from the real code. Chrome uses only these:

- `src/components/ui/*`: shadcn, restyled. Button (variants `default` for the one forward action, `secondary`, `outline`, `ghost`, `destructive`, `link`), Badge (`chip`, `chip-outline` for elements; `default`, `ok`, `warn`, `danger`, `info` for state), Card (`panel`, `recessed`, `raised`, `glass`, `link`), Input, Textarea, Select, Checkbox, Switch, Slider, ToggleGroup, Tabs (and `tabTriggerClass` for router links), Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Accordion, Table, Pagination, Breadcrumb, Progress, Separator, Kbd, Alert, ScrollArea, RadioGroup, Form, Label, sonner's `toast`.
- `src/components/system/*`: the house pieces. Shell, Masthead, SectionHead; SpecPlate, RecordRow, Meter, MoveSet, EmptyState, Tile; HelixMark, HelixSpinner, BrandLockup.
- Icons: `lucide-react`, sizes `size-3.5`, `size-4`, `size-5`, `size-6`.

If the component you need is not there, **add it to the system**: `npx shadcn@latest add <name>` then restyle it to the contract in `src/components/ui`, or a new file in `src/components/system` when it is a house pattern used three or more times; then a section on the style guide. Never style a one-off inline that a system piece should own. A featured component may be new, but every color, face, size and corner in it is a token class.

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

1. `cd my-app && npm test -- --run && npx tsc --noEmit -p tsconfig.json`.
2. With the dev server up, from the repo root: `node scripts/design/snap.js --out untracked/snaps <route> ...`. Open the PNGs at both widths. Check: nothing overflows, no console errors, contrast holds, focus is visible, the accent appears only where the rule allows, the fonts are Saira, Atkinson Hyperlegible and Martian Mono and not a fallback.
3. If you changed anything in `src/components/ui` or `src/components/system`, also snap `/styleguide`.
4. Only then report done. Never present visual work without a check that could have failed.

## Step 7: report friction

If the contract or a component fought the thing you were building, say so in the report with the case and the smallest change that would fix it. Nick decides.
