# Registry definitions (draft v2 for Nick's sign-off, 2026-09-02)

Every enum an agent can assign in a species template, with a definition per value and the selection rule an agent needs when a body fits more than one. Values are the ratified sets (design doc, second ring 2026-08-30, communication re-ratified 2026-09-01, anatomy 2026-09-01, trait model 2026-09-02); no value is added, dropped, or renamed here. What is new is the definitions and the selection rules. Once ratified this text replaces section 5.5 of the migrate-species skill; the 34 anatomy keys and 7 channels stay in section 5.6 and are only cross-referenced here. A blind validation pass ran on v1 (23 of 29 species split); v2 answers every finding and is re-validated before Nick sees it.

Rules that apply to every enum:

- The key describes function or presentation, never material or looks. Material lives in `composition`; looks live in the art and the description.
- The element never decides a physiology value. A plant-element bird is `flesh`; a fire-element creature is not `energy`.
- One value per single-valued enum. When a body fits two, apply the selection rule in that enum's section; if the rule does not settle it, take the value the art shows and list the field under Authored fields.
- A transient state produced by an ability (a cat that atomizes into smoke, an ape that forms ice armor, a body in constant flame) never changes composition, covering, or body plan. The resting body is what is classified; the state is an ability or a trait.

## corporeality (2)

- `corporeal`: has a physical body that occupies space and can be touched, struck, and held.
- `non-corporeal`: has no persistent physical body; matter passes through it and it through matter. Carries `phasing` at 100 and a composition of `spectral`, `energy`, or `gas`.

## composition (8; primary required, secondary optional and different)

What the body is made of at rest.

- `flesh`: living animal tissue, muscle and organ, whatever covers it.
- `plant`: living vegetable tissue: wood, fiber, stem, leaf, root.
- `mineral`: stone, crystal, sand, or glass held together as a body.
- `metal`: metallic body, whether grown, forged, or assembled.
- `slime`: viscous or gelatinous mass with no fixed internal structure.
- `gas`: a body of vapor, smoke, or cloud that holds a shape at rest.
- `energy`: a body of light, plasma, charge, or heat with no matter to speak of.
- `spectral`: a body of the ghost register: present, visible, and acting, but made of neither matter nor energy that instruments can name.

Secondary rule: declare a secondary only when a second substance forms a structural part of the resting body (a limb, a casing, horns, a core), never for a coating, an emission, a weapon it makes, or a transient state. A rocky exoskeleton over slime is `slime` primary, `mineral` secondary; crystal horns on a furred body are `flesh` primary, `mineral` secondary; a body that can become smoke is `flesh` alone.

Disambiguation: a chitin crab is `flesh` (chitin is its covering); a stone golem is `mineral`; a fog creature that is fog at rest is `gas`; a ghost is `spectral`; a rooted mass of living roots is `plant`.

## bodyPlan (9)

How the creature presents in the field and moves through it at rest. The plan is chosen by the body the creature stands, swims, drifts, or flies with; anatomy lists the parts and the plan does not repeat them.

