# Xalians Design System

The site has one visual language: **dark, galactic, neon-green**, with each of the 14 element types carrying its own colour. This document is the rulebook. The live reference is at **`/styleguide`** — it renders from the same tokens the pages use, so it cannot go stale.

## Where things live

| File | Role |
|---|---|
| `my-app/public/assets/css/tokens.css` | **Source of truth for CSS.** All tokens (`--x-*`) plus the primitive classes (`.x-*`). Loaded before everything else. |
| `my-app/src/constants/designTokens.js` | **Source of truth for JS.** The same palette, for consumers that can't read a CSS variable. |
| `my-app/src/constants/colorConstants.js` | The 14 element/type colours. Predates the system and is referenced widely, so it stays; `designTokens.js` re-exports it as `themeColors`. |
| `my-app/src/__tests__/designTokens.test.js` | Fails the build if the CSS and JS palettes disagree. |
| `my-app/public/assets/css/typeColors.css` | Element colour utility classes, generated from the element tokens. |
| `my-app/public/assets/css/style.css` | Page- and component-specific styles. Consumes tokens; should not define new raw colours. |
| `my-app/src/pages/styleGuidePage.js` | The living reference at `/styleguide`. |

## The two-sided palette, and why

Most styling belongs in CSS. But some consumers can only take a JavaScript string:

- **recharts** takes colours as `fill` / `stroke` props
- **GSAP** takes them as tween values
- **SVG** components take them as attributes

So the palette exists twice. That is a genuine duplication risk, which is why `designTokens.test.js` asserts every pair matches — change a colour on one side and the test fails naming the token that no longer agrees. **Never edit one side alone.**

## Rules

1. **No new raw hex.** If you're typing `#`, you either want an existing token or you're adding one. Add it to *both* sides and to the pairings list in the test.
2. **Use the spacing scale.** `--x-space-1` … `--x-space-8` (4px based). Not arbitrary pixel values.
3. **Cap body copy at `--x-measure`.** Long prose across a 1440px viewport is unreadable — the lore sections used to run ~200 characters per line.
4. **The value gets the emphasis, not the label.** In label/value pairs use `.x-detail-label` (dim) and `.x-detail-value` (bright). It used to be backwards.
5. **Contrast floor is 4.5:1** against the page background. `--x-text-dim` is the faintest step that clears it; anything fainter is decorative and must not carry meaning.
6. **Layering goes through the scale.** `--x-layer-navbar` and `--x-layer-modal`. The navbar sits at 99999, so a modal that doesn't outrank it gets its header covered — this is a real bug that shipped.

## Primitives

Class names are prefixed `.x-`.

| Class | Use |
|---|---|
| `.x-panel` | The core surface: a tinted, inset-glowing card. Defaults to brand green. |
| `.x-panel--type-<element>` | Keys a panel to an element colour (`.x-panel--type-fire`). |
| `.x-panel--flat` | Quieter panel for dense content, where a glow is noise. |
| `.x-page-title` / `.x-page-subtitle` | Page headers. Every page used to roll its own. |
| `.x-section-title` | Heading above a panel or section. |
| `.x-detail-row` / `.x-detail-label` / `.x-detail-value` | Label/value rows. |
| `.x-measure` | Caps content to a readable line length. |
| `.x-tabs` | Themed tabs. Bootstrap's default is blue-on-white and reads as broken here. |
| `.x-input` / `.x-input-addon` | Themed form controls. Bootstrap's are white-on-white. |
| `.x-empty-state` | "Nothing here" messaging. |

The panel is lifted from the planets page, which was the best-looking surface on the site before this system existed. `styleUtil.getInsideGlowThemeColor()` builds the same effect from JS where a dynamic element colour is needed.

## Buttons

Two variants, both bootstrap `variant` props: **`xalianGreen`** (primary action) and **`xalianGray`** (secondary). Both carry a green focus ring for keyboard users.

The `!important` flags on these rules are load-bearing — bootstrap's own `.btn` rules are more specific than a single class selector. Don't remove them without checking.

## Backgrounds

`.content-background-container` paints the starfield used site-wide. Pages that want the *drifting* particle field additionally mount `SplashGalaxyBackground` (home, species, planets) — that's a JS animation loop, so it stays opt-in rather than global.

## Adding a colour

1. Add the CSS token to `:root` in `tokens.css`.
2. Add the matching value to `designTokens.js`.
3. Add the pair to `PAIRINGS` in `designTokens.test.js`.
4. Run the tests. If you skipped step 2 or 3, they'll tell you.

## Known debt

- `style.css` is a 3504-line BootstrapMade template ("Gp v4.7.0") with a lot of unused rules. A naive scan says ~115 of 293 class names are unreferenced, **but that count has false positives**: `btn-xalianGreen` *is* used, composed by bootstrap from `variant='xalianGreen'`. Don't bulk-delete on that signal.
- Plenty of inline `style={{}}` remains, concentrated in the duel board components. Layout inline styles are lower priority; colour ones should move to tokens.
