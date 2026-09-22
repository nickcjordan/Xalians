# Reclamation: the status layer

Pass 32. Nick ratified the layer on 2026-09-21 ("We should build the status layer. If a creature obtains a status as the result of an enemy attacking them, that's something I would like to support"), then ruled the shape of it across several follow-ups recorded in "The rulings" below.

## Why this pass exists

Schema v5 retired `restrain`, `transfer` and `suppress` as effect types and moved that expressiveness into `status`. Reclamation read the v4 vocabulary, so after the v5 conversion every status-carrying effect fell through to `UNSUPPORTED_EFFECT_WORDS.status`, whose sentence read "applies a lasting condition the frame does not carry between worlds". Measured over the frozen release (`generation-0.6.0-1`, seed 7, 320 creatures, 1280 actions):

- 276 actions (21.6%) were unsupported, nearly all of them status-only
- 17 creatures (5.3%) were unfieldable, Hypnopet at 10 of 10 because entrancement is its whole identity
- 178 creatures (55.6%) carry at least one status effect somewhere in their repertoire

So this is not a niche feature. It is the majority of the pool, and one species was entirely locked out of its own game.

There is a second reason. The engine already had a `pinning` rule (pass 8) that keyed off `effectKind === 'restrain'`. That effect type does not exist in v5, so **the pinning mechanic has been silently inert since the conversion** and the balance numbers recorded in its comment (57.5 versus 58.7 percent win rate) describe a v4 game that no longer runs. This pass does not add pinning, it restores it on a v5 footing and generalizes it.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Statuses group into concepts, not one mechanic per status | 95% — Nick's ruling; the catalog's own definitions sort cleanly | `packages/content/src/creature/catalog.ts:41-57` |
| 2 | Attrition is exactly the three statuses the catalog marks with `harm` | 99% — read from the data, not inferred | `catalog.ts:71-73` |
| 3 | `slowed` is Diminished, not Held | 90% — its definition deliberately contrasts against the immobilizing four | `catalog.ts:43`, "Movement remains possible but is impaired" |
| 4 | Sense-specific statuses need no sense-specific mechanic | 85% — the Proving has no line of sight and no sound to model | no LOS anywhere in `expeditionRules.ts` |
| 5 | Half power for Diminished, flat, not scaled by `intensity` | 90% — Nick ratified with intensity explicitly kept as a later lever | this doc, "The rulings" |
| 6 | Statuses live on `BoardEntry` and die with the frame for free | 95% — measured, not assumed | `expeditionRules.ts:2078`, `board: emptyBoardForFrame(nextFrame)` |
| 7 | Five statuses stay cosmetic rather than getting invented mechanics | 95% — Nick ratified; no board feature for them to touch | this doc, "The rulings" |

## The rulings

Nick, 2026-09-21, in order:

1. **Statuses persist within a world, clear on a new one.** "I feel like retaining the status between rounds within the same world makes sense, but obviously, once the round is over and we are on a new world, any statuses would be gone."
2. **Two buckets by effect on a creature.** "Find any statuses that are directly applicable to certain conditions that affect a creature's ability to attack and make those reduce its ability in some way or another, but the rest of the statuses like burning etc just reduce their health aka hold."
3. **Concept first, not one-to-one.** "We should decide on which concept should be supported and then decide which statuses fit within those concepts... maybe all those just get lumped into one category of being less effective on your turn."
4. **Half power, intensity deferred.** "We can do a default of half for now with the caveat that we know we have the ability to go in and implement the intensity later."
5. **The unmapped five are cosmetic.** "The ones you mentioned, like concealed and phased, could be used for aspects of deciding how they animate or how their creature looks... but it can just be cosmetic stuff for this game."

## The four concepts

All 29 catalog statuses, sorted by what they do to a creature in the Clash. Counts are applications across the seed-7 pool of 320 creatures.

### Attrition (67 applications), this is hurting you

`burning`, `corroding`, `poisoned`.

Exactly the three the catalog gives a `harm` field. Each reduces hold at the top of every round it survives. The schema decided the membership of this bucket, not the game.

### Diminished (108 applications), you are less effective on your turn

