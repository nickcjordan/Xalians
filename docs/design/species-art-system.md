# Species art system

Xalian species art has two variants because one drawing cannot remain expressive at 300px and structurally legible at 35px.

## Variants

`portrait` is the authored, high-detail illustration. Use it for a species page, a generated-record detail view, an inspection panel, or another place where the art is large enough to reward detail. Portraits are loaded one species at a time.

`token` is a compact identity mark. Use it for board pieces, roster marks, card-grid thumbnails, and animated scene figures. The complete token set is eager so a game never begins with missing pieces.

Choose the variant from the role of the component, not from a resize observer or a CSS breakpoint. That keeps the same surface visually stable while it responds.

```jsx
<XalianImage speciesName="Terragoyle" primaryType="Earth" />
<XalianImage variant="token" speciesName="Terragoyle" primaryType="Earth" />
```

## Token drawing contract

Every file in `apps/web/src/svg/species/token` must:

- use the exact lowercase canonical species name as its filename;
- use `viewBox="0 0 64 64"` with the creature visually centered;
- contain a single-color silhouette that inherits `currentColor`;
- retain the two or three features that identify the species at 35px;
- keep important gaps broad enough to survive a light outline and drop shadow;
- avoid embedded styles, IDs, filters, masks, text, and exporter transforms;
- remain recognizable when filled solid black at DPR 1.

The token is not a mechanically thickened portrait. Fine interior illustration should be removed, but defining negative space, appendages, horns, and posture should remain. Vespersyn, for example, uses the lead familiar instead of reducing the entire swarm to noise.

## Adding a species

1. Add the canonical species record to `packages/content/json/species.json`.
2. Add the detailed portrait at `apps/web/src/svg/species/<name>.svg`.
3. Draw and add its compact counterpart at `apps/web/src/svg/species/token/<name>.svg` using the contract above.
4. Run `npm test -- --run xalianSvg` from `apps/web`. The registry test fails if content, portrait art, and token art are not a one-to-one set.
5. Inspect the token at 35px and 64px on a DPR 1 browser, including any surface that adds a stroke or shadow.

No JavaScript registry edit is required. The asset maps are generated from the two directories at build time, and an unknown or incomplete species receives a visible fallback instead of disappearing silently.
