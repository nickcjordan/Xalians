# Tribute v2: calibration and completion supplement

**Status:** design recommendation for ratification, 2026-09-01  
**Scope:** Tribute derivation and match rules only; no application design or implementation code  
**Authority:** this supplement completes `tribute-v2-new-records.md`. The ratified creature-system documents remain authoritative wherever this supplement does not explicitly revise a Tribute-layer decision.

## Executive rulings

Tribute v2 is viable, but four rules should change before its first simulated batch:

1. **Keep Bombard ability-derived.** It is the only record-honest source of projection power. Count signature abilities as real abilities, but measure rolled-only and signature-forced eligibility separately.
2. **Withdraw the claim that every species has a nonzero Bombard path.** `body` is a legal instrument, not an instrument automatically added to every species. Under the provisional action-only definition, 22 of 41 instruments have no Bombard action; `[talons, jaws]` is exactly 0% eligible.
3. **Remap matrix zeroes before affinity blending, not after it.** The v2 post-blend remap makes a weak secondary affinity worse than having no secondary. Use `0 → 0.25` on each matrix endpoint, blend those endpoints, round half up, and keep a played card at a minimum contribution of 1.
4. **Use per-spoke fees.** The platform should own a common fee-component schema and versioning mechanism, not one universal scalar. Tribute should price only the facts its current rules can exploit.

The recommended first-playable remains the prior cycle's naked pass game: exact 12-card deck, 10-card persistent hand, best of three Bouts, permanent pass, three Theaters, two public Decrees, no traits, Kindred, or Gambits yet. The numeric fee cap and final Standard Decree set are outputs of the batch gates below, not inherited numbers.

## Evidence boundary and loudly stated assumptions

There is no creature corpus. The Graviclaw blind-test record is one hand-authored pilot, not a distribution. No empirical claim below is presented as observed creature behavior.

| ID | **ASSUMED PARAMETER — NOT RATIFIED CREATURE DATA** | Where used |
|---|---|---|
| A1 | Within an instrument's allowed-action set, actions are equally likely. Actual element weights are not yet specified. | Closed-form Bombard examples only. The general formula supports nonuniform weights. |
| A2 | Instruments in a species list are equally likely and rolled abilities are conditionally independent draws with replacement. | Closed-form Bombard examples only. |
| A3 | When a single summary over “2–3 rolled abilities” is shown, two and three are each 50% likely. | The `50/50 mix` Bombard column only. Separate `n=2` and `n=3` results require no such assumption. |
| A4 | Prelaunch catalog reports weight all 29 species equally. A second production report uses actual Generator origin/species weights once authored. | Batch acceptance gates. Equal-species and production-weighted results must never be conflated. |
| A5 | For the analytic Decree ranking, primary elements are uniform across the 14 elements; 75% are mono-affinity; the 25% with a secondary choose uniformly among the primary's on-graph neighbors. | Condition ranking only. |
| A6 | Secondary grade is uniform over integer values 1–99 for the analytic Decree ranking. The real strength distribution is not ratified. | Condition ranking only. |
| A7 | Species attribute/capability bands, archetype weights, ability intensity distributions, action element-weights, and signature bands are deliberately **not invented** here. | They are inputs to, not outputs of, the batch plan. |

No Monte Carlo is reported as creature evidence. Inventing 29 species bands would dominate the result and create false confidence. The batch apparatus below is the valuable simulation: it runs as soon as the authored templates and probability tables exist.

## 1. Simulated-batch ratification plan

### 1.1 Common batch and reproducibility contract

Generate **10,000 individuals per species** from each of the 29 launch templates: **290,000 records per candidate generator snapshot**. Use domain-separated fixed seed ranges, retain the manifest hash and generator version, and rerun the same seeds after every tuning change. This gives a per-species standard error no worse than 0.5 percentage points for a proportion near 50%.

Every report has two views:

- **Catalog-balanced:** every species contributes exactly 10,000 records. This detects template inequity.
- **Production-weighted:** records are reweighted by actual Generator origin and species-generation odds. This predicts the live collection.

For deck tests, form **100 synthetic ownership pools of 60 creatures** by production weights and **100 catalog-balanced pools of 60**. From each pool, sample 10,000 distinct 12-card subsets after the four-per-planet rule: **2,000,000 candidate decks** total. Also construct adversarial pools containing top-roll, mono-planet, mono-archetype, and Bombard-heavy cards. Report bootstrap 95% intervals; a point estimate inside a band with an interval crossing its boundary is not a pass.

### 1.2 Every `[BATCH]` item converted to a gate

