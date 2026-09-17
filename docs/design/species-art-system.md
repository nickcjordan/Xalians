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

## Concept-art refinement protocol

Treat the approved creature record as the design source and generated images as proposals. Do not rewrite anatomy or lore merely to explain an accidental render. If an image suggests a genuinely stronger design, state the proposed change explicitly and approve it as a design decision before the record changes.

For each refinement pass:

1. Name one approved image as the baseline and name the exact regions allowed to change.
2. Restate invariants before editing: appendage count, attachment points, functional-organ source, unsupported pose, major markings, palette, and background.
3. Prefer one class of change per pass. If an edit changes an unrelated region, discard it and return to the last approved baseline instead of stacking repairs on the contaminated output.
4. Trace anatomy rather than counting visible tips. Every load-bearing limb must form one unambiguous path from body attachment through its joints to its own contact surface; every emitted substance must have a visible source and a credible route into the action.
5. Inspect negative space as anatomy. Contrasting pigmentation and interior gaps must not make adjacent limbs appear fused, crossed, detached, or exchanged. Simplify the marking before adding outline detail.
6. Judge character features as part of the whole silhouette. A crest, marking, or nonfunctional flourish must have a deliberate base and direction, remain distinct from ears or working organs, and leave room for the functional anatomy already present.
7. Use familiar associations as a readability aid, not the complete concept. A creature may read as spider-like or bird-like while retaining species-specific posture, anatomy, markings, and purpose.
8. Scope visual references to the rendering language being borrowed. Do not let another creature's anatomy, segmentation, surface treatment, or proportions enter merely because its silhouette style was referenced.
9. Check the image at portrait size, 64px, and 35px. Replace fine hair, reflection streaks, tiny markings, and narrow gaps with broader masses that survive reduction.
10. Label every displayed result as `evaluate`, `intermediate`, or `discarded`. Background corrections and other repair outputs remain intermediate until their invariants have been rechecked. Present exactly one image as the evaluation target at the end of a pass.

Before art approval, perform one final lore check against the record and one final visual trace of every repeated part. Record any intentional anatomy change in the proposal's art-consistency section, then derive the compact token from the approved portrait rather than from an earlier concept.
