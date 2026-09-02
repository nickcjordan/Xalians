# Graviclaw — migration walkthrough

Sources read: the Graviclaw entry in `lambda/src/json/species.json` and the full `history` array for Grimedes in `lambda/src/json/planets.json`. Nothing else was read for canon.

## Step 2 — Description status

`descriptionStatus: "source"`. The legacy description is not a two-sentence stub: it is 111 words, one paragraph, present tense, opening with a body appositive ("With the black-shelled body of a crab and an upright torso, the centaur-like crustacean known as the Graviclaw"), stating the hunting behavior, and anchoring to a named location on the home planet ("the foggy wetlands of Grimedes"). It is inside the 60 to 140 word register, so it is kept verbatim and no clauses were added. Verified character for character against `species.json`.

Note on register: the source paragraph reads as behavior rather than as an explicit Vallerii-purpose statement. Since it already satisfies the length, tense, appositive and location requirements, the ruling is "source" rather than rewriting canon prose to insert a purpose clause the source does not state. Open question 1 below asks Nick whether he wants a purpose clause added anyway.

## Step 3 — Buried-auto-trait pass

Traits the body DEMANDS (guaranteed):

- `armored` — "the black-shelled body of a crab" and "an immovable wall of chitin". A shelled, chitin-plated body means `armored` by the registry rule.
- `anchored` — "the Graviclaw can use its powers to root itself to the ground, becoming an immovable wall of chitin." The source states immovability outright, which is the definition of `anchored`.

Traits merely suggested (pool, weights justified):

- `stealthy` 4 — "lurks just beneath the foggy wetlands of Grimedes". Submerged concealment before it acts is exactly the trait's nature. Highest weight because it is the only pool trait the source describes as ongoing behavior.
- `perceptive` 3 — it hunts prey it cannot see in a world "surrounded in a cloak of perpetual night" (Grimedes history) from under water; something has to locate prey. Weighted below stealthy because the source never says it detects hidden things, only that it hunts.
- `solitary` 3 — the source describes a single creature ambushing on its own ("draw its helpless prey right into its clutches", "When facing larger foes, the Graviclaw"), never a pack. Not guaranteed, because absence of a pack in one paragraph is weaker than a stated fact. Excludes `pack-bonded`, which is therefore absent from the pool.
- `menacing` 2 — a heavy, immovable ambusher fits the trait, but nothing in the source says its presence erodes courage, so it is a low-weight roll only.
- `telekinetic` 1 — "its bizarre control over the intensification of gravitational waves to generate miniature black holes in the water and draw its helpless prey right into its clutches" is moving things without touching them. Kept rare, since the source frames the pull as a hunting mechanism rather than general levitation, and the registry marks the trait rare.

`guaranteed.length` 2 plus `rolledCount[1]` 1 equals 3, at the cap; `guaranteed.length` 2 plus `rolledCount[0]` 0 equals 2, above the floor of 1. No exclusion pair co-occurs.

## Step 4 — Physiology

- `corporeality: corporeal` — "the black-shelled body of a crab and an upright torso" is a physical body.
- `composition.primary: flesh` — a crustacean body; chitin is carried by `covering`, not composition. No secondary declared; the source names no second material.
- `bodyPlan: multiped` — "the centaur-like crustacean", a crab body carrying an upright torso, is a many-legged plan, not a biped or quadruped.
- `covering: chitin` — "an immovable wall of chitin".
- Anatomy:
  - `pincers` — "their massive claws in order to snap them shut". The registry ruling is explicit that snapping crab claws are `pincers`, never `claws`, whatever word the description uses.
  - `shell` — "the black-shelled body of a crab".
  - `hide` — the body surface used defensively, implied by "an immovable wall of chitin" presenting itself to larger foes. Flagged as the softest of the four keys; the source does not name a hide distinct from the shell. See open question 2.
  - `body` — universal fallback; "becoming an immovable wall of chitin" is the whole mass used as an instrument.
  - Deliberately excluded: `claws` (superseded by the pincers ruling), `jaws` and `fangs` (the source names no mouth), `roots` (the rooting is a gravitational power, not a gripping structure, per "can use its powers to root itself").
