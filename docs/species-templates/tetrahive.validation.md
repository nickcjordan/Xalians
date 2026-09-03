# Tetrahive independent validation

Validator agent, run 2026-09-02. Sources consulted: the `Tetrahive` entry in `C:\dev\src\Xalians\lambda\src\json\species.json`, the `Grimedes` entry in `C:\dev\src\Xalians\lambda\src\json\planets.json` (full `history` array and `data` block), the artwork `C:\dev\src\xalians-catalog\docs\species-templates\art\tetrahive.png` (opened and read), sections 2-6 of `migrate-species/SKILL.md`, and a grep of `docs/ability-catalog/consolidated-*.md` and `neutral-pools.md` for collisions. No other document was read.

## Step 1: script output and log honesty

```
WARN instruments.predicate.source   channel "swarm" with a non-swarm body plan means a conjured familiar swarm; the validator agent must confirm the description or art shows one

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\tetrahive.jsonl
```

The log (`validation-log/tetrahive.jsonl`) holds 12 entries. Entries 1-5 (11:25-11:30) carry a different snapshot entirely (anatomy `["jaws","wings","body"]`, signature `Convocation of Teeth`, traits `pack-bonded/protective/menacing/stealthy`) — this is the earlier different agent's attempt the walkthrough disclaims, and it is correctly not discussed as the walkthrough's own denial history. Entries 6-12 (12:39-12:46) match the walkthrough's own snapshot (anatomy `["wings","claws","tail","fangs","body"]`, signature `Unbidden Legion`) and are the walkthrough's own runs.

Within entries 6-12, one FAIL was ever raised: entry 7 (`signature.description.mechanics`), alongside three WARNs in that same entry (`instruments.predicate.source` x2, `signature.description.elementkey`, `enc.definition.name`). The walkthrough's Script denials section documents this FAIL, quotes the original and replacement description text, and gives its false-positive argument (the regex firing on "turns" as an ordinary verb rather than the game noun "a turn"). That argument is plausible: "turns them on a target" is unambiguously the verb sense, not a reference to a turn of play. The walkthrough is honest about it being its own editorial choice to also swap "a target" to "a single target" and "into the dark" to "into the black," not something the script demanded.

One thing the walkthrough does not mention: entry 6 (12:39) already carried a WARN (`swarm`/secretion) before entry 7's FAIL appeared, meaning the FAIL in entry 7 arrived on a run where the agent had also just changed instruments from `swarm, jaws` (entries 1-6 lineage did not have this) — this is a non-issue, just noting the walkthrough compresses the run history to "the" FAIL without narrating every intermediate WARN state, which is acceptable since it does account for the final live WARN set (entries 11-12: one WARN only, matching the single WARN the script printed for me in Step 1). The two WARNs from entry 7-10 collapse to one by entry 11 — the walkthrough's answer to the `secretion`-wording WARN (calling it a "cosmetic defect in the script's message, not a real question") is consistent with that WARN disappearing in later runs. All denials shown in the log are addressed honestly; no denial is hidden or misrepresented.

## Step 2: art-reading check

Claimed vs. actual, checked directly against the PNG:

| Claimed feature | Present in art? |
|---|---|
| Bat-shaped body, two broad membranous wings spread wide | Yes |
| Small blunt head, two pointed upright ears | Yes |
| Pair of narrow slitted eyes | Yes |
| Short forelimbs, three or four hooked digits near the chest | Yes |
| Hind feet with splayed hooked digits | Yes |
| Long thin whip-like tail, curls into a full loop at the tip | Yes |
| Body smooth/unarmored, no plates, spines, shell, horns | Yes |
| No visible teeth on the central figure | Yes (mouth/muzzle is solid closed silhouette, no dentition) |
| Roughly twenty smaller flying silhouettes ringing the central figure, all in flight, all facing different directions | Yes, count is approximately right (20-21 visible) |
| Composition reads as one body with a conjured cloud of small copies around it | Fair reading; the small figures are the same simplified wing-and-ear bat silhouette as the central one |

Nothing claimed is absent, and nothing significant visible was missed. The description is accurate and appropriately conservative (it does not claim teeth, which are genuinely absent from the art).

