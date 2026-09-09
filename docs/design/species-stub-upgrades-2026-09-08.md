# Species stub upgrades: seven thin descriptions (2026-09-08)

**Status: DRAFT. Nothing here has been applied.** No file in `lambda/src/json/`, `docs/species-templates/`, or `docs/encyclopedia/` was edited. These are proposed replacements for the `description` field of seven species in `lambda/src/json/species.json`, written for Nick's sign-off.

## Why

Seven species carry two-sentence legacy descriptions of 23 to 43 words in `species.json`. Their ratified records in `docs/species-templates/<key>.json` already hold an `upgraded` `lore.description` of 70 to 116 words, written and ratified at migration. But the trait evidence bar admits only SOURCE text, meaning `species.json` and the planet history, so these seven cannot earn traits their bodies plainly have: the record prose is downstream of the bar, not admissible to it. Bolstering the source description to the full species register (60 to 140 words) closes that gap.

## Rules followed

The ratified record text is the base of every draft. Every fact in it is kept, nothing in it is contradicted, and additions are constrained by the record's own `physiology`, `capabilities`, `senses`, `signatureAbility` and art, by the home planet's history, and by its Generator Environmental Report in `planetRecords.json`. No invented named characters, events, or institutions. No game mechanics. No em-dashes, American English, one paragraph, present tense, opening appositive, ending on a plain present-tense fact.

Each ledger separates **kept** claims (already in the ratified record or the legacy stub) from **authored extensions**: new behavioral sentences written so the trait bar has a sentence to read. An authored extension is marked as such, with the record field, planet paragraph, Generator report line, or art feature it is anchored to. These are the lines that need Nick's judgment; the kept claims do not.

---

## 1. Kosanos (Floria, Plant)

**Current `species.json` text (28 words):**

> "With a large blade at the end of its trunk, this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria."

**Ratified record text (`docs/species-templates/kosanos.json`, `lore.description`, 76 words):**

> "A heavy four-legged creature whose long ribbed trunk arches back over its shoulders and ends in a broad sweeping blade, the Kosanos is thought to have been designed to clear the thick brush of Floria, a world on which the Vallerii kept small settlements, research labs, and exploration parties and no more. It is a simple yet powerful creature. It works the underforests below the World Trees, felling standing growth in slow arcs of the blade."

**DRAFT (132 words):**

> A heavy four-legged animal whose long ribbed trunk arches back over its shoulders and ends in a broad sweeping blade, the Kosanos is thought to have been designed to clear the thick brush of Floria, a world on which the Vallerii kept small settlements, research labs, and exploration parties and no more. It is a simple yet powerful creature. It works the underforests below the World Trees, felling standing growth in slow arcs of the blade, and it sets its feet and reads the tremor of the ground before it swings. The toxic fungal blooms of the understory do not take in its hide, and what the brush opens in that hide closes over. It holds the lane it has cut, and it gapes its long teeth at whatever comes down it.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| heavy four-legged animal, ribbed trunk over the shoulders ending in a broad sweeping blade | record `physiology.bodyPlan` quadruped, `anatomy` trunk/blades/hide; art (four weight-bearing columnar legs, ribbed trunk arcing overhead to a body-length blade) | kept |
| thought to have been designed to clear the thick brush of Floria | `species.json` Kosanos, verbatim hedge preserved | kept |
| Vallerii kept only small settlements, research labs, and exploration parties | Floria history paragraph 8, "Vallerii activity on the planet remained limited to small settlements, research labs, and exploration parties" | kept |
| simple yet powerful | `species.json` Kosanos | kept |
| works the underforests below the World Trees, felling standing growth in slow arcs of the blade | record `lore.description` and `lore.biomeNiche`; Floria history paragraph 7 (World Trees, shaded underforests); `signatureAbility` Understory Reaping | kept |
| sets its feet before it swings | authored extension; anchored to `traits.pool.anchored` 100 and to `capabilities.sprint` 20 to 38 with `flight` 0 | authored |
| reads the tremor of the ground | authored extension; anchored to `senses.special: tremorsense` | authored |
| toxic fungal blooms of the understory do not take in its hide | authored extension; anchored to Floria report `hazards`, "toxic fungal blooms", and Floria history paragraph 8, "massive infestations of toxic fungi"; covering is `hide` per record | authored |
| what the brush opens in that hide closes over | authored extension; anchored to legacy `recoveryRating: high` and Floria report `outputPriorities`, "regenerative tissue" | authored |
| holds the lane it has cut | authored extension; anchored to Floria report `fauna.observations`, "territorial strategy: growth, entanglement, and regrowth in place of engagement" | authored |
| gapes its long teeth at whatever comes down it | authored extension; anchored to art (broad gape, row of long tapering teeth) and record `anatomy: jaws` | authored |

