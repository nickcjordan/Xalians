---
name: build-ui
description: Build or change anything visual on xalians.com (a page, a component, a game screen, a modal, CSS, chart colors) under the version 3 design system, "one relay, many terminals". Use before touching JSX className props, any CSS file, designTokens.js, or the styleguide, and when adding a new page or area of the site. Walks the terminal decision, the medium rule and the anchoring rule in order, and ends with the paint check.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Build UI under the terminal system

The site is a Zolto QED **relay**; each area is a remote **terminal** from a different faction and era. Read `docs/DESIGN_SYSTEM.md` in full before this skill; it is the contract. This skill is the order of operations.

## Step 1: which terminal, and why in the fiction

Answer before writing any markup: **who, in the fiction, owns this part of the experience?** Look it up in the terminal map (`docs/DESIGN_SYSTEM.md` section 4). If the area is listed, use its terminal. If it is new:

1. Read the lore summary in `CLAUDE.md` and, if needed, `docs/encyclopedia/encyclopedia.json` for the faction or world involved.
2. Pick the terminal whose owner matches: `relay` (Zolto network, the shell), `field` (salvaged ECHELON survey unit: generator, Reclamation, training), `archive` (Poseidas reading desk: reference and reading), `registry` (Kozrak's arena counter: duel, fees, ledgers), `readout` (the Generator's own voice, only as a mode inside another terminal).
3. If none fits, do not invent a look inline. Propose a new terminal row for section 3 (object, faction, era, hull, paper, screen, accent, legend face) in your message and use the closest existing terminal until Nick rules.

Write the answer as the first comment in the page file:

```js
// Terminal: registry. Kozrak's arena runs every duel as a ledger entry; setup is a docket at the clerk's window.
```

Set it on the page root: `<div className="g-console" data-terminal="registry">`. `src/__tests__/designSystem.test.js` fails without it.

## Step 2: sort every element into hull, paper or screen

For each thing on the page ask: does it change per record or per user?

- **No** and it is painted or moulded: **hull**. `.g-legend`, `.g-key`, `.g-keybank`, `.g-lamp`, `.g-asset-plate`, `.g-tape`, the terminal body (`.g-case`, `.g-counter`, `.g-desk`, `.g-cover-plate`).
- **Yes** and it is committed (a minted creature, a filed record, a ledger line that will not change): **paper**. `.g-paper--card`, `.g-paper--docket`, `.g-paper--slip`, with `.g-stamp`, `.g-tab`, `.g-clip`, `.g-meter--ink`, `.g-plate--photo`. **No buttons inside paper.**
- **Yes** and it is live (being generated, a link status, a battle, a cursor): **screen**. `.g-crt` for a full color record, `.g-vfd` or `.g-ledger` for a one-line status strip, `.g-screen` for terminal lines, `.g-readout` for the machine's voice.

A specimen record is content, not a medium: render `components/xalianRecord.js` inside the medium the terminal uses. If you find variable data sitting on `.g-panel` or `.g-shell` directly, that is a version 2 leftover; move it.

Legend text uses `--g-font-legend`; machine output uses `--g-font-out`; typed paper uses `--g-font-paper`; prose uses `--g-font-ui`. Never name a font family in page CSS.

## Step 3: anchor with the fewest cues

The object must show how it is attached to the world. Use the built-in cues (`.g-case` has hinge and screws, `.g-counter` has lip and clip well, `.g-desk` has the lamp pool, `.g-crt` has bezel and glass highlight, `.g-key` has travel). Do not add more. Exposed electronics, extra fasteners, whole-page overlays, glow on the hull and pulsing lamps were all tried and rejected; see section 8 of the design doc.

## Step 4: colors, type, spacing

- **No raw hex** in CSS or JSX. Need a color? Add a token to the terminal's block in `system.css` and to `designTokens.js`, and pair it in `designTokens.test.js`. Core tokens (`:root`) change only with Nick's approval.
- The 14 element hues are fixed points. `.g-el-<element>` on a container retunes meters, chips and tabs inside it. Never restyle them per terminal.
- Spacing from `--g-1` to `--g-9`; prose capped at `--g-measure`; digits `tabular-nums`; contrast floor 4.5:1 against the surface the text sits on (check it on paper too: faded typewriter ink still has to clear it).
- One `--primary` key per screen. Motion is mechanical and off under `prefers-reduced-motion`.
- Page-specific compositions go in `my-app/public/assets/css/pages/<area>.css`, loaded from `index.html`. Never add rules to `style.css`, `tokens.css`, `duel.css`, `reclamation.css` or `encyclopedia.css`; they are legacy and shrinking.

## Step 5: verify by paint

1. `cd my-app && yarn test --run` (token mirror and design-system tests must pass).
2. With the dev server up (`yarn dev`, port 3000), run from the repo root: `node scripts/design/snap.js --out untracked/snaps <route> ...`. Open the PNGs at both widths. Check: the terminal reads as its object at a glance, nothing overflows horizontally, no console errors, variable data is not on the hull.
3. If you changed a component in `system.css`, also snap `/styleguide` and confirm every terminal section still renders.
4. Only then report done. Never present visual work without a check that could have failed.

## Step 6: report friction

If a page's fiction fits no terminal, a rule forces something absurd, or a component cannot do what its lore says, stop and say so in the same message with the concrete case and the smallest change. The terminals and the three rules are levers, not stone.

## Reference

- Contract: `docs/DESIGN_SYSTEM.md`
- Ratified mockups with object descriptions: `docs/design/terminal-mockups.html`
- Living reference: `/styleguide`
- Harness: `scripts/design/snap.js`
