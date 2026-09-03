# Figzy independent validation

Validator agent, adversarial pass. Sources consulted: ONLY the Figzy entry in `species.json`, the Telypso entry in `planets.json` (full `history` array and `data` block), the artwork `docs/species-templates/art/figzy.png`, `migrate-species/SKILL.md` sections 2, 3, 4, 5.5, and 6, and the ability-catalog files (`consolidated-*.md`, `neutral-pools.md`) for the collision check. No other template, no `*-run.*`, no `*.validation.md`, no `RULINGS.md`, no `docs/design/`, no `CLAUDE.md`, no memory. No delegation. No git.

## Step 1: validator script

Rerun by me from `C:\dev\src\xalians-catalog`:

```
WARN signature.action.matrix        signature action "burst" is outside the allowed set for mind [snare, shove, hurl, crush, drain, ward, terrorize, mend] (allowed by rule 4; justify)

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\figzy.jsonl
```

This matches the walkthrough's `## Validator output` block exactly.

`figzy.jsonl` has 7 logged runs. Run 1 (17:52:24) raised two FAILs: `capabilities.flight` (scalar `0` instead of a `[lo,hi]` band) and `md.emdash` (an em-dash in the walkthrough's Authored fields bullet list). Runs 2 to 3 (17:52:33, 17:52:41) still carried the `enc.definition.name` WARN (Encyclopedia definition did not open by naming the species); by run 3 the `md.emdash` FAIL was gone but `enc.definition.name` persisted one run past the walkthrough's own claim that it was fixed on the "second run" — the walkthrough is loose about which run number fixed which item but its net claim (both FAILs fixed, both WARNs eventually resolved to one) matches the log. Runs 4 to 6 are stable at 0 FAIL / 1 WARN. Run 7 (17:54:57) carries a `note: "orchestrator: quote pairing fix"` and is identical in fails/warns to runs 4 to 6 — an orchestrator re-run after this validation began, not a change I made; noted per instructions, not reverted.

**Walkthrough's Script denials section vs. log: MATCHES.** Both denials (`capabilities.flight` shape error, `md.emdash` in the agent's own connective prose, not quoted source text) are real, correctly characterized as legitimate, and correctly not blamed on the script.

## Step 2: art reading, feature by feature

| Walkthrough claim | Art check |
|---|---|
| Single creature, upright on two legs | Confirmed. One body, bipedal stance. |
| Weight braced back on one leg, forelimbs raised free of the ground | Confirmed. Lunging/stepping posture, one leg forward, both arms up and away from the ground. |
| Hands: five-fingered, splayed, doing no weight-bearing work | Confirmed. |
| Head: two enormous ears flaring wider than the skull | Confirmed, ears are the widest feature of the silhouette. |
| Branched antlers rising from the crown | Confirmed, a slender forked rack on top of the head. |
| Two very large round eyes with bright highlights | Confirmed, crescent-style highlights visible. |
| Small blunt muzzle | Confirmed. |
| Tufted, ragged outline reading as a shaggy coat (ears, cheeks, chest, forelimbs, thighs) | Confirmed, the silhouette edge is jagged/tufted throughout rather than smooth. |
| Starburst floats separate from the body, in front of the raised hands, showing a projected release arriving at a short distance | Confirmed. The many-pointed hollow-centered burst sits apart from the hand, not touching it. |
| One body, no wings, no tail, no visible plating or shell | Confirmed. |

No overclaim found in the art paragraph. It is an accurate, literal description; nothing is invented that is not visible.

## Step 3: upgraded description, clause by clause

Legacy stub, quoted from `species.json`: "What this creature lacks in stature it makes up for with its incredible magical abilities. It is deceptively smart, yet known to be docile when it trusts you." Two sentences, `descriptionStatus: upgraded` is correctly triggered.

