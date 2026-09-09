---
name: build-ui
description: Build or change anything visual on xalians.com (a page, a component, a game screen, a modal, CSS, chart colors) under the version 4 design system (site chrome, featured components, immersive experiences). Use before touching JSX className props, any CSS file, designTokens.js, colorConstants.js, or the styleguide, and when adding a new page or area. Walks the tier decision, the component check, the accent and status rules, and ends with the paint check.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Build UI under the version 4 system

Read `docs/DESIGN_SYSTEM.md` in full first; it is the contract. This skill is the order of operations. Check section 11 of the doc for migration state: until a page is migrated it is still version 3, and you do not half-apply version 4 to it.

## Step 1: which tier

Answer before writing markup: **does this screen read, browse, configure or manage, or is it play in progress?**

- Reads, browses, configures, manages: **site chrome**. Navigation, home, account, encyclopedia, generator, every lobby, setup, results and reference screen.
- A rich piece inside a chrome page that gives the area character (a map, a plate, a reader, a chart, a splash): **featured component**. Built from the same tokens; it may not change the page around it.
- A game in progress: **immersive experience**. It may replace the chrome, keeps the core, always has a way out, and needs a short brief approved by Nick before it is built. Do not start an immersive experience from this skill alone.

Write the answer as the first comment in the file and set it on the root:

```js
// Tier: chrome. Duel setup is configuration; the board you enter afterward is the immersive experience.
<main className="g-page" data-tier="chrome">
```

`src/__tests__/designSystem.test.js` fails without it.

## Step 2: use what exists

Open `/styleguide` (or `src/pages/styleGuidePage.js`). Chrome uses only the components rendered there: page frame and masthead, buttons by rank, inputs, segmented, toggle, checkbox, range, form field, card, glass, list, table, tabs, chip, badge, meter, spinner, empty state, toast, modal, menu, tooltip.

If the component you need is not there, **add it to the system**: tokens if needed, the component with all five states in `system.css`, a styleguide section, and the test. Never style a one-off inline. A featured component may be new, but every color, face, size and corner in it comes from a token.

## Step 3: color by rule

- **Accent test.** Is this alive, or the one action that moves the person forward? Only then `--g-viable*`. One primary per screen. Headings, icons, dividers and kickers never wear it.
- **Status by role.** Viable, Plague, Caution, Neutral appear only on interface state: badges, borders, toasts, validation.
- **Element by content.** `.g-el-<element>` on a container sets `--g-el` for chips, plates, tiles, meters and map points inside it. Interface state never uses an element hue.
- **No raw hex.** A new color is a primitive in `system.css` and `designTokens.js`, paired in `designTokens.test.js`, then a semantic alias.

## Step 4: type, space, corners, motion

- Saira for anything that labels or heads (uppercase and tracked at legend size), Atkinson Hyperlegible for prose, Martian Mono for values with `tabular-nums`. Never name a font family in page CSS; use `--g-font-legend`, `--g-font-body`, `--g-font-data`.
- Spacing from the 4 point scale; prose capped at 62 characters.
- Square corners. The chamfer is only on `.g-glass` and `.g-key--primary`, and they already carry it.
- Motion 120, 200 or 320 ms, eased; nothing loops or pulses; instant under reduced motion. Loading is `.g-spinner` (the helix), never a skeleton.
- Page-specific compositions go in `my-app/public/assets/css/pages/<area>.css`, loaded from `index.html`. Never add to `style.css`, `tokens.css`, `duel*.css`, `reclamation.css` or `encyclopedia.css`.

## Step 5: copy

Controls say what happens in plain words. States use the world's registry words (kept, released, unclaimed; won, lost, abandoned). In-world voice lives in content, not on buttons. Errors say what went wrong and how to fix it.

## Step 6: verify by paint

1. `cd my-app && yarn test --run` (token mirror and design-system tests must pass).
2. With the dev server up, from the repo root: `node scripts/design/snap.js --out untracked/snaps <route> ...`. Open the PNGs at both widths. Check: nothing overflows, no console errors, contrast holds, focus is visible, the accent appears only where the rule allows.
3. If you changed `system.css`, also snap `/styleguide`.
4. Only then report done. Never present visual work without a check that could have failed.

## Step 7: report friction

If a screen fits no tier, a rule forces something absurd, or a component cannot do what the content needs, stop and say so in the same message with the concrete case and the smallest change. The system is a set of levers, not stone.

## Reference

- Contract: `docs/DESIGN_SYSTEM.md`
- Ratified proposal pages: `docs/design/v4-foundations.html`, `docs/design/v4-chrome.html`
- Living reference: `/styleguide`
- Harness: `scripts/design/snap.js`