| Test | Batch and measurement | Ratify | Reject / required response |
|---|---|---|---|
| **Printed-power spread per Theater** | On all 290,000 records, derive `P(v)=max(1, ceil(v/10))`. Report frequency 1–10, mean, SD, IQR, entropy, and per-species occupied bins for Vanguard, Skirmish, and eligible Bombard. | Per Theater: at least 7 bins each hold ≥1%; no bin holds >25%; SD **1.50–2.60**; IQR **2–4**; Theater means differ by ≤1.0. For at least 75% of species, each native attribute Theater occupies ≥3 bins with each of those bins holding ≥5% of that species. | Revise species bands or the shared printed-power curve. Do not create per-Theater curves unless the shared curve fails twice after band review. A species may intentionally fail the within-species gate only with an authored exception note. |
| **Bombard eligibility overall** | Report (a) rolled-only eligibility, (b) final eligibility including signature, and (c) signature-forced share. Show catalog-balanced and production-weighted values. | Rolled-only overall **40–65%**; final overall **45–70%**; production-weighted result within 10 percentage points of catalog-balanced. | Rebalance instrument/action weights or templates. Do not fix a production-weighting miss by changing the printed power curve. |
| **Bombard eligibility per species** | For each species, report its exact closed-form probability from authored weights beside observed batch frequency; difference must be ≤1 percentage point. | Rolled-only **15–90% for every species**. Final 100% is allowed only for a projected signature; no more than 25% of launch species may be signature-forced to 100%. No species may be 0%. | A zero or sub-15% species fails the declared “no structural lockout” goal. Add a lore-valid projected instrument/action path or explicitly reverse that goal; never silently inject `body`. A non-signature 100% species requires action-weight revision. |
| **Bombard power spread** | Among eligible records, report maximum projected intensity and printed Bombard power; stratify signature-forced versus rolled access. | Same overall spread gates as a Theater above; signature-forced and rolled-access means within 1.5 printed points; no signature species has >80% of individuals in one Bombard bin unless its authored band deliberately says so. | Widen/tune signature or rolled intensity bands. Do not exclude signatures merely to make the histogram pass. |
| **Fee spread / weight calibration** | Apply each candidate weight vector to 290,000 records. Separately estimate each card's marginal Bout value by 100,000 paired bot placements and 200,000 deck-swap mirrors. Report fee histogram, rank correlation to marginal value, and species/archetype residuals. | Integer-fee CV **0.20–0.35**; `P90−P10` is **35–100% of median fee**; no single fee holds >20% of records; Spearman fee-to-marginal-value **0.65–0.90**; no species or archetype has an absolute mean residual >0.75 Tribute points after controlling for fee. | Below 0.65 means fee is not buying power; above 0.90 suggests the cap may collapse viable texture into a solved ranking. Fix weights or add one justified component, never a species surcharge. |
| **Deck-cap sweep** | For all 2,000,000 sampled legal subsets, sweep every integer cap from the cheapest observed deck to the most expensive. Repeat over ten disjoint seed blocks. | Select the lowest cap admitting **25–35%** of ordinary subsets. Across seed blocks the legal share stays within ±5 points. ≥90% of adversarial all-top-decile decks are illegal; ≥95% of ordinary 60-card ownership pools contain at least one legal 12-card deck. | If no cap satisfies all four conditions, the fee is misspecified. Do not choose a cap on the 25–35% statistic alone. Publish the chosen integer only after this gate. |
| **Condition legality under 75/25** | First run the closed-form exposure enumeration over all primary × on-graph secondary × grade states. Then verify on 1,000,000 sampled records and 250,000 representative occupied rows. Report mean, SD, mean absolute deviation from 1, neutral share (`0.9–1.1`), severe suppression (`≤0.5`), strong boost (`≥1.5`), and row-total swing. | A Standard candidate has mean **0.95–1.05**, neutral share **25–50%**, severe suppression **15–32%**, strong boost **15–32%**, and MAD **0.28–0.42**. Median absolute occupied-row swing is **15–45%**. No card contribution becomes 0. The six-candidate batch rank must have Kendall `τ ≥ 0.70` with the analytic rank below. | Move a candidate to Reserve/Disabled. If all candidates miss row swing together, tune Decree economy or zero floor, not the matrix. If rank reverses, use actual batch composition and document why. |
| **Kindred archetype collisions** | On 1,000,000 ordinary legal 12-card decks, measure distinct archetypes, same-key unordered pairs, largest group, any pair in the opening 10, and groups actually co-playable in one Theater. Repeat on 250,000 archetype-seeking decks under fee/planet rules. | Ordinary decks: ≥95% contain a pair; opening 10 ≥90% contain a pair; mean unordered pairs **3–7**; median largest group **2–3**; 95th-percentile largest group ≤5. No single archetype exceeds 12.5% of catalog-balanced individuals. | Below the lower gates, Kindred is too rarely live; above pair/group gates, species archetype weights are collapsing variety. Keep no archetype deck cap if the reward remains a flat +1 per participating card once a pair exists; add a cap only if the reward later scales with group size. |
| **Kindred balance follow-up** | Post-v1 only: 20,000 paired bot mirrors with identical decks/seeds, Kindred on versus off, plus 10,000 synergy-deck mirrors. | Ordinary win shift ≤3 points; optimized Kindred deck advantage over fee-matched nonsynergy decks ≤5 points; average Kindred contribution ≤12% of winning Bout total. | Tune bonus or fee interpretation. Do not ship Kindred merely because collision frequency passed. |

As a closed-form sanity check only, **ASSUME** 12 independent cards uniformly distributed over 16 archetypes. The chance of at least one collision is `1−(16×15×…×5)/16^12 = 99.6903%`; expected same-archetype unordered pairs are `C(12,2)/16 = 4.125`; expected distinct archetypes are `16×[1−(15/16)^12] = 8.625`. The batch bands center on this benchmark but deliberately allow species archetype weights and deck constraints to move it.

### 1.3 Decision order for the batch session

Run the gates in this order: record validity → printed power → Bombard access → Bombard power → starting fee weights → cap sweep → Conditions → Kindred. Fee and deck-cap results from an invalid Bombard distribution are disposable; Condition legality does not need fee calibration and may run in parallel only after the records validate.

The one Graviclaw record must **not** enter the statistical batch. It is a fixture for worked derivation and validation only.

## 2. Bombard eligibility, closed form

### 2.1 General result

Let the projected action set be

`R = {beam, hurl, spray, burst, cloud}`.

For species instrument list `I`, let `q_i` be the probability that a rolled ability chooses instrument `i`. Let `w(i,a,e)` be the actual element-conditioned draw weight for allowed action `a`, and let `E` denote the creature's realized element/affinity state. The projected chance for one roll is

`p(E) = Σ(i∈I) q_i × [Σ(a∈Allowed(i)∩R) w(i,a,E)] / [Σ(a∈Allowed(i)) w(i,a,E)]`.

For `n` conditionally independent rolled abilities,

`Pr(rolled Bombard access | E,n) = 1 − (1 − p(E))^n`.

If ability draws are without replacement or duplicate action/instrument pairs are suppressed, use the corresponding sequential product `1 − Π_k(1−p_k)` instead. Medium and intensity do not affect eligibility; medium matters only insofar as element weighting changes the action draw. Intensity determines Bombard power after access exists.

If a signature ability counts, the complete result is

`Pr(final access) = 1` when the signature is projected, otherwise `1 − (1−p)^n`.

