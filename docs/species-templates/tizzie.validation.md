# Tizzie — independent validation report

Validator: independent pass per skill section 9. Sources consulted: `species.json` Tizzie entry, `planets.json` Telypso entry (full `history` array and `data` block), `art/tizzie.png`, `.claude/skills/migrate-species/SKILL.md` sections 2, 3, 4, 5.5, 6, and `docs/ability-catalog/consolidated-*.md` + `neutral-pools.md` for the collision check. No other file was read.

## Step 1 — Script output and log comparison

Independent re-run from `C:\dev\src\xalians-catalog`:

```
$ node docs/species-templates/tools/validate-template.js tizzie
WARN instruments.predicate.source   channel "gaze" also needs the description to support a stare; the validator agent must confirm

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\tizzie.jsonl
```

This matches the walkthrough's claimed final state: 0 FAIL, 1 WARN. The template as it stands on disk is script-clean.

**However, the walkthrough's narrative of how it got there is inaccurate.** The `validation-log/tizzie.jsonl` file (read in full, 8 entries prior to my own run) shows:

| Run | Fails | Notable |
|---|---|---|
| 1 | `capabilities.flight`, `md.emdash`, `md.quote` | first run, 3 FAILs + 2 WARNs |
| 2 | none | `enc.definition.name` WARN also gone |
| 3 | none | `md.quote` FAIL "fixed" via paraphrase, per walkthrough note |
| 4 | **`md.quote`** (same code, same message, "terrain line and its") | **FAIL recurs after being marked fixed in run 3** |
| 5 | none | fixed again |
| 6–8 | none | clean, re-runs |

The walkthrough's "Script denials" section presents a single, linear fix-once narrative for all three run-1 FAILs and never mentions that the `md.quote` FAIL reappeared in run 4 after being resolved in run 3. This is a material omission in the walkthrough's self-report: the agent's editing was not as clean as described (something reintroduced the offending double-quote pairing, or a revert occurred, between runs 3 and 4). It does not affect the correctness of the final on-disk artifact, which is script-clean, but the walkthrough's account of its own process is not fully honest to the log. **Flagged as a documentation-honesty finding, not a content defect.**

## Step 2 — Art vs. reading paragraph, and body-plan ruling

**Art description (independent read):** A flat black silhouette, three-quarter view. Two huge pointed ears, one canted up-left with a pale inner notch, one swept right. Two large circular eyes drawn as black-and-white spiral pinwheels, each taking roughly a quarter to a third of the head, side by side. Tufted, shaggy fur-edge outline along the head, chest, and haunches. A long thin S-curved tail rises from the body and ends in a large flat disc filled with a tight spiral, held out to the left at roughly head height. **Critically: the creature's body hangs vertically in the frame. A single visible forelimb reaches up and grips a looped branch or vine at the top of the frame — the paw is wrapped around it, not merely raised. The hind legs hang free below the body with two-toed feet, splayed loosely, touching nothing.** No ground, no floor line, no other surface is drawn anywhere in the frame.

**Comparison to the walkthrough's art-reading paragraph:** The walkthrough claims "a pair of hind legs bearing weight with two-toed feet" and calls the pose "a mid-motion crouch or spring: the limbs are splayed... nothing else in the frame is drawn." This is not an accurate description of the image. There is no ground for the hind legs to bear weight against — they hang free in open space. The pose is a **hang from a gripped branch**, not a crouch or spring. The walkthrough does correctly note "nothing else in the frame is drawn" but fails to identify the one thing that plainly *is* drawn beyond the creature itself: the branch/vine the forelimb grips. Omitting the one environmental object in the frame, and misreading a hanging pose as a weight-bearing crouch, is a meaningful accuracy failure in the art-reading paragraph, since the whole body-plan ruling downstream depends on this reading.

**Second forelimb:** the walkthrough describes "one reaching up and forward and one raised to the side, both clear of the ground and ending in small paws with visible digits." Only one forelimb (the one gripping the branch) is unambiguously a limb in the image; the shape near the top of the head that might be a second raised forelimb is ambiguous with fur/ear tufting and cannot be confidently called a second paw. This is a minor over-claim relative to what the art actually shows clearly.

**Applying the section 5.5 body-plan selection rule myself:**

