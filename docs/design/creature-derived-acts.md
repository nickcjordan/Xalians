# Derived acts: the creature's body decides what it can do

Contract for the change Nick ruled on 2026-09-22. Supersedes the "species permissions" paragraph of `creature-model-current.md` and the migrate-species skill's "do not restore the instrument matrix" line where they conflict. Every table in this document is a lever in the sense of the repo `CLAUDE.md`: a current setting, recorded so work can proceed, movable on evidence.

## Context

Nick saw two ordinary actions with the same name on one Crystorn in Powerworks. The [naming audit](creature-ability-naming.md#collision-audit-2026-09-22) traced it to selection, and then further: the v5 species records author about three "mechanisms" each (mean 3.19 over 32 species, 78 of 102 contact-only, 72 of 102 a single plain harm effect), and the compiler only varies tempo, range and likelihood inside them. So nearly every individual carries every mechanism and differs in how fast it swings. The anatomy-derived act space that the 2026-09-01 anatomy ruling and the 2026-09-19 architecture correction both describe was never implemented in v5; the migration skill said not to restore the instrument matrix, and authors wrote one mechanism per body part and stopped at the slot count.

Nick's ruling: **derive the act space from registry tables, and let species records narrow or extend it with evidence.** "That was the original intent I have, anyways." Act-first selection and the instrument and fact vocabulary from the naming branch stay; they are what make a wide space read as variety instead of repeats.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The ratified allowed-actions matrix (41 instruments by 16 actions) and the conduit medium table (14 elements) are the source tables, translated into v5 delivery, effect and status vocabulary rather than re-argued. | 90%. Both were ratified 2026-09-01 and 2026-09-02 and are still called levers in the design doc. | `docs/ability-catalog/anatomy-consolidated.md` "Allowed-actions matrix"; `packages/rules/src/generator/constants.ts` `CONDUIT_ACTIONS_BY_MEDIUM`; `registries.json` `instrumentActions` |
| 2 | A conduit instrument gets its physical row plus the medium row (union), as v4 did. | 95%. The 2026-09-02 conduit ruling says "physical row plus the element's medium row". | `xalian-creature-system-redesign.md` "Conduits" |
| 3 | `ambush` is dropped as an act: it is closing approach with immediate preparation, both already variable facts. `hurl` survives only as a projectile harm from launching parts (spines); elsewhere it folds into `shove` or is covered by `spray`. | 80%. Ambush names timing, not a distinct thing done. Hurl on pincers, wings and tail meant throwing the target, which is a displacement. | v4 action definitions in `registries.json`; act identity in `compiler.ts` |
| 4 | `hide` and `shell` gain `strike` (a ram). The ratified row had only ward and shove, but seven authored v5 mechanisms already strike with hide, shell or body, and the roster's rams need a home. | 85%. Lever change recorded here; Nick can strike it. | v5 records: chromocat, crystorn, kosanos, venemist (hide); foromeer, graviclaw, scalatto (shell) |
| 5 | Derived output bands come from the governing attribute band times a factor per pattern class; authored v5 harm bands sit at a median 0.79 to 0.89 of the strength or willpower band, so the default factors are set there. | 75%. Measured over 79 authored harm effects; species can override any band. | measurement 2026-09-22, this document "Output" |
| 6 | Species records keep `mechanisms[]` for lore-specific acts the tables cannot express (Avilily's paralyzing saliva, Hypnopet's focusing signal, Graviclaw's pull). They are the extension half of "narrow or extend". | 95%. The schema and compiler already handle them; nothing is gained by deleting the mechanism form. | `species.ts` `MechanismSchema` |
| 7 | Innate channels become a declared species list with the ratified predicates, and conduits return as `conduits: {instrument: element}`. Both were retired by `creature-model-current.md`; Nick's ruling reopens them because the derivation needs to know where power leaves the body. | 90%. Without declarations the compiler cannot know a Crystorn's horns carry light but its fists do not. | anatomy-consolidated.md "Innate channels"; v4 conduit pairs for 15 species |
| 8 | The generator version bumps to 0.7.0 and the roster freezes as a new release ID, because CI rejects any modification of an archived release. Nick's "no new version needed" is read as releasing the ceremony, not forbidding the archive that the check requires. | 85%. `check:releases --base` fails on modified or deleted archive files. | `scripts/generationRelease.cjs` line 73 |
| 9 | The default posture reverses: anatomy grants, lore subtracts. An author excludes an act with a written reason; silence no longer means "not authored, therefore absent". | 95%. This is the ruling. | Nick, 2026-09-22 |

## The tables

All tables live in `packages/content/src/creature/acts.ts` as typed, frozen data, and are fingerprinted into the release like the rest of the catalog. `registries.json` keeps the display rows; `acts.ts` is the executable source.

### Patterns

A pattern is an act shape in v5 vocabulary. Physical patterns need an instrument row that lists them. Medium patterns need a conduit. Common defaults unless a row says otherwise: targeting `other`, preparation `immediate | brief`, recovery `repeatable | brief`, approach `stationary | closing` for contact and `stationary` for everything else, harm likelihood `consistent`, status likelihood `likely | occasional`, status intensity omitted (catalog default 50).

| pattern | delivery | effects | notes |
|---|---|---|---|
| strike | contact, range contact | harm, mechanism from the instrument row (first listed is the default; each listed mechanism is a separate act) | |
| crush | contact | harm compression | preparation `brief`, recovery `brief | prolonged` (held pressure) |
| rake | contact | harm cutting | |
| lash | contact, area sweep `small | medium` anchor self, resolved | harm on area; mechanism impact, or cutting for blades | targeting other only |
| drain | contact | harm on target, plus restore on self `requires` the harm | medium only since the species pass (see Lever moves); a biological drainer authors its own mechanism |
| shove | contact | displace away | |
| snare | contact (spinnerets: projectile `short | medium`) | status from the instrument's bind column, lingering `brief`, removable per column | |
| hurl | projectile `short | medium` | harm (instrument mechanism, or elemental through a medium) | spines only among physical rows; rock, ice and metal medium rows (thrown solid matter) |
| terrorize | signal, range `short | medium`, reception per instrument column | status frightened, lingering `brief`, removable stabilizing | a body part derives it only when the species can signal it: visual reception needs `display` communication, auditory needs `vocal` or `vibration` (Thirstaserp's rattle); channels carry their own predicates |
| ward | self, targeting self | status shielded on self, lingering `brief | prolonged`, removable disrupting | preparation `brief`, recovery `brief | prolonged`; a medium row may substitute its ward status |
| mend | two mechanisms: self delivery on self; contact (signal for the signal channels mind, gaze, voice, aura) on target `short` | restore | targeting self, or other |
| beam | stream, range `short | medium | long` | harm elemental | medium only; preparation `brief`, recovery `brief | prolonged` |
| burst | pulse, area radial `small | medium` anchor self, resolved | harm elemental on area | medium only; recovery `brief | prolonged` |
| spray | projectile, range `short | medium` | harm elemental on target, plus the medium status if the row has one | medium only |
| cloud | field, range `short | medium`, area radial `small | medium` anchor location, lingering `brief | prolonged` | medium status on area, lingering `brief` | medium only; rows without a status have no cloud |

A medium variant of a physical pattern (fire strike, ice crush, metal rake, plant snare) is the physical structure with `element` set: harm becomes `elemental`, snare uses the medium's bind status, ward uses the medium's ward status when it has one, and strike or lash add the medium status at `likely | occasional` when the row has one. Drain through a medium is elemental harm plus restore.

### Instrument rows

Patterns are the ratified matrix with decisions 3 and 4 applied. Class sets the output factor. Bind is what a snare from this part applies. Reception is what a terrorize signal from this part needs.

| instrument | patterns | harm mechanisms | class | bind | reception |
|---|---|---|---|---|---|
| jaws | strike, crush, rake, drain, snare | piercing, compression | heavy | restrained (freeing) | |
| fangs | strike, drain | piercing | light | | |
| beak | strike, crush, rake, drain | piercing, impact | light | | |
| tusks | strike, shove, rake, crush, terrorize | piercing, impact | heavy | | visual |
| horns | strike, shove, crush, ward, terrorize | piercing, impact | heavy | | visual |
| antlers | strike, shove, snare, terrorize | impact | heavy | restrained (freeing) | visual |
| trunk | lash, snare, shove, strike | impact | heavy | restrained (freeing) | |
| tongue | lash, snare, strike, drain | impact | light | restrained (freeing) | |
| crest | terrorize, ward | | light | | visual |
| lure | snare | | light | entranced (disrupting) | |
| claws | strike, rake, crush, shove | cutting, piercing | light | | |
| talons | strike, rake, crush, snare | piercing, cutting | light | restrained (freeing) | |
| fists | strike, crush, shove | impact | heavy | | |
| hooves | strike, crush, shove | impact | heavy | | |
| pincers | strike, crush, snare, shove, ward | compression, cutting | heavy | restrained (freeing) | |
| blades | strike, rake, lash | cutting | light | | |
| spurs | strike, rake | piercing, cutting | light | | |
| wings | strike, lash, shove, ward | impact | light | | |
| tail | strike, lash, crush, shove, snare | impact | heavy | restrained (freeing) | |
| stinger | strike, drain, terrorize | piercing | light | | none |
| rattle | ward, terrorize | | light | | auditory |
| coils | crush, snare, shove, ward | compression | heavy | restrained (freeing) | |
| hide | strike, ward, shove | impact | heavy | | |
| shell | strike, ward, shove, crush | impact | heavy | | |
| spines | strike, rake, ward, hurl | piercing | light | | |
| tendrils | lash, snare, crush, drain, shove, strike | impact, compression | heavy | restrained (freeing) | |
| roots | snare, strike, shove, drain, ward | compression, impact | heavy | restrained (freeing) | |
| pseudopods | strike, crush, shove, snare, lash, drain | impact, compression | heavy | restrained (freeing) | |
| spinnerets | snare, ward | | light | restrained (freeing) | |
| light-organs | ward, terrorize, mend | | light | | visual |
| vents | ward | | light | | |
| core | ward | | light | | |
| antennae | lash, snare | impact | light | restrained (freeing) | |
| body | strike, crush, shove, ward, terrorize | impact, compression | heavy | | visual |
| mind | snare, shove, crush, drain, ward, terrorize, mend | compression | channel | entranced (disrupting) | none |
| gaze | terrorize, snare | | channel | entranced (disrupting) | visual |
| voice | terrorize, ward | | channel | | auditory |
| breath | | | channel | | |
| secretion | snare, ward, mend | | channel | restrained (cleansing, freeing) | |
| swarm | strike, drain, snare, rake, terrorize | piercing | channel | restrained (freeing) | visual |
| aura | ward, terrorize, mend | | channel | | none |

Channel delivery: mind, gaze, voice and aura deliver by signal at `short | medium`; secretion and swarm deliver by contact. Medium patterns fix their own delivery (beam is always a stream). Crest, light-organs, vents, core and breath are emitters: without a conduit they contribute little or nothing, which is the ratified reading (the element is the power, the part is the outlet).

### Medium rows

What an element can do when it leaves through a declared conduit. Patterns are the ratified conduit table with hurl folded per decision 3. Status is applied by spray and cloud and added to strike and lash. Bind replaces the instrument's bind for a medium snare. Ward replaces shielded.

| element | patterns | status (removable) | bind (removable) | ward |
|---|---|---|---|---|
| fire | strike, beam, spray, burst, cloud, lash | burning (cooling, smothering) | | |
| water | spray, burst, cloud, snare, shove, mend, lash | slowed (warming) | restrained (freeing) | |
| dark | snare, crush, shove, drain, burst, ward, terrorize | | pinned (freeing) | |
| light | beam, burst, ward, mend, terrorize, spray | blinded (stabilizing) | | |
| plant | snare, ward, mend, lash, cloud, spray | sedated (stabilizing) | restrained (freeing) | |
| electric | beam, burst, lash, strike, snare, spray | stunned (stabilizing) | paralyzed (stabilizing) | |
| ghost | terrorize, drain, cloud, snare, ward | frightened (stabilizing) | restrained (freeing) | phased |
| rock | ward, crush, burst, shove, strike, hurl | | buried (freeing) | reinforced |
| chemical | spray, cloud, burst, drain, snare | corroding (cleansing) | restrained (cleansing, freeing) | |
| air | shove, burst, cloud, lash, ward | disoriented (stabilizing) | | |
| psychic | burst, snare, terrorize, ward, mend, drain, shove | disoriented (stabilizing) | entranced (disrupting) | focused |
| ice | snare, ward, spray, burst, crush, mend, hurl | chilled (warming) | frozen (warming) | |
| metal | strike, ward, beam, crush, rake, hurl | | | reinforced |
| sand | cloud, spray, drain, snare, burst, rake | blinded (cleansing) | buried (freeing) | |

Water's status is the one invention here: the catalog has no soaked state, and slowed by drag is the nearest honest reading. Dark is gravity, per the 2026-08-30 element fantasy ruling, so its bind is pinned and it has no spray or cloud.

### Output

Every derived harm, displace and restore effect gets a band from a species attribute band times a factor. Factors are levers in `acts.ts`:

| effect | governing attribute | factor |
|---|---|---|
| physical harm, heavy instrument | strength | 0.85 |
| physical harm, light instrument | strength | 0.65 |
| lash (area harm) | strength | class factor times 0.8 |
| displace force | strength | 0.8 |
| elemental harm (beam, burst, spray, medium strike) | willpower | 0.85; burst 0.7 |
| channel harm (mind crush, swarm strike) | willpower | 0.75 |
| restore (mend, drain) | vitality | 0.6; drain 0.4 |

Bands round to integers and floor at 1. A species may override a band per act (below). Statuses keep the catalog default unless overridden.

### Lever moves from the species pass, 2026-09-22

The two halves of the roster pass reported the same friction from opposite ends, and four settings moved before the freeze:

1. **Physical drain is medium-only.** Seventeen of 32 records had excluded a life drain from every mouth, tendril or root. A drain now derives only through a dark, ghost, chemical, sand or psychic conduit; Thirstaserp's dehydrating venom and Neph's suction stay authored.
2. **A part's terrorize needs a signal.** Bioflim (no communication) and Frackworm (nearly blind, vibration only) were granting threat displays. Visual reception now requires `display` communication and auditory requires `vocal`; mind, gaze, voice, swarm and aura keep their own predicates.
3. **Rock, ice and metal can hurl.** Terragoyle's whole identity is thrown boulders and the rock row had no ranged delivery but burst. Thrown solid matter is a projectile elemental harm on those three rows.
4. **Mend through any signal channel is a signal.** A psychic conduit on gaze was deriving a repair delivered by touch.

Kept as they were, with the reason: tail and spur harm rows stay impact-only and piercing-or-cutting-only respectively (a bladed or drilling tail is what an authored mechanism is for, and widening the row would hand every fluffy tail a blade); hide and shell keep strike (decision 4) and the band scales with strength, so a small body's ram is weak rather than absent; `body/terrorize` on species with display communication stays. Two judgment calls are recorded for Nick, not ruled: Chromocat's light spray can blind while Crystorn's audit excludes dazzle, and Hypnopet's "support only" audit was read as no harm required rather than harm forbidden.

## Species record changes

Additive fields on the v5 species schema, schema version unchanged at 5.0.0:

```json
{
  "channels": ["secretion"],
  "conduits": { "horns": "light" },
  "acts": {
    "exclude": ["horns/terrorize", "fists/*", "*/drain"],
    "output": { "horns/beam": [48, 75] }
  },
  "mechanisms": [ ...authored extensions, unchanged shape... ]
}
```

- `channels` lists the innate channels this species has, validated by the ratified predicates: `voice` needs vocal communication, `breath` needs a nonempty breathes list, `swarm` needs the swarm body plan, `mind` needs telepathic communication or a psychic special sense or the psychic element, `gaze` needs sight above zero throughout the band, `secretion` and `aura` are declared with lore justification in the audit. Any guaranteed or authored ability using a channel must have it declared.
- `conduits` maps instrument to element. The instrument must be in anatomy or channels. The element must be the species element, unless a guaranteed or authored ability already uses that instrument with that element (Neph's freezing Benthane precedent), so no species acquires a new element by declaration alone.
- `acts.exclude` removes derived acts by `instrument/pattern`, with `*` on either side. Every exclusion needs a reason in the species audit. `acts.output` overrides the derived band for one act.
- `mechanisms` is unchanged in shape and meaning: acts the tables cannot express. An authored mechanism whose every act identity is also derived is redundant and the species pass removes it.

## Compiler

`deriveMechanisms(species): Mechanism[]` in `acts.ts` builds, for every instrument in anatomy and channels, one mechanism per allowed pattern (and per harm mechanism for strike, drain and hurl), then for every conduit one mechanism per medium pattern, applies exclusions, and fills output bands. Each derived mechanism has key `derived-<instrument>-<pattern>[-<mechanism>][-<element>]`, a plain generated name and description, and the same `Mechanism` shape as an authored one, so `branchesFor`, act-first `select`, alias matching and naming run unchanged over `[...derived, ...species.mechanisms]`.

Guaranteed actions and passives are untouched. The four-action proof, act identity, naming and the collision guardrail are untouched. Overlap between a derived act and an authored one is handled by the existing alias exclusion; it raises that act's sampling weight, which is acceptable and documented.

## Guardrails

- `check:creature-model` prints, per species, the number of distinct acts on offer and a breakdown by instrument, the exclusions in force, and the existing naming line.
- `creatureActs.test.ts` (content): every instrument row pattern is a known pattern; every status in the tables is a catalog status; a synthetic species per instrument compiles and every derived mechanism passes `MechanismSchema`; a synthetic conduit species per element compiles.
- `creatureCanonicalPilot.test.ts` (rules) gains: every canonical species offers at least `MIN_DISTINCT_ACTS` (8) distinct acts, and every anatomy instrument contributes at least one act unless excluded.
- The collision guardrail stays at 2% over 120 seeds.
- The migrate-species skill replaces its "do not restore the matrix" line with: declare channels and conduits from evidence, read the act breakdown, exclude with a reason, author a mechanism only for what the tables cannot say.

## Species pass

For each of the 32 records: declare `channels` from current usage and the predicates; declare `conduits` from the v4 pairs and every authored elemental ability (15 v4 pairs plus Neph's ice, Yetimoth's three, Figzy's fists); remove authored mechanisms that derivation now covers; keep the rest; add exclusions only where the audit or lore contradicts a derived act, with the reason written in the audit; append a dated "Derived acts" section to each audit with the breakdown line. Descriptions stay verbatim. Guaranteed actions and passives do not change.

## Release and games

Generator 0.7.0, schema 5.0.0, release `generation-0.7.0-1` frozen from the same entry point; `generation-0.6.0-1` stays archived. Powerworks and Reclamation read the canonical entry point and switch with it. Powerworks: rerun the 200-run sim, re-pin the two seed-1 assertions, re-check the four companion seeds still teach the intro (Avilily paralysis, a charger to interrupt, a puller), and update the contract's pass tables. Reclamation: rerun the 300-match simulator and record the numbers in its design doc.

## Measurements

Filled in as the work lands.

| reading | before | after |
|---|---|---|
| mechanisms per species (mean) | 3.19 authored | |
| distinct acts per species (min / median / max) | | |
| species below 8 acts | 18 of 32 (coarse identity) | |
| parenthetical share, collision share (120 seeds) | 0.00% / 0.00% | |
| Powerworks win rate, mean rounds | | |
| Reclamation fairness | | |
