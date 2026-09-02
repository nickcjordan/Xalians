# Anatomy Demand Sweep — Project Data (species.json + instrument vocabulary)

Sweep of the project's own canon data for anatomy-key demand, per the assignment: (1) every one of the 29 species in `lambda/src/json/species.json`, listing candidate kebab-case anatomy keys demanded by the description text, with the exact demanding phrase; (2) the ~25-instrument vocabulary from `xalian-ability-grammar-draft.md` Table 2, classified PHYSICAL (matched against species demand) or NON-PHYSICAL (mind-like).

Source files: `c:\dev\src\Xalians\lambda\src\json\species.json`, `C:\Users\njord\.claude\plans\xalian-ability-grammar-draft.md` Table 2.

---

## Part 1 — Species-by-species anatomy demand

### 1. Xylum (Plant, Floria)
"A giant organism of thick, intertwined roots that act as tentacles."
- `roots` — "thick, intertwined roots that act as tentacles"
- `tendrils` — same phrase; the description explicitly analogizes the roots to tentacles/tendrils in function, so both keys are demanded (roots-as-instrument, tendril-like grasping/whipping function)

### 2. Dromeus (Fire, Magmuth)
"razor sharp teeth ... spread their wings to temporarily take flight ... sink their teeth into their prey."
- `jaws` — "razor sharp teeth", "sink their teeth into their prey"
- `wings` — "spread their wings to temporarily take flight"
- `talons` (candidate, weak) — ground bird with lizard features running at speed; no explicit claw/talon phrase, so not confirmed, listed as a soft candidate only