The description (`species.json`) names no legs, no stance, and no forelimb work at all — it is completely silent on locomotion ("It uses its tail to draw attention to its big, hypnotic eyes. Once eye contact is made, this creature can attack from within your mind."). So per the rule, the art decides.

The rule's test: "a creature drawn on all fours is `quadruped` even if it can rise, and otherwise the test is whether the forelimbs bear weight: a creature whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is `biped`, and one whose forelimbs reach the ground as legs is `quadruped`, whatever pose it is drawn in."

The creature is **not drawn on all fours** (no ground is drawn at all, so this branch of the rule cannot even be applied). Falling to the second branch: the forelimb is unambiguously "free of the ground" and is actively gripping an external object — functionally closer to the rule's "hands... tools" biped criterion than to a "reaches the ground as a leg" quadruped criterion. There is no ground for the forelimb to reach in this image at all.

**Ruling: the art, read accurately, supports `biped` at least as strongly as `quadruped`, and arguably more strongly, because the one clearly-drawn forelimb is shown doing grip work (holding a branch) rather than resting as a leg.** The rule is not cleanly decidable here because it was written assuming a ground-referenced pose (standing, crouching, rearing on visible ground), and this art shows neither ground nor a clean four-legged stance — it shows a hang. That said, of the two enum values, the walkthrough's chosen `quadruped` is the *weaker* reading of the two once the pose is read correctly, since a body hanging by one gripping forelimb with two free-swinging hind legs reads more like an arboreal biped/climber than a four-legged stander. This should have been surfaced as the open question to Nick, not resolved unilaterally in the walkthrough's favored direction while the actual open question posed was about height/size instead.

**Downstream consequence:** the walkthrough itself flags that choosing `quadruped` forced it to author a height band (42–58 cm) sharply lower than the legacy 89 cm gauge, on the theory that 89 cm was an upright measurement. If the correct plan is `biped`, that whole size-authoring chain (Step 5 finding below) was solving a problem created by the plan choice, not a problem inherent to the source.

## Step 3 — Upgraded description, clause by clause

| Clause | Verdict | Basis |
|---|---|---|
| "A small shaggy quadruped with outsized ears" | INVENTED (body-plan word) / SUPPORTED (shaggy, ears) | "quadruped" bakes in the disputed body-plan ruling as a stated fact in-world prose, which the registry never intends — body plan is a physiology field, not a prose fact, and asserting it in the description text presents an unsettled classification as settled. "Shaggy," "outsized ears" supported by art (tufted outline, two very large ears). |
| "spiral-patterned eyes that fill half its face" | SUPPORTED | Art: two large spiral-pinwheel eyes; `species`: "big, hypnotic eyes." "Half its face" is a mild art-reading extrapolation but reasonable given the eyes' visible proportion. |
| "a long tail tipped in a flat whorled disc" | SUPPORTED | Art shows the disc; `species` names the tail. |
| "the Tizzie was generated on Telypso to counterbalance the psychic energies of the deranged Vallerii the Imperial Houses marooned there" | SUPPORTED (planet-wide, correctly scoped as Generator intent) | `planet`: "the Generator began churning out new forms of life, Xalians whose psychic energies could be used to counterbalance those of the brainsick creatures"; `planet`: Imperial Houses sent "the most unstable and mentally deranged" there. Correctly stays at the level of Generator purpose for the class of psychic Xalians, does not claim a unique individual mission for Tizzie specifically — this is appropriate use of a planet-wide sentence for engineered-purpose framing, distinct from claiming a species-specific behavior. |
| "It works the way its Generator intended" | INFERRED (connective) | Adds no fact; bridges the purpose clause to the method clause. Acceptable per section 3's structure requirement (purpose, then how it plays out). |
| "the tail disc turns and draws attention to the eyes, eye contact opens the way" | SUPPORTED | `species`: "It uses its tail to draw attention to its big, hypnotic eyes. Once eye contact is made..." |
| "the treatment proceeds from inside the patient's mind rather than through the body" | SUPPORTED | `species`: "attack from within your mind"; `planet`: "began to treat the prisoners as patients." Word "patient" is sourced from the planet history, correctly noted. |
| "Nothing about that method distinguishes therapy from assault" | INFERRED, borderline EDITORIAL | This is an authorial claim built by juxtaposing the species' word "attack" against the planet history's word "treatment"/"patients." It is a legitimate present-tense observation about the overlap the two sources create (no new fact is added), but it reads close to editorializing — it is a judgment about the *moral character* of the method rather than a plain description of what the creature does. It survives the no-dramatic-sign-off test only because it is not the *last* sentence of the paragraph (mid-paragraph editorial commentary is not explicitly forbidden the way a closing flourish is), but graded strictly it is closer to commentary than to fact-stating. Borderline pass. |
| "since the Nemesis Plague reached the sanctuaries and turned the creatures of Telypso against one another, Tizzies work the same hold on each other in the fungal forests" | SUPPORTED, and this is the closing sentence — apply sign-off test | `planet`: "The End Wars have brought the Nemesis Plague to Telypso's sanctuaries... tainting the creatures of Telypso and turning them against one another." Present tense, states what the species does now (uses its hold on other Tizzies), no staged scene, no metaphor, no flourish, no personified consequence, no so-that/until-nothing/whatever-is-hunted construction. **Passes the no-dramatic-sign-off test** — it is a plain present-tense fact, not a movie-trailer line. |

