# Immersive legacy CSS

Nothing in this directory may be linked from `index.html` or imported by a chrome route. The shared `immersive.css` entry preserves the v3 cascade for the remaining games and is imported only by their lazy entries:

- `duelPage.js` and `duelPlaygroundPage.js`
- `reclamationPage.js`
- `longReturnPage.js`
- `matchCardGamePage.js` and `physicsGamePage.js` (also rendered by the training lobby)

Its import order is `tokens.css` then `system.css`; the final element defaults now sit at the end of `system.css`, preserving the former cascade without a second shared stylesheet. The route sheets follow it:

- `duel.css`: imported by the live Duel match and the Duel affordance reference.
- `duel-playground.css`: imported after `duel.css` by the Duel affordance reference only.
- `reclamation.css`: imported by Reclamation only.
- `training.css`: imported after `immersive.css` by Xalian Match and Physics only; the Training Grounds lobby receives it through those embedded game modules.

They remain legacy because their immersive redesigns have not been commissioned. Do not add unrelated page rules here. When a route is modernized, move reusable primitives into the shared design system, keep genuinely route-specific styling with the route, and tighten `bundle-budgets.json` from measured output.