No flight claim (record `capabilities.flight` is 0 to 0). No projected element (record declares no conduits; the blade cuts as a physical edge).

**Cut-table traits the draft now supports with a sentence:** `menacing` (cut 2026-09-07 at 25 for "a broad gape in the art with no source sentence behind it"; the closing sentence is now that source sentence). Also promoted from planet-wide to species-level evidence, though not previously cut: `anchored`, `perceptive`, `resistant`, `regenerative`, `territorial`.

---

## 2. Tetrahive (Grimedes, Dark)

**Current `species.json` text (29 words):**

> "When in battle, this creature summons a swarm of small flying familiars with teeth like piranhas. It controls the swarm with its mind, attacking or defending as one unit."

**Ratified record text (`docs/species-templates/tetrahive.json`, `lore.description`, 116 words):**

> "A small winged thing with a long whipping tail, the Tetrahive fights by conjuring a swarm of little flying familiars with teeth like piranhas, holding every one of them in its mind and moving them as a single unit to attack or defend. It was generated on Grimedes not to serve as a labor force but as a test subject, one product of the experiments the Vallerii ran on the Xalian population in laboratories that rumor holds were black sites for ECHELON. It hunts the thick, stalky undergrowth of a world cloaked in perpetual night, and the newest generation of its kind now stands at the edge of the galaxy and watches the endless black."

**DRAFT (140 words):**

> A small winged thing with a long whipping tail, the Tetrahive fights by conjuring a swarm of little flying familiars with teeth like piranhas, holding every one of them in its mind and moving them as a single unit to attack or defend. It was generated on Grimedes not as a labor force but as a test subject, one of the Xalians the Vallerii experimented on in laboratories rumored to be black sites for ECHELON. It hunts the thick, stalky undergrowth of a world cloaked in perpetual night, taking its bearings by ear, not by eye, and it keeps its own body inside the wheeling cloud so nothing can tell which shape it is. Whatever hears the swarm coming breaks and runs. The newest generation of its kind stands at the edge of the galaxy and watches the endless black.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| small winged body, long whipping tail | record `anatomy` wings/claws/tail/body, `size` 60 to 90 cm; art (bat-shaped body, broad membranous wings, long whip tail curled at the tip) | kept |
| conjures a swarm of small flying familiars with piranha teeth, held in its mind, moved as one unit to attack or defend | `species.json` Tetrahive; record `signatureAbility` Unbidden Legion; art (roughly twenty small copies ringing the central figure) | kept |
| generated on Grimedes as a test subject rather than a labor force | Grimedes history paragraph 4, "the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation" | kept |
| experimented on in laboratories that rumor holds were black sites for ECHELON | Grimedes history paragraph 3, "Rumor has it that many of these facilities were in fact black sites for covert research funded by ECHELON's most classified R&D divisions"; hedge preserved | kept |
| hunts the thick, stalky undergrowth of a world cloaked in perpetual night | Grimedes `data.Terrain`, "Thick Stalky Undergrowth"; history paragraph 0, "surrounded in a cloak of perpetual night"; record `diet: carnivore` | kept |
| takes its bearings by ear, not by eye | authored extension; anchored to `senses.hearing` 60 to 85 against `senses.sight` 30 to 55, and to Grimedes report `outputPriorities`, "non-visual sensory systems", plus `terrain.notes`, "Illumination: infrared only" | authored |
| keeps its own body inside the wheeling cloud so nothing can tell which shape it is | authored extension; anchored to the art composition (the central body is the same silhouette as its twenty copies) and to `traits.pool.slippery` | authored |
| whatever hears the swarm coming breaks and runs | authored extension; a statement about flight response only, with no claim about any effect on a Xalian mind | authored |
| the newest generation stands at the edge of the galaxy and watches the endless black | Grimedes history paragraph 9, "the Grimedites stand at the edge of the galaxy, trusted or perhaps condemned to watch the endless black" | kept |