### 2.2 Provisional per-instrument probabilities

The following is closed form under **ASSUMPTIONS A1–A2: uniform instrument and allowed-action draws**. It is an analysis of the current action-only proposal, not a claim about the future registry weights.

| One-roll projected fraction | Instruments |
|---:|---|
| `0` | jaws, fangs, beak, tusks, horns, antlers, tongue, claws, talons, fists, hooves, blades, spurs, stinger, rattle, coils, hide, shell, tendrils, roots, pseudopods, antennae |
| `1/8 = 12.5%` | mind |
| `1/6 = 16.7%` | pincers, tail, body, swarm |
| `1/5 = 20%` | trunk, wings, aura |
| `1/4 = 25%` | gaze |
| `1/3 = 33.3%` | lure, spinnerets, voice |
| `2/5 = 40%` | spines, light-organs |
| `3/7 = 42.9%` | secretion |
| `1/2 = 50%` | crest |
| `2/3 = 66.7%` | core |
| `3/4 = 75%` | vents |
| `1 = 100%` | breath |

This is the decisive correction to v2: **22 of 41 instruments are structural zeroes under the five-action definition.** `body` being broad and legal does not add it to a species list. A species with only zero instruments remains locked out unless its signature is projected.

### 2.3 Representative species-template instrument sets

| Declared instruments | One-roll `p` | Access, 2 rolls | Access, 3 rolls | **ASSUMED** 50/50 mix | Design reading |
|---|---:|---:|---:|---:|---|
| `[pincers, mind]` | 14.58% | 27.04% | 37.68% | 32.36% | Graviclaw's rolled-only path under uniform weights; low but not zero. Its actual pilot rolled no projected action. |
| `[talons, jaws]` | 0% | 0% | 0% | 0% | Structural lockout. This directly disproves the automatic-`body` premise. |
| `[vents, body]` | 45.83% | 70.66% | 84.11% | 77.38% | Strong but still individual-variable. |
| `[light-organs, aura]` | 30.00% | 51.00% | 65.70% | 58.35% | Healthy middle under the provisional action tags. |
| `[breath, vents]` | 87.50% | 98.44% | 99.80% | 99.12% | Functionally species-guaranteed even without a projected signature. |
| `[core, breath]` | 83.33% | 97.22% | 99.54% | 98.38% | Same near-100 problem. |
| `[body]` | 16.67% | 30.56% | 42.13% | 36.34% | `body` alone is not a high-access solution. |
| `[talons, jaws, body]` | 5.56% | 10.80% | 15.76% | 13.28% | Blindly appending `body` barely clears access and dilutes anatomy identity. Do not do this. |
| `[talons, jaws, breath]` | 33.33% | 55.56% | 70.37% | 62.96% | A lore-valid channel fixes access cleanly. |
| `[secretion, light-organs]` | 41.43% | 65.69% | 79.91% | 72.80% | Strong, readable emitter species. |

Worked template implications:

- The real Graviclaw pilot has instruments effectively `[pincers, mind]`, one signature `snare`, and three rolled actions `crush/snare/ward`. It therefore prints Vanguard 8, Skirmish 2, and has no Bombard value on this individual.
- A hypothetical species authored with `[talons, jaws]` cannot pass the no-lockout batch gate, regardless of its ability count or intensity bands.
- A hypothetical vented species with `[vents, body]` is eligible roughly 71–84% of the time before its signature under uniform weights. That is individual texture without making access rare.

### 2.4 Should signatures count?

**Yes. Count the signature for both Bombard eligibility and Bombard power.** A signature is an actual ability in the immutable record with the same baseline grammar fields. Showing a beam signature on a card while locking that creature out of Bombard would violate the record's graceful-degradation contract and be immediately confusing.

The cost is intentional species asymmetry: a projected signature makes every individual of that species eligible, although its intensity still varies. Control that asymmetry through fee and roster composition, and expose it in the batch as `signature-forced eligibility`; do not make the record lie.

### 2.5 Delivery-class registry ruling

The five-action set is acceptable for this closed-form preflight but **not precise enough to ship as an action-only tag**. `body + burst` is a local discharge; `core + burst` can be an emitted shot. `aura + cloud` is centered on the creature; `vents + cloud` can be expelled downrange. The instrument-action pair carries delivery.

Add a descriptive `deliveryClass` to every allowed instrument-action edge in the pinned registry snapshot. Recommended values are `contact`, `reach`, `projectile`, `line`, `cone`, `deployed-field`, `self-wave`, and `aura`. Tribute maps `projectile`, `line`, `cone`, and `deployed-field` to Bombard. As defaults:

| Action | Default | Required edge exceptions |
|---|---|---|
| beam, hurl, spray | Bombard-capable | None unless an authored edge is explicitly self-directed. |
| cloud | Bombard-capable only when expelled or deployed | Aura-centered cloud is not Bombard. |
| burst | Bombard-capable only from a directed emitter/channel | `body` and `spines` bursts default to `self-wave`, not Bombard. |

This preserves the current five-action intuition while stopping each spoke from hand-inferring range. Once the edge tags are ratified, rerun the same closed form with `R` replaced by the eligible edge set.

## 3. Condition math, worked

### 3.1 Corrected formula

The v2 formula is sound only if the zero remap happens at the matrix-cell level. Define

`r(m) = 0.25 if m=0, otherwise m`.

For primary multiplier `m_p`, optional secondary `m_s`, and secondary grade `g`:

`m_used = [100×r(m_p) + g×r(m_s)] / (100+g)`.

Mono-affinity creatures use `r(m_p)`. Resolve each card as

`conditionedPower = max(1, roundHalfUp(printedPower × m_used))`.

The minimum 1 is necessary to honor “suppressed, not erased”: a printed-power-1 card at 0.25 otherwise rounds to 0.

### 3.2 Full multiplier landscape

All tables below use the corrected endpoint remap. Rows are `m_p`; columns are `m_s`. Values are shown to three decimals but resolution uses the unrounded value.

