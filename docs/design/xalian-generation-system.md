# Xalian generation system: Generators, tokens, and targeting

Status: proposal, 2026-09-11. Not ratified. Written at Nick's request after the species-rarity discussion, which settled that no species is intentionally rare and that scarcity should come from mechanisms rather than from a rarity field. This doc proposes those mechanisms. Nothing here is implemented except where section 7 says so.

## Context

`GET /xalians/showroom` and `POST /xalians` currently pick a species uniformly from all thirty, then set the record's `origin` to that species' home planet. That is backwards against both the lore and the record schema: `ProvenanceSchema.origin` is documented as "planet key the generator ran on", and in canon a Generator is a planet-bound machine that bioengineers life adapted to its own world. The machine does not follow the creature. The creature follows the machine.

Every species record already carries `generatorPlanets`, a non-empty list of planet keys, currently equal to its home planet in all thirty cases. Nothing in `packages/rules` reads it. `scripts/buildCodex.js` reads it as "other worlds" where a species can be generated. The hook for planet-bound generation is therefore already in the data and unused.

Two constraints from Nick, 2026-09-11, in his words: avoid a system "that allows someone to easily get any creature they want", and avoid one "that makes it to where you have no ability to specify what you want", including the case of spending tokens and getting back a creature you already hold while many others are unowned.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | A Scrambler Token is the genome and the Generator is what expresses it, so token maps to seed and Generator maps to the species pool plus expression context | 90%, both are stated directly in canon and the mapping onto seed and template is the only consistent reading | `packages/content/json/planets.json`, `glossary.json`, `docs/design/xalians-platform-vision-and-economy.md` section 4 |
| 2 | The same token expressed by two different Generators yields two different creatures | 70%, an inference rather than stated canon, but it follows from Generators adapting life to their own world | `packages/content/json/planets.json` Generator passages |
| 3 | Choosing a planet is choosing an element, because the mapping is one to one across fourteen planets | 95%, the planet set was built one per element | `packages/content/json/elements.json` |
| 4 | Species targeting is a small step above planet targeting, because each planet has only two or three natives | 90%, counted from the bundle | `packages/content/json/speciesRecords.json` |
| 5 | The real chase is individual quality, not species identity, because every rolled field varies within a species | 85%, the generator rolls archetype, attributes, traits, affinity, abilities, and finish independently | `packages/rules/src/generator/generate.ts` |
| 6 | The restoration tilt is per owner rather than global, so one player's pulls do not shift another's odds | 65%, a design call; global would read as more literal lore but creates shared state and a griefing surface | this doc, section 4 |
| 7 | The public showroom is a demonstration machine rather than a planet Generator, which is why it can print any species and keeps nothing | 75%, invented lore, consistent with Kozrak's documented grift and with `keepable: false` | `apps/api/src/handlers/showroomXalian.ts`, vision doc section 3 |
| 8 | Releasing a creature means returning it to its homeworld population, and can therefore grant credit rather than costing the player | 60%, a design call; the endpoint and the verb already exist | `apps/api/src/handlers/releaseRegistryXalian.ts` |
| 9 | `origin` should become the planet the Generator ran on, with species derived from it | 90%, the schema comment already says exactly this | `packages/content/src/schema/record.ts` |

## 1. Two machines, not one

Canon already splits generation into two devices, and that split is the whole design.

The **Mercurius Machine** on Valleron is the only thing that prints Scrambler Tokens. A token holds a randomly generated, encrypted genome. Kozrak controls it, and targeted genomes cost extra, which is his grift.

A **Xalian Generator** is a planet-bound machine that takes a genome and expresses it as life adapted to that planet's environment. There are fourteen, one per world, each with its own history and its own damage.

So a token is a seed, and a Generator is the context that decides what the seed becomes. A player does not buy a creature. A player buys a genome and chooses where to run it.

## 2. Three dials

**Where you run it.** The Generator decides the species pool, which is that planet's natives through `generatorPlanets`, and therefore the element. This is the primary targeting dial and the primary progression gate.

**What you feed it.** A raw token is a random genome. Kozrak's people can partially decode a token for a price, which narrows the outcome. This is the ratified pricing ladder restated in lore terms: cheap is a raw token on whatever Generator you can reach, more buys the world, premium buys a partially decoded genome that lands on a named species.

**How depleted the population is.** A Generator directed by a player who is rebuilding a population weights toward the species that population is shortest of. This is the restoration tilt in section 4. It is automatic and soft.

Nothing on any dial buys power. The dials buy precision about identity, never about quality, which preserves the ratified principle that paying more buys constraint over the roll and never strength.