**Sign-off test applied to the three required targets:**

1. **Last sentence of the species description** ("...Tizzies work the same hold on each other in the fungal forests.") — PASS. Plain present-tense fact, no flourish.
2. **Signature description** ("It turns the disc of its tail until the eyes are the only thing worth looking at, and whatever meets them stops where it stands.") — Examined closely: "the eyes are the only thing worth looking at" and "whatever meets them stops where it stands" are both stylized, slightly aphoristic phrasings. Neither stages an invented scene, and both describe what the creature does (present tense, active), so they do not trip the explicit banned-pattern list (no "difference between," no personified consequence noun, no so-that/until-nothing construction). This is a **narrow PASS** but is the closest line in the whole submission to failing — "whatever meets them stops where it stands" is a generalized, slightly grandiose restatement rather than a plain description of an act, and a stricter reading could call it a flourish. Recorded as a borderline finding, not a FAIL.
3. **Encyclopedia entry** closing clause ("...it works on that subject from inside its mind rather than through its body.") — PASS. Plain, definitional, no flourish.

**Canon constraint check (hypnosis cap):** `hypnotic` per the registry "entrances and holds attention, dulling the will to act (caps there)." The description says the creature "can attack from within your mind" and the signature says "whatever meets them stops where it stands." Neither claims the creature *controls* the target's body, makes it act, or puppets it — "stops where it stands" is consistent with dulling the will to act (freezing/halting), not with directing the target's actions. This stays within the cap; no puppeting is implied. **PASS.**

## Step 4 — Signature description and Encyclopedia clause check

Signature: "It turns the disc of its tail until the eyes are the only thing worth looking at, and whatever meets them stops where it stands." — instrument `gaze`, action `snare`. "Stops where it stands" is squarely within `snare`'s registry definition ("holds, binds, pulls, or pins the target in place") and within `hypnotic`'s cap (dulling the will to act). No implication of the target being moved, commanded, or made to act against itself — it is held in place, which is the `snare` action exactly. **Within the hypnotic cap. PASS.**

Encyclopedia definition: "The Tizzie is a small furred four-legged Xalian of Telypso..." — **this bakes in "four-legged," i.e. the same disputed body-plan word, into the encyclopedic register, which is supposed to be "encyclopedic and definitional."** Same finding as the description's "quadruped" clause: presents a genuinely unsettled classification as flat fact. Otherwise the definition is clean, present-tense, leads with the category noun, no flourish, correctly renamed after the `enc.definition.name` WARN fix.

## Step 5 — Field-by-field audit of tizzie.json