## Step 3: upgraded description, clause by clause

Full text: "A small winged thing with a long whipping tail, the Tetrahive fights by conjuring a swarm of little flying familiars with teeth like piranhas, holding every one of them in its mind and moving them as a single unit to attack or defend. It was generated on Grimedes not to serve as a labor force but as a test subject, and its swarm belongs to the same body of research that yielded organisms able to manipulate shadows to create copies of sentient life, work carried out in laboratories that rumor holds were black sites for ECHELON. It hunts the thick, stalky undergrowth of a world cloaked in perpetual night, and the newest generation of its kind now stands at the edge of the galaxy and watches the endless black."

| Clause | Verdict | Evidence |
|---|---|---|
| "A small winged thing with a long whipping tail" | SUPPORTED | art: broad wings, long looped tail; legacy height 76cm (relative gauge, used only as connective color per rule 6, not a hard source, but reasonable) |
| "conjuring a swarm of little flying familiars with teeth like piranhas" | SUPPORTED | species: "summons a swarm of small flying familiars with teeth like piranhas" |
| "holding every one of them in its mind and moving them as a single unit to attack or defend" | SUPPORTED | species: "It controls the swarm with its mind, attacking or defending as one unit." |
| "It was generated on Grimedes not to serve as a labor force but as a test subject" | SUPPORTED | planet: "unlike most worlds, the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation" (verified verbatim) |
| "its swarm belongs to the same body of research that yielded organisms able to manipulate shadows to create copies of sentient life" | INFERRED, borderline INVENTED | planet lists this as one of several things the Generator produced ("Xalians that could alter gravitational waves... Organisms that could seemingly 'erase' information... manipulate shadows to create 'copies' of sentient life, or blend into darkness and 'phase out'"). Nothing in the planet text or species text says the Tetrahive's own swarm-summoning ability is derived from or related to the shadow-copying research specifically, as opposed to any of the other listed abilities, or none of them. This is a connective the walkthrough itself flags only as "carries no new fact," but it does assert a specific causal/kinship link between two different named phenomena that the source only lists side by side, disconnected. This is the weakest clause in the description — it reads as more than pure connective tissue; it manufactures a research lineage. Flag as INFERRED-generous, arguably over the line, not INVENTED outright because both phenomena are drawn from the same Generator and same paragraph. |
| "work carried out in laboratories that rumor holds were black sites for ECHELON" | SUPPORTED | planet: "Rumor has it that many of these facilities were in fact black sites for covert research funded by ECHELON's most classified R&D divisions." |
| "It hunts the thick, stalky undergrowth" | INFERRED | planet: "came to be covered in a layer of thick, stalky undergrowth" describes the planet's terrain, not the species' behavior. Nothing in either source says the Tetrahive specifically "hunts" there (this is a planet-wide terrain sentence repurposed as a species behavior claim). The verb "hunts" is a mild overreach beyond a location statement — the planet history never depicts the Tetrahive hunting, only that its diet is inferable from "teeth like piranhas." Acceptable connective per rule 6, but worth flagging as leaning on a planet-wide sentence for what is nominally a species-specific verb. |
| "a world cloaked in perpetual night" | SUPPORTED | planet: "the planet Grimedes is surrounded in a cloak of perpetual night" |
| "the newest generation of its kind now stands at the edge of the galaxy and watches the endless black" | SUPPORTED | planet: "the newest generation of Grimedites now serve a vital role... the Grimedites stand at the edge of the galaxy... watch the endless black" (all verified verbatim; "Grimedites" here plausibly reads as all Grimedes-origin Xalians collectively, of which Tetrahive is one — a fair collective-to-specific narrowing) |

Voice check: word count is approximately 130 words (within 60-140). Present tense used throughout for the current-day clauses ("fights," "hunts," "stands," "watches"); past tense correctly used for the historical generation clause. Body appositive present ("A small winged thing with a long whipping tail, the Tetrahive..."). Engineered purpose stated (test subject). Present-day turn present (edge of galaxy, watching the black) anchored to a specific institution (ECHELON, ties to a named planet). No mechanics vocabulary. No em-dashes present. American spelling throughout.