`overheated`, `chilled`, `slowed`, `blinded`, `deafened`, `disoriented`, `frightened`, `sedated`, `stunned`, `paralyzed`, `entranced`.

Every definition here is "impairs functioning", "disrupts responses", "reduces alertness" or "interferes with behavior", with no harm attached. A diminished creature lands its blows at **half power**. The reduction does not stack: several diminished statuses at once still means half, so a creature cannot be reduced to nothing by an accumulation of small conditions.

Half is chosen as the `intensity` default of 50 on the catalog's 0 to 100 scale, so the number comes from the data model rather than from taste. Scaling by each application's own `intensity` is a live lever, deliberately not pulled: a 40 percent reduction and a 55 percent one are indistinguishable in playback, and the flat version needs to prove too blunt first.

### Held (73 applications), you do not swing at all

`restrained`, `pinned`, `frozen`, `buried`.

Four statuses whose definitions all describe a force physically preventing movement. A held creature does not land its attack this Clash. This is the pass 8 pinning rule, restored on v5 footing and widened from one dead effect type to four live statuses.

A hold does not stop a creature HOLDING its world, only attacking. That constraint is inherited from pass 8 and kept for the same reason: it keeps the rule from becoming a second way to remove a creature.

### Boons (45 applications), mostly self-applied

`mending`, `shielded`, `reinforced`, `protected`, `stimulated`, `focused`.

`mending` restores hold at the top of each round. `shielded`, `reinforced` and `protected` feed the protection layer, which `effectiveProtection()` in `packages/content/src/creature/semantics.ts` already computes. `stimulated` and `focused` are the mirror of Diminished and restore full power, cancelling a diminishment rather than exceeding full strength.

### Cosmetic (30 applications), carried, shown, not simulated

`concealed`, `revealed`, `marked`, `phased`, `dispersed`.

The first three are about detection and targeting; the Proving has no hidden information during a Clash and picks targets by role and speed order, so there is nothing for them to bite on. The last two are traversal (the catalog attaches literal `traversal: 'phase'` and `traversal: 'seep'`); the Proving has no geometry to pass through.

These are recorded on the entry and exposed to the UI as presentation hints, per ruling 5. They are honestly parked rather than given invented mechanics, and the table does not claim they did anything.

## Where it lives

- `statusLayer.ts` (new), in `packages/rules/src/expedition/`: the concept map, and the pure functions that answer "what does this set of applications do to this creature". One file, so the buckets are readable in one place.
- `recordReading.ts`: status effects stop being unsupported. A status-only action aimed at another creature becomes a real act.
- `expeditionRules.ts`: the resolution loop reads Held instead of the dead `declaration.restrains`, multiplies Diminished into `hurtFactor`, and ticks Attrition and `mending` at the top of each round.
- `types.ts`: `BoardEntry.statuses`, carried through to `PublicBoardEntry` so the UI can show and animate them.

## What the frame model turned out to be

Found while wiring the tick, and it corrected the design: **a world sees exactly one Clash.** A frame is one Deploy in which the seats alternate sends; the moment both pass, the engine runs Resolve then Judge then advances the frame and empties the board (`expeditionRules.pass` -> `runResolveAndJudge`, then `board: emptyBoardForFrame`). Measured with a probe: 22 creatures can be sent into one world across a frame, producing one Clash with 39 attack events.

So "rounds within a world" means the alternating send turns before the Clash, not repeated Clashes at the same world. The consequence for this pass, stated plainly rather than papered over:

- **DIMINISHED works fully.** The Clash resolves creatures in speed order, so a creature blinded by a faster enemy swings later in that same Clash at half power. This is measured in `statusInClash.test.ts` against a control that differs only in the status.
- **HELD works fully.** Same reasoning: a hold landed by a faster creature takes the slower one's swing away before it happens.
- **ATTRITION has nowhere to fire today.** There is no second Clash at a world for a burning creature to be burned in. The arithmetic is built and unit-tested, the tick is wired into `resolve()`, and it does nothing at the current frame shape. The test for it asserts exactly that, so a passing suite is not mistaken for a working feature.
- **BOONS are partly in the same position.** `stimulated` and `focused` cancel a diminishment within the Clash and work. `mending` ticks between Clashes and so, like attrition, has nowhere to fire.