#### Secondary grade `g=0`

| `m_p \ m_s` | 0 | 0.5 | 1 | 1.5 | 2 |
|---:|---:|---:|---:|---:|---:|
| 0 | 0.250 | 0.250 | 0.250 | 0.250 | 0.250 |
| 0.5 | 0.500 | 0.500 | 0.500 | 0.500 | 0.500 |
| 1 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| 1.5 | 1.500 | 1.500 | 1.500 | 1.500 | 1.500 |
| 2 | 2.000 | 2.000 | 2.000 | 2.000 | 2.000 |

#### Secondary grade `g=25`

| `m_p \ m_s` | 0 | 0.5 | 1 | 1.5 | 2 |
|---:|---:|---:|---:|---:|---:|
| 0 | 0.250 | 0.300 | 0.400 | 0.500 | 0.600 |
| 0.5 | 0.450 | 0.500 | 0.600 | 0.700 | 0.800 |
| 1 | 0.850 | 0.900 | 1.000 | 1.100 | 1.200 |
| 1.5 | 1.250 | 1.300 | 1.400 | 1.500 | 1.600 |
| 2 | 1.650 | 1.700 | 1.800 | 1.900 | 2.000 |

#### Secondary grade `g=50`

| `m_p \ m_s` | 0 | 0.5 | 1 | 1.5 | 2 |
|---:|---:|---:|---:|---:|---:|
| 0 | 0.250 | 0.333 | 0.500 | 0.667 | 0.833 |
| 0.5 | 0.417 | 0.500 | 0.667 | 0.833 | 1.000 |
| 1 | 0.750 | 0.833 | 1.000 | 1.167 | 1.333 |
| 1.5 | 1.083 | 1.167 | 1.333 | 1.500 | 1.667 |
| 2 | 1.417 | 1.500 | 1.667 | 1.833 | 2.000 |

#### Secondary grade `g=75`

| `m_p \ m_s` | 0 | 0.5 | 1 | 1.5 | 2 |
|---:|---:|---:|---:|---:|---:|
| 0 | 0.250 | 0.357 | 0.571 | 0.786 | 1.000 |
| 0.5 | 0.393 | 0.500 | 0.714 | 0.929 | 1.143 |
| 1 | 0.679 | 0.786 | 1.000 | 1.214 | 1.429 |
| 1.5 | 0.964 | 1.071 | 1.286 | 1.500 | 1.714 |
| 2 | 1.250 | 1.357 | 1.571 | 1.786 | 2.000 |

#### Secondary grade `g=99`

| `m_p \ m_s` | 0 | 0.5 | 1 | 1.5 | 2 |
|---:|---:|---:|---:|---:|---:|
| 0 | 0.250 | 0.374 | 0.623 | 0.872 | 1.121 |
| 0.5 | 0.376 | 0.500 | 0.749 | 0.997 | 1.246 |
| 1 | 0.627 | 0.751 | 1.000 | 1.249 | 1.497 |
| 1.5 | 0.878 | 1.003 | 1.251 | 1.500 | 1.749 |
| 2 | 1.129 | 1.254 | 1.503 | 1.751 | 2.000 |

### 3.3 Readability and degeneracy findings

The corrected blend is monotone in `m_s`. As `g` increases it moves smoothly toward the remapped secondary endpoint: upward when the secondary is better, downward when it is worse, and not at all when equal. Grade 99 remains slightly primary-weighted (100 parts primary to 99 secondary), which is consistent with primary affinity fixed at 100.

The v2 text's original **post-blend** remap is non-monotonic. With `m_p=0`, `g=25`:

| Secondary `m_s` | Raw blend | Post-blend v2 result |
|---:|---:|---:|
| 0 | 0 | **0.25 after remap** |
| 0.5 | 0.10 | **0.10** |
| 1 | 0.20 | **0.20** |
| 1.5 | 0.30 | 0.30 |

A creature gains a favorable secondary and becomes *more* suppressed than a pure hard-zero creature. That result is both mathematically discontinuous and impossible to teach. Endpoint remapping removes it.

Worked pilot example: under a Dark Decree, Graviclaw's primary Dark is 0.5 and secondary Ghost is 2 at grade 44. Its multiplier is `(100×0.5 + 44×2)/144 = 0.9583`. Its Vanguard 8 contributes `roundHalfUp(7.667)=8`; the weak affinity nearly, but not quite, neutralizes Dark's primary disadvantage.

### 3.4 All-element Decree ranking

The following ranking uses **ASSUMPTIONS A5–A6**, the ratified adjacency graph, corrected endpoint remapping, and the 75/25 mono/dual split. `Low` is probability `m≤0.5`; `High` is `m≥1.5`; `Neutral` is `0.9≤m≤1.1`. The five matrix-count columns remain exact regardless of assumptions.

