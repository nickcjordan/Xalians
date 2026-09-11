# Route-owned legacy CSS

These stylesheets belong to specific lazy route entries and must not be linked from `index.html`:

- `duel.css`: imported by the live Duel match and the Duel affordance reference.
- `duel-playground.css`: imported after `duel.css` by the Duel affordance reference only.
- `reclamation.css`: imported by Reclamation only.

They remain legacy because their immersive redesigns have not been commissioned. Do not add unrelated page rules here. When a route is modernized, move reusable primitives into the shared design system, keep genuinely route-specific styling with the route, and tighten `bundle-budgets.json` from measured output.