This is friction worth reporting rather than working around (CLAUDE.md, "report friction in the moment"). Attrition becoming real needs either more than one Clash per world or a Clash that resolves in more than one exchange. That is a change to the shape of the game, not a tuning lever, so it is Nick's call and not taken here.

## Verification

Every gauge is audited both ways per the standing discipline: break what it measures and confirm failure, then run against healthy code and confirm it passes.

**Unit tests** (`statusLayer.test.ts`, 22 assertions). Broken four ways, each caught, healthy code green:

| Break | Result |
|---|---|
| `chilled` sorted into attrition (the real mistake an earlier draft made) | 1 failed |
| `slowed` sorted into held | 2 failed |
| diminishment stacks multiplicatively | 1 failed |
| a maintained hold outlives its holder | 1 failed |

**Engine tests** (`statusInClash.test.ts`, 8 assertions). Broken three ways at the seams that matter:

| Break | Result |
|---|---|
| acts never register a hold | 1 failed |
| statuses never applied to an entry | 1 failed |
| `isHeld` gutted | 1 failed (after the derived-field test was added; it did NOT fail before, which is why that test exists) |

**Fieldability**, frozen release, seed 7, 320 creatures, 1280 actions:

| | before | after |
|---|---|---|
| unsupported actions | 276 (21.6%) | 15 (1.2%) |
| unfieldable creatures | 17 (5.3%) | 0 (0.0%) |
| Hypnopet unfieldable | 10 of 10 | 0 of 10 |

The 15 that remain are the remove-only actions, deliberately still unsupported.

**Simulator**, 300 matches per seed, against main at the same seeds:

| gauge | band | main (7 / 13 / 21) | this pass (7 / 13 / 21) |
|---|---|---|---|
| resolve mattered | 25-40% | 26.6 / 25.1 / 26.3 | **30.5 / 28.8 / 29.6** |
| downs per match | 3-5 | 5.17 / 5.00 / 5.32 | 5.45 / 5.44 / 5.67 |
| comeback | 30-40% | 28.0 / 30.7 / 29.9 | 29.6 / 30.8 / 22.1 |
| strike keeper | 40-60% | 61.2 (out) | **59.4 / 59.8 / 60.3** |
| sweep keeper | 40-60% | 62.8 (out) | **57.4 / 59.7 / 60.5** |
| bolster keeper | 40-60% | 45.4 | 45.3 / 47.7 / 43.6 |
| shield keeper | 40-60% | 52.5 | 55.3 / 53.6 / 52.3 |
| fallback sends | 0% | 0.0 | 0.0 |
| errors | 0 | 0 | 0 |

Read honestly:

- **Resolution matters more.** 26.6 -> 30.5 on seed 7 and in band on all three. Statuses give the Clash more ways to change who holds a world, which is the gauge that four earlier passes could not move.
- **Strike and sweep came back into band.** Both were above 60 on main. Afflicting acts give non-strike creatures something to do in a fight, which flattens the strike premium.
- **Downs per match goes further out of an already-breached band.** Main was 5.00 to 5.32 against a ceiling of 5; this reads 5.44 to 5.67. The pass makes an existing problem slightly worse rather than creating one, and it is the one number here moving the wrong way. `magnitudeScale` is the named lever for it (assumption 28) and is not touched in this pass, because retuning the whole game's damage scale off the back of a feature pass would hide what the feature did.
- **Comeback on seed 21 fell to 22.1** from 29.9, while 7 and 13 held. One seed of three moving outside an interval is worth recording and watching rather than acting on.

### One regression found and fixed inside the pass

The first simulator run read **fallback sends 3.2 percent against 0.0 on main**. Cause: `buildActs` classed every non-ATTACK role as SUPPORT, so an afflicting act was support, so `blowActOf` found no attacking act for a creature whose only act applies a condition and sent it in swinging the synthetic `MIN_BLOW_MAGNITUDE`. An afflict aimed at an enemy is an attack at this table, so it now classes with the attacks; an afflict aimed only at itself stays support. Fallback returned to 0.0 percent and every other gauge improved with it.