| Rank | Element | 0 / .5 / 1 / 1.5 / 2 cells | Mean | SD | MAD from 1 | Low | High | Neutral | Ruling |
|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | Psychic | 1 / 3 / 6 / 3 / 1 | 1.018 | 0.435 | 0.317 | 23.5% | 22.9% | 38.8% | **Standard** — ideal profile and balanced tails |
| 2 | Rock | 1 / 3 / 6 / 3 / 1 | 1.012 | 0.437 | 0.319 | 23.5% | 22.6% | 38.9% | **Standard** — same readable profile, different targets |
| 3 | Water | 1 / 3 / 6 / 3 / 1 | 1.020 | 0.448 | 0.330 | 22.2% | 26.2% | 38.4% | **Standard** — slightly more upside, still centered |
| 4 | Air | 1 / 3 / 5 / 5 / 0 | 1.013 | 0.407 | 0.324 | 23.5% | 30.4% | 33.0% | **Standard** — broad 1.5× pressure with no doubles |
| 5 | Ice | 1 / 3 / 7 / 1 / 2 | 1.016 | 0.480 | 0.330 | 25.0% | 19.6% | 45.7% | **Standard** — neutral-heavy controlled polarizer |
| 6 | Electric | 2 / 2 / 6 / 2 / 2 | 1.051 | 0.513 | 0.377 | 23.4% | 25.9% | 38.7% | **Standard** — the hard-counter option; safe only with the 0.25 floor |
| 7 | Sand | 0 / 3 / 8 / 3 / 0 | 1.000 | 0.311 | 0.209 | 16.7% | 17.3% | 52.1% | **Reserve** — too inert to spend a turn reliably |
| 8 | Metal | 1 / 4 / 5 / 2 / 2 | 1.011 | 0.509 | 0.387 | 31.4% | 24.7% | 34.0% | **Reserve** — lower tail just inside tolerance, useful future rotation |
| 9 | Plant | 1 / 4 / 4 / 4 / 1 | 1.011 | 0.483 | 0.396 | 31.6% | 30.7% | 25.0% | **Reserve** — broad edge of readability |
| 10 | Light | 1 / 4 / 6 / 0 / 3 | 1.026 | 0.546 | 0.392 | 29.9% | 20.7% | 40.7% | **Disabled** — binary: no 1.5 cells and three doubles |
| 11 | Dark | 1 / 4 / 6 / 0 / 3 | 1.022 | 0.548 | 0.397 | 30.2% | 20.4% | 39.1% | **Disabled** — same binary profile |
| 12 | Ghost | 1 / 5 / 2 / 5 / 1 | 1.011 | 0.516 | 0.459 | 39.0% | 37.5% | 13.5% | **Disabled** — almost everything moves |
| 13 | Chemical | 2 / 4 / 3 / 2 / 3 | 1.039 | 0.599 | 0.509 | 37.7% | 32.3% | 18.3% | **Disabled** — two suppressions, three doubles, little neutral board |
| 14 | Fire | 1 / 6 / 2 / 2 / 3 | 1.020 | 0.596 | 0.518 | 42.9% | 32.1% | 13.4% | **Disabled** — maximum board churn |

**Recommended six-card Standard set:** Psychic, Rock, Water, Air, Ice, Electric. Sand, Metal, and Plant are the first rotation reserves. Electric is no longer degenerate because the two matrix zeroes become 0.25 endpoints and contributions cannot fall below 1; if Nick rejects either safety rule, Electric immediately returns to Disabled.

The old conclusion that every matrix row averages 1 still holds only over a uniform mono-element population with raw zeroes. The adjacency blend and 0.25 remap lift these assumed means slightly above 1; the measured range 1.012–1.051 for the chosen six is acceptable and is explicitly batch-gated.

## 4. Fee calibration apparatus

### 4.1 What the fee is optimizing

A fee is not a rarity grade and should not recreate the whole record in one number. Tribute's fee has one job: make two decks at the same cap comparable in **expected opportunity value**, while leaving different shapes useful in different situations.

Optimize candidate weights against these ordered objectives:

1. **Marginal game value:** a one-fee increase should purchase approximately the same expected Bout contribution across Vanguard, Skirmish, and Bombard choices.
2. **Flexibility value:** the third legal Theater is worth something even when the card's Bombard number is modest. Let a positive Bombard coefficient absorb this first; add a separate eligibility intercept only if paired simulations show a persistent residual.
3. **No content tax:** after controlling for fee, species, planet, and archetype should not predict overperformance. Fix a component interpretation, not individual species prices.
4. **Deck constraint quality:** one integer cap should admit 25–35% of plausible decks, reject premium piles, and still leave nearly every ordinary collection a legal deck.
5. **Stability:** modest changes to generator mix or a future species should not move more than 5% of decks across the cap.

Do not optimize fee correlation to raw attribute total. Eight attributes are currently irrelevant to Tribute power, and a high correlation would demonstrate that the game is charging players for facts they cannot use.

### 4.2 Starting Tribute weight vector

For the first playable use

`fee₀ = roundHalfUp(1.00×P_V + 1.00×P_S + 1.25×P_B + 0×T + 0.50×A + 0×G)`

where:

| Term | Definition | Starting weight | Rationale |
|---|---|---:|---|
| `P_V` | Vanguard printed power | 1.00 | One point is one visible Bout point. |
| `P_S` | Skirmish printed power | 1.00 | Symmetric with Vanguard. |
| `P_B` | Best Bombard printed power; 0 if ineligible | 1.25 | Pays for power plus access to a third Theater. |
| `T` | Count of traits with active Tribute interpretations | **0 in first playable** | Traits are cut. Charging them would price unusable text. Start at 1.5 when the trait module is tested, then calibrate per interpretation rather than assuming all traits equal. |
| `A` | Has a secondary affinity | 0.50 | A secondary is a small flexibility option, not pure upside. Half a fee is deliberately provisional. |
| `G` | Signature/Gambit component | **0 in first playable** | Signatures already affect Bombard when projected; charging a constant again double-counts them. Add a Gambit-specific value only when Gambits ship. |

This is a starting vector, not a ratified cap. Graviclaw's pilot derives `P_V=8`, `P_S=2`, `P_B=0`, `A=1`, so `fee₀=roundHalfUp(10.5)=11`. That is a worked fixture, not evidence that 11 is typical.

The v2 proposal's `w_T=2` and constant `w_G=1` should not be used in v1. Both would charge for modules the player cannot activate; the signature constant would also add the same amount to every card and do no sorting work.

### 4.3 Weight fitting procedure

Use the batch in §1 and perform five passes:

1. **Single-card placement value.** In matched public board states, substitute one card at a time and measure change in win probability and cheapest-winning-plan cost. Use all legal Theater placements and Condition exposures.
2. **Paired component isolation.** Match cards within ±1 Vanguard and Skirmish point, then compare Bombard eligible versus ineligible; match printed powers and compare mono versus secondary affinity. This decides whether `1.25` and `0.50` represent option value rather than correlation.
3. **Deck-swap value.** In fee-near decks, replace one card with another and run paired bot mirrors with identical seeds, seats, and mulligans. Record marginal match-win change per fee.
4. **Constrained search.** Search weights in 0.05 increments within `0.75–1.25` for Vanguard/Skirmish, `1.00–1.60` for Bombard, and `0–1.00` for affinity. Minimize weighted error on the five objectives in §4.1. Keep Vanguard and Skirmish equal unless their measured marginal values differ by >10% in two independent batches.
5. **Human sanity pass.** Show 30 matched card pairs without fees to experienced players, ask which is the more valuable Tribute card, then reveal fees. At least 80% of differences of two or more fee should agree with the median judgment. Simulation cannot catch an illegible scalar.

