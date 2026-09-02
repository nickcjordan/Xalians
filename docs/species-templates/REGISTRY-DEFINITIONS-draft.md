# Registry definitions (draft for Nick's sign-off, 2026-09-02)

Every enum an agent can assign in a species template, with a one-line definition and the disambiguation an agent needs. Values are the ratified sets (design doc, second ring 2026-08-30, communication re-ratified 2026-09-01, anatomy 2026-09-01, trait model 2026-09-02); no value is added or removed here. What is new is the definitions. Once ratified this text replaces section 5.5 of the migrate-species skill and is appended to the design doc. A blind validation pass follows ratification.

Rule for every enum: the key describes function or presentation, never material or looks. Material lives in `composition`, looks live in the art and the description.

## corporeality (2)

- `corporeal`: has a physical body that occupies space and can be touched, struck, and held.
- `non-corporeal`: has no persistent physical body; matter passes through it and it through matter. Forces `phasing` at 100 and a composition of `spectral` or `energy`.

## composition (8; primary required, secondary optional and different)

What the body is made of. Never a covering and never a body plan.

- `flesh`: living tissue, muscle and organ, whether or not it is covered in chitin, scale, or fur.
- `plant`: living vegetable tissue: wood, fiber, sap-carrying stem, leaf.
- `mineral`: stone, crystal, sand, or glass held together as a body.
- `metal`: metallic body, whether grown, forged, or assembled.
- `slime`: viscous or gelatinous mass with no fixed internal structure.
- `gas`: a body of vapor, smoke, or cloud that holds a shape.
- `energy`: a body of light, plasma, charge, or heat with no matter to speak of.
- `spectral`: a body of the ghost register: present, visible, and acting, but not made of matter or energy that instruments can name.

Disambiguation: a chitin crab is `flesh` (chitin is its `covering`); a stone golem is `mineral`; a glowing crystal creature is `mineral` primary with `energy` secondary if the light is part of the body; a fog creature is `gas`; a ghost is `spectral`.

## bodyPlan (9)

How the creature presents in the field and moves through it. The plan describes the whole entity as an opponent meets it, so a creature that fights as many bodies is `swarm` even when it has a single central body with its own anatomy. Anatomy lists the parts; the plan does not repeat them.

