# Xalian generation system: Generators, tokens, and targeting

Status: proposal, revised 2026-09-11 after Nick's second pass. Not ratified. Written at Nick's request after the species-rarity discussion, which settled that no species is intentionally rare and that scarcity should come from mechanisms rather than from a rarity field. This doc proposes those mechanisms. Nothing here is implemented except where section 7 says so.

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
| 4 | Withdrawn 2026-09-11. Species can never be bought at any price; the ratified premium tier is replaced by the condition stack in section 4a | n/a, Nick's ruling | this doc, section 3 |
| 5 | The real chase is individual quality, not species identity, because every rolled field varies within a species | 85%, the generator rolls archetype, attributes, traits, affinity, abilities, and finish independently | `packages/rules/src/generator/generate.ts` |
| 6 | The restoration tilt is per owner rather than global, so one player's pulls do not shift another's odds | 65%, a design call; global would read as more literal lore but creates shared state and a griefing surface | this doc, section 4 |
| 7 | The public showroom is a demonstration machine rather than a planet Generator, which is why it can print any species and keeps nothing | 75%, invented lore, consistent with Kozrak's documented grift and with `keepable: false` | `apps/api/src/handlers/showroomXalian.ts`, vision doc section 3 |
| 8 | Releasing a creature means returning it to its homeworld population, and can therefore grant credit rather than costing the player | 60%, a design call; the endpoint and the verb already exist | `apps/api/src/handlers/releaseRegistryXalian.ts` |
| 9 | `origin` should become the planet the Generator ran on, with species derived from it | 90%, the schema comment already says exactly this | `packages/content/src/schema/record.ts` |
| 10 | Rarity should be emergent from stacked conditions rather than a per-species number, so no species record ever gains a rarity field | 80%, Nick's direction plus the content argument that species are story rather than loot | this doc, section 4a |
| 11 | Generators have modes tied to their canonical damage, and some species only express in some modes | 70%, every Generator in canon is already described as damaged or altered in a specific way | `packages/content/json/planets.json` |
| 12 | Development changes what a creature can do and where it can survive, never its raw attributes | 85%, a design call that keeps grinding from becoming force and preserves the fielding budget as the fairness mechanism | this doc, section 4b |
| 13 | Signature abilities become dormant at birth and awaken through play, which is a change to current behavior | 60%, a design call; the abilities and their prose already exist and are granted at generation today | `packages/rules/src/generator/generate.ts` |
| 14 | Releasing a creature is a token faucet and a creature sink, not a token sink | 95%, follows from what the action does | this doc, section 4d |
| 15 | Duplicates are never fused or merged into one stronger creature | 85%, fusion contradicts the platform premise that each creature is a unique individual that is owned and carried between games | `docs/design/xalians-platform-vision-and-economy.md` |

## 1. Two machines, not one

Canon already splits generation into two devices, and that split is the whole design.

The **Mercurius Machine** on Valleron is the only thing that prints Scrambler Tokens. A token holds a randomly generated, encrypted genome. Kozrak controls it, and targeted genomes cost extra, which is his grift.

A **Xalian Generator** is a planet-bound machine that takes a genome and expresses it as life adapted to that planet's environment. There are fourteen, one per world, each with its own history and its own damage.

So a token is a seed, and a Generator is the context that decides what the seed becomes. A player does not buy a creature. A player buys a genome and chooses where to run it.

## 2. Three dials

**Where you run it.** The Generator decides the species pool, which is that planet's natives through `generatorPlanets`, and therefore the element. This is the primary targeting dial and the primary progression gate.

**What you feed it.** A raw token is a random genome, and that is the only kind of token there is. The ratified pricing ladder said premium buys a genome decoded down to a named species; Nick reopened that on 2026-09-11 and it is withdrawn here. See section 3.

**How depleted the population is.** A Generator directed by a player who is rebuilding a population weights toward the species that population is shortest of. This is the restoration tilt in section 4c. It is automatic and soft.

Nothing on any dial buys power. The dials buy precision about identity, never about quality, which preserves the ratified principle that paying more buys constraint over the roll and never strength.

## 3. What you can and cannot target