## 3. What you can and cannot target

You can target the world, and therefore the element. You can pay more to target the species. You cannot target anything about the individual: archetype, attributes, traits, secondary element, abilities, and finish stay random under every profile.

This resolves the tension between Nick's two constraints. Getting *a* Smokat becomes easy once you can reach Phantiri, which is fine, because the roster is thirty and species are content that every player should meet. Getting a *good* Smokat stays impossible to buy. The scarce thing is the roll, not the name.

It also means the premium species tier is deliberately a small step. With two or three natives per world, paying to remove the last coin flip is a convenience rather than a power purchase, and it should be priced that way.

## 4. Duplicates, and why the fix is a tilt rather than a rule

A hard no-duplicate rule is wrong on three counts. It contradicts the lore, because the machine cannot know what a player owns. It turns the economy into a guaranteed completion engine, which kills the chase on a small roster. And it does not address the actual complaint, because two creatures of one species already differ in every rolled field. The frustration is perceptual: the species name and the art dominate the record, so a second Smokat reads as a copy even though it is not.

Three answers, in order of how much they cost to build.

**Lead the record with what differs.** Archetype, standout traits, and the signature ability name should register before the species name settles in. A second Smokat that opens with a different archetype and a different signature ability reads as a different animal. This is a presentation change in `RecordView` and costs almost nothing.

**Tilt toward what the population lacks.** A player is repopulating worlds, which is the canonical reason Xalians fight for tokens at all. A Generator directed by that player weights toward the species the player holds fewest of. Halving the weight per copy held, with a floor so the weight never reaches zero, keeps every outcome possible while making a fourth consecutive Smokat very unlikely. This is a tilt, not a guarantee, and it should be stated to the player as a property of the machine rather than hidden in the odds.

**Make releasing a creature a good act.** The release endpoint exists and its verb is already correct. Returning a Xalian to its homeworld population is restoration in canon, not sacrifice. Granting partial token credit for a release turns a surplus into progress and gives the collection a floor, without ever making a creature worthless.

## 5. Access as the progression spine

Planet access is what a player earns by playing, and it is the only thing in this system that gates content. The canonical loop is already the right one: Xalians fight in Kozrak's tournaments to win Scrambler Tokens to repopulate their homeworlds. Reclamation already visits worlds and sites, and the duel already fields squads.

So winning on a world, or completing an expedition there, earns standing with that world's Generator. Tokens buy the genome. Play buys the address. A player who plays more collects more worlds, which is a content gate rather than a power gate, and a new player is never locked out by luck, only by not having been somewhere yet.

This also gives the fourteen planets a job in the product rather than only in the fiction.

## 6. The free showroom

The public generator is not a planet Generator. It is a demonstration unit, Kozrak's promotional machine, printing display specimens that exist for a moment and belong to no one. That is why it can draw on any species, why it keeps nothing, and why it is openly detuned to commoners.

This gives the constrained profile from issue #197 a lore-native reason to exist, and it retires the unimplementable "common-tier species weights only" clause. The showroom's constraint is on the quality of the expression, which is already built: standard finish, no rare traits, a single element. Its species draw stays uniform across all thirty, because meeting the roster is the point of a demonstration.

## 7. What changes, in order

1. **Make `origin` real.** Generation takes a planet, draws the species from that planet's natives through `generatorPlanets`, and records the planet it ran on. This is a small change in `packages/rules` and both handlers, and it is the foundation for everything else. Until access exists, the planet is a free parameter defaulting to a random world.
2. **Lead the record with what differs.** Presentation only, in `RecordView`.
3. **Restoration tilt.** Needs the owner's holdings at generation time, which the registry repository can already answer by owner.
4. **Release for credit.** Needs token accounting, which is server-only today and unwired.
5. **Planet access.** Needs a per-user standing record and a hook from whichever game ships first.
6. **Token decode tiers.** Needs the token economy to exist.

Steps 1 and 2 are worth doing now. Steps 3 through 6 wait on the economy.

## 8. Open levers

The roster is thirty species across fourteen worlds, so planet choice narrows to two or three. Completion is therefore fast by design, and the system's longevity rests on the quality chase and the finish ladder rather than on species count. If that feels thin later, the answer is more worlds or more natives per world, not rarer species.

The restoration tilt's halving factor and its floor are tuning values, unset until there is play data.

Whether planet access is purely earned, or also purchasable at a high price, is unsettled. Purely earned keeps play as the only route and is the recommendation here. Purchasable would give tokens a second sink.
