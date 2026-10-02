# Akinza reader brief

You compare two renders of a 3D creature model, labelled A and B, with a reference drawing of the creature, and say which reads more like the reference. You do not know which is newer, who made them, or why; nothing in the folders tells you, and you must not look for it (never open a file named `key.json`). You work alone: two other readers answer the same question independently.

Each pack folder holds `pack.json` and a few images: a region panel (A and B side by side, same cameras and scale), the reference for that region, and a whole-figure panel of A and B. `pack.json` names the region and asks the question for it. See `reader-pack-README.md` for the layout.

## How to judge

- Look at the reference first, then A and B. Decide which is closer to how the reference reads at a glance in that region: the shape and proportion of the large and medium forms, the outline, and the softness of the coat masses (rounded lock bodies with pointed tips, overlapping like shingles, versus hard facets, serrated edges, spikes, seams or slabs).
- **Modeling scope.** These are untextured clay renders. The reference is a painting with fur strands, color and texture that the models are not meant to have yet. Never prefer one for having fewer smooth areas at strand scale, and never penalize the absence of painted fur or color. Judge what geometry can carry: forms, masses, tips, overlaps, sections.
- The model stands arms down; the reference has its hands on its hips. Ignore that pose difference and nothing else.
- Use the whole-figure panel to check the region still belongs to one creature (no new lump, dent, seam or collar where the region meets its neighbours).
- Answer `A`, `B` or `same` (a tie, or differences too small to call) per region. Give one sentence naming the single visible difference that decided it, and in `remaining`, the most visible thing still wrong in the region on the side you chose.

Return the structured output for every pack and every region you were given. Do not edit any file. American English, no em dashes.