No gravity, shadow-copy, or time manipulation is claimed: Grimedes history paragraph 6 attributes those to other lineages, and this record's `signatureAbility` medium is `dark` by conjured swarm.

**Cut-table traits the draft now supports with a sentence:** `menacing` (cut 2026-09-07 at 20 as "restatement of the swarm attack, with no source sentence describing an effect on courage"; the break-and-run sentence is now that sentence). `stealthy` (considered and removed because its only support was the planet-wide perpetual-night line, already spent on `nocturnal`; the body-inside-the-cloud sentence is species-level and independent of that line). Also strengthened from planet-wide to species-level: `nocturnal`, `slippery`, `perceptive`.

---

## 3. Xylum (Floria, Plant)

**Current `species.json` text (23 words):**

> "A giant organism of thick, intertwined roots that act as tentacles. It lives mostly underground as this is where it absorbs its power."

**Ratified record text (`docs/species-templates/xylum.json`, `lore.description`, 103 words):**

> "A giant organism of thick, intertwined roots that act as tentacles, the Xylum keeps the greater part of itself buried and shows only the crown of its mass above the soil of the underforests. It lives mostly underground, as this is where it absorbs its power, and its limbs carry rows of short serrations along the last of their length. Some say the oldest Xalians of Floria were born from the first seeds of the Genesis Prototype. Vallerii activity on the planet never grew past small settlements, research labs, and exploration parties, and the Xylum remains in the ground beneath the World Trees."

**DRAFT (139 words):**

> A giant organism of thick, intertwined roots that act as tentacles, the Xylum keeps the greater part of itself buried and shows only the crown of its mass above the soil of the underforests. It lives mostly underground, as this is where it absorbs its power, and its limbs carry rows of short serrations along the last of their length that hold whatever they wrap. It has no eyes and takes the world as tremor through the soil, whose toxic fungal blooms do not take in it. Ground disturbed above it answers with six limbs rising in a ring. Some say the oldest Xalians of Floria were born from the first seeds of the Genesis Prototype. It meets what crosses its ground by growing over it rather than by giving way, and a limb cut off it comes back.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| giant organism of thick intertwined roots acting as tentacles | `species.json` Xylum, verbatim | kept |
| keeps the greater part buried, shows only the crown above the soil of the underforests | record `lore.description` and `lore.biomeNiche`; `capabilities.burrow` 70 to 92; art (mass rising out of a broken soil line) | kept |
| lives mostly underground, where it absorbs its power | `species.json` Xylum, verbatim; record `diet: energy-feeder` | kept |
| limbs carry rows of short serrations along the last of their length | record `anatomy: spines`; art (sawtooth serrations along the outer edge of the last third of each limb) | kept |
| the serrations hold whatever they wrap | authored extension; anchored to `species.json` "roots that act as tentacles", record instruments `roots` and `tendrils`, and `capabilities.manipulation` 45 to 70 | authored |
| it has no eyes | record `senses.sight` 0 to 15; art (no head, no face, no eyes) | kept, now stated in prose |
| takes the world as tremor through the soil | authored extension; anchored to `senses.special: tremorsense` | authored |
| the soil's toxic fungal blooms do not take in it | authored extension; anchored to Floria report `hazards`, "toxic fungal blooms", and history paragraph 8, "massive infestations of toxic fungi" | authored |
| ground disturbed above it answers with six limbs rising in a ring | authored extension; anchored to the art, which draws exactly six serrated limbs rising and curling outward from the buried mass, three to a side | authored |
| some say the oldest Xalians of Floria were born from the first seeds of the Genesis Prototype | Floria history paragraph 10, "Some say that there are even some Xalians on Floria that pre-date all other Xalians in the galaxy, creatures born from the first seeds of the Genesis Prototype"; hedge preserved, and the Xylum is not named as one of them | kept |
| meets what crosses its ground by growing over it rather than by giving way | authored extension; anchored to Floria report `fauna.observations`, "territorial strategy: growth, entanglement, and regrowth in place of engagement" | authored |
| a limb cut off it comes back | authored extension; anchored to legacy `recoveryRating: high` and Floria report `outputPriorities`, "regenerative tissue" | authored |