### 3. Tetrahive (Dark, Grimedes)
"a swarm of small flying familiars with teeth like piranhas"
- `swarm` — "summons a swarm of small flying familiars"
- `jaws` — "teeth like piranhas" (the swarm members' biting instrument)

### 4. Bioflim (Chemical, Drainov)
"An acid slime organism protected by a thick rocky exoskeleton. Its slime can continually regenerate an outer shell."
- `hide` — "thick rocky exoskeleton", "regenerate an outer shell"
- `secretion` — "acid slime organism", "its slime can continually regenerate"

### 5. Smokat (Ghost, Phantiri)
"can instantly atomize into a cloud of smoke for a sneak attack or quick evasion."
- `body` — the whole-body atomization is a body-level instrument, not a discrete part
- No discrete physical part is stated. FLAGGED: no clear actionable body part beyond "body"; relies on an incorporeal/smoke transformation. Candidate non-physical support: none of the instrument list's innate keys (breath/gaze/voice/aura/mind) is explicitly demanded either — closest is `body` (uses medium words only).

### 6. Newtapede (Water, Poseidas)
"A 16 legged amphibious creature with a long, segmented body ... slender frame and webbed feet"
- `legs` (candidate, new key not in current instrument list) — "16 legged ... webbed feet"
- `body` — "long, segmented body", "slender frame"
- No striking/attacking part is named; description is locomotion-only. FLAGGED: no clear offensive/defensive actionable part stated (legs/feet imply swimming/locomotion, not combat action per the brief's "acts WITH or defends WITH" framing, though webbed feet could paddle-strike).

### 7. Voltish (Electric, Zolton)
"bones and claws made from a tough, conductive metal alloy ... release the shock into enemies."
- `claws` — "bones and claws made from a tough, conductive metal alloy"
- `body` (skeletal conduction) — "bones ... made from a tough, conductive metal alloy" (the bones themselves conduct/discharge, arguably a `body`-level instrument since it's not an external limb)

### 8. Tizzie (Psychic, Telypso)
"It uses its tail to draw attention to its big, hypnotic eyes. Once eye contact is made, this creature can attack from within your mind."
- `tail` — "uses its tail to draw attention"
- `gaze` — "big, hypnotic eyes ... eye contact is made"
- `mind` — "attack from within your mind"

### 9. Crystorn (Light, Luminax)
"The gems growing out of this creature's head transmit powerful light energy"
- `crest` — "gems growing out of this creature's head transmit powerful light energy" (matches the instrument-list `crest` key explicitly, per the grammar doc's own note that `crest` was added for Crystorn's light-gems)

### 10. Luceras (Air, Saiphus)
"can jump so high ... comes missiling down on its enemy like a battering ram."
- `legs`/`hind-legs` (candidate, new key) — implied jumping instrument, not named directly as a part, only as an action ("can jump")
- `body` — "comes missiling down ... like a battering ram" (body-slam instrument)
- FLAGGED (partial): no discrete named part, only the jump-and-ram action; leaning on `body` as the instrument.

### 11. Codazzo (Rock, Stonera)
"exposing only its tail made of explosive barbs ... fire off a few projectiles"
- `tail` — "its tail made of explosive barbs"
- `spines`/`barbs` (candidate, barbs is a variant/synonym of `spines`) — "explosive barbs", "fire off a few projectiles"

### 12. Figzy (Psychic, Telypso)
"incredible magical abilities ... deceptively smart"
- `mind` — "incredible magical abilities" (Psychic-type, ability-only, no physical part named)
- FLAGGED: no physical part at all; description is entirely non-physical (intelligence/magic). Confirms `mind` demand but zero physical anatomy.

### 13. Foromeer (Metal, Veridium)
"metallic exoskeleton on its limbs, with long drill-like horns for arms ... powerful horns can break through the strongest of material."
- `hide` — "metallic exoskeleton on its limbs"
- `horns` — "long drill-like horns for arms ... powerful horns can break through"
- Note: horns are explicitly described as functioning as arms/drills — strong confirmation of `horns` as a crush/strike/ambush instrument (matches instrument-list allowed archetypes strike/ambush/ward/shove, though "drill" suggests crush too).

### 14. Venemist (Chemical, Drainov)
"toxic mist expelled from a tube in its mouth ... only 2 teeth"
- `secretion` — "toxic mist expelled from a tube in its mouth" (spray/cloud instrument)
- `jaws` — "with only 2 teeth"
- Confirms grammar doc's own note that Venemist needs a spray-capable instrument.

### 15. Kosanos (Plant, Floria)
"a large blade at the end of its trunk ... designed to clear the thick brush"
- `tail` (as "trunk" — candidate; could also be read as a distinct `trunk`/blade-tail hybrid, but functionally matches `tail`) — "large blade at the end of its trunk"
- Alternative reading: this may demand a dedicated `blade`/`horn`-like appendage key distinct from tail; flagging as ambiguous between `tail` and a new `blade` key.

### 16. Imprit (Fire, Magmuth)
"long tails with scythe-like tips ... fire-retardant fur ... using their tails to swing through the air"
- `tail` — "long tails with scythe-like tips", "using their tails to swing"
- `hide` (fur) — "fire-retardant fur that protects their bodies"

### 17. Scalatto (Sand, Endessa)
"Shielded by a scaly exoskeleton, this creature can roll into a ball to protect itself."
- `hide` — "scaly exoskeleton"
- `body` — "roll into a ball" (whole-body defensive instrument)

### 18. Akinza (Ice, Krystos)
"incredible stealth and night vision allow it to sneak through the night with ease."
- No physical instrument named at all — stealth and night vision are sensory/behavioral, not an actionable external part.
- FLAGGED: no clear actionable part demanded; description is purely sensory/stealth.

### 19. Avilily (Plant, Floria)
"beaks resemble the closed pedals of a flower ... sweet, syrupy smelling saliva ... powerful sedative"
- `beak` — "their beaks resemble the closed pedals of a flower"
- `secretion` — "sweet, syrupy smelling saliva ... powerful sedative which paralyzes"

### 20. Thirstaserp (Sand, Endessa)
"subsonic vibration from the rattles on their tails ... attack with a unique venom that drains the victim's water when bitten"
- `tail` — "rattles on their tails"
- `voice` (candidate, as vibration/call organ — "subsonic vibration") — could also be read as a `tail`-instrument (rattle) rather than voice; flagging both
- `jaws` — "attack with a unique venom ... when bitten"
- `secretion` — "unique venom that drains the victim's water"
- Confirms grammar doc's own note: Thirstaserp needs jaws × drain.

### 21. Graviclaw (Dark, Grimedes)
"black-shelled body of a crab ... massive claws in order to snap them shut ... severing through even the hardest of materials"
- `pincers` — "massive claws ... snap them shut with a force ... severing through" (crab claws map to `pincers` per the instrument list's crush/snare/hurl allowance)
- `hide` — "black-shelled body of a crab" (exoskeleton, defensive)

### 22. Yetimoth (Ice, Krystos)
"heads of mammoths and tusks made of pure ice ... meaty, ice-gauntleted fists ... form thick sheets of ice ... covering themselves in ... armor"
- `tusks` — "tusks made of pure ice"
- `fists` — "meaty, ice-gauntleted fists", "pummel them into submission"
- `hide`/`secretion` (ice-armor generation, candidate) — "form thick sheets of ice from thin air, covering themselves in a near-impenetrable armor" — this is an innate generated-armor ability rather than a fixed body part; closest match is `secretion` (innate, produces a substance) or a new `ice-armor`-type key. Flagging as ambiguous.

### 23. Chromocat (Light, Luminax)
"two sickle-shaped blades ... extend backwards from its front paws ... 'energy swords' ... barraging them with rapid cuts"
- `claws` — "two sickle-shaped blades ... extend backwards from its front paws" (claw-blade hybrid; closest existing key is `claws`, though "sickle-shaped blades" pushes toward a distinct `blades` key)
- FLAGGED (borderline new key): the description explicitly calls these "energy swords," which is stronger/more specific than generic `claws` — candidate new key `blades` may be warranted, but `claws` covers the rake/lash function adequately.

### 24. Ectoghoul (Ghost, Phantiri)
"spectral green mist ... grinning skull with a ghost-like tail for a body ... zapping their opponents with blasts of gooey ectoplasm."
- `tail` — "ghost-like tail for a body"
- `secretion` — "blasts of gooey ectoplasm" (spray/burst instrument)
- Confirms grammar doc's own note: Ectoghoul needs a spray-capable instrument.

### 25. Hippochamp (Water, Poseidas)
"long, trunk-like snouts serve as high-pressure water cannons"
- `secretion` (candidate, weak fit) — better match is a dedicated snout/spray-organ key; the instrument list has no "snout" key. Closest existing match: `breath` (innate, allows spray) since the snout functions like a breath-weapon delivery tube, OR treat the snout itself as anatomy.
- FLAGGED (new key candidate): `snout`/`proboscis` — "long, trunk-like snouts serve as high-pressure water cannons" is a clear, vivid physical instrument not covered by any existing instrument-list key (jaws, beak, tendrils, tail all miss the "trunk/hose" shape). Confirms grammar doc's own note: Hippochamp needs a spray-capable instrument, but the *anatomy* backing it (a trunk/snout) is not yet a registry key.

### 26. Neph (Air, Saiphus)
"long, trailing tentacles that vacuum up ... Benthane ... pull in opponents with considerable suction ... jettison air ... expel jets of Benthane gas ... spray their enemies with bouts of flammable gas."
- `tendrils` — "long, trailing tentacles" (matches instrument list's `tendrils` drain/snare/hurl allowance; grammar doc explicitly notes Neph needs tendrils × drain)
- `secretion`/`breath` — "expel jets of Benthane gas", "spray their enemies with bouts of flammable gas" (gas-expulsion instrument, matches `breath`'s cloud/spray/burst allowance)

### 27. Terragoyle (Rock, Stonera)
"elongated tails tipped with a levitating ball of stone ... using their tails to levitate boulders and fling them"
- `tail` — "elongated tails tipped with a levitating ball of stone ... using their tails to levitate boulders and fling them"
- `wings` (candidate, implied by "rise high into the sky" and bat-like description, "vaguely humanoid bats") — "resembling ... bats", "rise high into the sky ... soar overhead"
- Confirms grammar doc's own note: Terragoyle needs tail × hurl.

### 28. Hypnopet (Psychic, Telypso)
"single color-changing unicorn horn atop their heads ... horn begins to pulse and swirl with psychedelic color, it hypnotizes others"
- `crest`/`horns` — "single ... unicorn horn atop their heads" — the grammar doc's own annotation assigns Hypnopet's horn to the `crest` key (emissive/hypnotic growth), though `horns` is the more literal anatomical match. Flagging both; `crest` fits the innate hypnotic-emission function better, `horns` fits the literal body part better.

### 29. Drilltail (Sand, Endessa)
"small, stinger-like drills to quickly tunnel through the earth ... sharp, scissor-like claws"
- `stinger` — "small, stinger-like drills"
- `claws`/`pincers` — "sharp, scissor-like claws" ("scissor-like" leans `pincers`, but "claws" is the literal word used, so both keys are plausible matches)

---

## Species flagged for authoring attention (no clear actionable part, or ambiguous/new-key demand)

| Species | Issue |
|---|---|
| Smokat | No discrete physical part; whole-body smoke transformation only. |
| Newtapede | Only locomotion parts (legs, webbed feet) named; no combat instrument stated. |
| Luceras | Only an action (jumping/ramming) named, no discrete part; leans on `body`. |
| Figzy | Purely non-physical (magical ability, intelligence); zero physical anatomy. |
| Akinza | Purely sensory/stealth (night vision, stealth); zero physical anatomy. |
| Kosanos | "Blade at the end of its trunk" is ambiguous between `tail` and a possible new `blade` key. |
| Chromocat | "Sickle-shaped blades" from paws pushes toward a possible new `blades` key beyond generic `claws`. |
| Yetimoth | Self-generated ice armor is an ability, not a fixed body part; ambiguous between `secretion` and a new key. |
| Hippochamp | Trunk-like snout is a clear physical instrument with no matching key in the current instrument list (candidate new key: `snout`/`proboscis`). |
| Thirstaserp | Tail-rattle vibration is ambiguous between `tail` (rattle organ) and `voice` (subsonic call). |
| Xylum | Roots explicitly described as acting like tentacles; ambiguous whether `roots` alone suffices or `tendrils` must also apply. |

---

## Part 2 — Instrument vocabulary classification (from `xalian-ability-grammar-draft.md` Table 2)

25 instrument keys total. Classification: PHYSICAL (names a body part, must be covered by anatomy vocabulary) vs NON-PHYSICAL (mind-like/innate, validates against senses/traits rather than a body part).

| Instrument key | Kind (per doc) | Classification | Species-demanded match | Notes |
|---|---|---|---|---|
| `jaws` | physical | PHYSICAL | Dromeus (teeth), Tetrahive (swarm's teeth), Venemist (2 teeth), Thirstaserp (bitten/venom) | Clean match, multiple species confirm. |
| `beak` | physical | PHYSICAL | Avilily ("beaks resemble ... flower") | Clean, single confirming species; grammar doc notes this key was added specifically for Avilily. |
| `crest` | physical | PHYSICAL | Crystorn (head-gems), Hypnopet (unicorn horn, contested vs `horns`) | Grammar doc explicitly notes `crest` was added for Crystorn and Hypnopet. Confirmed demanded. |
| `talons` | physical | PHYSICAL | No confirmed species match | Dromeus is a soft/weak candidate (lizard-bird, no explicit talon phrase). FLAG: instrument exists but no species description explicitly demands `talons` distinct from `claws`. |
| `claws` | physical | PHYSICAL | Voltish (metal claws), Chromocat (blade-claws from paws), Drilltail (scissor-like claws) | Clean, multiple confirming species. |
| `fists` | physical | PHYSICAL | Yetimoth ("ice-gauntleted fists") | Clean, single confirming species. |
| `hooves` | physical | PHYSICAL | No confirmed species match | FLAG: no species description mentions hooves at all across all 29 entries. Instrument exists in the vocabulary with zero current anatomy demand. |
| `tail` | physical | PHYSICAL | Tizzie, Codazzo, Imprit, Ectoghoul, Terragoyle, Kosanos (as "trunk," contested), Thirstaserp (rattle, contested) | Heavily demanded — the single most-confirmed physical instrument in the species set. |
| `horns` | physical | PHYSICAL | Foromeer ("drill-like horns for arms"), Hypnopet (contested vs `crest`) | Clean primary match on Foromeer. |
| `tusks` | physical | PHYSICAL | Yetimoth ("tusks made of pure ice") | Clean, single confirming species. |
| `wings` | physical | PHYSICAL | Dromeus (spreads wings to fly), Terragoyle (implied, bat-like, soft match) | Dromeus is a clean confirm; Terragoyle is inferred from "bat" simile rather than an explicit wing phrase. |
| `tendrils` | physical | PHYSICAL | Xylum (roots-as-tentacles), Neph ("long, trailing tentacles") | Clean, confirmed by grammar doc's own note (Neph needs tendrils × drain). |
| `spines` | physical | PHYSICAL | Codazzo (explosive barbs, contested vs a dedicated `barbs` reading) | Weak/soft match only; "barbs" is closer to spines than to any other key, but no species description uses the word "spines" directly. |
| `stinger` | physical | PHYSICAL | Drilltail ("stinger-like drills") | Clean, single confirming species. |
| `pincers` | physical | PHYSICAL | Graviclaw ("massive claws ... snap them shut," crab-claw framing), Drilltail (scissor-like claws, contested vs `claws`) | Clean primary match on Graviclaw (crab pincers is the textbook case). |
| `hide` | physical | PHYSICAL | Bioflim (rocky exoskeleton), Foromeer (metallic exoskeleton), Scalatto (scaly exoskeleton), Imprit (fire-retardant fur), Graviclaw (crab shell) | Heavily demanded, second most-confirmed physical instrument after `tail`. |
| `body` | physical | PHYSICAL (whole-body, not a discrete part) | Smokat, Luceras, Voltish (bones), Scalatto (rolls into a ball) | Matches the brief's allowance of `body` as a catch-all instrument for species with no discrete named part; several species lean on it precisely because they lack a specific limb/organ. |
| `breath` | innate | NON-PHYSICAL (mind/trait-adjacent — an emitted-substance ability, not a fixed body part) | Neph (gas expulsion), Hippochamp (soft match, water-cannon snout) | Classified innate per the doc; validates as a produced-effect capability rather than a specific anatomy key. Note: Hippochamp's snout is itself a *physical* part not covered by `breath` or any other key (see Part 1 flag). |
| `gaze` | innate | NON-PHYSICAL (sense-linked but per the brief's own exception, eyes-that-act qualify for dual-role inclusion) | Tizzie ("hypnotic eyes," "eye contact") | Clean confirm. Per the harvest brief's own carve-out (senses that both perceive and act may be included), `gaze` sits at the PHYSICAL/NON-PHYSICAL boundary — the doc calls it innate, and it validates against a sense (sight) rather than a discrete manipulable part, so NON-PHYSICAL is the correct bucket per this doc's own kind-tagging. |
| `voice` | innate | NON-PHYSICAL | Thirstaserp (subsonic vibration, contested vs `tail`) | No species clearly and solely demands `voice` as a distinct vocal organ; Thirstaserp's rattle is arguably a `tail` effect, not a throat/voice effect. |
| `aura` | innate | NON-PHYSICAL | No confirmed species match | FLAG: zero species descriptions demand a self-radiating field ability by name. |
| `mind` | innate | NON-PHYSICAL | Tizzie ("attack from within your mind"), Figzy ("incredible magical abilities") | Clean, mind-like by definition; validates against psychic trait, not anatomy. |
| `secretion` | innate | NON-PHYSICAL (a produced substance, not a fixed part) | Bioflim (acid slime), Avilily (sedative saliva), Venemist (toxic mist), Thirstaserp (venom), Ectoghoul (ectoplasm), Neph (Benthane gas) | Heavily demanded as a functional ability across many species, though it is explicitly NOT anatomy (it's a produced substance) — correctly classified innate/non-physical per the doc. |
| `swarm` | innate | NON-PHYSICAL | Tetrahive ("summons a swarm of ... familiars") | Clean confirm; swarm-summoning is an ability, not a body part, correctly innate. |
| `roots` | physical | PHYSICAL | Xylum ("thick, intertwined roots") | Clean, single confirming species; grammar doc's own worked example uses Xylum's roots. |

### Instruments whose wording is a body part but too vague to be one anatomy key

- **`body`** — explicitly acknowledged in the instrument table itself as using "medium words only" (no `nameForm`), i.e. it is already treated as a non-specific catch-all rather than a true anatomy key. This is the clearest case of a physical-sounding instrument that is intentionally too vague to be a single anatomy key — it stands in for "whatever the creature's mass/hide does," not a discrete part.
- **`spines`** — the term is broad enough to cover quills, barbs, ridges, and thorns as very different real-world structures; Codazzo's "explosive barbs" is the only species match and barbs are a narrower, more specific structure than generic spines. Borderline vague.
- **`crest`** — covers two structurally different things in the species data alone (Crystorn's crystalline head-gems vs. Hypnopet's single spiraled horn) that only share a "grows from the head and emits something" function, not a common shape. Flag as a key that may need splitting (e.g. `crest` for ridge/plate growths vs `horn`-family for the unicorn-horn case) if more species accumulate under it.

---

## Summary

**Total distinct candidate keys demanded by species (Part 1):** 15 confirmed/clean keys — `roots`, `tendrils`, `jaws`, `wings`, `swarm`, `hide`, `secretion`, `tail`, `claws`, `gaze`, `mind`, `crest`, `horns`, `beak`, `stinger`, `pincers`, `tusks`, `fists`, `body` — (count reconciled below).

Reconciled distinct-key count demanded by at least one species description: **19** — `roots`, `tendrils`, `jaws`, `wings`, `swarm`, `hide`, `secretion`, `tail`, `claws`, `gaze`, `mind`, `crest`, `horns`, `beak`, `stinger`, `pincers`, `tusks`, `fists`, `body`. Plus **2 candidate new keys** not present in the current 25-instrument vocabulary at all: `snout`/`proboscis` (Hippochamp's water-cannon trunk) and, more tentatively, `blade`/`blades` (Kosanos's trunk-blade, Chromocat's sickle paw-blades) and `legs` (Newtapede, Luceras — locomotion-only, likely out of scope per the brief's action-relevance framing).

**Instrument-vocabulary mismatches found (Part 2):**
1. `talons` — in the instrument vocabulary but **no species description explicitly demands it**; only a weak inferred match on Dromeus. Possible redundancy with `claws`, or the vocabulary is ahead of current species text.
2. `hooves` — in the instrument vocabulary but **zero species matches anywhere in the 29 descriptions**. Fully unconfirmed by current canon data.
3. `aura` — innate/non-physical instrument with **zero confirming species description**. No creature currently radiates a stated aura effect.
4. `voice` — weak/contested match only (Thirstaserp's rattle is arguably `tail`, not throat/voice); no clean single-species confirmation.
5. Hippochamp's trunk-like snout is a vivid, explicit physical instrument with **no corresponding key anywhere in the 25-instrument list** — the closest existing keys (`breath`, `secretion`) capture the emitted water-jet effect but not the physical snout/trunk organ itself. This is the sweep's clearest gap.
6. `crest` covers two structurally dissimilar parts (Crystorn's gem growths, Hypnopet's horn) — flagged as possibly too broad, a single key doing double duty.
7. `spines` has only one weak species match (Codazzo's "explosive barbs," not literally "spines") — under-confirmed relative to its instrument-list presence.
8. Several species (Smokat, Luceras, Newtapede, Figzy, Akinza) demand **no clean physical instrument at all** — either purely non-physical (Figzy's magic, Akinza's stealth) or a bare `body`/locomotion-only fallback (Smokat, Luceras, Newtapede), confirming the harvest brief's expectation that some species will need authoring attention rather than a mechanical mapping from their existing text.
