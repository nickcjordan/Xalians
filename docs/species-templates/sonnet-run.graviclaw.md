# Graviclaw — migration walkthrough

## Source status

Description is already in full species register (body appositive, engineered purpose implied by behavior, present-day/ongoing predatory turn, well within 60-140 words) so `descriptionStatus: "source"`, kept verbatim. No upgrade needed.

## Physiology

- **corporeality: corporeal.** The species is a physical creature with a shelled body and claws; nothing in the description suggests non-corporeal form.
- **composition primary flesh, secondary mineral.** "the black-shelled body of a crab and an upright torso" — the torso is organic (flesh), the shell is a hardened biological casing best captured by the mineral secondary within the enum (no "chitin" composition option; chitin is expressed via `covering` instead).
- **bodyPlan: multiped.** "the centaur-like crustacean known as the Graviclaw" — a crab lower body implies more than four legs; no "centaur" enum exists, so `multiped` is the closest honest fit for a crab-legged lower half.
- **covering: chitin.** "black-shelled body," "an immovable wall of chitin" — chitin is stated outright.
- **anatomy: [claws].** "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut" — claws are the only named external functional part in the text. No other limb, mouth, or sensory part is described, so no other anatomy key is claimed.
- **size.** Legacy height 191 cm / weight 211 kg used only as a relative gauge per rule 0.6; banded around it: heightCm [175, 210], weightKg [190, 240], reflecting "massive claws" and a body strong enough to become "an immovable wall."
- **lifespan: long.** Wear rubric: an armored crustacean chassis with slow-and-immovable habits (anchoring, ambush lurking rather than high-output activity) wears slowly; Grimedes is a harsh but not mechanically abrasive environment ("foggy wetlands"), so `long` rather than `enduring`/`ageless`.
- **genome.chirality: rolled.** No species-level override stated; default.
- **diet: carnivore.** "draw its helpless prey right into its clutches" — it captures and presumably consumes prey.
- **communication: [].** No calls, cries, displays, or signals are described anywhere in the text; treated as mute per rule (empty array is legal).
- **breathes: [gas, liquid].** "lurks just beneath the foggy wetlands" implies an amphibious creature moving between submerged ambush and open air ("foggy" surface conditions); both media supported.
- **environmentalTolerance.ambientMedia: [gas, liquid]** matching breathes. **temperatureC [-5, 15]**: from the Grimedes planet history, "a shadowy world... cloak of perpetual night," a dying, dim brown dwarf star providing "almost no visible light other than the shortest bands of infrared radiation" — a cold, sunless world; the wetland niche keeps it above deep-freeze, hence a cool but not extreme band.
- **capabilities:**
  - flight [0,0]: no wings or flight mentioned; excluded.
  - swim [40,65]: "lurks just beneath the foggy wetlands... in the water" — a competent swimmer/submerger, not described as a fast open-water hunter, so mid band.
  - burrow [10,30]: "root itself to the ground" implies some ground-engaging capability short of true burrowing; low-to-modest band.
  - climb [0,10]: nothing in the text supports climbing; a heavy, anchoring body argues against it.
  - sprint [10,25]: an ambush predator that "roots itself" and snaps shut on prey drawn to it is not built for a chase; low band.
  - leap [0,10]: no leaping behavior described; heavy anchored body argues against it.
  - manipulation [45,70]: claws capable of precise, forceful closure ("snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials") justify an above-baseline manipulation band; per the constraint this is legal because grasping anatomy (claws) is present.
- **senses:** sight [20,40] and hearing [30,50] kept modest because Grimedes is a near-lightless world ("almost no visible light") and the creature ambushes by feel/pressure rather than sight; smell [40,60] slightly higher for tracking prey in murky wetland water; special: void-sense, justified by the planet history's description of Grimedes Xalians as beings who "bend space and time," sense gravitational/dark-space phenomena, and by the species' own "control over the intensification of gravitational waves" implying an innate sense for gravity fields consistent with the `void-sense` enum value.

## Archetype weights

`juggernaut` (strength, resilience) 5 — primary read: an armored, claw-crushing, anchor-and-tank body. `bulwark` (vitality, resilience) 4 — the "immovable wall of chitin" line supports a tanking role beyond pure offense. `stalwart` (resilience, willpower) 2 — minor weight for the steadfast, rooted-in-place behavior.

## Attribute bands

- strength [70,95]: "snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure" is an explicit, extreme strength claim.
- resilience [70,92]: chitin shell plus "immovable wall" framing.
- vitality [45,65], endurance [40,60]: moderate; no text suggests exceptional stamina or fragility either way.
- agility [10,25]: an anchoring, lurking ambush predator is not agile.
- reflex [25,40]: modest; ambush requires some reactive snap-timing on the claws but the creature is otherwise stationary.
- intelligence [20,35]: nothing in the text suggests elevated cognition; ambush-ecology intelligence, not tool use or planning.
- willpower [35,55]: moderate, tied to the "immovable" framing.
- instinct [45,65]: predatory ambush behavior ("draw its helpless prey right into its clutches") supports above-average instinct.
- charisma [10,25]: nothing textually supports presence or social standing; low by default for a solitary-reading ambush predator.

Legacy `statRatings` (standardAttack: high, standardDefense: high) used only as a relative check confirming the strength/resilience-forward read; not copied as values.

## Trait pools

