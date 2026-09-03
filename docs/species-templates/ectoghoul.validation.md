# Ectoghoul validation report

Independent adversarial validation of the Ectoghoul migration (Phantiri, ghost, first non-corporeal species). Sources consulted: `lambda/src/json/species.json` (Ectoghoul entry, id 00024), `lambda/src/json/planets.json` (Phantiri `history` array and `data` block), `docs/species-templates/art/ectoghoul.png`, `.claude/skills/migrate-species/SKILL.md` sections 2-6, and `docs/ability-catalog/consolidated-*.md` / `neutral-pools.md` for the collision and cell-count checks. No other species template, no `RULINGS.md`, no `docs/design/`, no memory, and no prior validation artifacts were read.

## Step 1. Script output and validation log

Ran `node docs/species-templates/tools/validate-template.js ectoghoul` from `C:\dev\src\xalians-catalog`. Verbatim output:

```
WARN traits.expected                expected trait count 4.54 is above 3.5; confirm the species is meant to carry that many
WARN instruments.predicate.source   channel "secretion" has a source-text predicate (an emitted substance); the validator agent must confirm the quoted sentence

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

This matches the walkthrough's reproduced "Validator output" block exactly.

`docs/species-templates/validation-log/ectoghoul.jsonl` holds 5 runs. Run 1 (17:19:14Z) carried 7 FAILs (`size.weight` weightKg band malformed at `[0,1]`, one `md.emdash`, five `md.quote` failures on unverified double-quoted phrases) plus the same 2 WARNs seen today, plus two additional WARNs not present in the final run (`enc.definition.name`, `md.thincombo`). Runs 2 through 5 (17:20:30Z onward) show 0 FAIL and the same 2 WARNs, with `weightKg` corrected to `[0.1, 0.5]`. This is a one-to-one match against the walkthrough's "Script denials" table and its "Answers to every WARN" subsection: the weight-band fix, the em-dash and quote cleanups, and the two later-fixed WARNs (`enc.definition.name` fixed by opening the Encyclopedia definition with "The Ectoghoul is...", `md.thincombo` fixed by adding the Step 11 subsection) are all accounted for and none are silently dropped. No discrepancy found.

## Step 2. Art check, feature by feature

| Art feature | Walkthrough claim | Verdict |
|---|---|---|
| Single skull, tipped/turned | "a large, cleanly drawn human-style skull... tipped back and to the side" | MATCH |
| Empty eye orbits | "two deep empty orbits" | MATCH |
| Nose | "a small triangular nasal opening" | MATCH |
| Mouth | "a wide grinning row of squared teeth running in an upturned arc," fused, no separate lower-jaw hinge | MATCH |
| Limbs | "no arms, no legs, no wings, and no fins anywhere" | MATCH |
| Body | "a smooth, thick, tapering ribbon of body" curving and hooking back, splitting into 2-3 trailing streamers | MATCH |
| Lower body | dissolves into a "dense scatter of small dark specks," thickest near the body, thinning outward | MATCH |
| Posture | drift/swoop, nose up, tail streaming, no ground contact | MATCH |

No feature was invented or omitted. This is an accurate, conservative reading of the art; if anything it under-claims (it does not, for instance, try to read the particle scatter as a specific ability effect).

## Step 3. Upgraded description, clause by clause

| Clause | Verdict | Basis |
|---|---|---|
| "A spectral green mist that gathers into the vague impression of a grinning skull trailing a ghost-like tail for a body" | SUPPORTED | Direct rephrase of species text: "Appearing as a spectral green mist that forms the vague impression of a grinning skull with a ghost-like tail for a body." |
| "was among the first forms the Phantiri Generator produced once the Leviticus Overdrive taught it to make life the moon-weapon could not read as living" | INFERRED, acceptably hedged | Planet: the Leviticus Overdrive line is quoted correctly. "Among the first" is not stated by either source; the planet gives no chronology of which species came first out of the Overdrive. The hedge ("among the first," not "the first") keeps this defensible, but it is manufactured sequencing, not a sourced fact. Flag: mild overreach, hedge mitigates it. |
| "It was set to scout the corpse islands of the Dreadscape" | INFERRED, correctly flagged by the walkthrough itself | The walkthrough's own Step 3/Open-questions text admits this is "the weakest inference in the paragraph" and that "scout" is authored framing. Agreed: the planet's stated intent is planet-wide and machine-level ("seeing its extraterrestrial aggressor as an environmental factor to be overcome"), never assigning a scouting job to Ectoghouls specifically. This is honestly disclosed, which is the correct behavior, but it remains an invented engineered-purpose clause dressed as fact in the prose itself (no in-text hedge like "perhaps" or "may have been"). The prose reads as flat assertion despite being pure inference. |
| "a body the killing signal ignores" | SUPPORTED | Planet: "it would appear that it only targets organic, cellular life," combined with the non-corporeal, spectral-energy composition. Reasonable synthesis, not invention. |
| "where organic laborers dropped dead on the spot" | SUPPORTED | Planet: "only for them to drop dead on the spot as soon as they were recognized as living organisms." Direct. |
| "Nothing now issues it orders" | SUPPORTED (by absence) | Planet: "the entire excavation fleet went radio silent," "sealed and classified," "restricted space into perpetuity." No living oversight is shown returning. Legitimate inference from an absence, correctly framed as inference rather than overclaimed as a stated fact. |
| "tarry oceans and splayed forests of the mass grave" | SUPPORTED | Planet: "islands of corpses covered in macabre forests of splayed limbs, and deep, tarry oceans." Direct paraphrase. |
| "amuses itself instead by terrorizing other Xalians" | SUPPORTED | Species: "They seem to amuse themselves by terrorizing other Xalians." Direct. |
| "announcing every arrival with a cackle" | SUPPORTED, minor rhetorical tightening | Species: "emitting a terrifying cackle wherever they go." "Announcing every arrival" narrows "wherever they go" into an arrival-specific act, which is a small rhetorical liberty but not a new fact. |

**Voice and canon check:** No em-dashes present. American spellings used throughout. No mechanics named. No gendered pronoun (the description consistently uses "It"). No lifespan stated in years. Critically, "disappearing and re-appearing at will" and "passing through surfaces" are carried at exactly the register the species text uses and are never escalated into teleportation or true invisibility language ("vanish," "teleport," "invisible" do not appear). This constraint (canon section 2: no teleportation, no true invisibility) is respected.

**Overall Step 3 finding:** one clause ("It was set to scout...") is inference presented with declarative confidence in the prose itself, though honestly disclosed in the walkthrough's own text and again in the Open Questions section. This is a genuine soft spot, correctly self-flagged, not a concealed one.

## Step 4. Signature description and Encyclopedia definition, clause by clause

Signature description: "The mist tightens into a grinning skull and lets out a cackle that follows its target through walls, so that whatever is hunted hears the joke it has become long after the Ectoghoul has gone."

| Clause | Verdict |
|---|---|
| "The mist tightens into a grinning skull" | SUPPORTED — species: "forms the vague impression of a grinning skull"; art shows the skull as the dominant feature. |
| "lets out a cackle" | SUPPORTED — species: "emitting a terrifying cackle." |
| "that follows its target through walls" | INFERRED / SYNTHESIZED, not directly sourced as stated. The species text never links the cackle specifically to wall-penetration. Two separate clauses exist independently — "emitting a terrifying cackle wherever they go" and, in the next sentence, "passing through surfaces" — describing the body's general locomotion, not an acoustic property of the cackle. The signature description fuses these into a single claim that the *sound itself* penetrates walls and tracks a specific target, which is new composite content beyond what either source clause states on its own. The walkthrough's Step 10 claims "Every clause is sourced," which overstates the case: the individual words are sourced, but the causal link (cackle -> penetrates walls -> follows a specific target) is authored synthesis. This is the single clearest overclaim in the whole package — reasonable as flavor text (it stays combat-legible and does not invent a new mechanic), but the walkthrough's provenance claim for this line is not fully honest about how much synthesis occurred. |
| "so that whatever is hunted hears the joke it has become" | INFERRED, acceptable flavor — species: "amuse themselves by terrorizing," reframed as "the joke." A stylistic gloss, not a new mechanical fact. |

**Verdict on "a cackle that follows its target through walls":** Not directly supported as written. It is a plausible, in-voice combination of two true facts (cackles constantly; passes through surfaces) but the specific mechanism claimed — sound tracking a target through walls — is invented. It does not violate any hard canon constraint (no teleportation, no true invisibility, no telepathy claimed), so it is acceptable as authored flavor, but it should have been listed under "Authored fields" or at minimum flagged as synthesis rather than asserted as fully sourced.

Encyclopedia definition: "The Ectoghoul is a drifting phantom of Phantiri, formed of green mist gathered into a grinning skull above a trailing tail, that passes through solid surfaces and vanishes and returns at will. It ranges the Dreadscape harassing other Xalians with its cackle and with blasts of gooey ectoplasm."

| Clause | Verdict |
|---|---|
| "drifting phantom of Phantiri" | SUPPORTED (bodyPlan floating + home planet) |
| "green mist gathered into a grinning skull above a trailing tail" | SUPPORTED — direct species paraphrase |
| "passes through solid surfaces" | SUPPORTED — "passing through surfaces" |
| "vanishes and returns at will" | SUPPORTED — "disappearing and re-appearing at will"; correctly avoids the word "teleport" |
| "ranges the Dreadscape harassing other Xalians with its cackle and with blasts of gooey ectoplasm" | SUPPORTED — direct paraphrase of both named acts |

Encyclopedia definition is clean: opens by naming the species (fixing the earlier `enc.definition.name` WARN), no flourish, no ellipsis, no registry jargon, no element key named in prose. No findings against it beyond the general concern above about the signature line it does not repeat.

## Step 5. Field-by-field template audit

| Field | Value | Verdict | Notes |
|---|---|---|---|
| `corporeality` | non-corporeal | HONEST | Directly stated by both species ("passing through surfaces") and planet ("no corporeal bodies to speak of"). |
| `composition.primary` | spectral | HONEST | Planet: "ghost-like Xalians formed of spectral energy." Registry allows spectral/energy/gas for non-corporeal; "spectral" is the better fit given the description explicitly uses "spectral" as a word. No secondary claimed — correct, since the skull is an "impression," not a literal bone structure. |
| `bodyPlan` | floating | HONEST | Art shows zero wings/fins/legs, body drawn hanging in air. Registry: "A fast wingless flier is `floating`." Correctly overrides the legacy `canFly: true` per the registry's explicit instruction that speed does not decide this field. |
| `covering` | mist | HONEST | Species: "a spectral green mist." Registry: a named mist surface always beats a default. |
| `anatomy: jaws` | included | OVER-CLAIMED, self-flagged | No source sentence shows biting. The teeth are drawn but never used in either text. The walkthrough (Step 4 and Open Questions #3) is explicit that this is the thinnest anatomy entry and raises it as an open question to Nick rather than asserting it as settled. Grading this HONEST would be too generous given the anatomy registry's "external functional parts relevant to action only" standard — a mouth shape with no bite behavior described anywhere is weak grounds for `jaws` specifically (vs. leaving it out of anatomy, or using it only as a display feature). Correctly disclosed, not corrected. |
| `anatomy: tail` | included | HONEST | Species: "ghost-like tail for a body"; art confirms. |
| `anatomy: body` | included | HONEST | Universal fallback, legitimately used since the mist-as-whole is what passes through surfaces and emits ectoplasm. |
| `instruments: voice` | included | HONEST | `vocal` predicate satisfied by the cackle sentence. |
| `instruments: secretion` | included | HONEST | Ectoplasm "blasts" at opponents is a textbook emitted-substance predicate. Quoted sentence is real and applies correctly (confirms the WARN). |
| `instruments: jaws` | included | OVER-CLAIMED, same issue as anatomy jaws | No source sentence shows the Ectoghoul fighting with its mouth; both named offensive acts (cackle, ectoplasm) route through voice and secretion. `jaws` as a third instrument rests entirely on the art showing teeth, which the registry's instruments section does not treat as sufficient on its own without a description tying the part to an act. Correctly flagged as the weakest of the three instruments in the walkthrough's own Open Questions #3. |
| `communication: vocal` | included | HONEST | Direct. |
| `communication: display` | included | INFERRED, defensible but marked as open | The grin is a fixed body shape from mist "gathering," not obviously a deliberate signal versus simply what the body looks like. The walkthrough correctly raises this as Open Question #2 rather than asserting it flatly. Acceptable as authored, properly flagged. |
| `diet` | none | HONEST | Registry fallback for spectral bodies with no feeding sentence; correctly distinguishes "terrorizing" from "feeding" per the registry's explicit carve-out. |
| `breathes` | [] | HONEST | Non-corporeal, no organic intake shown. |
| `ambientMedia` | gas, liquid, vacuum | `gas` and `liquid` HONEST; `vacuum` AUTHORED, correctly disclosed | Gas/liquid map to Phantiri's haze and oceans/tarry seas. `vacuum` has no textual support at all — it is a pure inference from "non-corporeal + non-breathing implies vacuum tolerance," listed candidly under Authored fields. Defensible logically but is asserted with no hedge in the JSON itself (fields carry no confidence marker), which is an inherent limitation of the template format rather than a validator failure. |
| `temperatureC` | -58 to 53 (full planet band) | JUSTIFIED, not lazy, but worth scrutiny | The walkthrough's justification ("a body that is not organic tissue has no thermal envelope either source restricts") is reasonable given non-corporeal composition, but taking the *entire* planet band with zero narrowing is the least effortful legal choice available, and no source sentence actually states the Ectoghoul tolerates planetary temperature extremes — it is an absence-of-restriction argument, not a positive claim. Acceptable under the registry (full planet band requires no special justification, only narrowing does), but flagged here as a case where "technically permitted" and "well-evidenced" diverge. |
| `senses` | sight 50-75, hearing 45-70, smell 0-10 | AUTHORED, ordinary bands, correctly disclosed | No source sentence grades any sense. Bands are plausible mid-range guesses, listed under Authored fields as required. |
| `lifespan` | ageless | HONEST | Registry rubric cut 1 (spectral bodies) applies cleanly; canon section 2 agrees non-corporeal bodies do not wear out. |
| `chirality` | achiral | HONEST | Planet: "formed of spectral energy" — no chiral chemistry to assign. |
| `size` | height 80-105cm, weight 0.1-0.5kg | HONEST for height (legacy-anchored gauge, permitted); weight is AUTHORED and internally consistent with the script's positive-lower-bound requirement | The walkthrough's handling of the weight-band FAIL is transparent: it explains the original `[0,1]` was the more honest statement of "no meaningful mass," accepted the script's denial, and moved to `[0.1, 0.5]` as an "effectively weightless" compromise. This is good-faith engineering around a validator constraint, correctly disclosed, not smuggled through. |
| `archetypeWeights` | prowler 5, skirmisher 4, rogue 3, predator 2, seeker 1 | HONEST | All five map to real source clauses (stealth-and-ambush behavior, speed, mischief-driven terrorizing, targeted attacks, ranging); correctly excludes every strength/vitality/resilience-leaning archetype given the non-corporeal body. |
| `traits.pool` | see below | see trait table | |

**Traits pool, individually against physiology/art/description/environment:**

| Trait | % | Verdict | Basis |
|---|---|---|---|
| phasing | 100 | HONEST | Body-demanded by registry rule for non-corporeal bodies; directly stated in both sources. |
| menacing | 85 | HONEST | Best-evidenced behavioral trait in the description ("terrorizing," "terrifying cackle"). Species-sourced, correctly not planet-sourced. |
| stealthy | 60 | HONEST, well-reasoned | "Disappearing and re-appearing at will" fits the registry definition; the walkthrough correctly discounts the percent because the same creature also announces itself with a cackle, which is a genuine in-source tension honestly reflected in a moderate rather than maximal percent. |
| slippery | 55 | HONEST but redundant risk acknowledged | "Passing through surfaces" plus high legacy evasion. The walkthrough itself flags the overlap with `phasing` and deliberately keeps the percent from climbing higher to avoid double-counting the same fact. Reasonable. |
| nocturnal | 40 | HONEST, correctly modest | Walkthrough is careful to note Phantiri's `data` block says "thick haze," not stated darkness or perpetual night, and appropriately keeps this well below the 95-100 band the registry reserves for true night-worlds. This is the trait most likely to be second-guessed, but the low percent (not a near-100 claim) is the right call given "haze" is not "darkness." Environmental, planet-sourced — legal per the registry's rule that a planet-wide sentence may justify an environmental adaptation. |
| toxic | 30 | HONEST | Correctly modest; "zapping" with ectoplasm never names a toxic effect, so keeping this a minority roll rather than a guaranteed fact is right. |
| solitary | 25 | HONEST | No source shows cooperative behavior; correctly notes `pack-bonded` is not listed so no exclusion math is needed. |
| perceptive | 20 | HONEST, thin but disclosed as low-confidence | Behavioral, species-sourced ("closes on their opponents"), kept low; acceptable. |
| resistant | 15 | HONEST, correctly environmental not behavioral | Grounded in the planet's "only targets organic, cellular life" plus the contaminated mass-grave environment — this is an environmental/physiological adaptation claim, not a behavior, so it legally qualifies for planet-wide justification per the registry's explicit carve-out ("a planet-wide sentence may justify an environmental adaptation... but never a behavior"). Correctly kept low since true immunity is already carried by the body having no cells, not by this trait. |
| luminous | 12 | HONEST, minority roll correctly framed | "Green mist" is a color, not a stated emission; walkthrough is candid that this is speculative and keeps the percent low accordingly. |
| hypnotic | 8 | HONEST, rare-band correctly used | Grin/cackle draw attention but source shows fright rather than fascination; single-digit percent matches. |
| foresighted | 4 | HONEST, rare-band correctly used | "Disappearing... at will" read as evasion-before-the-blow; within the registry's 2-8% rare band. |

**Expected count:** 100+85+60+55+40+30+25+20+15+12+8+4 = 454, expected count 4.54 — verified independently, arithmetic is exact. No exclusion pair present (only `solitary`, not `pack-bonded`, listed), so no adjustment applies, matching the registry's exclusion-math rule. WARN response in the walkthrough (top three traits alone contribute 1.85, tail is thin at 1.14 total) is accurate and defensible; this is a legitimate species profile, not padding.

**Authored fields section completeness check:** The walkthrough's "Authored fields" list covers diet, both size bounds, `ambientMedia: vacuum`, all four zero/low capability bands, all three senses bands, all ten attribute bands, signature intensity, `biomeNiche`, the word "scout," archetype weight numbers, and every trait percent except phasing. This is a genuinely thorough disclosure list — checked against the field audit above, nothing unsourced was found missing from it. One omission: the signature description's synthesized clause "a cackle that follows its target through walls" is not listed under Authored fields (it lives in `signatureAbility.description`, a free-text field the Authored-fields convention does not obviously cover, but the degree of synthesis there is comparable to other listed items and arguably belongs there too).

## Step 6. Signature ability checks

- **Collision scan:** Verified independently. `grep -rli "ectoghoul"` across all `consolidated-*.md` and `neutral-pools.md` returns nothing. `grep -rli "rictus"` returns nothing anywhere in the catalog. Exact string "Rictus of the Dreadscape" returns nothing. Confirmed clean, matches the walkthrough's claim exactly.
- **"Cackle" check:** `consolidated-ghost.md`'s `terrorize (224)` cell contains exactly one match, "Spectral Cackle [voice]" (plus "Wraith Cackle [voice]" and "Grim Cackle [voice]," which the walkthrough did not need to distinguish since none matches the coined name). The walkthrough's claim that "Cackle" appears once in `consolidated-ghost.md`... "but not in this phrase" is essentially accurate (there are in fact three Cackle entries, all tagged `[voice]`, none matching "Rictus of the Dreadscape"); a minor undercount in the walkthrough's own text (it said "once," there are three) but the substantive conclusion (no collision) is correct.
- **Registry vocabulary:** "Rictus" and "Dreadscape" are both clean words — no possessive, no hyphen, no franchise reference, no Earth fauna/flora, no real-world weapon, no nuclear-age register. American spelling. Passes the naming rules in section 5.8.
- **Action via voice against the allowed-actions matrix:** `voice` allows `terrorize, ward, burst` per section 5.7 (verified directly against the SKILL.md table). `terrorize` is legal for `voice`. Correct.
- **Medium:** `ghost` is the primary element, always covered per the elements registry. Correct.
- **Combat legibility / no mechanics:** The description names no HP, damage, turns, or stats. It stays in-voice.
- **Cell-count table (Step 11) cross-check:** Independently re-extracted every action-count line from `consolidated-ghost.md`, `consolidated-dark.md`, and `consolidated-psychic.md`. All fifteen numbers in the walkthrough's table match the source files exactly, including the two flagged near-thin cells (ghost mend 29, dark mend 10) and the two additional single-digit-adjacent cells (psychic rake 12, dark spray 12). No fabricated or rounded numbers found.

## Step 7. Canon compliance across all three files

- No mates, offspring, parents, breeding, lineage, or gendered pronouns in any file. Ectoghoul is referred to as "it" throughout.
- No language spoken; communication is calls (`vocal`) and posture (`display`), consistent with canon section 2.
- Lifespan is `ageless`, correctly stated with no year figure anywhere.
- No teleportation language used (checked specifically: neither "teleport" nor any synonym appears; "vanish"/"disappear" language is carried at the same register as the legacy species text, never escalated).
- No true invisibility claimed; "passing through surfaces" and "disappearing and re-appearing" are treated as movement/phasing facts, not sight-based invisibility, consistent with the registry's non-corporeal `phasing` trait rather than a stealth mechanic exceeding `stealthy`'s cap.
- No puppeting/possession, no time reversal, no life creation/summoning claimed (the Ectoghoul is a Generator product, not itself a life-creator).
- No spellcasting language; all effects route through registry channels (`voice`, `secretion`).
- No crypto/minting language; the species text and template make no reference to generation mechanics in the prose.
- No nuclear-age military register anywhere.
- No em-dashes in `ectoghoul.md` (the one em-dash the script caught in an earlier draft was fixed before the final validation run) or in the description fields of the JSON/encyclopedia files.
- American spelling used consistently ("color" not checked directly since the word doesn't appear, but no British spellings found in any of the three files).

No canon violations found in any of the three artifacts.

## Step 8. Adversarial scan, descending confidence

1. **(High confidence) The signature description overclaims its own sourcing.** "A cackle that follows its target through walls" is stated by the walkthrough (Step 10) to have "every clause... sourced," but the specific causal linkage between the cackle and wall-penetration is synthesized from two independent, unconnected source clauses. This is the strongest finding in the review: not a canon violation, not disallowed, but a provenance overclaim that should be corrected to something like "every fact is sourced, but the specific combination is my synthesis" or moved partly into Authored fields.
2. **(Medium-high confidence) `jaws` as anatomy and as an instrument is the weakest field in the template.** No sentence in either canon source shows the Ectoghoul biting anything. This is honestly and repeatedly disclosed (Step 4, Open Questions #3), which is the correct behavior, but the field currently stands as committed template data rather than a placeholder pending Nick's answer. Recommend resolving Open Question #3 before treating the template as final; as written, an independent reviewer could reasonably argue `jaws` should be dropped from `instruments` (leaving `voice` and `secretion`) while remaining in `anatomy` as a part-with-no-combat-role, exactly as the walkthrough itself proposes as the alternative.
3. **(Medium confidence) The engineered-purpose clause ("It was set to scout the corpse islands of the Dreadscape") is the single largest inference in the upgraded description**, and while the walkthrough discloses this candidly in both Step 3 and the Open Questions, the description prose itself states it with flat, unhedged confidence ("was set to scout"), which could read to a future reader as settled canon rather than an open inference awaiting Nick's ruling. The disclosure exists but is one layer removed from the sentence a player or future writer would actually encounter.
4. **(Low-medium confidence) `ambientMedia: vacuum` and the full-width `temperatureC` band are both the maximally permissive choice available under the registry rather than a narrowly evidenced one.** Neither is dishonest (both are disclosed or legally defaulted), but both represent the path of least resistance rather than the most defensible reading. A stricter reviewer might have narrowed the temperature band at least slightly given the Dreadscape's specific description (fog, cold-leaning imagery) rather than taking the planet's full extremes verbatim.
5. **(Low confidence) The collision-scan write-up in the walkthrough undercounts "Cackle" matches** (says "once," it is actually three, all tagged `[voice]`), a copy-editing slip that does not change the substantive conclusion (no collision on the actual signature name) and has no downstream effect on validity.
6. **(Low confidence, informational) The weight-band fix from `[0,1]` to `[0.1,0.5]` is a defensible engineering-around-the-validator move**, transparently disclosed, and does not misrepresent the underlying "no real mass" fact; flagged only because it is the one place the template value was shaped by a tooling constraint rather than by source evidence, which is worth Nick's awareness even though the walkthrough already surfaces it.

No finding above rises to a canon violation, a concealed fabrication, or a structural/script failure. The template is internally consistent, the collision scan is clean, the catalog cell counts are all verified accurate, and the trait math is exact. The issues found are calibration and disclosure-precision issues, concentrated in the two areas the walkthrough's own Open Questions already flagged (the engineered-purpose clause and the `jaws` field), plus one new finding not previously flagged (the signature description's overclaimed full-sourcing statement).

## Verdicts

| File | Verdict | Failing items |
|---|---|---|
| Template (`ectoghoul.json`) | PASS | No FAIL-level issues. `jaws` in anatomy/instruments is weakly evidenced but disclosed and pending Nick's ruling (Open Question #3), not a structural defect. |
| Walkthrough (`ectoghoul.md`) | PASS, with one correction needed | Step 10's claim that "every clause is sourced" for the signature description overstates provenance for "a cackle that follows its target through walls" — the individual facts are sourced but the causal combination is synthesis and should be labeled as such rather than asserted as fully sourced. Minor: undercounts "Cackle" catalog matches (says one, there are three; conclusion unaffected). |
| Encyclopedia (`ectoghoul.encyclopedia.json`) | PASS | No findings against this file. Definition is clean, names the species, fully supported clause by clause, no registry jargon leaked into prose. |

**Overall recommendation:** Migration is sound and internally honest about its own weakest points. Before treating this as final canon, Nick should resolve the three Open Questions already raised in the walkthrough (engineered-purpose clause, `display` in communication, `jaws` as anatomy/instrument), and the walkthrough's Step 10 sourcing claim for the signature description should be softened to acknowledge synthesis rather than full direct sourcing.