| Clause | Verdict | Basis |
|---|---|---|
| "A small antlered forager with outsized ears, wide unblinking eyes and a shaggy coat" | **PARTIAL / INVENTED on two words** | `small`: SUPPORTED (stub, "lacks in stature"). `antlered`, `outsized ears`, `shaggy coat`: SUPPORTED (art). `forager`: **INVENTED**. No sentence in either source and nothing in the art shows the Figzy gathering, eating, or scavenging anything; the template's own `diet: omnivore` is an Authored fallback with no source sentence (walkthrough's own Authored fields section admits this), so "forager" states a specific foraging behavior with zero backing, not a neutral omnivore label. `unblinking`: **INVENTED**. The art is a static flat silhouette; every creature drawn in this style has open eyes because it is a single frozen image, not a documented trait of this species' eyes. Nothing sourced supports blink behavior one way or the other. Calling this "wide unblinking eyes" imports a behavioral/visual claim (constant unblinking stare) the art cannot show and the text never states. |
| "carries in its raised hands more force than its stature admits" | INFERRED, fair | Stub: "incredible magical abilities" + art: raised open hands, starburst in front of them. Section 2's spellcasting ban forces "magical abilities" into a physical/projected register; "more force than its stature admits" is a reasonable restatement of "what it lacks in stature it makes up for," not a new fact. |
| "The Telypso Generator built it to counterbalance the unstable auras of the Vallerii marooned planetside" | SUPPORTED | planet: "...the Xalian Generator was forced to kick itself into gear when the most insane and demented of the Vallerii race began finding themselves marooned planetside. As if sensing their unstable auras, the Generator began churning out new forms of life, Xalians whose psychic energies could be used to counterbalance those of the brainsick creatures..." |
| "treating the prisoners as patients rather than removing them" | SUPPORTED | planet: "Instead, the Generator began to treat the prisoners as patients, hoping to cure them..." and "It would have perhaps seemed pertinent for the Generator to create Xalians tasked with removing such Vallerii..." (contrasted with "the code of the Generator... seemed intent on assimilating them into its fold"). |
| "one of the small psychic bodies that emerged from the fungal forests" | SUPPORTED / mild INFERRED | planet: "Soon, psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests..." `small` reasonably ties back to the stub's own stature claim rather than introducing a new fact; acceptable connective. |
| "to steady what the deranged left behind" | SUPPORTED | planet: "...their intrusive thoughts and erratic behaviors began to twist the world, leaving psychic impressions that had to be rectified in order to keep Telypso in harmony." |
| "It is deceptively smart and goes docile with anything it has come to trust." | SUPPORTED | stub, near-verbatim: "It is deceptively smart, yet known to be docile when it trusts you." |
| "The Nemesis Plague now turns the creatures of Telypso against one another" | SUPPORTED | planet: "The End Wars have brought the Nemesis Plague to Telypso's sanctuaries... Reverberating through its mushroom forests comes great waves of spiritual sorrow and suffering, tainting the creatures of Telypso and turning them against one another." |
| "and a Figzy that has settled on no one raises its hands at everything that moves." | **INFERRED, stretched — flag** | Built from the stub's trust condition (inverted) plus the plague sentence plus the art's raised-hands gesture. Passes the letter of the no-dramatic-sign-off test (plain present-tense fact, no staged scene, no metaphor, not a trailer line). But it overreaches its sources on scope: the plague sentence says creatures are turned "against one another" — i.e., hostility between Telypso's own Xalians — while "raises its hands at everything that moves" asserts indiscriminate reactivity to any movement at all, a broader and more universal claim the sources do not make. This is an editorial expansion, not a stated fact. Recommend narrowing to something scoped to other creatures/Xalians rather than "everything that moves." |

**Sign-off test results (last sentence of each of the three prose pieces):**

- Species description's last sentence (clause above): **PASSES the letter of the rule** (plain present-tense fact, no staged scene, no invented personification, no trailer cadence) but is flagged above for scope overreach beyond the source's "against one another."
- Signature description's last clause, "striking everything close to what it stopped trusting": **PASSES**. Plain present-tense description of the burst action reaching the target; ties directly to the stub's trust language. Not a metaphor, not a staged scene, not a banned pattern.
- Encyclopedia's last sentence, "It is quick to understand and slow to threaten, and it projects force from its raised hands at whatever it has stopped trusting.": **PASSES the sign-off test as a sentence-shape matter** (plain fact, no flourish) but see Step 4 for a definitional-register concern — "quick to understand and slow to threaten" is a paraphrase invention not directly voiced in either source (see below).