When traits or Gambits later ship, freeze all earlier weights, measure the new module's marginal value, and add/version its component. Refit an old component only if the module changes that component's opportunity value by >10%.

### 4.4 Cap sweep on batch data

For each candidate vector:

1. Compute the integer fee for all 290,000 records.
2. Build the 200 ownership pools and two million planet-legal 12-card subsets specified in §1.
3. For every integer cap, record ordinary legal share, number of pools with any legal deck, median number of legal decks per pool, adversarial premium-deck rejection, element/archetype composition, and Bombard count.
4. Discard any cap failing the four gates in §1.2.
5. Among survivors, choose the **lowest** cap whose legal share is nearest 30%. Lower is preferred because future species and larger collections naturally loosen construction pressure.
6. Repeat on ten seed blocks and after ±10% perturbations to production species weights. Publish only a cap whose legal share remains within ±5 points.

Do not scale the cap from the old 180 or from “15 per card.” Those numbers belonged to a dead fee scale.

### 4.5 Platform fee versus per-spoke fee

**Recommendation: per-spoke fee, with platform-owned components and versioning.** A single platform power scalar cannot honestly price both Tribute's `strength/agility/projection` and Duel's `vitality/resilience/endurance/reflex/movement`. It either charges each player for mostly irrelevant record fields or quietly embeds the priorities of one game.

The platform should expose a canonical normalized component vector—attributes, capabilities, senses, traits, affinities, and ability intensities—plus a fee explanation contract. Every spoke publishes a versioned sparse weight vector over those components. “Battle Fee” remains the lore term; the UI says **Tribute Fee** or **Duel Fee** and shows the rules version.

If a universal scalar were nevertheless mandated, the least-bad starting sketch would be:

`PlatformFee = roundHalfUp(0.30×Attr + 0.15×Cap + 0.10×Sense + 1.50×Traits + 2.00×Affinity + 0.50×Signature + 0.50×RolledAbility)`

| Component | Full-record definition |
|---|---|
| `Attr` | Sum of `ceil(attribute/10)` over all 10 attributes; a zero remains zero. |
| `Cap` | Sum of `ceil(capability/10)` over all 7 capabilities; a zero remains zero. |
| `Sense` | Sum of `ceil(sight/10)`, `ceil(hearing/10)`, and `ceil(smell/10)`. Special senses need interpretation, not an automatic premium. |
| `Traits` | Total guaranteed plus rolled traits, maximum 3. This assumes every trait has platform option value, an assumption no individual spoke can rely on. |
| `Affinity` | Secondary grade divided by 50; zero for mono-affinity. This ranges just above 0 to 1.98. |
| `Signature` | Mean of `ceil(realized signature intensity/10)` and `ceil(signature-band midpoint/10)`, resolving the band from the record's pinned species-template snapshot. This prices both this individual's roll and the species' authored signature floor without consulting current content. |
| `RolledAbility` | Mean `ceil(intensity/10)` over non-signature abilities. |

On the Graviclaw pilot, using its ratified `[60,90]` signature band, `Attr=61`, `Cap=20`, `Sense=14`, `Traits=3`, `Affinity=0.88`, `Signature=8`, and `RolledAbility=4.67`, producing a platform fee of about **35**. Tribute's starting fee is **11** because it sparsely projects only Strength 8, Agility 2, no projected ability, and the affinity option. The 24-point difference is not healthy cross-game texture; it is mostly a tax on facts Tribute cannot exploit. This example is why the universal scalar should remain a diagnostic “record capability index,” not a deck legality currency.

## 5. First-playable procedure delta

Everything not listed here survives from `tribute-design-supplement-codex.md` §5–6: exact 12-card deck, draw 10, set-aside mulligan up to two, no later draw, alternating starters, permanent pass, Bout resolution, more-cards-remaining tie-break, first-passer tie-break, discard, best of three, deterministic bot jitter, and the public-information-only rule.

