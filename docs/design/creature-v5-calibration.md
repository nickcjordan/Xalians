# Canonical v5 roster calibration

2026-09-21. This is the shared-reference authoring pass for the 32 staged templates in `docs/species-templates/v5/`. Ratings are open-ended comparisons: 0 means absent, 50 is the standard reference, 75 strong, and 100 exceptional. They are not percentages, damage formulas, or percentiles against the current roster. Direct harm, repair, protection and displacement outputs use their own reference descriptions in `packages/content/src/creature/benchmarks.ts`; a harm 70 and a restore 70 are not equal quantities. Games decide the numerical consequences.

## Method and decisions

The earlier v4 bands were source-reviewed relative values, then the roster-wide v5 audit checked all 32 against physiology and planet context. This pass compared their notable high/low attribute, movement and sense bands to the stable benchmark meanings, rather than applying old archetype/trait modifiers. Every v5 ability output was compared within its *effect family and mechanism*, with mass, anatomy and lore used only as evidence for the band. Fixed signatures use fixed output where needed; ordinary domains generally retain a range. Default status intensity remains 50 unless the source expressly gives a stronger degree. These are authoring references, not a promise that every game will treat the same rating identically.

Two corrections came from the cross-roster comparison:

- `flight` now explicitly allows a low positive rating for brief controlled flight. Dromeus's wing-assisted launch qualifies; its rating of 15–35 is well below a standard sustained flier. Smokat's old 20–45 flight band was removed because drifting as smoke does not establish controlled self-powered flight. Its temporary seep remains a status effect.
- Specific source language justifies stronger status intensity for Avilily's powerful paralysis, Yetimoth's thick ice armor, Hypnopet's locking visual trance, Venemist's dissolving corrosion and Thirstaserp's severe dehydrating venom. Their fixed actions received fixed values; ordinary domains received ranges. Other statuses use the catalog's 50 default rather than invented grades.

The following comparisons anchor the most influential values and avoid treating element identity as output strength:

| Species | Calibration anchor |
|---|---|
| Akinza | High agility/sight with lowlight, but modest physical contact and no ice output. |
| Avilily | Small physical outputs; strong explicit paralytic saliva, high flight and agility. |
| Bioflim | Very low agility, high shell resilience, substantial self repair and chemical contact. |
| Chromocat | Exceptional agility/sprint and powerful ion-blade cutting, with no teleport rating. |
| Codazzo | Moderate body force; an explosive barb's blast exceeds its ordinary claw output. |
| Crystorn | Slow heavy body with strong fists and separately strong gem light. |
| Drilltail | Strong burrowing, moderate dog-sized drill and pincer outputs. |
| Dromeus | Very fast ground runner; limited brief flight and a stronger closing bite than standing claw contact. |
| Ectoghoul | Low physical strength, high movement through explicit spectral transit, moderate ectoplasm impact. |
| Figzy | High reasoning and modest body force; mental protection/displacement outclass antler contact. |
| Foromeer | Industrial piercing and compression, with moderate plated-limb contact. |
| Frackworm | Colossal head-drill and slurry output; low agility and sight. |
| Graviclaw | Heavy gravity-amplified compression and attraction, high toughness, low agility. |
| Hippochamp | Useful pressure-water output and cooling, with lower hoof/tail contact. |
| Hypnopet | High mental aptitude, low strength and no bodily harm or wound-healing output. |
| Imprit | Quick and intelligent, with moderate flaming oil and tail cutting; fire-retardant fur is resistance, not immunity. |
| Kosanos | Heavy brush-clearing blade and body force, low agility. |
| Luceras | Exceptional leap and agility but small mass; descent outranks tail contact. |
| Neph | Large-scale pressure and suction with slow maneuvering; Benthane causes chilled, not automatic ice imprisonment. |
| Newtapede | Strong swim and maneuvering; restraint is a hold, not an invented damage multiplier. |
| Scalatto | High shell resilience, modest rolling and claw output, scoped cutting resistance. |
| Shuntara | Protective filament output is its emphasis; jaw damage is minor. |
| Smokat | Agile solid feline contact; temporary seep, no independent flight or fire attack. |
| Sonalloy | Skilled external alloy repair and lesser pincer harm; continuous self renewal is separate. |
| Terragoyle | Strong tail-launched boulders and flight; dispersed gravel has lower per-recipient output. |
| Thirstaserp | Venom's severe ongoing impairment outranks its ordinary fang pierce; no hydration bar. |
| Tizzie | Visually received mind harm outclasses small tail contact. |
| Venemist | Chemical dissolution dominates its weak physical fallback. |
| Vespersyn | Coordinated swarm piercing/protection with a weaker central body. |
| Voltish | Stored electric discharge exceeds ordinary alloy-claw cutting. |
| Xylum | Strong rooted body, self regrowth and hold, not target vitality theft. |
| Yetimoth | Heavy fists, thick armor and freezing; no route-wall mechanic. |

The status catalog supplies the default when a status intensity is omitted. Its values describe relative degree, not a universal skipped-turn count. Ordinary ranges provide variation only within authored mechanisms. Area size, recovery, likelihood and resistance remain distinct from raw output ratings. The canonical release test generates 80 deterministic samples per species, checks distinct action structures and guaranteed identity, and independently replays all 32 through the release adapter. This is a design/authoring calibration, not a per-creature production evaluation or a game balance pass.
