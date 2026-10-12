# Akinza reader brief

You compare two renders of a 3D creature model, labelled A and B, with a reference drawing of the creature, and say which reads more like the reference. You do not know which is newer, who made them, or why; nothing in the folders tells you, and you must not look for it (never open a file named `key.json`). You work alone: two other readers answer the same question independently.

Each pack folder holds `pack.json` and a few images: a region panel (A and B side by side, same cameras and scale), the reference for that region, and a whole-figure panel of A and B. `pack.json` names the region and asks the question for it. See `reader-pack-README.md` for the layout.

## How to judge

- Look at the reference first, then A and B. Decide which is closer to how the reference reads at a glance in that region: the shape and proportion of the large and medium forms, the outline, and how clean and soft the surfaces are (smooth, rounded forms versus lumps, dents, creases, hard facets, serrated edges, spikes, seams or slabs).
- **The reference panel says which kind it is.** When it is headed "Reference (approved look)", it shows a part Nick has approved (`docs/design/species-construction/akinza/approved-looks.json`), rendered as clay at the same cameras as A and B: prefer whichever of A and B keeps that look, and treat any departure from it as a loss, even one that moves toward the painted sheet. Otherwise it is the painted sheet, cropped to the region, plus accepted studies.
- **Fur is not modeled (Nick, 2026-10-08 and 2026-10-09).** These are untextured clay renders. Fur comes later from the texture stage, as tufts of hair, not feathers and not sculpted locks, shorter on the face, head and neck and longer at the ear tips. The painted sheet draws fur, strands and color the models are not meant to have, so its outline sits outside the clay: never prefer a model for following the painted fur outline, for modeled locks, pointed tips, shingles or tufts, and never penalize a smooth, clean form for lacking them. Judge what the clay carries: the forms under the fur, their proportions, sections and joins.
- The model stands arms down; the reference has its hands on its hips. Ignore that pose difference and nothing else.
- Use the whole-figure panel to check the region still belongs to one creature (no new lump, dent, seam or collar where the region meets its neighbors).
- Answer `A`, `B` or `same` (a tie, or differences too small to call) per region. Give one sentence naming the single visible difference that decided it, and in `remaining`, the most visible thing still wrong in the region on the side you chose.

Return the structured output for every pack and every region you were given. Do not edit any file. American English, no em dashes.