## Step 4: signature description and Encyclopedia entry

Signature: "It calls up a wheeling cloud of small toothed familiars and sets them on a single target as one mind, and a familiar that is broken simply thins away into the black."

| Clause | Verdict | Evidence |
|---|---|---|
| "It calls up a wheeling cloud of small toothed familiars" | SUPPORTED | species: "summons a swarm of small flying familiars with teeth like piranhas" |
| "sets them on a single target as one mind" | SUPPORTED | species: "It controls the swarm with its mind, attacking or defending as one unit" |
| "a familiar that is broken simply thins away into the black" | INFERRED, licensed by rule | Not stated in either species.json or planets.json for this species specifically. This clause is licensed entirely by SKILL.md section 2's familiar rule: "conjured familiars are projections, not life... when they are destroyed they phase away rather than die." The word "black" ties to the planet's "endless black" / "perpetual night" motif, which is sourced, but the mechanism of thinning-away is not sourced text, it is the section 2 ruling applied. This is correctly disclosed nowhere as a quoted source (rightly, since it isn't one) but the walkthrough does not explicitly flag this clause as rule-derived rather than source-derived in its judgment lines — a minor documentation gap, not a canon violation. The content itself is fully consistent with and required by section 2. |

Encyclopedia definition: "The Tetrahive is a small winged Xalian of Grimedes that conjures a swarm of toothed flying familiars and moves them as a single unit by will alone. It was generated on that world as a test subject rather than a laborer, and its projected swarm descends from the same Grimedite research that produced organisms able to copy sentient life out of shadow."

| Clause | Verdict | Evidence |
|---|---|---|
| "small winged Xalian of Grimedes" | SUPPORTED | art (small winged body), species.json `planet: Grimedes` |
| "conjures a swarm of toothed flying familiars and moves them as a single unit by will alone" | SUPPORTED | species: summons swarm with piranha-like teeth, controls with mind, attacks/defends as one unit |
| "generated on that world as a test subject rather than a laborer" | SUPPORTED | planet: quoted above |
| "its projected swarm descends from the same Grimedite research that produced organisms able to copy sentient life out of shadow" | INFERRED, same over-reach as the description clause above | Same issue as Step 3's flagged clause: the planet text lists shadow-copying as one of several unrelated Generator outputs, not as a stated ancestor of the swarm-summoning capability. "Descends from" asserts a specific research lineage the source text does not state. Register check: this uses "projected," not the element key, and avoids mechanics language, satisfying voice rule 3's registry-word ban. |

Both prose pieces obey the voice rules: no em-dashes, American spelling, encyclopedia entry names the species in its first sentence (correctly fixing the earlier WARN), no element key or registry word used as jargon.

## Step 5: field-by-field audit of tetrahive.json

| Field | Value | Verdict | Note |
|---|---|---|---|
| `bodyPlan` | `avian` | HONEST | art: two wings, two hind limbs, flying body; species legacy `canFly: true` agrees |
| `covering` | `hide` | HONEST | art shows no plating/shell; correct per registry (hide = unarmored declaration) |
| `anatomy.wings` | included | HONEST | art, dominant feature |
| `anatomy.claws` | included | HONEST | art: hooked digits fore and hind |
| `anatomy.tail` | included | HONEST | art: long looped tail |
| `anatomy.fangs` | included | OVER-CLAIMED | Art shows the central body's mouth closed with no visible teeth. The only teeth named in the source text belong explicitly to the familiars ("teeth like piranhas" describing the swarm), not to the central creature's own mouth. The walkthrough itself acknowledges this is "the weakest anatomy call" and raises it as an open question rather than asserting it flatly — that disclosure is honest, but the JSON still ships `fangs` as a firm anatomy key rather than omitting it, and the instrument list correctly does NOT use `fangs` as an instrument (avoiding double-counting), which mitigates but does not eliminate the over-claim. Recommend: drop `fangs` from anatomy, per the walkthrough's own honest alternative, since neither source text nor art assigns teeth to the central body plan. |
| `anatomy.body` | included | HONEST | universal fallback, legitimately used |
| `instruments: swarm` | included | HONEST, per section 2 | conjured-familiar exception applies cleanly; species text plus art support the projection reading |
| `instruments: mind` | included | HONEST | predicate satisfied via `senses.special: psychic`, itself justified below |
| `instruments: claws` | included | HONEST | only physical part the art actually shows in an active gripping/striking posture |
| `senses.special: psychic` | `["psychic"]` | OVER-CLAIMED (circular) | This value exists specifically to satisfy the `mind` channel's predicate (SKILL.md 5.6: "psychic element, a psychic special sense, or telekinetic/hypnotic in guaranteed traits"). The species is not `psychic`-element (it is `dark`, on-graph secondaries are ghost/psychic/ice, so psychic is a plausible rolled secondary but is not guaranteed), and no trait like `telekinetic` is guaranteed. The walkthrough's own justification ("A mind that holds and steers a whole conjured swarm as one is the psychic special sense") is a restatement of the very sentence being used to justify the `mind` instrument, i.e., the source sentence is being read once to license `mind` as instrument and a second time, independently, to manufacture the `senses.special` field whose sole purpose is to satisfy `mind`'s own predicate. This is legal by the letter of the predicate (a special sense can be declared from the same behavior described) but it is the walkthrough's own most self-referential move and deserves flagging as circular rather than doubly-sourced. |
| `communication: telepathic` | `["telepathic"]` | OVER-CLAIMED | The species sentence describes an inward, one-directional control channel over its own conjured swarm ("It controls the swarm with its mind"), not an outward communicative act directed at other beings. SKILL.md's `communication` enum lists `telepathic` alongside `vocal`, `vibration`, `display`, `chemical` — all of which are outward signaling channels to other creatures. Controlling one's own familiars is arguably a body function (akin to how a hand is not "communication" with itself), not communication in the sense the enum intends. The walkthrough's justification treats "It controls the swarm with its mind" as sufficient for an outward telepathic channel, but nothing in either source shows the Tetrahive telepathically signaling another being (ally, predator, or otherwise). This is the same source sentence stretched to cover three separate fields (`instruments.mind`, `senses.special.psychic`, `communication.telepathic`), each legitimate on its own footing per the registry's letter, but collectively an aggressive read of one clause. |
| `diet: carnivore` | HONEST | "teeth like piranhas" implies predation; no plant-feeding named | |
| `breathes: gas` / `ambientMedia: gas` | HONEST | planet has photosynthesizing flora implying breathable gas atmosphere; ordinary flesh flier | |
| `temperatureC: -6 to 34` | HONEST | inside planet's `-6` to `93` data-block range; narrower band justified by perpetual-night/cold-star context | |
| `senses.sight [30,55]`, `hearing [60,85]` | HONEST | art: small slitted eyes, prominent large ears; planet: near-total darkness world | |
| `senses.smell [25,45]` | HONEST (disclosed) | correctly listed in Authored fields as no-source middling default | |
| `lifespan: short` | HONEST | wear rubric: small light metabolically intense flier sustaining a swarm, on planet described as "on the verge of death" | |
| `size` bands | HONEST (disclosed) | legacy height (76cm) sits inside range; correctly flagged as authored absolutes in Authored fields | |
| `archetypeWeights` (sage 4, seeker 2, sovereign 1, skirmisher 5, prowler 3) | HONEST ordering, authored integers (disclosed) | sage/seeker tie to the mind-controls-swarm sentence; sovereign's low weight (1) is honestly flagged as the weakest ("nothing in the source describes presence") | |
| `traits.pool` | | | |
| — `nocturnal: 5` | HONEST | rests on BOTH a planet-wide sentence (perpetual night) AND the art's own night-adapted features (slit eyes, big ears) — properly dual-sourced, not planet-only | |
| — `mind-sealed: 4` | HONEST | species-specific sentence ("controls swarm with its mind") | |
| — `slippery: 3` | HONEST | legacy evasion=high (relative gauge) plus art's light frame | |
| — `stealthy: 3` | UNSUPPORTED-leaning | Justification given is "a small dark-silhouetted flier... on a world of perpetual night per the planet history." This rests substantially on the planet-wide night sentence plus an art-color inference (the art is a black silhouette style used for every creature's line art, not necessarily evidence the animal itself is dark-colored/camouflaged — silhouette rendering is an art-asset convention, not fur/skin color data). This weight leans on a planet-wide sentence for what SKILL.md step 14 says a planet-wide sentence must never justify ("never a species trait weight or a behavior... a world of perpetual night does not make one species perceptive" — the rule's own example is nearly this exact case, substituting perceptive for stealthy). Flag as a rule violation risk. |
| — `perceptive: 2` | HONEST (low, disclosed) | correctly kept low, honestly noting no source sentence describes it finding hidden things | |
| — `menacing: 2` | HONEST (low, disclosed) | correctly low, tied to swarm's teeth with the honest caveat that no sentence describes an effect on courage | |
| — `solitary: 1` | HONEST | correctly the lowest weight, honestly noting neither source states solitary behavior | |
| `traits.guaranteed: []` | HONEST | no shell/plating (not armored), corporeal (not phasing), no ground-gripping (not anchored) — correctly empty | |

Authored fields section: present and reasonably complete. It lists `senses.smell`, most `capabilities` bands, `genome.chirality`, `size` bands, `attributes` band widths, `archetypeWeights` integers, `traits.pool` integers, `signatureAbility.intensity`, `anatomy.fangs`, and `lore.biomeNiche` wording. It does NOT separately flag `senses.special: psychic`, `communication: telepathic`, or `traits.pool.stealthy` as leaning on the same single overloaded sentence or a planet-wide sentence, even though each is defensible on registry letter — these are the report's main findings, not omissions from the Authored list per se (they are "sourced" values, just aggressively read ones), so their absence from Authored fields is technically correct but the over-reach is real.

## Step 6: signature checks

- Collision scan: grepped `docs/ability-catalog/consolidated-*.md` and `neutral-pools.md` for "Tetrahive" and "Unbidden Legion" — zero matches in any of the 14 consolidated element files or the neutral pool file. (Two hits for "Tetrahive" exist only in `anatomy-consolidated.md` and `anatomy-demand-sweep.md`, which are anatomy-registry working notes, not the ability-name catalog files the collision-check step names; they record Tetrahive as the worked example for the `swarm` predicate and are not name collisions.) Confirmed clean.
- Registry vocabulary: `swarm` (instrument), `cloud` (action) — both in SKILL.md's registries (5.6 swarm channel, 5.7 swarm's allowed actions include `cloud`). Correct.
- Medium: `dark` is the primary element, needs no affinity cover. Correct.
- Combat legibility without mechanics: "calls up a wheeling cloud... sets them on a single target as one mind... a familiar that is broken simply thins away into the black" — reads as flavor, no HP/damage/turn/stat vocabulary. Passes.