**You cannot buy a species.** The premium tier in the ratified pricing ladder is withdrawn. Nick's objection, 2026-09-11, is that a collection loses its spine when the creature you want is a purchase: in Pokemon you cannot buy a Charizard, you find a hard-to-find lesser creature and then put work into it. Paying to name the species collapses both halves of that into a transaction.

**You can choose the world, once you can reach it.** Planet choice is element choice and narrows to that world's two or three natives. It is earned through play rather than bought, which is section 5.

**You can never touch the individual.** Archetype, attributes, traits, secondary element, abilities, and finish stay random under every profile and every price. Nothing anywhere in this system sells a better roll.

So identity is shaped at two points instead of one: which Generator you can reach and what state it is in, and then what you do with the creature afterward. Section 4a covers the first. Section 4b covers the second, which is the part that was missing.

## 4a. Rarity as a stack of conditions, not a number

No species carries a rarity value. A species is hard to get when several conditions have to line up at once, and every one of those conditions is something the world already has a reason for.

**Access.** Which Generators you can reach at all. Section 5.

**Generator state.** Every Generator in canon is damaged or altered, and the damage is specific. Phantiri's rewrote itself as Leviticus Overdrive and prints non-corporeal ghosts. Endessa runs on a stolen prototype that is glitching out aquatic leviathans as the sands uncover ruins. Luminax's ION-9 misfires and causes mutation. Floria's Genesis Prototype ran wild and terraformed the planet. So a Generator has modes, and some species only express in some modes. Modes move with world state, story beats, and player action, which gives the fiction a lever on the collection and gives the collection a reason to follow the fiction.

**Site conditions.** Reclamation already models sites within a world, each with a medium and a temperature band. Generating at a deep-ruins site is not the same as generating on the surface.

**Restoration tilt.** Your own holdings bias the draw toward what your population lacks. Section 4c.

**Token supply.** How many attempts you can afford at all.

A Neph is therefore hard to get because Saiphus is far, because its Generator prints Neph only while the Benthane band is running, and because attempts cost tokens. Nowhere does anything say a Neph is rare. Every one of those conditions is tunable per world without editing a species record, which keeps species as content and rarity as tuning.

## 4b. Development: the second half of the effort

Finding a creature is one kind of work. Making it into what you want is the other, and it is the half this system was missing. Two axes, both lore-native, both earned by play and never sold.

**Acclimation.** A Generator adapts life to a planet's environment. Living on a world does the same thing slowly. Every record already carries an environmental tolerance, an ambient media list and a temperature band, and Reclamation already grades strain by how far a creature's tolerance sits from a site's conditions. So a creature that repeatedly survives strain on a world shifts its tolerance toward that world, and far enough along picks up a weak affinity for that world's element. Taking a Smokat to Magmuth and keeping it alive is how it becomes a Smokat that can work on Magmuth. This is the closest thing in our lore to raising a creature, and most of the machinery exists.

**Signature awakening.** Every species carries a hand-written signature ability, and the generator grants it at birth today. Proposal: it is present but dormant, and it awakens when the creature does the thing the ability describes. The Akinza's Silence of the Long Night wakes after it lands enough ambushes, or survives a night-side site. Every creature arrives with a small personal quest attached to writing that already exists. This is a change in current behavior, not a free hook, and it makes a fresh creature weaker than it is today, which is the point.

**The bound that keeps this fair.** Development changes what a creature can do and where it can survive. It never raises raw attributes. A veteran creature is more useful and better fitted, not stronger in a straight fight, so a new player is behind on options rather than behind on force. Reclamation's fielding budget already handles the rest.

## 4c. Duplicates, and why the fix is a tilt rather than a rule

A hard no-duplicate rule is wrong on three counts. It contradicts the lore, because the machine cannot know what a player owns. It turns the economy into a guaranteed completion engine, which kills the chase on a small roster. And it does not address the actual complaint, because two creatures of one species already differ in every rolled field. The frustration is perceptual: the species name and the art dominate the record, so a second Smokat reads as a copy even though it is not.

Three answers, in order of how much they cost to build.

**Lead the record with what differs.** Archetype, standout traits, and the signature ability name should register before the species name settles in. A second Smokat that opens with a different archetype and a different signature ability reads as a different animal. This is a presentation change in `RecordView` and costs almost nothing.

