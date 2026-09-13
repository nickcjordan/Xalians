# Immersive legacy CSS

Nothing in this directory may be linked from `index.html` or imported by a chrome route. The shared `immersive.css` entry preserves the v3 cascade for the remaining games and is imported only by their lazy entries:

- `duelPage.js` and `duelPlaygroundPage.js`
- `reclamationPage.js`
- `longReturnPage.js`

Its import order is `tokens.css` then `system.css`; the final element defaults now sit at the end of `system.css`, preserving the former cascade without a second shared stylesheet. The route sheets follow it:

- `duel.css`: imported by the live Duel match and the Duel affordance reference.
- `duel-playground.css`: imported after `duel.css` by the Duel affordance reference only.
- `reclamation.css`: imported by Reclamation only.

The retired Training Grounds prototypes have been replaced by the v4 Arcade routes, which use colocated Tailwind styling and no legacy stylesheet. The files that remain here are legacy because their immersive redesigns have not been commissioned. Do not add unrelated page rules here. When a route is modernized, move reusable primitives into the shared design system, keep genuinely route-specific styling with the route, and tighten `bundle-budgets.json` from measured output.