| Field | Value | Verdict | Notes |
|---|---|---|---|
| `bodyPlan` | `quadruped` | **CONTRADICTED** (see Step 2) | Art, read accurately, does not show a weight-bearing four-legged stance; it shows a hang by one gripping forelimb. `biped` is at least as well supported. |
| `covering` | `fur` | HONEST | Art shows tufted/shaggy outline; registry names this exact signal for `fur`. |
| `anatomy: tail` | — | HONEST | `species`: "It uses its tail..." |
| `anatomy: lure` | tail disc | HONEST | Registry defines `lure` as "a dangled bait appendage." The disc is held out and its sole sourced function is to "draw attention" — this is bait-like function (draw the eye), correctly mapped. Reasonable application of the definition. |
| `anatomy: claws` | — | UNSUPPORTED, correctly flagged | Walkthrough itself lists this in Authored fields as art-only with no text support. Honest self-flagging. |
| `anatomy: hide` | — | HONEST | No shell/plating in art; single-surface-key rule correctly applied. |
| `instruments: lure` | — | HONEST | See above. |
| `gaze` (predicate: sight > 0 + description supports a stare) | sight band 70–92, "Once eye contact is made" | HONEST | Predicate genuinely holds; this is the one WARN the script raises and the walkthrough answers it correctly and directly. |
| `mind` (predicate: psychic element or psychic special sense) | primary element psychic, `senses.special: [psychic]` | HONEST | Predicate holds independently two ways. |
| `diet: omnivore` | — | HONEST (fallback, correctly flagged) | Registry's stated fallback for a flesh body with no feeding sentence; correctly listed in Authored fields. |
| `temperatureC: [12, 42]` | — | HONEST | Inside planet's [7, 65] range; narrowed toward "humid, smothering mists" language. Legitimate use of planet data for environment. |
| `lifespan: short` | mass midpoint 10 kg | HONEST, but downstream of the disputed size band | Correctly applies cut 3 (flesh body, <20kg, not swarm/flier) given the *authored* weight band — but that weight band itself is suspect (see next row). |
| `size: heightCm [42, 58]` | vs legacy 89 cm | **OVER-CLAIMED / suspect** | This is the crux problem. The walkthrough explicitly authors a height roughly half the legacy gauge specifically *to make `quadruped` coherent* — this is reasoning backward from a body-plan conclusion to a size band that fits it, rather than deriving body plan and size independently from evidence. The walkthrough is honest that this is authored and flags it as "the single most likely place this template is wrong" and raises it as the open question to Nick — which is the correct procedural move — but the template ships with the weaker-evidenced value as the default rather than the better-evidenced one, with the burden placed on Nick to catch it. Given the Step 2 finding that `biped` is the more art-accurate reading, the height band is likely wrong as shipped. |
| `archetypeWeights` | virtuoso 5, prowler 3, skirmisher 3, sage 2, rogue 1 | HONEST | Reasonably argued from the sourced act (presence/attention, willed mental effect) and legacy speed rating. No strength/defense archetypes, correctly excluded (all legacy defense/strength ratings blank). |
| `traits.hypnotic: 100` | — | HONEST — body-demanded | `species`: "big, hypnotic eyes" is a standing property of the body (the eyes are always there), correctly placed at 100 and exempted from tilts. |
| `traits.healing: 25` | — | **OVER-CLAIMED, violates the planet-wide-sentence rule** | The registry states explicitly: "a planet-wide sentence may justify an environmental adaptation (`nocturnal`, `resistant`) but never a behavior (`perceptive`, `stealthy`, `menacing`)." `healing` is a behavior trait ("restores others"), not an environmental adaptation. The sole support offered is: "the Generator began to treat the prisoners as patients, hoping to cure them and merge them into the mind of the rest of Telypso's psychosphere" — this is a **planet-wide, Generator-intent sentence about the class of psychic Xalians Telypso produces**, not a species-specific behavior sentence about Tizzie, and it describes a hoped-for outcome of the Generator's population-level program, not an act any individual Tizzie performs. This is exactly the case the rule forbids. The walkthrough itself surfaces this as an open question and offers to drop it, but it ships in the pool at a live, non-trivial 25% by default. **This should be UNSUPPORTED per the letter of the rule and removed, not left in pending sign-off, given the rule reads as a hard constraint ("never") rather than a judgment call.** |
| `traits.perceptive: 55` | — | HONEST-ish | Justified from `species`: "Once eye contact is made" (a species behavior sentence, correctly distinguished from a planet-wide one per the walkthrough's own framing). Percent value itself is a proposal but direction is sourced. |
| `traits.slippery: 45`, `stealthy: 40`, `mind-sealed: 15` | — | Largely AUTHORED, correctly flagged | Walkthrough lists these in Authored fields; direction argued from art/body reasoning rather than direct source sentences. Acceptable as long-tail authored percents, consistent with registry's tolerance for reasoned proposals. |
| `traits.menacing: 20`, `solitary: 30`, `foresighted: 6`, `telekinetic: 4` | — | HONEST | Reasoned minority reads, correctly caveated, rare-band values correctly kept low. `foresighted`/`telekinetic` justified from planet-wide sentences about the *world's* physics (erratic time, antigravity fungi) — these are used only as coherence/flavor support for a *rare* percentage, not asserted as demanded traits, which is a materially different (and permissible) use of planet-wide text than the `healing` case. |
| Expected trait count | 3.40 | Arithmetic check | (100+55+45+40+30+25+20+15+6+4)/100 = 340/100 = 3.40. **Correct arithmetic.** If `healing` is removed per the finding above: (315)/100 = 3.15, matching the walkthrough's own stated fallback figure. |
| Authored fields list | — | Largely complete | Does list `bodyPlan`, `claws`, `covering`, sizes, `diet`, `breathes`/`ambientMedia`, several capability bands, `senses.smell`, most attribute bands, several trait percents, `intensity`, `biomeNiche`. **Does not list `healing` as authored/contestable in the Authored fields section itself** — it is discussed only in the separate "Open questions" section, which is a reasonable structural choice per the skill's format, so this is not a strict omission, but it means a reader scanning only Authored fields would miss that `healing`'s justification is contested. |

## Step 6 — Signature ability audit

- Collision scan: independently re-ran `grep -rli "tizzie"` across `docs/ability-catalog/` — hits only in `anatomy-consolidated.md` and `anatomy-demand-sweep.md`, both anatomy-registry working notes recording Tizzie's instrument set (tail + gaze/mind), not a signature-name ledger. Independently grepped for "Spiral of Perfect Attention" and "Perfect Attention" across the same folder — **zero hits**. Walkthrough's collision-scan claim is verified correct.
- Registry vocabulary: `gaze` is a declared instrument with a satisfied predicate (sight band + description supports a stare — WARN correctly answered). `snare` is in `gaze`'s allowed-action set per section 5.7 (`gaze` → terrorize, snare, drain, beam). Confirmed.
- Medium `psychic`: primary element, always has cover. Confirmed.
- No mechanics in the description ("It turns the disc of its tail until the eyes are the only thing worth looking at, and whatever meets them stops where it stands.") — no HP, damage, turns, or stats named. Confirmed clean.
- Name form: American English, no possessive, no hyphen, no franchise borrowing, no real-world weapon, no Earth fauna/flora, no nuclear-age register. Confirmed clean.

**PASS**, no issues found beyond the borderline flourish note in Step 3.

## Step 7 — Canon compliance across all three files

- Sexless / no lineage language: none present in any file. PASS.
- No language, only calls/telepathic feeling: `communication: [display, telepathic]`, no vocal words anywhere. PASS.
- Lifespan wear-out, no years stated: `short` used as an enum band, no year figures in prose. PASS.
- No teleportation/invisibility/puppeting/time-reversal/life-creation/permanent transformation: the hypnosis is capped at "stops where it stands" (freeze, not command) — verified in Step 4. No other reality-breaking claim anywhere. PASS.
- No spellcasting-as-magic language: the ability decomposes into `gaze` (willed via mind/eyes), consistent with registry decomposition rules. PASS.
- Scrambler Token / generation vocabulary: not invoked in this species' text (no generation-event language needed here). N/A, no violation.
- Nuclear-age register: absent. PASS.
- Voice rules (section 3): third person, present tense, no em-dashes (confirmed by script), American English. PASS, with the two borderline notes already raised (the "therapy/assault" editorial clause, the signature's "stops where it stands" flourish) — neither rises to a hard FAIL under the letter of the no-dramatic-sign-off rule, but both sit closer to the line than the rest of the submission.

## Step 8 — Adversarial scan, descending confidence

1. **(High confidence) `bodyPlan: quadruped` is not well supported by an accurate reading of the art.** The art shows a creature hanging by one gripping forelimb from a branch, hind legs free in open space, no ground drawn anywhere. The walkthrough's art-reading paragraph mischaracterizes this as a weight-bearing crouch/spring pose and omits the one environmental object (the branch) actually present in the frame. Applying the section 5.5 rule to the correctly-read pose, `biped` is at least as well supported as `quadruped`, arguably better, since the visible forelimb is doing grip/tool-like work rather than resting as a leg. This is the single highest-severity finding: it is a physiology field that then determined a downstream authored size band.

2. **(High confidence) `traits.healing: 25` violates the registry's explicit rule** that a planet-wide sentence may justify only an environmental adaptation, never a behavior. `healing` is defined in the registry as a behavior trait ("restores others"), and its sole support is a planet-wide, Generator-intent sentence about the psychic Xalians of Telypso as a class, not a species-specific sentence about Tizzie. The walkthrough itself half-recognizes this (raises it as an open question, offers the fallback expected-count of 3.15) but ships the trait live in the default pool rather than withholding it pending Nick's answer, which puts a rule-violating value into the artifact by default.

3. **(Medium confidence) The walkthrough's own account of the validator log is inaccurate.** It describes a single clean fix for each of the three run-1 FAILs and never discloses that the `md.quote` FAIL recurred in run 4 after being marked resolved in run 3. Does not affect the final artifact (which is script-clean) but is a process-honesty gap: the "Script denials" section should be a complete account of every denial, and it is not.

4. **(Medium confidence) The Encyclopedia definition and the upgraded description both assert the disputed body-plan word as flat fact** ("four-legged," "quadruped") in registers that are supposed to be either encyclopedic/definitional or upgraded-but-strictly-sourced prose. Since body plan is genuinely unsettled per finding 1, baking the word into two separate prose artifacts compounds the risk if the ruling is later reversed — both documents would need rewriting, not just the JSON field.

5. **(Low-medium confidence, borderline) Two prose clauses sit close to the voice-rule line without clearly failing it:** "Nothing about that method distinguishes therapy from assault" (editorial framing rather than plain fact-stating, though not the closing sentence so not strictly caught by the no-dramatic-sign-off rule) and the signature's "whatever meets them stops where it stands" (a stylized aphorism rather than a plain description of an act). Neither trips an explicit banned pattern; both are worth a second look if the bar is meant to be applied strictly.

6. **(Low confidence, minor) The art-reading paragraph over-claims a second forelimb** ("one reaching up and forward and one raised to the side") when only one forelimb is unambiguously legible in the silhouette; the second may be ear/fur tufting. Minor relative to finding 1, but consistent with a general pattern of the art-reading paragraph being less careful than the rest of the walkthrough.

7. **(Low confidence, no action needed) `anatomy: lure` mapping of the tail disc is a reasonable but generous reading** of the registry's "dangled bait appendage" definition — the disc is held out and presented, and the source text supports its attention-drawing function, but "bait" carries a connotation of luring prey to be caught/eaten that this species' sourced function (luring a subject's gaze for hypnosis, not consumption) does not exactly match. Judged acceptable on balance since the registry's own definition is function-based ("dangled... appendage" whose job is to draw attention) rather than strictly prey-luring, and the walkthrough correctly ties it to the sourced "draw attention" language.

## Verdicts

**Template (`tizzie.json`): FAIL.**
Failing items: `bodyPlan: quadruped` (Step 2, Step 8 #1 — CONTRADICTED against an accurate art reading), `traits.pool.healing: 25` (Step 5, Step 8 #2 — violates the planet-wide-sentence-never-justifies-a-behavior rule as a live default value rather than a withheld pending-decision value). The downstream `size.heightCm` band is also suspect as a consequence of the body-plan finding but is not counted as a separate failing item since it was already correctly self-flagged by the agent as authored and uncertain.

**Walkthrough (`tizzie.md`): FAIL.**
Failing items: the art-reading paragraph materially mischaracterizes the pose (Step 2, Step 8 #1) — this is not merely an interpretive judgment call but an inaccurate description of what is drawn (claims weight-bearing legs and a spring/crouch where the art shows a hang with no ground); the "Script denials" section omits the run-4 recurrence of the `md.quote` FAIL, giving an incomplete account of the agent's own denial history (Step 1, Step 8 #3); the `healing` trait's justification is presented as a live open question while the value ships active in the default pool rather than being withheld, understating how directly it conflicts with a stated hard rule ("never," not "avoid where possible").

**Encyclopedia (`tizzie.encyclopedia.json`): FAIL.**
Failing item: "four-legged" bakes the disputed, likely-incorrect body-plan call into a supposedly definitional, settled-fact register (Step 4, Step 8 #4). Otherwise clean: correctly named after the WARN fix, correctly scoped, no flourish, no mechanics.