**Tilt toward what the population lacks.** A player is repopulating worlds, which is the canonical reason Xalians fight for tokens at all. A Generator directed by that player weights toward the species the player holds fewest of. Halving the weight per copy held, with a floor so the weight never reaches zero, keeps every outcome possible while making a fourth consecutive Smokat very unlikely. This is a tilt, not a guarantee, and it should be stated to the player as a property of the machine rather than hidden in the odds.

**Make releasing a creature a good act.** The release endpoint exists and its verb is already correct. Returning a Xalian to its homeworld population is restoration in canon, not sacrifice. Granting partial token credit for a release turns a surplus into progress and gives the collection a floor, without ever making a creature worthless.

## 4d. The token economy: what fills it and what drains it

Nick's note that release matters "to keep the token economy working" needs one correction before the rest lands. Releasing a creature is a **creature sink and a token faucet**. It destroys a creature and pays out tokens. It does not drain the currency, it adds to it. That is still worth building, because it gives surplus creatures a use and a floor, but the drains have to come from somewhere else or the currency inflates the way every unbalanced game economy does: faucets outrun sinks, each token buys less, and prices have to climb to compensate.

**Faucets, where tokens come from.** Tournament and duel wins scaled by tier. A small daily and participation trickle. Expedition completion. Releasing a creature back to its homeworld population.

**Sinks, where tokens go for good.** Generation is the primary one, since every attempt burns a token, and it scales with how much a player plays. Acclimation runs are the second and the more important one long term, because development is open ended and the players holding the most tokens are exactly the players who want to keep shaping creatures. Kozrak's cut is the third, and it is the lore-native version of the transaction tax most healthy game economies run on: every trade, entry, and service passes through his machine and he skims it, which is precisely his character. Arena stakes are the fourth, where entering a high tier costs a stake and more entrants lose than win, so the pool drains on its own. Vanity is the last and the safest, since registry displays, world monuments, and naming rights delete large sums from wealthy players without touching balance.

**The rule to hold onto.** Sinks must scale with wealth, or the richest players accumulate without limit and the currency stops meaning anything to everyone else. Generation alone does not do that, because a player only wants so many creatures. Acclimation, stakes, and vanity do.

**What release should pay.** Not a flat rate. A release returns a creature to its homeworld population, so it should pay in proportion to how much that world needs it, which ties the payout to the same world state that drives Generator modes in section 4a. Releasing a common native onto a world already thick with them pays little. Releasing onto a world you have been rebuilding pays more and moves that world's recovery forward. Surplus creatures become the fuel of the meta-game rather than trash, and the fiction and the economy pull in the same direction.

**What release must never become.** Fusing two creatures into a better one is off the table. It is the standard answer in collection games and it is wrong here, because the platform's premise is that each creature is a unique individual a player owns and carries between games. A system that eats individuals to upgrade other individuals argues against that premise every time it runs.

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
4. **Acclimation.** Needs the expedition to report per-creature strain survived, which it already computes, plus a place to record drift on the creature.
5. **Signature awakening.** Needs a per-creature progress counter and a condition per species. The abilities and their prose already exist.
6. **Release for credit.** Needs token accounting, which is server-only today and unwired, plus per-world population state.
7. **Planet access and Generator modes.** Needs a per-user standing record, per-world state, and a hook from whichever game ships first.

Steps 1 and 2 are worth doing now. Everything after them waits on the economy and on which game ships first.

## 8. Open levers

The roster is thirty species across fourteen worlds, so planet choice narrows to two or three. Completion is therefore fast by design, and the system's longevity rests on the quality chase and the finish ladder rather than on species count. If that feels thin later, the answer is more worlds or more natives per world, not rarer species.

The restoration tilt's halving factor and its floor are tuning values, unset until there is play data.

Whether planet access is purely earned, or also purchasable at a high price, is unsettled. Purely earned keeps play as the only route and is the recommendation here. Purchasable would give tokens another sink, but section 4d already has enough of them.

Whether Generator modes are global, so every player sees one world state, or per player, is unsettled. Global makes the world feel shared and lets the fiction move everyone at once. Per player avoids one group of players deciding what another group can collect. A middle reading is global state that moves slowly, with per-player standing deciding what you can reach inside it.

How far acclimation can drift a tolerance band, and whether it can ever add a second element outright, are tuning values. The first version should drift the band only, since adding an element changes type matchups and therefore combat.