- Size `heightCm [170, 205]`, `weightKg [180, 260]` — the legacy height 191 cm is a fair anchor and the band is centered on it. Weight is derived independently per section 5.5: a 191 cm upright-torso crustacean with a full chitin shell is far denser than a comparable-height flesh biped; chitin and shell add substantial mass, and the source itself insists on heaviness ("an immovable wall of chitin", "with a force many times heavier than their implied mass"). The band lands near but not on the legacy 211 kg, which was used only as a relative gauge.
- `lifespan: long` — wear rubric: a heavy, armored, slow, cold-world body with low metabolic intensity wears slowest. Grimedes opens its history as "A shadowy world that occupies the outer rim of the galaxy of Xalia" and orbits "a dying brown dwarf star that has cooled so significantly it emits almost no visible light", so metabolic demand is low. Not `enduring`, because the body is flesh under chitin rather than mineral or metal, and Grimedes is a harsh world for field machinery.
- `genome.chirality: rolled` — nothing in the source declares achirality, so the default 50/50 roll stands.
- `diet: carnivore` — "draw its helpless prey right into its clutches".
- `communication: ["vibration", "display"]` — no call or cry is described; a heavy shelled body in wetland mud communicates by vibration, and the massive claws afford `display`. `vocal` is deliberately omitted because the source names no cry, which also means the `voice` channel is unavailable.
- `breathes: ["gas", "liquid"]` — it "lurks just beneath the foggy wetlands" and generates black holes "in the water", so it operates submerged, and it also faces "larger foes" above the surface. Subset of `ambientMedia`, as required.
- `environmentalTolerance.ambientMedia: ["gas", "liquid"]` — same evidence. Not `vacuum`; nothing supports it.
- `temperatureC: { min: -40, max: 15 }` — read from the Grimedes climate: "a dying brown dwarf star that has cooled so significantly it emits almost no visible light other than the shortest bands of infrared radiation". A world lit only by infrared is cold, but its wetlands are liquid water rather than ice, so the band brackets just above freezing with a cold floor.
- Capabilities:
  - `flight [0, 0]` — no wings in the source; a shelled crustacean does not fly.
  - `swim [45, 65]` — it lurks "just beneath the foggy wetlands" and works "in the water", but it is a heavy bottom-dweller, not a swimmer.
  - `burrow [50, 70]` — "lurks just beneath the foggy wetlands" is life under the surface.
  - `climb [10, 25]` — a mass this heavy on crustacean legs climbs poorly; nothing in the source suggests otherwise.
  - `sprint [15, 30]` — the legacy `statRatings` leave `speedRating` blank while marking attack and defense high, used here only as a relative gauge; the source's fighting mode is stillness and ambush, not pursuit.
  - `leap [5, 20]` — an anchoring, heavy body.
  - `manipulation [45, 65]` — "an upright torso" with "massive claws" that can "snap them shut" gives real grasping anatomy, satisfying the above-40 rule; capped mid-band because pincers are coarse graspers.
- Senses:
  - `sight [20, 40]` — Grimedes is "surrounded in a cloak of perpetual night" and the creature hunts from under water, so vision is a weak sense.
  - `hearing [40, 60]` and `smell [35, 55]` — moderate defaults for an ambusher whose source names no sense; flagged as authored, not sourced.
  - `special: ["tremorsense"]` — it "lurks just beneath the foggy wetlands" and must detect prey it cannot see in perpetual night. Authored, flagged; see open question 3.

## Step 5 — Instruments

`["pincers", "shell", "body"]`, all present in anatomy, all physical so no channel predicates apply.

- `pincers` — "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure." This is the part it fights with.
- `shell` — "the black-shelled body of a crab", used defensively.
- `body` — "becoming an immovable wall of chitin".

`hide` is in anatomy but not promoted to an instrument; the shell is the honest defensive surface. Channels considered and rejected: `mind` fails its predicate (element is dark not psychic, the special sense is tremorsense not psychic, and `telekinetic` is pooled rather than guaranteed); `aura` fails because the gravitational effect is targeted and terminates on the prey drawn into the claws, not an emanation acting on everything around it; `voice` fails because `vocal` is absent from communication.

## Step 6 — Archetype weights

`bulwark` 5 (vitality, resilience) — "an immovable wall of chitin" is the archetype in one phrase. `juggernaut` 4 (strength, resilience) — "severing through even the hardest of materials with crushing pressure" plus the shell. `predator` 3 (instinct, reflex) — "draw its helpless prey right into its clutches" is ambush hunting. `prowler` 2 (agility, instinct) — "lurks just beneath the foggy wetlands", though its agility is low so this reads weaker. `stalwart` 1 (resilience, willpower) — "When facing larger foes" it stands rather than flees; lowest weight since willpower is not addressed in the source.

## Step 7 — Attribute bands

- `strength [70, 92]` — "with a force many times heavier than their implied mass, severing through even the hardest of materials".
- `vitality [55, 75]` — a large body, but the source dwells on armor rather than life force; legacy `healthRating` is blank.
- `endurance [50, 70]` — a low-metabolism ambusher that holds position; no source claim of sustained output.
- `agility [15, 35]` — an anchoring, immovable body is the opposite of maneuvering.
- `reflex [35, 55]` — an ambusher's snap, offset by heavy mass.
- `intelligence [25, 45]` — "bizarre control" over gravity is instinctive power, not reasoning; well below true-human range.
- `willpower [45, 65]` — implied by standing against "larger foes"; nothing stronger in the source.
- `instinct [55, 75]` — it hunts by ambush in perpetual night without relying on sight.
- `charisma [15, 35]` — no presence or display effect is described.
- `resilience [72, 94]` — "an immovable wall of chitin"; legacy `standardDefenseRating` is "high", used only as a relative gauge.