| Procedure point | v2 delta |
|---|---|
| **Deck registration** | Validate immutable record IDs against current ownership, the season's `tributeRulesVersion`, the record's pinned registry snapshot, the new per-spoke fee, an exact cap selected by §4.4, and at most four primary planets. Publish each card's V/S/B, fee, primary/affinity, archetype, and Bombard source. Do not publish the hidden draw order or hand. |
| **Printed power** | Use `P(v)=max(1,ceil(v/10))`, not bare `ceil(v/10)`. Attributes may legally be 0; v2's claimed 1–10 range otherwise has a 0 edge case. Bombard intensity is already 1–100. |
| **Vanguard / Skirmish** | Vanguard reads Strength; Skirmish reads Agility. Both are always legal placements. Reflex, flight, and all other capabilities are ignored in v1. |
| **Bombard eligibility** | Read the pinned delivery edge of every ability, including the signature. Eligible if at least one edge maps to Bombard. `body` is not automatically added. |
| **Bombard power** | Maximum printed intensity among Bombard-eligible abilities, including the signature. The card face names the ability supplying the maximum; ties show the signature first, then stable ability ID order. |
| **Condition resolution** | Use endpoint zero-remap, graded blend, round-half-up per card, and minimum contribution 1 from §3. One active Condition per Theater, one Decree play per player per Bout, replacement/spending, expiration, and pass restrictions remain unchanged. |
| **Decree loadout** | Replace the legacy six with Psychic, Rock, Water, Air, Ice, and Electric provisionally. The batch gate ratifies the exact Standard set. Decrees remain two distinct public choices outside the creature deck. |
| **Court Favor** | Start at **+1**, because the board still uses a 1–10 printed scale. Ratify over **10,000 paired bot mirrors** and at least 500 human/Bot or human mirrors: starter Bout win rate 48–52%, with the 95% interval wholly inside 47–53%. If it fails, test 0 then +2; never use a fractional Favor. |
| **`gain(c,r)`** | The current conditioned contribution derived from Strength, Agility, or the best projected ability intensity, plus only modules active in the rules version. In naked v1 there are no trait or Kindred modifiers. |
| **`reserve(c)`** | `max(P_V, P_S, P_B if eligible)` before Conditions. It is the best legal unconditioned contribution, not the maximum intensity over all abilities. |
| **`flex(c)`** | Redefine as `number of legal Theaters − 2`: 0 when Bombard-ineligible, 1 when eligible. The old `−1` definition no longer has a meaningful zero because every v2 creature can enter two Theaters. |
| **`risk(c,r)`** | Current gain minus the worst contribution under any opponent Decree still public and unspent, using the card's full graded affinity and minimum-1 rule. |
| **`q60` / opponent model** | For every unseen public-roster candidate, derive Strength, Agility, projected ability maximum, and affinity from its immutable record. Do not infer from species averages. |
| **Cheapest winning plan** | Subset enumeration is unchanged, but each candidate card uses its best **current** legal conditioned placement. When considering a Bombard card, the reserve cost uses its unconditioned projected maximum. |
| **Bot Decree score** | Recompute both sides card by card with graded affinities. No row-average multiplier shortcut. The future-swing estimate uses actual unseen-roster affinity profiles. |
| **Trait interpretation** | All trait effects, including `stealthy`, remain disabled in first playable. Their mere presence does not alter fee or bot evaluation. |
| **Kindred** | Disabled in first playable. When enabled, it keys on `archetype.key`, not planet, and grants a flat +1 to each participating card once at least two same-key cards share the Theater. It never increases per additional same-key ally. |
| **Gambits** | Disabled in first playable. When enabled, a card is spent face-down as its signature ability only; signature action interpretation and intensity scaling use a separate versioned table. |

### Bot fields, restated compactly

The bot may read public immutable records, the season derivation table, public roster, played/discarded identities, visible Conditions, scores, hand counts, Decree loadouts, and Bout score. It may read its own hand. It may never read the opponent's hand, draw order, or a concealed `stealthy` identity. The prior pass thresholds, `MUST_WIN/CAN_YIELD/EVEN` states, 1,024-subset helper, and 15–30% thin-lead bluff remain the first tuning baseline; only their derived inputs change.

## 6. Answers to the four open questions

### 1. Platform-wide fee or per-spoke fee?

**Per-spoke.** Centralize component normalization, explanations, and rules-version storage on the platform, but let Tribute and Duel publish sparse weights. A universal record index may exist for collection sorting; it must not gate decks. The Graviclaw 35-versus-11 worked example shows the universal tax problem concretely.

### 2. `0 → 0.25` or lethal zeroes?

**Keep 0.25, applied to matrix endpoints before blending, with minimum card contribution 1.** At 75% mono-affinity, raw zeroes are frequent deterministic deletions, not rare dual-type accidents. Lethal zeroes make Decree availability more important than pass skill and force the Standard set to avoid much of the matrix. Quarter-power retains a hard counter while preserving a player's spent card.

### 3. Bombard from abilities despite the asymmetry?

**Yes.** Strength, Agility, and projected intensity are three honest 0–100 measurements even though they live in different layers. Substituting Willpower or Intelligence would falsely imply spellcasting and would ignore the record's most expressive layer. Price Bombard's third-Theater flexibility and expose its source ability on the card. Correct the access distribution through authored instruments and delivery tags, not a fake third attribute.

### 4. Delivery-class registry tags?

**Yes, on instrument-action edges, not actions alone.** Retain beam/hurl/spray/burst/cloud as the provisional projected family, but classify the actual edge so local `body + burst` and `aura + cloud` are not treated like ranged artillery. Pin those tags in `generatorVersion`, and let all games map the descriptive classes rather than infer them independently.

## 7. Shippable-game gaps and rulings

### 7.1 Ownership, trade, seasons, and immutable records

| Gap | Required rule |
|---|---|
| **Trade after deck save** | A saved deck is a list of IDs, not a reservation. A trade immediately marks every saved deck containing that ID invalid. Show the missing owner/slot; never substitute another individual. |
| **Trade during queue or match** | Queue entry atomically validates ownership and creates a signed match roster snapshot. The creature is soft-locked from trade until the match ends or the queue reservation expires. A match uses the snapshot even if an administrative transfer later occurs. |
| **Mid-season derivation patch** | Every deck and match stores `tributeRulesVersion`. Standard legality, fee weights/cap, delivery mapping, trait table, and Decree set freeze for a season. A new version revalidates saved decks between seasons; it never changes an active match. |
| **Old generator versions** | Old records remain legal if their pinned registry can supply every required derivation. Unknown traits are ignored; unknown delivery edges make the ability non-Bombard until that rules version explicitly maps them. Never resolve an old record against “current” registry vocabulary. |
| **Invalid or corrected record** | The platform needs the signed external errata/quarantine layer already parked by the master audit. A quarantined record cannot enter a new queue; completed historical matches remain intact. No record field mutates. |
| **Append-only history** | Tribute may write `deck_registered`, `match_started`, `bout_result`, and `match_result` events, but gameplay and ownership validation never depend on reading history. Current ownership is platform state, not inferred from a chain of trade events. |
| **Simultaneous deck use** | One owned creature may appear in multiple saved decks but in only one active competitive match reservation at a time. Bot/tutorial play does not reserve it. |

### 7.2 Hidden information and `stealthy`

The draft trait cannot work if the public total immediately reveals its exact contribution. When the trait module ships:

