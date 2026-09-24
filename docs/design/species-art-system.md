# Species art system

Status: art presentation direction updated with Nick's agreement on 2026-09-18. The current site implementation still has two SVG variants. Their existence does not limit the number of presentation forms the art library may use.

## Presentation direction

- **Agreed:** Keep the existing portrait as a visual reference baseline for each species. The ratified species template and lore remain the authority if a portrait conflicts with them.
- **Agreed:** An animated stage performance is an approved additional presentation role. More roles may be added where a real use case calls for them.
- **Deferred:** The current compact SVG art remains in use, but its future form is outside this animation study. If a compact species representation becomes a production requirement, it applies across the species library.
- **Open:** The final stage style, required views, and universal clip set are not selected. The three-species cutout pilot is a working implementation, not a permanent visual standard.

The current review concerns animated stage performances: how a creature moves, how its defining action reads, and how editable motion becomes a reusable game asset.

## Current site forms

`portrait` is the authored, high-detail illustration. Use it for a species page, a generated-record detail view, an inspection panel, or another place where the art is large enough to reward detail. Portraits are loaded one species at a time.

`token` is the current compact species identity mark used for board pieces, roster marks, and some animated scene figures. It is unrelated to the account's Scrambler Token. The art is a separate simplified SVG, rather than a runtime resize of the portrait. The current loader imports art lazily by species; it requires a same-named portrait and token before showing either one. Duel, Reclamation, Arcade, and Long Return currently use token art. This is implemented behavior to preserve while its long-term role is reviewed.

Choose the variant from the role of the component, not from a resize observer or a CSS breakpoint. That keeps the same surface visually stable while it responds.

```jsx
<XalianImage speciesName="Terragoyle" primaryType="Earth" />
<XalianImage variant="token" speciesName="Terragoyle" primaryType="Earth" />
```

## Existing token drawing contract

Every file in `apps/web/src/svg/species/token` must:

- use the exact lowercase canonical species name as its filename;
- use `viewBox="0 0 64 64"` with the creature visually centered;
- contain a single-color silhouette that inherits `currentColor`;
- retain the two or three features that identify the species at 35px;
- keep important gaps broad enough to survive a light outline and drop shadow;
- avoid embedded styles, IDs, filters, masks, text, and exporter transforms;
- remain recognizable when filled solid black at DPR 1.

The token is not a mechanically thickened portrait. Fine interior illustration should be removed, but defining negative space, appendages, horns, and posture should remain. Vespersyn, for example, uses the lead familiar instead of reducing the entire swarm to noise.

## Adding a species to the current site

1. Add the canonical species record to `packages/content/json/species.json`.
2. Add the detailed portrait at `apps/web/src/svg/species/<name>.svg`.
3. Draw and add its compact counterpart at `apps/web/src/svg/species/token/<name>.svg` using the contract above.
4. Run `npm test -- --run xalianSvg` from `apps/web`. The registry test fails if content, portrait art, and token art are not a one-to-one set.
5. Inspect the token at 35px and 64px on a DPR 1 browser, including any surface that adds a stroke or shadow.

No JavaScript registry edit is required. The asset maps are generated from the two directories at build time, and an unknown or incomplete species receives a visible fallback instead of disappearing silently. These steps describe current code, not a permanent art-production requirement.

## Stage performance brief

The stage form is approved as a role. The production requirements below are proposals to test before making them universal:

1. Identify the ratified template, lore, and portrait baseline. Trace the anatomy, eye or other contact point, body covering, size, emitter sources, and features that must read in silhouette.
2. Define the actual viewing context, camera/view, apparent scale, smallest displayed size, and any habitat or staging constraints. Do not normalize biological scale without an intentional presentation reason.
3. Save editable source for the character, its rig or frame animation, and any separate effects. The chosen visual style may use SVG, layered raster, Blender, or a combination, while the game delivery can remain 2D frames.
4. Write a motion brief for that species: rest, anticipation, peak, recovery, and visual cue meanings. Choose clips needed by real presentation uses. The pilot's `idle`, `action`, and `hit` names are examples, not a universal catalog.
5. Export stable placement origins, frame timing, and any needed attachment or emitter points. Keep visual cues separate from game results. Review playback at actual stage size and normal speed.
6. Review the motion, finish treatments, source editability, clipping, joins, legibility, and resource cost. Record the art revision separately from immutable creature genesis.

Additional views, expressions, locomotion, or reaction clips should be justified per creature or consuming game. A difficult body plan may require drawn frames or other authoring methods in place of a conventional cutout rig.

The [art direction review](creature-art-direction-review.md) compares animation methods. The [Avilily motion brief](avilily-motion-comparison-brief.md) defines the next controlled performance study.

## Concept-art refinement protocol

Treat the approved creature record as the design source and generated images as proposals. Do not rewrite anatomy or lore merely to explain an accidental render. If an image suggests a genuinely stronger design, state the proposed change explicitly and approve it as a design decision before the record changes.

For each refinement pass:

1. Name one approved image as the baseline and name the exact regions allowed to change.
2. Restate invariants before editing: appendage count, attachment points, functional-organ source, unsupported pose, major markings, palette, and background.
3. Prefer one class of change per pass. If an edit changes an unrelated region, discard it and return to the last approved baseline instead of stacking repairs on the contaminated output.
4. Trace anatomy rather than counting visible tips. Every load-bearing limb must form one unambiguous path from body attachment through its joints to its own contact surface; every emitted substance must have a visible source and a credible route into the action.
   For an aquatic-bodied playable creature, inspect the neutral land pose as well: its weight support, ground-contact surfaces, and likely push or pull motion should read as capable, not as a stranded swimmer. Fins or other aquatic structures may do this work without becoming ordinary legs. Do not rely on a prose claim of land mobility to rescue an image that visibly contradicts it.
5. Inspect negative space as anatomy. Contrasting pigmentation and interior gaps must not make adjacent limbs appear fused, crossed, detached, or exchanged. Simplify the marking before adding outline detail.
6. Judge character features as part of the whole silhouette. A crest, marking, or nonfunctional flourish must have a deliberate base and direction, remain distinct from ears or working organs, and leave room for the functional anatomy already present.
7. Use familiar associations as a readability aid, not the complete concept. A creature may read as spider-like or bird-like while retaining species-specific posture, anatomy, markings, and purpose.
8. Scope visual references to the rendering language being borrowed. Do not let another creature's anatomy, segmentation, surface treatment, or proportions enter merely because its silhouette style was referenced.
9. Check the image at portrait size, 64px, and 35px. Replace fine hair, reflection streaks, tiny markings, and narrow gaps with broader masses that survive reduction.
10. Label every displayed result as `evaluate`, `intermediate`, or `discarded`. Background corrections and other repair outputs remain intermediate until their invariants have been rechecked. Present exactly one image as the evaluation target at the end of a pass.

Before art approval, perform one final lore check against the record and one final visual trace of every repeated part. Record any intentional anatomy change in the proposal's art-consistency section. If a compact mark is needed, derive its design from the approved portrait rather than from an earlier concept, and test it at its actual use size.