Legacy `statRatings` cross-check: "high" appears on `standardAttackRating` and `standardDefenseRating` only, which matches strength and resilience being the two topmost bands.

## Step 8 — Element

Primary `dark`, from `type: "Dark"` in `species.json`, stored at affinity 100. Secondaries are whatever the dark graph allows: ghost, psychic, ice. No `affinityOdds` override is declared, so the 75/25 baseline is inherited. There is no lore reason in the source to make secondaries more or less likely for this species specifically.

## Step 10 — Signature ability

Lore-defining act, quoted: "Graviclaws can strengthen the gravitational pull of their massive claws in order to snap them shut with a force many times heavier than their implied mass, severing through even the hardest of materials with crushing pressure."

- Name: **Point of No Return**. The reserved-signature search over every `consolidated-*.md` and `neutral-pools.md` for "graviclaw" returned one hit, a ratified ledger note in `consolidated-dark.md` line 52: "Point of No Return remains signature-register (Graviclaw's signature)." That is a prior ruling by Nick, and the source description does not contradict it, so it is used rather than coining a new name. The collision scan for the exact string across all 15 catalog files returns only that ledger note and no catalog cell name, so there is no collision.
- `instrument: pincers` — per the ratified classification rule, the instrument is the part where the effect terminates on the target. The gravity is the physics that produces the force; the claws are where it lands ("their massive claws in order to snap them shut").
- `action: crush` — "with crushing pressure". `crush` is in the allowed set for `pincers`.
- `medium: dark` — the primary element; gravity is the dark fantasy per the element table.
- `intensity: [55, 95]` — a high band, because the source states the force exceeds "their implied mass" by "many times" and cuts "even the hardest of materials", but not floored at the top, since intensity is rolled per individual.
- Description: "The Graviclaw deepens the pull of its claws until nothing near them can hold its ground, then closes them with a weight its body was never built to carry." One line, canon voice, no mechanics, no em-dashes, American English.

## Step 11 — Catalog check through the species lens

Instruments `pincers` (strike, crush, snare, shove, ward, hurl), `shell` (ward, shove, crush), `body` (strike, crush, shove, ward, burst, terrorize). Union of actions: strike, crush, snare, shove, ward, hurl, burst, terrorize. Media: dark (primary) plus each on-graph secondary (ghost, psychic, ice). Counts are drawable names after applying instrument tags against this species' instrument set.

| Medium | strike | crush | snare | shove | ward | hurl | burst | terrorize |
|---|---|---|---|---|---|---|---|---|
| dark | 325 | 128 | 80 | 496 | 98 | 44 | 34 | 60 |
| ghost | 69 | 17 | 139 | 14 | 65 | 31 | 141 | 161 |
| psychic | 80 | 32 | 70 | 60 | 118 | 45 | 124 | 112 |
| ice | 270 | 111 | 84 | 80 | 164 | 78 | 43 | 95 |

**Thin-combo findings: none.** The lowest drawable cell for this species is ghost shove at 14, more than double the threshold of 6, before the neutral pool for each action is added on top. Nothing was padded.

## Open questions for Nick

**1.** The legacy Graviclaw paragraph is already 111 words in the full species register, so I marked it `descriptionStatus: "source"` and kept it character for character. The one thing it never states is the original engineered purpose under the Vallerii, which the register calls for. The Grimedes history does give a planet-wide purpose: "unlike most worlds, the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation." My recommendation is to leave the description untouched, because the source-only rule warns specifically against citing a planet-wide statement as if it were about one species, and because the paragraph already satisfies every length and structure requirement. Would you rather I keep it verbatim as it stands, or upgrade it with a test-subject clause drawn from the planet history?

**2.** I put both `shell` and `hide` in anatomy. `shell` is directly sourced ("the black-shelled body of a crab"), but `hide` is my own reading of "an immovable wall of chitin" as a defensive body surface distinct from the enclosing shell, and a crab arguably has only the one carapace. Dropping `hide` would leave anatomy at `pincers`, `shell`, `body`, which is a cleaner and more honest set, at the cost of losing the `ward` and `shove` grain that a separate hide would offer, though `shell` already supplies both. Should I drop `hide` from anatomy?

**3.** The source gives the Graviclaw no named sense organ at all, while requiring it to hunt prey from beneath water on a world of "perpetual night". I authored `tremorsense` as its special sense on that reasoning, and set sight low. The alternative reading is `void-sense`, which would tie the sense to its own gravitational faculty rather than to vibration in mud, and which sits closer to the dark element's fantasy. Which of the two do you want as the Graviclaw's special sense?