- A stealthy card is played as an opaque occupied slot. Its ID, element, archetype, base power, conditioned contribution, and source ability are hidden from the opponent until Bout resolution.
- The opponent's row and Bout totals show a known subtotal plus `?`; the owner sees the exact total. Decrees still affect it immediately but do not reveal the result.
- The public-information bot forms a belief set from the opponent's public roster minus seen/discarded cards, constrained by the legal Theater. It weights candidates by mulligan/draw likelihood and never reads the hidden ID.
- Pass copy changes from “opponent needs 7” to a bounded statement such as “visible lead 7; 1 concealed card.” Exact pass prompts are restored after reveal.
- At Bout resolution, reveal all concealed cards in stable play order, recalculate, then apply normal tie-breaks. A facedown Gambit and a stealthy body require distinct backs/icons so legal action type remains public.

This is a post-v1 module because it changes the information economy and invalidates the current exact-score bot heuristic; it is not a small passive keyword.

### 7.3 Card face and ten-attribute readability

Do not place ten equal numbers on the competitive card face. The card is a court dossier with progressive disclosure:

| Layer | Always visible | On inspect / binder expansion |
|---|---|---|
| **Play face** | Art/silhouette, name/serial, Tribute Fee, large V/S/B triangle, Bombard source icon/name or lock, primary plus graded secondary, archetype badge, legal-Theater highlights | — |
| **Tactical drawer** | — | Strength and Agility raw values; all projected abilities and intensities; Condition calculation; fee component explanation; active Tribute trait readings |
| **Full dossier** | — | All 10 attributes in two labeled groups, seven capabilities, senses, physiology, all traits, all abilities, provenance, appearance, and canonical descriptions |

The ten attributes should be a single fixed-order horizontal bar list, not a radar chart: radar area exaggerates differences and is poor for exact comparison. Keep canonical names visible; highlight Strength and Agility with Theater colors. Bombard deliberately points to an ability, visually teaching why the third value is different. Every color encoding also needs an icon/text label.

### 7.4 Record and registry preflight gaps exposed by the pilot

The only sample is not yet a safe golden fixture against the final ratified registries:

- Its anatomy contains `walking-legs`, which the consolidated 34-key vocabulary does not include; ordinary legs were explicitly cut as locomotion-only.
- It declares `mind` as an instrument, but the final channel predicate requires Psychic element/sense or guaranteed `telekinetic`/`hypnotic`. The record shows Dark/Ghost, tremorsense, and rolled `stealthy`, so the predicate is not satisfied as written.

Resolve these before generation. Recommended correction: remove `walking-legs` from notable anatomy and either author a documented Graviclaw-specific psychic-support predicate in the species template or replace `mind` with a lore-valid channel/instrument. Do not weaken the global predicate merely to preserve a pilot artifact.

The generator linter must also verify:

- every physical ability instrument is present in species-fixed anatomy;
- every channel predicate passes;
- every ability action is permitted by its instrument edge unless it is the one authored signature exception;
- exactly one signature exists and 2–3 non-signature abilities exist;
- ability intensity is 1–100;
- the best Bombard source and delivery edge resolve under the pinned registry;
- trait count/exclusions and affinity adjacency hold;
- every Tribute printed/fee derivation is deterministic at boundary values 0, 1, 10, 11, 99, and 100.

### 7.5 Remaining first-playable requirements

| Missing system | Recommendation |
|---|---|
| **Collection onboarding** | Competitive Tribute requires 12 owned IDs across at least three planets under the four-per-planet cap. Do not relax Standard legality per player. Provide a separate tutorial using court-issued, non-tradeable fixed dossiers; unlock owned-deck Standard only when the account can register a legal deck. |
| **Deck legality explanation** | Every invalid deck shows all failures at once: missing ownership, fee over cap, planet count, duplicate ID, quarantined record, unmapped historical registry, or wrong rules version. |
| **Ability tie and ordering** | Stable IDs, not array position or localized name, break equal-intensity Bombard ties and resolve simultaneous reveals. Signature-first is presentation only; rules use stable ID order after identical contribution. |
| **Condition arithmetic UI** | At rest show final contribution. On inspect show `base × [primary 100 + secondary grade] = exact multiplier → rounded result`, including the zero-to-quarter endpoint substitution. Never show only an unexplained decimal. |
| **Decree timing** | A Decree recalculates every card in the Theater immediately, including concealed cards privately. Replacement spends the incoming Decree; the replaced Decree remains spent. There is no response window in v1. |
| **Mulligan auditability** | Match seed deterministically fixes shuffle and bot jitter. Persist set-aside IDs privately so the “cannot redraw a just-mulliganed card” rule is verifiable on replay. |
| **Reconnect / replay state** | Persist action order, rules version, roster snapshot, derived values, Condition changes, passes, and tie-break path. A replay must reproduce totals without reading live registries or ownership. |
| **Accessibility** | Theater and element never rely on color alone; Bombard eligibility needs an icon and text; face-down states announce owner, Theater, and play order without identity. |
| **Telemetry separation** | Store raw action facts and derived displayed values with the rules version. Never write bot belief states or hidden opponent cards into player-visible replay data before match completion. |
| **Balance patch policy** | Publish fee/Condition changes between seasons with old/new derivation examples. Existing records remain unchanged; saved decks are marked for review, not silently rewritten. |

## Final ratification checklist

Tribute can enter first-playable implementation planning only after all of the following design inputs exist and pass:

1. All 29 species templates validate, including Graviclaw predicate/anatomy cleanup.
2. The instrument-action delivery-edge registry is ratified and pinned.
3. The 290,000-record batch passes printed-power and Bombard gates.
4. A fee vector and exact integer deck cap pass the two-million-deck sweep.
5. The six Standard Decrees pass the actual 75/25 batch and occupied-row gates.
6. Court Favor +1 passes paired seat testing on the new derivations.
7. The season rules version, ownership reservation, invalid-deck, and record-quarantine contracts are specified.

Kindred, traits, stealth, and Gambits remain post-v1 even if their data gates pass. The first playable should answer one question cleanly: whether spending cards, threatening rows, and choosing when to pass is fun when every number is an honest derivation of an owned Xalian.