The "Vallerii activity never grew past small settlements, research labs, and exploration parties" clause was dropped for length. It is a Floria fact rather than a Xylum fact, the Kosanos draft in this same file still carries it, and dropping it removes no fact about this creature.

**Cut-table traits the draft now supports with a sentence:** `menacing` (cut 2026-09-07 at 12 because "large justifies menacing only alongside a threat sentence, and neither source carries one"; the six-limbs-rising sentence is that threat sentence). Also promoted from planet-wide to species-level: `anchored`, `territorial`, `resistant`, `regenerative`, `perceptive`. `healing`, `protective` and `solitary` remain unsupported and are not written toward.

---

## 4. Figzy (Telypso, Psychic)

**Current `species.json` text (28 words):**

> "What this creature lacks in stature it makes up for with its incredible magical abilities. It is deceptively smart, yet known to be docile when it trusts you."

**Ratified record text (`docs/species-templates/figzy.json`, `lore.description`, 110 words):**

> "A small antlered creature with outsized ears, wide eyes and a shaggy coat, the Figzy carries in its raised hands more force than its stature admits. The Telypso Generator built it to counterbalance the unstable auras of the Vallerii marooned planetside, treating the prisoners as patients rather than removing them, and the Figzy was one of the small psychic bodies that emerged from the fungal forests to steady what the deranged left behind. It is deceptively smart and goes docile with anything it has come to trust. The Nemesis Plague now turns the creatures of Telypso against one another, and a Figzy that trusts no one raises its hands against its own kind."

**DRAFT (138 words):**

> A small antlered creature with outsized ears, wide eyes and a shaggy coat, the Figzy carries in its raised hands more force than its stature admits. The Telypso Generator built it to counterbalance the unstable auras of the Vallerii marooned planetside, treating the prisoners as patients rather than removing them, and the Figzy was one of the small psychic bodies that emerged from the fungal forests to steady what the deranged left behind. It puts itself between a distressed mind and whatever is agitating it, holding the one quiet and driving the other back with a burst that leaves its open hands. It is deceptively smart and goes docile with anything it trusts. The Nemesis Plague turns the creatures of Telypso against one another, and a Figzy that trusts no one raises its hands against its own kind.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| small antlered biped, outsized ears, wide eyes, shaggy coat, raised open hands | record `bodyPlan: biped`, `anatomy` antlers/fists, `covering: fur`, `size` 95 to 125 cm; art (branched antlers, ears flaring wider than the skull, two large round eyes, tufted outline, both hands raised and splayed) | kept |
| carries more force than its stature admits | `species.json` Figzy, "What this creature lacks in stature it makes up for with its incredible magical abilities" | kept |
| the Telypso Generator built it to counterbalance the unstable auras of the Vallerii marooned planetside | Telypso history paragraph 6, "As if sensing their unstable auras, the Generator began churning out new forms of life, Xalians whose psychic energies could be used to counterbalance those of the brainsick creatures" | kept |
| treating the prisoners as patients rather than removing them | Telypso history paragraph 6, "the Generator began to treat the prisoners as patients", set against the same paragraph's rejected alternative of "Xalians tasked with removing such Vallerii" | kept |
| emerged from the fungal forests | Telypso history paragraph 6, "psychic Xalians ... were emerging from the fungal forests"; record `lore.biomeNiche` | kept |
| puts itself between a distressed mind and whatever is agitating it | authored extension; anchored to Telypso report `fauna.observations`, "empathic forms with emotional-state regulation function", and `outputPriorities`, "psychic stabilization capacity" and "emotional regulation function", stated here as this creature's own act rather than as a planet-wide function | authored |
| holds the one quiet | authored extension; same anchor, plus the record's own "steady what the deranged left behind" | authored |
| drives the other back with a burst that leaves its open hands | record `signatureAbility` Small Hands of the Psychosphere, instrument `mind`, action `burst`; art (many-pointed starburst with a hollow center, separated from the body, in front of the raised hands) | kept |
| deceptively smart, docile with anything it trusts | `species.json` Figzy | kept |
| the plague turns the creatures of Telypso against one another; a Figzy that trusts no one raises its hands against its own kind | Telypso history paragraph 7, "tainting the creatures of Telypso and turning them against one another"; the second clause is the record's ratified turn | kept |