## Step 7: canon compliance

Checked across `.json`, `.md`, `.encyclopedia.json`:

- No gendered pronouns or lineage language (pronoun "it" used consistently; no mates/offspring/parents language). PASS.
- No spoken language attributed (communication channel is `telepathic`, not `vocal`-as-language; no dialogue or naming of a spoken tongue). PASS.
- Creating life / summoning: correctly treated under the section 2 familiar exception; "conjuring," "summons," "familiars," "conjured" language throughout, never "offspring" or "children." PASS.
- No teleportation, invisibility, puppeting, time reversal, or permanent transformation claimed anywhere in the three files. PASS.
- No crypto or mechanics vocabulary in any prose (verified: no "mint," no HP/damage/turn references after the FAIL was fixed). PASS.
- No em-dashes: scanned all three files, none found. PASS.

## Step 8: adversarial findings, descending confidence

1. **HIGH CONFIDENCE — `communication: telepathic` and `senses.special: psychic` both derive from the identical single source sentence** ("It controls the swarm with its mind, attacking or defending as one unit"), and that sentence describes an inward control channel over the creature's own conjured projections, not outward communication with another being or an independently-evidenced psychic sense. Using one sentence to license three separate fields (`instruments.mind`, `senses.special.psychic`, `communication.telepathic`) is the template's most aggressive read. Recommend Nick decide whether `communication` should instead be `[]` (mute, consistent with SKILL.md 5.5's rule that communication channels require an outward call/signal/scent/telepathic-to-others behavior, none of which is described) while keeping `mind` as an instrument justified directly by the swarm-control sentence without needing the `senses.special` detour.

2. **MEDIUM-HIGH CONFIDENCE — `traits.pool.stealthy: 3` rests on the planet-wide "perpetual night" sentence plus an art-rendering-style inference (black silhouette art), which is exactly the category of justification SKILL.md step 14 forbids** ("a world of perpetual night does not make one species perceptive" is the rule's own worked example, structurally identical to using the same planet fact for stealthy here). `nocturnal` legitimately double-sources from both planet and art; `stealthy` does not have an equally independent second leg — art silhouette style is a rendering convention shared by every species template's art asset, not species-specific color data.

3. **MEDIUM CONFIDENCE — the description and encyclopedia clause linking the Tetrahive's swarm to "the same body of research that yielded organisms able to manipulate shadows to create copies of sentient life"** asserts a specific causal/kinship relationship between two Generator outputs that the planet source only lists side by side in an enumeration ("Xalians that could alter gravitational waves... Organisms that could seemingly 'erase' information... manipulate shadows to create 'copies' of sentient life, or blend into the darkness and 'phase out'"). Nothing ties the swarm ability to the shadow-copy line specifically over the gravity-bending or information-erasing lines. This reads as invented lineage dressed as connective tissue.

4. **LOW-MEDIUM CONFIDENCE — `anatomy.fangs`** is honestly flagged by the walkthrough itself as its weakest call and left as an open question; the art shows no teeth on the central body, and the only sourced teeth belong to the familiars. The instrument list correctly avoids double-counting (no `fangs` instrument), which limits the practical harm, but the anatomy key itself remains an over-claim as shipped.

5. **LOW CONFIDENCE — the "It hunts the thick, stalky undergrowth" clause** repurposes a planet-wide terrain sentence into a species-specific behavior verb ("hunts"). Minor; well within normal connective latitude and the sentence is otherwise sourced for location.

6. **LOW CONFIDENCE / DOCUMENTATION GAP, NOT A CANON ISSUE — the signature description's "thins away into the black"** clause is licensed by SKILL.md section 2's familiar rule rather than by a quoted source sentence, and the walkthrough does not explicitly separate "sourced" from "rule-licensed" for this specific clause the way it does elsewhere. The content itself is correct and required by the ruling; only the walkthrough's self-documentation is slightly less precise here than elsewhere.

## Verdicts

**Template (`tetrahive.json`): FAIL** — `anatomy.fangs` is an over-claim not supported by art or by the central creature's own body in the source text (teeth belong only to the familiars); `senses.special: psychic` and `communication: telepathic` both derive circularly from one sentence describing an inward control channel, with `communication: telepathic` in particular asserting an outward signaling capability the sources never show; `traits.pool.stealthy` leans on a planet-wide sentence in the specific way SKILL.md step 14 prohibits.

**Walkthrough (`tetrahive.md`): PASS with flags** — every quoted source string verified verbatim against `species.json` and `planets.json`; the art-reading paragraph is accurate against the PNG; the Script denials section honestly represents the log's FAIL/WARN history for its own runs and correctly disclaims the earlier different agent's runs; the Authored fields and Open Questions sections are present and substantially complete, including honest self-flagging of the `fangs` call as weakest. Flags: the description-clause research-lineage claim (finding 3) and the `stealthy` trait weight (finding 2) are not self-flagged as leaning on thin or planet-wide justification the way `fangs` is.

**Encyclopedia (`tetrahive.encyclopedia.json`): PASS with one flag** — correctly names the species in its first sentence (fixing the earlier WARN), stays within registry vocabulary, no mechanics or crypto language, no em-dashes. Flag: repeats the same unsupported research-lineage claim as the description (finding 3).