- `biped`: stands and moves on two legs; forelimbs, if any, are free for other work.
- `quadruped`: stands and moves on four limbs.
- `multiped`: stands and moves on more than four limbs, or on a limb arrangement that no other key names (a centaur-like torso on a crab's legs is `multiped`).
- `serpentine`: a long body that moves by undulation, with no limbs or with limbs too small to bear it.
- `avian`: a winged body that moves primarily by flight and perches or lands between flights; the wings are the defining locomotion whether the creature is bird-like, bat-like, or insect-like.
- `piscine`: a body built for movement through liquid: finned, streamlined, or jet-driven; may leave the water but is defined by it.
- `amorphous`: a body without a fixed shape that flows, spreads, or reforms as it moves.
- `swarm`: many bodies acting as one creature, whether the units are its own flesh, split-off pieces, or conjured projections held by a central mind. The units' shape lives in anatomy and the art.
- `floating`: a body that hangs or drifts in its medium without wings or fins, held up by gas, field, or the ghost register; movement is slow and directionless compared with `avian`.

Disambiguation: a bat is `avian`; a jellyfish is `floating` in water and `floating` in air; a flying insect swarm is `swarm`; a legged creature that also flies well is whichever it uses first in a fight, with `capabilities.flight` carrying the rest.

## covering (9)

The outer surface. Distinct from composition (what the body is) and from the `armored` trait (a mechanical fact that a covering may demand).

- `fur`: hair or pelt.
- `feathers`: feathers, down, or plumes.
- `scales`: overlapping plates of skin or horn, reptile or fish style, flexible as a whole.
- `chitin`: a hard exoskeleton or carapace grown by the body. Demands `armored` at 100 and the `shell` anatomy key.
- `hide`: thick, leathery, or rugged skin with no armored aspect. Pairs with the `hide` anatomy key and never with `shell`.
- `plating`: rigid plates that are not grown chitin: stone, metal, bone, or crystal armor integrated into the body. Demands `armored` at 100 and the `shell` anatomy key.
- `crystal`: a surface of crystal growth or facets. Demands `armored` at 100 only when the description says it is a defense.
- `mist`: a surface of vapor, smoke, or haze with no firm boundary.
- `bare`: smooth unprotected skin, membrane, or surface; the default for slime, gas, energy, and spectral bodies.

## diet (6)

- `carnivore`: eats other creatures.
- `herbivore`: eats plant matter.
- `omnivore`: eats both.
- `photosynthetic`: feeds on light directly.
- `energy-feeder`: feeds on a non-food energy: heat, charge, radiation, gravity, minds.
- `none`: does not feed; sustained by its nature (spectral, mineral, or Generator-sustained bodies).

## communication (array of up to 5; empty means mute)

Outward signaling to other creatures. Controlling one's own body, familiars, or projections is not communication. No Xalian speaks a language.

- `vocal`: calls, cries, roars, songs, hisses; any sound made by the body to signal.
- `vibration`: signals by tremor, drumming, or percussion through ground, water, or air.
- `display`: signals by posture, color, light pattern, or gesture.
- `chemical`: signals by scent or secreted substance.
- `telepathic`: signals by direct impression on another mind; feeling and image, never words.

## breathes and ambientMedia (phases, arrays; breathes is a subset of ambientMedia)

- `gas`: atmosphere of any chemistry.
- `liquid`: water or another liquid of any chemistry.
- `vacuum`: the absence of medium.

`breathes` lists the phases the body draws on to live; empty means a non-breather. `ambientMedia` lists the phases the creature can sustain activity in. Solid is never a medium: living inside rock or sand is the `burrow` capability. Chemistry, pressure, and humidity are not modeled.

## senses.special (array, optional; omit rather than leave empty)

Senses beyond sight, hearing, and smell. Each must be supported by a source sentence or the art; none is authored to fill space.

- `echolocation`: locates by emitted sound and its return.
- `tremorsense`: reads vibration through ground or water to locate what moves.
- `electroreception`: senses electric fields and living charge.
- `psychic`: senses minds, feelings, and intent directly. Satisfies the `mind` channel predicate.
- `heat-sense`: senses infrared and body heat.
- `void-sense`: senses gravity, mass, and the structure of space; the dark register's sense.

## lifespan (6; species-set, never rolled)

Bands of a working life under the wear rubric (mass and metabolic intensity, composition, home-world harshness).

- `fleeting`: a season to a few years; swarms, small hot-running fliers, disposable field units.
- `short`: a few years to a decade; small, fast, hard-working flesh.
- `standard`: decades; the default for mid-sized flesh bodies.
- `long`: many decades to a century or more; large, slow, cold, or armored bodies.
- `enduring`: centuries; mineral, metal, crystal, and the largest slow bodies.
- `ageless`: does not wear out; spectral and energy bodies. Still killable.

## genome.chirality (2)

- `rolled`: each individual rolls levo or dextro at 50/50; the default.
- `achiral`: the species has no handedness to roll; declared only when the body has no chiral chemistry (energy, spectral, some mineral).

## lore.descriptionStatus (2)

- `source`: the species.json description is carried verbatim because it is already in the full register.
- `upgraded`: the description was rewritten from a stub using only the stub, the art, and the planet history.

## capabilities (7 bands, 0 to 100)

Outcome-based: how well the creature does the thing, not how. 0 means it cannot; a band's ceiling above 60 needs a source sentence or the art.

- `flight`: sustained movement through air under its own power.
- `swim`: movement through liquid.
- `burrow`: movement through solid ground, sand, or rubble.
- `climb`: movement up surfaces steeper than it can walk.
- `sprint`: short-burst ground speed.
- `leap`: distance or height cleared in one bound.
- `manipulation`: handling objects; above 40 needs grasping anatomy or `telekinetic` at 100.

## actions (16; the verb of an ability)

Grain ruling: texture is carried by names, never by new actions. Stab, gore, and impale are `strike`; slash, cut, and tear are `rake`.

- `strike`: a single direct blow or thrust that lands with impact.
- `lash`: a sweeping or whipping blow from a flexible part or a swept limb.
- `crush`: pressure applied and held: squeezing, clamping, compressing.
- `rake`: a cutting or tearing pass that opens the target.
- `shove`: force that moves the target rather than wounds it: pushes, rams, throws off balance.
- `drain`: takes something from the target and keeps it: vitality, heat, charge, will.
- `ambush`: a strike delivered from concealment or with a sudden closing rush.
- `beam`: a focused projected line of energy or matter.
- `hurl`: a thrown or launched solid that travels to the target.
- `spray`: a projected stream or shower of matter over an area or line.
- `burst`: an outward release from the body that hits everything close at once.
- `cloud`: a lingering volume of matter or effect that occupies space.
- `snare`: holds, binds, pulls, or pins the target in place.
- `ward`: protects the user or an ally: shields, deflects, braces.
- `mend`: restores the user or an ally.
- `terrorize`: acts on the target's courage or will rather than its body.

## instruments (34 anatomy keys plus 7 channels)

Already defined in the skill's anatomy registry (section 5.6). Standing rule restated: keys are functional, never material; external parts only; one surface key per species (`shell` is the armored aspect, `hide` the unarmored); a crab's snapping claws are `pincers`.

## temperatureC

A sustained-normal-activity band in Celsius, inside the home planet's data-block range; sub-bands expected.

## What an agent may never assign

Anything not in these lists. The validator script fails any other value, and compound keys (`quadruped-avian`, `walking-legs`) are not values.