No flight (record `capabilities.flight` 0 to 0). No speech and no dialogue: the Figzy acts, it does not address anyone.

**Cut-table traits the draft now supports with a sentence:** `protective` (cut 2026-09-07 at 35 because "a planet fact may carry only an environmental adaptation, and shielding others is behavior"; the interposing sentence states that behavior of this species). `healing` (cut at 30 on the same ground; "holding the one quiet" makes the steadying the creature's own act, which is the same move that restored `healing` to the Tizzie pool). `inspiring`, `slippery`, `stealthy` and `pack-bonded` remain unsupported and are not written toward.

---

## 5. Dromeus (Magmuth, Fire)

**Current `species.json` text (43 words):**

> "Partially feathered ground birds with lizard features, these creatures are extremely quick with razor sharp teeth. When running at high speeds, they can spread their wings to temporarily take flight as they launch into the air and sink their teeth into their prey."

**Ratified record text (`docs/species-templates/dromeus.json`, `lore.description`, 94 words):**

> "A partially feathered ground bird with lizard features, built long in the leg and narrow in the skull, the Dromeus was designed by Magmuth's corporations for the transient mineral islands, fast enough to cross a cooling lava flow before it opened underfoot. It is extremely quick and carries razor sharp teeth. At speed it spreads its wings and takes flight for a few seconds, launching into the air to sink its teeth into its prey. It still runs the ash fields of Magmuth, where the blood feuds of the company wars have never ended."

**DRAFT (137 words):**

> A partially feathered ground bird with lizard features, built long in the leg and narrow in the skull, the Dromeus was designed by Magmuth's corporations for the transient mineral islands, fast enough to cross a cooling lava flow before it opened underfoot. It takes the ash storms and the sulfuric air of that world without damage, and it picks a moving shape out of the haze from far off. It is extremely quick and carries razor sharp teeth. At speed it spreads its wings and takes flight for a few seconds, launching into the air to sink its teeth into its prey. It runs down what it eats in loose groups that scatter the moment the strike lands. It still runs the ash fields of Magmuth, where the blood feuds of the company wars have never ended.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| partially feathered ground bird with lizard features, long in the leg, narrow in the skull | `species.json` Dromeus; record `bodyPlan: biped`, `covering: feathers`; art (long narrow lizard head, two hind legs, plume fans at wing, tail and hip) | kept |
| designed by Magmuth's corporations for the transient mineral islands | Magmuth history paragraph 4, "These corporations designed all manner of Xalians"; paragraph 3, "the transient islands that form from the hardened lava are known to be replate with heavy metals" | kept |
| fast enough to cross a cooling lava flow before it opened underfoot | Magmuth report `mobility.sprint` note, "surface transit windows between flow shifts are brief"; `outputPriorities`, "burst locomotion"; record `capabilities.sprint` 80 to 98 | kept |
| takes the ash storms and the sulfuric air of that world without damage | authored extension; anchored to Magmuth report `fauna.observations`, "heat-shielded integument universal", `outputPriorities`, "thermal shielding", and history paragraph 2, "lacing the atmosphere with sulfuric ash and pungent, toxic fumes" | authored |
| picks a moving shape out of the haze from far off | authored extension; anchored to `senses.sight` 70 to 90 and Magmuth history paragraph 2, air thick with volcanic smoke | authored |
| extremely quick, razor sharp teeth | `species.json` Dromeus, verbatim | kept |
| spreads its wings at speed, takes flight for a few seconds, sinks its teeth into its prey | `species.json` Dromeus; record `signatureAbility` Ashfall Stoop; `capabilities.flight` 15 to 35, a brief airborne interval and not sustained flight | kept |
| runs down what it eats in loose groups that scatter the moment the strike lands | authored extension; anchored to Magmuth report `fauna.observations`, "inter-pack aggression elevated", which presumes packs, and to `diet: carnivore` | authored |
| still runs the ash fields of Magmuth, where the blood feuds of the company wars have never ended | Magmuth history paragraph 7, "Internecine warfare wracks the Magmuthites, fueled by old blood feuds that arose from the company wars of long ago"; history paragraph 1 and `data.Terrain` for the ash fields | kept |

The legacy `traits.canFly: false` and the record's brief `flight` band do not conflict: the source sentence is a few seconds aloft at the end of a run, which both the record and the draft state as such.

**Cut-table traits the draft now supports with a sentence:** `pack-bonded` (cut 2026-09-07 at 55 because the Magmuth inter-pack line is a planet fact and "no ratified field states group living"; the loose-groups sentence states it of this species). Also promoted from planet-wide to species-level: `hardened`, `resistant`, `perceptive`. `menacing`, `stealthy`, `slippery` and `solitary` remain unsupported and are not written toward.

---

## 6. Tizzie (Telypso, Psychic)

**Current `species.json` text (25 words):**

> "It uses its tail to draw attention to its big, hypnotic eyes. Once eye contact is made, this creature can attack from within your mind."

**Ratified record text (`docs/species-templates/tizzie.json`, `lore.description`, 116 words):**

> "A small shaggy climber that hangs from the branches by long-fingered hands, with outsized ears, spiral-patterned eyes that fill half its face, and a long tail tipped in a flat whorled disc, the Tizzie was generated on Telypso to counterbalance the psychic energies of the deranged Vallerii the Imperial Houses marooned there. It works the way its Generator intended: the tail disc turns and draws attention to the eyes, eye contact opens the way, and the treatment proceeds from inside the patient's mind rather than through the body. Since the Nemesis Plague reached the sanctuaries and turned the creatures of Telypso against one another, Tizzies work the same hold on each other in the fungal forests."

**DRAFT (137 words):**

> A small shaggy climber that hangs from the branches by long-fingered hands, with outsized ears, spiral-patterned eyes that fill half its face, and a long tail tipped in a flat whorled disc, the Tizzie was generated on Telypso to counterbalance the psychic energies of the deranged Vallerii the Imperial Houses marooned there. It works the way its Generator intended: the tail disc turns and draws attention to the eyes, eye contact opens the way, and the treatment proceeds from inside the patient's mind rather than through the body. Nothing takes the same hold on it, and a hand closing on the body finds it already gone along the branch. Since the Nemesis Plague reached the sanctuaries and turned the creatures of Telypso against one another, Tizzies work the same hold on each other in the fungal forests.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| small shaggy climber hanging from the branches by long-fingered hands | record `bodyPlan: biped`, `covering: fur`, `anatomy` fists, `capabilities.climb` 65 to 90, `size` 80 to 95 cm and 10 to 16 kg; art (hanging from a branch by one long-fingered hand, hind legs clear of any ground) | kept |
| outsized ears, spiral-patterned eyes filling half the face, long tail tipped in a flat whorled disc | art (two ears each nearly as long as the head, two spiral pinwheel eyes taking up about half the head, S-curved tail ending in a spiral disc about the diameter of the skull); record `anatomy` tail and lure | kept |
| generated on Telypso to counterbalance the psychic energies of the deranged Vallerii the Imperial Houses marooned there | Telypso history paragraph 5, "The Imperial Houses were content to leave Telypso as a cosmic asylum ... choosing to send the most unstable and mentally deranged of the Vallerii species there"; paragraph 6, the counterbalancing purpose | kept |
| the disc turns, draws attention to the eyes, eye contact opens the way | `species.json` Tizzie; record `signatureAbility` Spiral of Perfect Attention, instrument `gaze`, action `snare` | kept |
| the treatment proceeds from inside the patient's mind rather than through the body | `species.json` Tizzie, "this creature can attack from within your mind"; Telypso history paragraph 6, "the Generator began to treat the prisoners as patients" | kept |
| nothing takes the same hold on it | authored extension; anchored to the record's own act (this is the species that opens minds) and to `traits.pool.hypnotic` 100 with no counterpart vulnerability stated in any source | authored |
| a hand closing on the body finds it already gone along the branch | authored extension; anchored to `capabilities.climb` 65 to 90, `leap` 40 to 65, a 10 to 16 kg body, and legacy `speedRating: high` | authored |
| since the plague reached the sanctuaries and turned the creatures of Telypso against one another, Tizzies work the same hold on each other | Telypso history paragraph 7, "The End Wars have brought the Nemesis Plague to Telypso's sanctuaries ... tainting the creatures of Telypso and turning them against one another" | kept |

No four-legged claim: the 2026-09-02 amendment corrected `bodyPlan` to biped and the draft keeps the hanging posture.

**Cut-table traits the draft now supports with a sentence:** `mind-sealed` (cut 2026-09-07 at 15, "no sentence, no field"; the "nothing takes the same hold on it" sentence is now that sentence). `slippery` (cut at 45 because "the legacy `evasionRating` is unrated" and no sentence existed; the branch sentence is that sentence). `stealthy`, `menacing`, `solitary` and `telekinetic` remain unsupported and are not written toward.

---

## 7. Venemist (Drainov, Chemical)

**Current `species.json` text (28 words):**

> "The toxic mist expelled from a tube in its mouth helps to dissolve its prey. With only 2 teeth, this tactic is necessary for the creature to survive."

**Ratified record text (`docs/species-templates/venemist.json`, `lore.description`, 70 words):**

> "A shaggy four-legged hunter with a spray tube seated in its gaping jaws, the Venemist carries only two teeth and cannot bite down on anything it wants to eat. The toxic mist it expels from that tube helps to dissolve its prey, and the Generator that shaped it on Drainov was built to fill a world of acid swamps and industrial waste with life capable of surviving there at all."

**DRAFT (125 words):**

> A shaggy four-legged hunter with a spray tube seated in its gaping jaws, the Venemist carries only two teeth and cannot bite down on anything it wants to eat. The toxic mist it expels from that tube helps to dissolve its prey, and the Generator that shaped it on Drainov was built to fill a world of acid swamps and industrial waste with life capable of surviving there at all. It finds a carcass by scent through the smog, and several will stand over the same one until it is thin enough to drink. Nothing on that planet burns it: not the corrosive rain, not the acid swamps, not its own mist. A body opened in a fight vents the same mist through the breach.

**Fact-check ledger**

| Claim | Source | Class |
|---|---|---|
| shaggy four-legged hunter, spray tube seated in gaping jaws, two teeth | `species.json` Venemist; record `bodyPlan: quadruped`, `covering: fur`, `anatomy` jaws/fangs/vents; art (seated quadruped, jaws gaped, two long curved fangs and nothing else reading as a tooth, tube projecting from the mouth with a fanning spray) | kept |
| cannot bite down on what it wants to eat | `species.json` Venemist, "With only 2 teeth, this tactic is necessary for the creature to survive"; record `capabilities.manipulation` 10 to 25 | kept |
| toxic mist from the tube dissolves its prey | `species.json` Venemist; record `signatureAbility` Dissolution Veil and `conduits: { vents: chemical }` | kept |
| the Drainov Generator was built to fill a world of acid swamps and industrial waste with life capable of surviving there | Drainov history paragraph 5, "Drainov's Xalian Generator was able to miraculously bioengineer new forms of life capable of surviving within the planet's hostile wastelands"; `data.Terrain`, "Acid Swamps, Gaseous Smog, Toxic Atmosphere" | kept |
| finds a carcass by scent through the smog | authored extension; anchored to `senses.smell` 60 to 85 against `sight` 40 to 60, and to Drainov report `mobility.flight` note, "airborne particulates degrade tissue and instrumentation" | authored |
| several will stand over the same carcass until it is thin enough to drink | authored extension; anchored to the record's own two-teeth constraint, which makes external digestion the only feeding mode, and to `diet: carnivore` | authored |
| the corrosive rain, the acid swamps and its own mist do not burn it | authored extension; anchored to Drainov report `fauna.observations`, "full-spectrum toxin immunity universal", `outputPriorities`, "chemical immunity" and "containment-grade integument", and history paragraph 5, "bubbling acid swamps, steaming corrosive rain" | authored |
| a body opened in a fight vents the same mist through the breach | authored extension; anchored to Drainov report `fauna.observations`, "reactive discharge on structural breach", stated here of this species | authored |

No burrowing and no hiding claim (record `capabilities.burrow` 0 to 10; `stealthy` stays out).

**Cut-table traits the draft now supports with a sentence:** `pack-bonded` (cut 2026-09-07 at 20 as "argued from the same silence"; the shared-carcass sentence is now a cooperation sentence). Also promoted from planet-wide to species-level: `toxic`, `resistant`, `volatile`, `perceptive`. `stealthy` and `solitary` remain unsupported and are not written toward.

---

## Summary

| Species | Draft word count | Cut-table traits newly supported | Pool traits promoted to species-level evidence |
|---|---|---|---|
| Kosanos | 132 | `menacing` | anchored, perceptive, resistant, regenerative, territorial |
| Tetrahive | 140 | `menacing`, `stealthy` | nocturnal, slippery, perceptive |
| Xylum | 139 | `menacing` | anchored, territorial, resistant, regenerative, perceptive |
| Figzy | 138 | `protective`, `healing` | telekinetic, perceptive |
| Dromeus | 137 | `pack-bonded` | hardened, resistant, perceptive |
| Tizzie | 137 | `mind-sealed`, `slippery` | hypnotic, perceptive, healing |
| Venemist | 125 | `pack-bonded` | toxic, resistant, volatile, perceptive |

Every draft is one paragraph, present tense, inside the 60 to 140 word band, opens on an appositive describing the body, and closes on a plain present-tense fact. No em-dashes, no British spellings, no game mechanics, no invented names, no Xalian speech.

## Open items for Nick

1. Two drafts assert group behavior that no source states: Dromeus hunting in loose groups, and several Venemist feeding at one carcass. Both are anchored (elevated inter-pack aggression on Magmuth presumes packs; the two-teeth constraint makes external digestion the only feeding mode), but both are exactly the kind of behavior sentence the 2026-09-07 evidence bar exists to stop. They are the two lines most worth vetoing if you want the bar held tight.
2. The Xylum draft drops the "Vallerii activity never grew past small settlements, research labs, and exploration parties" clause for length. It is a Floria fact rather than a Xylum fact, and the Kosanos draft still carries it. Say if you want it in both.
3. The Tizzie line "nothing takes the same hold on it" is the weakest of the authored extensions: it rests on the creature being the one that does the holding, not on any source sentence about resisting. If `mind-sealed` is not worth having, that sentence is the first to cut.
4. Applying any of these means editing `lambda/src/json/species.json`, then re-running the affected records so the trait pools read the new sentences, then `node scripts/bundleLore.js` and `yarn copy-json`. None of that is done here, and the encyclopedia entries would need a matching pass.