## Step 4: signature description and Encyclopedia definition, clause by clause

**Signature ability**, quoted: "The Figzy raises both hands and the force it has been holding back leaves them all at once, striking everything close to what it stopped trusting."

| Clause | Verdict |
|---|---|
| "raises both hands" | SUPPORTED (art: both hands up, open). |
| "the force it has been holding back leaves them all at once" | INFERRED, fair (stub's "incredible magical abilities" + art's starburst departing the hands; `burst` action per section 5.5 definition — "an outward release from the body that hits everything close at once" — matches the art's radiating hollow-centered starburst). |
| "striking everything close to what it stopped trusting" | **INFERRED, stretched — same overreach as the description's closing clause.** "Everything close" (an area-effect / indiscriminate-radius claim) is a reasonable rendering of the `burst` action definition itself (which the registry defines as hitting everything close at once), so this clause is arguably supported by the ability grammar rather than raw lore, which is a legitimate source of derivation per section 5.8 rule 1. "What it stopped trusting" ties to the stub. Verdict: SUPPORTED as ability-grammar-derived, not as a lore-only claim; acceptable but worth distinguishing from a pure lore quote in a future pass. |

**Encyclopedia definition**, quoted: "The Figzy is a small antlered forager generated by the Telypso Generator to counterbalance the unstable auras of the Vallerii prisoners marooned in the planet's fungal forests. It is quick to understand and slow to threaten, and it projects force from its raised hands at whatever it has stopped trusting."

| Clause | Verdict |
|---|---|
| "small antlered forager" | Same INVENTED flag on "forager" as the description (Step 3). |
| "generated by the Telypso Generator to counterbalance the unstable auras of the Vallerii prisoners marooned in the planet's fungal forests" | SUPPORTED, matches planet quotes. |
| "It is quick to understand and slow to threaten" | **INFERRED, loosely.** This is a paraphrase of "deceptively smart... docile when it trusts you," but "slow to threaten" reads as an invented behavioral gloss rather than a direct restatement: the stub says the creature is docile toward what it trusts, not that it is generally slow to escalate to threat. Combined with the description's closing clause (a Figzy with no trust bond "raises its hands at everything that moves"), the two documents are in mild tension: one paints an animal broadly slow to threaten, the other paints one that reacts to any movement once untrusting. Not a hard CONTRADICTION (they can both be true of different individuals: trusting Figzy are docile/slow-to-threaten, untrusting ones are reactive), but the Encyclopedia's blanket phrasing elides that conditionality and should either state the condition or be softened. |
| "it projects force from its raised hands at whatever it has stopped trusting" | SUPPORTED by the same chain as the description. |

Voice check: no em-dashes in any of the three files (confirmed by grep-equivalent read), American English throughout, present tense, no game mechanics named, no gendered/lineage language, no spoken language attributed to the Figzy. Encyclopedia register opens by naming the species and the category noun ("The Figzy is a small antlered forager..."), satisfying section 3's Encyclopedia rule and closing out the `enc.definition.name` WARN correctly.

## Step 5: field-by-field physiology audit

| Field | Value | Verdict | Notes |
|---|---|---|---|
| corporeality | `corporeal` | HONEST | Art shows a solid opaque body; nothing sources non-corporeality. |
| composition.primary | `flesh` | HONEST | Art: furred animal body, muscle/limb/muzzle. Correctly not `energy` despite psychic element (5.5 rule: element never decides physiology). |
| bodyPlan | `biped` | HONEST | Forelimb test applied correctly: art shows forelimbs free of the ground, ending in open hands — the exact 5.5 selection-rule trigger for `biped`. Confirmed against the art myself; hands are clearly not weight-bearing. |
| covering | `fur` | HONEST | Art outline is tufted/shaggy along ears, cheeks, chest, forelimbs, thighs — matches the 5.5 test ("the art shows a surface only when the outline itself is drawn as that surface... tufted or shaggy edges for fur"). Confirmed directly against the image. |
| anatomy: antlers | present | HONEST | Art: branched rack, matches 5.6 definition exactly. |
| anatomy: claws | present | **OVER-CLAIMED, but self-flagged** | Art shows open, splayed digits, not hooking/raking claws per the 5.6 definition ("hooking or raking digits"). The digits in the art look like an open five-fingered hand reaching for a psychic burst, not claws in a fighting posture. The walkthrough itself flags this in Authored fields ("the digits are visible but the sources never name them fighting") — so the disclosure requirement is met, but the anatomy key itself is a stretch against the strict 5.6 definition; "fingers" or "hands" is not a registry key, so `claws` may be the least-bad available label, but it is doing real mechanical work (it gates `manipulation` above 40, and it makes `claws` a listed instrument with strike/rake/crush/shove/ambush actions) on a body the art never shows fighting or gripping anything with those digits. Flag for orchestrator: this is the shakiest anatomy key in the template. |
| anatomy: hide | present | HONEST | Correct application of the one-surface-key rule; `shell` correctly absent since no armor is shown. |
| anatomy: body | present | HONEST | Section 8 universal fallback, correctly applied per the explicit species list in section 8. |
| size | 95-125cm, 34-52kg | HONEST | Legacy figures (116cm/48kg) used only as a relative gauge per operating rule 6; proposed band brackets the legacy midpoint reasonably. |
| lifespan | `standard` | HONEST | Correctly walks the 5.5 cut sequence: flesh body, mass midpoint 43kg falls in the 20-200kg standard band, no "cold/slow/long-lived" adjustment claimed (correctly, nothing sources one), no harshness cut applied (correctly, no source says Telypso shortens Xalian life spans specifically — the "screams in psychic pain" sentence is about present-day plague suffering, not a stated lifespan effect, so withholding the harshness cut is the right call). |
| diet | `omnivore` | HONEST, disclosed | Correctly the 5.5 fallback for a flesh body with no feeding sentence in either source; correctly listed in Authored fields. |
| communication: telepathic | present | HONEST | planet: "psychic Xalians capable of targeting and influencing emotion, thought, and perception... creatures that could enter dreams or induce hypnosis" is a reasonable basis for `telepathic` (direct impression on another mind). |
| communication: display | present | HONEST | Art: raised hands, flared ears, braced posture is a posture/gesture signal per the 5.5 `display` definition. |
| breathes / ambientMedia | `[gas]` / `[gas]` | HONEST | planet `data` block Terrain includes "Flourescent Mist," history describes "humid, smothering mists" — atmosphere is sourced. |
| temperatureC | 12-44 | HONEST, inside range | Planet data block: Low 7°C, High 65°C (note: source text shows "7 \u00b0C" — mangled encoding in the raw JSON, actual value is 7°C to 65°C as the walkthrough states). Band sits inside range as required. |
| capabilities: flight [0,0] | HONEST | No wings, biped, corporeal — correctly zero per 5.5 rule. |
| capabilities: swim, burrow, climb, leap | 10-30 / 0-10 / 35-60 / 40-65 | HONEST, disclosed | All correctly under the 60-upper-bound threshold that would otherwise require a source sentence; correctly listed in Authored fields. |
| capabilities: manipulation 45-70 | **OVER-CLAIMED (downstream of the claws flag)** | Gated on `claws` in anatomy per the 5.5 rule ("upper bound above 40 needs grasping anatomy... or telekinetic at 100"). Since the `claws` key itself is shaky (see above), this band's justification inherits that weakness. If `claws` is downgraded or removed, this band's upper bound of 70 would no longer be licensed by the registry rule. |
| senses: sight 55-80, hearing 65-90, smell 30-55 | HONEST | Sight/hearing bands tied directly to the art's oversized eyes and ears (visually obvious, correctly the dominant facial features); smell correctly disclosed as authored/moderate from the muzzle. |
| senses.special: psychic | present | HONEST | planet quote on "targeting and influencing emotion, thought, and perception" supports sensing minds directly, satisfying both the `psychic` special-sense definition and the `mind` channel predicate. |

**Authored fields section completeness:** checked against the field-by-field audit above. The walkthrough's Authored fields list covers diet, `claws`, `body`, `hide`, the four capability bands, smell, size, all ten attribute bands, chirality, biomeNiche phrasing, intensity band, and every trait percent. This is thorough and honestly matches what has no direct source sentence. One omission: `communication: display` is justified purely from the art (posture/gesture), which the walkthrough treats as sourced ("art:" citation) rather than authored — this is consistent with how the skill treats art citations elsewhere (as sourced, not authored), so it is not a disclosure gap, just worth noting the line is thin.

## Step 6: signature ability audit

- **Collision scan:** independently reproduced. `grep -i "figzy"` and `grep -i "small hands"` across all `consolidated-*.md` and `neutral-pools.md` return zero hits. Two adjacent files (`anatomy-consolidated.md`, `anatomy-demand-sweep.md`) do mention Figzy, but those are analysis/planning documents outside the `consolidated-<element>.md` / `neutral-pools.md` naming pattern this step is scoped to, and their content (both call for a `mind` channel plus authored `body` fallback, "purely non-physical... zero physical anatomy") actually corroborates the template's instrument choice rather than contradicting it. **Verdict: no collision, claim confirmed.**
- **Registry vocabulary:** `mind` and `burst` are both valid registry terms (5.5, 5.6). Confirmed.
- **Action burst on mind, outside the matrix:** Confirmed against section 5.7's `mind` row: `snare, shove, hurl, crush, drain, ward, terrorize, mend` — `burst` is indeed absent. Rule 4 (section 5.8) permits an instrument/action pairing outside the matrix for a signature specifically. The walkthrough's justification (the art shows a radiating, hollow-centered burst rather than a held crush or a thrown hurl) is genuine: I independently examined the art and the starburst does read as an omnidirectional release, not a directional line (ruling out `beam`) or a thrown solid (ruling out `hurl`). The justification is real, not a rationalization to avoid reworking the concept — a reasonable in-matrix alternative (e.g., `crush` or `drain`) would visibly misdescribe the art's radiating shape. **Verdict: justified.**
- **Medium psychic:** primary element, cover satisfied trivially.
- **Combat-legible, no mechanics:** confirmed, no HP/damage/turn language in the description.

## Step 7: canon compliance across all three files

- No gendered/lineage language: confirmed (pronoun "it" throughout, no mates/offspring/parents).
- No spoken language: confirmed, communication is telepathic/display only, no dialogue or naming of speech.
- No forbidden powers (section 2): no teleportation, no true invisibility, no possession, no time reversal, no life creation/summoning claimed. The projected force is correctly kept as a `mind`-channel burst, not framed as spellcasting.
- No crypto/mechanics vocabulary: confirmed, no mint/generate-as-crypto language, no stat/HP/turn words.
- No em-dashes: confirmed across `figzy.json` prose fields, `figzy.md`, and `figzy.encyclopedia.json` (the walkthrough's own em-dash instances were in its own connective bullets and were fixed per the Script denials section; the verbatim planet quotes correctly retain the source's en-dashes/hyphens, which the script correctly does not flag since those are quotations, not authored prose).
- American English: confirmed (no "colour," "-ise" endings, etc.).

## Step 8: adversarial scan, descending confidence

1. **"forager" in both the description and the Encyclopedia definition is unsourced invention (confidence: high).** Neither `species.json` nor the Telypso planet history contains any statement about the Figzy eating, gathering, or foraging. The template's own `diet: omnivore` is explicitly an Authored fallback with zero source sentence. Calling the creature "a forager" states a specific behavioral fact (active food-gathering) that nothing in the allowed sources supports, and it appears in TWO of the three prose deliverables (description and Encyclopedia), compounding the issue. This should be replaced with a non-behavioral descriptor (e.g., a plain body-shape appositive) or removed.

2. **"wide unblinking eyes" imports an invented visual/behavioral detail (confidence: high).** The art is a static silhouette; "unblinking" cannot be shown by a single frozen image, and no source sentence addresses blinking. This reads as flavor invented for effect, not derived from either source.

3. **The description's closing clause ("raises its hands at everything that moves") and the signature's closing clause ("striking everything close to what it stopped trusting") both broaden the plague sentence's scope from "against one another" (Xalian-on-Xalian hostility) to an indiscriminate, universal reactivity claim (confidence: medium-high).** This technically passes the mechanical sign-off test (plain present tense, no staged scene) but is a real scope overreach that a strict adversarial read should flag as going beyond "expand what they say" into new territory the source does not state. The `burst` action's own registry definition ("hits everything close at once") partially rescues the signature's version as ability-grammar-derived rather than lore-only, but the description's version has no such cover.

4. **`claws` anatomy key is the weakest field in the template (confidence: medium).** The art shows an open, splayed, empty hand reaching toward a psychic effect, not a gripping or fighting gesture. `claws` per the 5.6 definition means "hooking or raking digits," which is a stronger claim than "the digits are visible" (the walkthrough's own hedge). This key does mechanical double duty: it becomes a listed instrument (with strike/rake/crush/shove/ambush actions available to rolled abilities) and it licenses the `manipulation` capability band above 40. Both downstream effects are more consequential than the walkthrough's brief hedge acknowledges. This is disclosed, not hidden, which is the mitigating factor, but it should be reconsidered against a plainer key like `hands`-adjacent framing under `body`, or explicitly narrowed in scope if kept.

5. **Encyclopedia's "quick to understand and slow to threaten" is a soft paraphrase invention, in mild tension with the description's own closing clause about untrusting individuals (confidence: medium-low).** Not a hard contradiction since both can be true conditionally, but the Encyclopedia states it as an unconditional trait while the description conditions it on trust, and neither source states "slow to threaten" as such.

6. **Minor: the walkthrough's own account of exactly which run number retired the `enc.definition.name` WARN is imprecise relative to the raw log (confidence: low, cosmetic).** Not a defect in the artifacts themselves, just a loose narrative detail in the walkthrough's WARN-answers section.

No CONTRADICTED claims were found (nothing in the three artifacts states a fact the sources directly negate). All flagged items are UNSUPPORTED/OVER-CLAIMED-by-degree rather than outright fabrications contradicting canon.

## Verdicts

**Template (`figzy.json`): PASS**, with one flagged field. `capabilities.flight` shape and structural constraints all validate (0 FAIL confirmed by independent script run). The `anatomy: claws` key (and its downstream `manipulation` band and instrument listing) is the one substantive judgment call worth an orchestrator second look, but it is disclosed in Authored fields and is not a canon violation.

**Walkthrough (`figzy.md`): FAIL**, on the following items:
- "forager" in the upgraded description: unsourced invented behavior, appears uncaptioned as if derived (it is presented inline in the description's clause table as sourced from the stub's stature language plus art, when in fact no source supports "foraging" specifically).
- "wide unblinking eyes": unsourced invented detail, not flagged anywhere in the walkthrough as an inference or authored addition.
- Description's closing clause scope overreach ("everything that moves" vs. sourced "against one another"): not flagged as an expansion beyond the sources in the walkthrough's own clause table, which claims "no new fact is introduced" when in fact the scope is broadened.

**Encyclopedia (`figzy.encyclopedia.json`): FAIL**, on the following items:
- "forager": same unsourced invention as the description.
- "quick to understand and slow to threaten": unconditional paraphrase not stated in source, in mild tension with the description's own conditional framing.

## Recommendation

Before this goes to Nick: drop or replace "forager" in both the description and the Encyclopedia definition; drop "unblinking" from the description; narrow the description's and (if desired) the signature's closing clauses to match the sourced "against one another" scope rather than "everything that moves" / "everything close"; and have the orchestrator take a second look at the `claws` anatomy key given how much registry weight it carries (instrument listing, manipulation band) versus how thin the art support for it actually is. None of these are canon violations or catalog collisions; all are source-fidelity precision issues appropriate to fix in a revision pass.