- **guaranteed: armored.** "black-shelled body," "an immovable wall of chitin" — the body demands natural plating per the `armored` trait definition.
- **guaranteed: anchored.** "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall" — explicit, textbook match for the `anchored` trait ("cannot be moved against its will").
- **pool: menacing (5).** A creature that can crush through "even the hardest of materials" and root itself as an unmovable wall reads as a credible source of dread to smaller foes; registry tilt also pushes menacing up with mass/size, which this body has.
- **pool: stealthy (3).** "lurks just beneath the foggy wetlands... draw its helpless prey right into its clutches" is textbook ambush-predator behavior supporting stealthy; weighted modestly per the registry's tilt of stealthy down with mass, since this is a heavy creature.
- **pool: perceptive (2).** Ambush hunting that successfully draws "helpless prey" implies the creature can track what it cannot yet see in murky wetland water; minor weight, no direct sensory claim in the text beyond behavior.

No exclusion-pair conflicts (pack-bonded/solitary not touched; hypnotic/mind-sealed not touched).

## Instruments

- **claws**: physical instrument, present in anatomy, directly used for the crushing action described.
- **aura**: channel instrument. Predicate check: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water" describes a radiated, whole-body gravitational field effect, not delivered through a named limb (unlike the claws, which are named explicitly for the crushing power). This satisfies the `aura` predicate ("description supports a radiated whole-body field") per section 5.6. Considered and rejected `mind` per the section 6 pilot-lesson ruling: the power is gravitational/physical field manipulation stated as originating from the whole creature's control, not a psychic/willed effect, and the species has no psychic element or sense to ground a `mind` channel.

## Signature ability

Lore-defining act, quoted: "using its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches."

- **instrument: aura** (see Instruments section above for the predicate justification).
- **action: snare.** The effect draws prey inward and holds it ("draw its helpless prey right into its clutches") which matches `snare`'s nature far more than a direct-damage action; the catalog's dark `snare` cell is thematically built around exactly this idea (Event Horizon, Gravity Well, Singularity, Gravity Bind).
- **medium: dark.** Primary element; the species' whole power set (gravitational waves, black holes) is thematically the dark element's "gravity, void, and time" fantasy per the element registry.
- **intensity band [55, 90]:** set high-mid to reflect that this is described as the species' central hunting method, not a rare or weak effect, while leaving room for individual variance.
- **name: "Mireheart Horizon."** Grander register per rule 5.8(6): "Mireheart" evokes the wetland ambush setting ("foggy wetlands"), "Horizon" evokes the gravity-well/event-horizon fantasy without naming mechanics. Collision scan: searched all 14 `consolidated-*.md` files and `neutral-pools.md` in `C:\dev\src\xalians-catalog\docs\ability-catalog\` for "Mireheart" and "Mireheart Horizon" (case-insensitive); no matches found in either search.
- **description**: "The Graviclaw thickens the gravity around itself into a well beneath the wetland's surface, and whatever wades too close is drawn down into its clutches before it ever sees the claws waiting there." Combat-legible (draws foes in, then strikes), no game mechanics named, canon voice.

## Catalog check (thin-combo findings)

Checked the primary element (dark) and Grimedes' on-graph secondaries (ghost, psychic, ice) against the instruments' allowed actions:

- **claws** allowed actions: strike, rake, crush, shove, ambush.
- **aura** allowed actions: ward, cloud, terrorize, drain, mend.

Counts pulled from `consolidated-dark.md`, `consolidated-ghost.md`, `consolidated-psychic.md`, `consolidated-ice.md`, plus `neutral-pools.md` (all 16 actions carry 43-100 pooled names each, so no combo falls below 6 once the neutral pool is included):

- dark: crush (129), shove (496), drain (133), snare (85), ward (98), mend (10), terrorize (82) — all comfortably above 6, no thin-combo finding for dark.
- ghost: snare (171), crush (25), terrorize (224) — no thin-combo finding.
- psychic: snare (72), crush (54), terrorize (122) — no thin-combo finding.
- ice: crush (140), snare (92), terrorize (133) — no thin-combo finding.

No thin-combo findings for this species; every instrument x action x medium combination that matters (claws-crush, aura-ward/terrorize/drain/mend across dark and the three on-graph secondaries) has healthy name counts even before counting the neutral pool.

## Open questions for Nick

1. The description gives the Graviclaw no communication behavior at all (no calls, no displays). I marked `communication: []` (mute) rather than inventing a signal channel. Do you want it to stay silent, or should I look for textual support elsewhere before locking that in? My recommendation: leave it mute; inventing a communication channel not in the source would violate the source-only rule.
2. I read "centaur-like crustacean" as `bodyPlan: multiped` since there's no centaur option in the enum and a crab's lower half implies more than four legs. If you'd rather this read as `biped` (an upright torso standing on two legs, with the "crab body" being more textural/armor framing than literal extra legs), that changes both `bodyPlan` and possibly the capability bands (climb/sprint). My recommendation: keep `multiped`, since "the black-shelled body of a crab" reads as a literal crab lower body to me, not just a torso covering.
3. I placed the gravity-well power on the `aura` channel rather than `mind`, reasoning that "control over the intensification of gravitational waves" is a radiated field effect rather than a willed psychic effect, and the species carries no psychic element or sense. If you intended this to read as a mental/psychic-flavored power (the creature "thinking" black holes into existence) rather than a physically radiated field, that would push toward `mind` instead, which is also a valid channel under the dark element's adjacency to psychic. My recommendation: keep `aura`, since the description frames it as a physical, waves-based phenomenon ("intensification of gravitational waves"), not a mental act.