- `biped`: stands and moves on two legs; forelimbs, if any, are free for other work. A winged creature that stands and walks on two legs is `biped` with a `flight` capability, not `avian`.
- `quadruped`: stands and moves on four limbs. Same wing rule as `biped`.
- `multiped`: stands and moves on more than four limbs, or on a limb arrangement that no other key names (a torso on a crab's legs; a body borne on roots or tendrils that shift it).
- `serpentine`: a long body that moves by undulation, with no limbs or with limbs too small to bear it.
- `avian`: a winged body whose primary movement is flight and which lands or perches between flights; bird, bat, or insect alike, but only when the description or art shows flight as the way it moves, not merely that it has wings.
- `piscine`: a body built for movement through liquid: finned, streamlined, or jet-driven; may leave the water but is defined by it.
- `amorphous`: a body without a fixed outline that flows, spreads, or reforms as it moves.
- `swarm`: the creature presents as many bodies acting as one, whether the units are its own flesh, split-off pieces, or conjured projections held by a central mind (Nick, 2026-09-02: a creature whose whole way of fighting is a cloud of units is a swarm even when a single central body exists; that body's parts still go in anatomy).
- `floating`: a body that hangs, drifts, or glides in its medium with no wings and no fins, held up by gas, field, or the ghost register. Speed and direction do not matter; the absence of wings and fins does. A fast wingless flier is `floating`.

Selection rule: choose the plan by how the body is borne at rest (legs, undulation, fins, wings, drift, many units). A rooted body that never moves has no key in the ratified nine; see the open question at the end.

Disambiguation: a bat that hunts on the wing is `avian`; a winged humanoid that crouches and walks is `biped`; a jellyfish is `floating`; a bird-shaped creature that flies is `avian` whatever its element; a bat-like controller whose fight is its conjured cloud is `swarm`.

## covering (9; one value)

The outer surface of the resting body. Distinct from composition (what the body is) and from the `armored` trait (a mechanical fact a covering may carry).

- `fur`: hair or pelt.
- `feathers`: feathers, down, or plumes.
- `scales`: overlapping plates of skin or horn, reptile or fish style, flexible as a whole.
- `chitin`: a hard exoskeleton or carapace grown by the body. Carries `armored` at 100 and the `shell` anatomy key unless the walkthrough argues otherwise; the script warns when it does not.
- `hide`: thick, leathery, or rugged skin with no armored aspect. Pairs with the `hide` anatomy key and never with `shell`.
- `plating`: rigid plates that are not grown chitin: stone, metal, bone, or crystal armor integrated into the body. Same `armored` and `shell` expectation as `chitin`. A mineral or metal body whose surface is the body itself takes `plating`.
- `crystal`: a surface of crystal growth or facets covering the body. Carries `armored` at 100 when the crystal encloses the body; crystal that grows as horns, spines, or an emitter on another surface is anatomy (`spines`, `horns`, `core`), and the covering is whatever surrounds it.
- `mist`: a surface of vapor, smoke, or haze with no firm boundary.
- `bare`: smooth unprotected skin, membrane, or surface; the default for slime, gas, energy, and spectral bodies, and for a smooth-skinned flesh body with no hair, scale, or armor.

Selection rule: name the surface that covers most of the resting body. A hard casing over a soft body is the casing (`chitin` or `plating`). A partial second surface (feathers on a scaled body, a barbed tail on a furred body, metal on the limbs of a flesh body) does not change the value; the part goes in anatomy. Armor a creature forms on demand is an ability, not a covering.

## diet (6)

- `carnivore`: eats other creatures.
- `herbivore`: eats plant matter.
- `omnivore`: eats both.
- `photosynthetic`: feeds on light directly.
- `energy-feeder`: feeds on a non-food energy the description names it taking in: heat, charge, radiation, gravity, minds.
- `none`: does not feed at all, stated or implied by a body with no way to take anything in (spectral and energy bodies; a mineral body the description never shows feeding).

Selection rule: a creature the source shows hunting, biting, or taking prey is `carnivore`; one it shows grazing or eating plants is `herbivore`; one shown drawing in an energy is `energy-feeder`. When the sources say nothing about feeding, take `omnivore` for a flesh body, `none` for a spectral or energy body, and `energy-feeder` only if the description says the creature absorbs or stores an energy; list the field under Authored fields. A creature that stores energy it also eats food with is not an energy-feeder.

## communication (array of up to 5; empty means mute)

Outward signaling to other creatures. Controlling one's own body, familiars, or projections is not communication. An effect aimed at a target (hypnotizing it, terrorizing it) is an ability, not communication, even when it uses light or sound. No Xalian speaks a language.

- `vocal`: calls, cries, roars, songs, hisses; any sound the body makes to signal.
- `vibration`: signals by tremor, drumming, or percussion through ground, water, or air.
- `display`: signals to others by posture, color, light pattern, or gesture.
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

Bands of a working life. Apply the cuts in order: composition first, then mass and metabolic intensity, then home-world harshness.

1. Spectral and energy bodies are `ageless` (still killable).
2. Mineral and metal bodies are `enduring`; a mineral or metal secondary on a flesh body does not change the band.
3. Flesh, plant, slime, and gas bodies: under about 20 kg and metabolically intense (fliers, sprinters, swarms) are `fleeting` when the source shows a disposable or seasonal life, otherwise `short`; between about 20 and 200 kg are `standard`; above about 200 kg, or cold, slow, or armored at any mass, are `long`.
4. Harshness moves a flesh body one band down only when the description says the environment shortens its life.

- `fleeting`: a season to a few years.
- `short`: a few years to a decade.
- `standard`: decades.
- `long`: many decades to a century or more.
- `enduring`: centuries.
- `ageless`: does not wear out.

## genome.chirality (2, species template)

- `rolled`: each individual rolls levo or dextro at 50/50; the default. The generated record stores `levo` or `dextro`.
- `achiral`: the species has no handedness to roll; declared only when the body has no chiral chemistry (energy, spectral, some mineral). The record stores `achiral`.

## lore.descriptionStatus (2)

- `source`: the species.json description is carried verbatim because it is already in the full register.
- `upgraded`: the description was rewritten from a stub using only the stub, the art, and the planet history.

## capabilities (7 bands, 0 to 100)

Outcome-based: how well the creature does the thing, not how. 0 means it cannot. A band whose upper bound exceeds 60 needs a source sentence or a feature visible in the art. `flight` is the outcome and `bodyPlan` is the presentation: a `flight` band above 0 requires `wings` in anatomy, `bodyPlan: floating` or `swarm`, or a non-corporeal body, and the script warns otherwise.

- `flight`: sustained movement through air under its own power.
- `swim`: movement through liquid.
- `burrow`: movement through solid ground, sand, or rubble.
- `climb`: movement up surfaces steeper than it can walk.
- `sprint`: short-burst ground speed.
- `leap`: distance or height cleared in one bound.
- `manipulation`: handling objects; an upper bound above 40 needs grasping anatomy or `telekinetic` at 100.

## actions (16; the verb of an ability)

Grain ruling: texture is carried by names, never by new actions. Stab, gore, and impale are `strike`; slash, cut, and tear are `rake`. Concealment is the `stealthy` trait, never part of an action.

- `strike`: a single direct blow or thrust that lands with impact.
- `lash`: a sweeping or whipping blow from a flexible part or a swept limb.
- `crush`: pressure applied and held: squeezing, clamping, compressing.
- `rake`: a cutting or tearing pass that opens the target.
- `shove`: force that moves the target rather than wounds it: pushes, rams, throws off balance.
- `drain`: takes something from the target and keeps it: vitality, heat, charge, will.
- `ambush`: a burst of closing speed that ends in a hit.
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

Defined in skill section 5.6, which this file does not replace. Standing rules restated: keys are functional, never material; external parts only; one surface key per species (`shell` is the armored aspect, `hide` the unarmored); a crab's snapping claws are `pincers`.

## temperatureC

A sustained-normal-activity band in Celsius. It must lie inside the home planet's data-block range (`Temperature Low` to `Temperature High`); a narrower sub-band is expected and is justified from the history and the body. Extending past the planet range in either direction requires a quoted source sentence; without one it is a validation failure.

## What an agent may never assign

Anything not in these lists. The validator script fails any other value, and compound keys (`quadruped-avian`, `walking-legs`) are not values.

## Open question for Nick

The nine body plans have no key for a rooted, sessile body. Xylum (Floria) is a mass of living roots that lives underground and moves little or not at all; `multiped` requires limbs that bear and shift it, `amorphous` requires no fixed outline, `serpentine` requires undulation. Options: add a tenth value `sessile` (a rooted or fixed body that does not travel; movement, if any, is by growth), or rule that a rooted body borne on its roots is `multiped`. Recommendation: add `sessile`, because a plant-world creature line is expected to have more than one rooted species, and forcing them into `multiped` would make the plan lie about how the creature is met in the field.
