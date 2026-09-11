# Generation and economy: open threads

A handoff brief, written 2026-09-11 so a fresh agent can continue the design conversation with Nick without rereading the whole repo. It is a companion to `docs/design/xalian-generation-system.md`, which is the design of record. Read that first; this file only carries the state of the conversation, the rulings, and the questions still open.

## Read these first

- `docs/design/xalian-generation-system.md`, the proposal itself, revised three times on 2026-09-11. Not ratified.
- `docs/design/xalians-platform-vision-and-economy.md`, the ratified platform vision, including the funnel and the token economy direction. Two of its ratified lines have been reopened; see below.
- `docs/design/xalian-creature-system-redesign.md`, the ratified creature record.
- `packages/content/json/planets.json`, the fourteen planet histories, which are where every mechanism in this design gets its lore.
- `CLAUDE.md`, sections "Creature system: levers, not stone" and "Lore and world canon".

## The shape of the system, in short

Canon splits generation into two machines, and that split is the whole design. Kozrak's Mercurius Machine prints Scrambler Tokens, each holding a random encrypted genome, so a token is a seed. A planet-bound Xalian Generator expresses a genome as life adapted to its own world, so the Generator decides the species pool and the element. A player never buys a creature. A player buys a genome and chooses where to run it.

Rarity is a stack of conditions rather than a number on a species: which Generators you can reach, what mode that Generator is in, which site you run at, how depleted your own holdings are, and how many attempts you can afford. No species record ever gains a rarity field.

Development never raises raw attributes. It changes what a creature can do, where it fits, and what it is worth to another player.

## Settled so far

These came from Nick directly on 2026-09-10 and 2026-09-11. Treat them as current rulings, subject to the levers-not-stone rule.

1. **No species is intentionally rare.** Species are content, not loot. All thirty should be reachable by every player. A per-species rarity or weight field is off the table.
2. **The ratified "common-tier species weights only" clause for the free lever is unimplementable and is withdrawn.** The showroom constrains the quality of the expression, not which species appears. That shipped in PR #209 as a generator profile behind a visible toggle, which is exploratory rather than enforcement.
3. **The ratified premium tier that let a player buy a named species is withdrawn.** Nick's reason: a collection loses its spine when the creature you want is a purchase, the way you cannot buy a Charizard.
4. **Paying never buys power.** This one is older and still stands. Price buys constraint over the roll and nothing else.
5. **Duplicates are never fused into one stronger creature.** It contradicts the premise that each creature is a unique individual a player owns and carries between games.
6. **Trading unwanted creatures to Kozrak as arena fodder, in exchange for a better token, is Nick's idea and he likes it.** It must be a net loss in raw tokens or it becomes a currency press.
7. **Acclimation is demoted.** Drifting a creature's tolerance toward a world it survives on reads as a cheat code, because tolerance is stated as physiology.
8. **Release is a token faucet, not a sink.** The sinks are generation, development, Kozrak's cut as a transaction tax, arena stakes, and vanity.

## Open threads

Each of these needs Nick, and each has a current recommendation in the proposal doc. Do not treat a recommendation as settled.

**1. Which development axis, and whether more than one.** The proposal offers three that avoid experience bars and evolution: specialization by use, where a creature trades breadth for depth at constant total force; squad cohesion, which lives on the group and cannot be bought or transferred; and provenance, where the record accrues history and nothing about capability changes. Nick asked specifically for something that adds depth to squad building. Dormant signature abilities that awaken through play are a fourth option already in the proposal and would change current behavior, since the generator grants signatures at birth today.

**2. Whether world restoration is per player or shared.** The proposal recommends personal restoration inside an authored galaxy, and section 5b argues why a single shared meter fails at both small and large populations. Nick's instinct was the same, that a combined effort feels weird, but he has not ruled. This decision shapes the product more than any other item here.

**3. What a higher-grade token actually does.** The proposal suggests a spread token, where the Generator prints several candidates and the player keeps one, and an attuned token, which forces a Generator into an uncommon mode. Neither names a species. The starter spread in the ratified funnel is precedent for the first.

**4. Whether Generator modes are global or per player.** Global makes the world feel shared and lets the fiction move everyone at once. Per player stops one group of players from deciding what another group can collect. A middle reading is slow global state with per-player standing deciding what you can reach inside it.

**5. How release and the Kozrak levy are priced against each other.** The proposal wants release to pay by how much the world needs the creature, and the levy to pay better but cost standing and advance nothing. The exchange rates are unset.

**6. What the restoration tilt's numbers are.** The tilt weights a player's draws toward the species that player holds fewest of, which is this design's version of a pity system. The halving factor and the floor are unset.

## Also open, filed separately

- Issue #197, the constrained showroom profile. Shipped behind a toggle; real enforcement and the species-weight half remain open there.
- Issue #210, the word "showroom" now naming both the unowned state of a record and the constrained generator profile.

## How to work on this

- Every ruling in the creature system is a tuned lever, not a law. Report friction in the moment with the concrete case and the smallest fix. New evidence reopens a ruling. Taste does not.
- Discussion is not consent. Only an explicit sign-off from Nick ratifies anything. Re-present pending items after a tangent.
- Apply your recommendation rather than leaving an open question hanging, record it, and report it as overridable.
- Ask design questions in prose, one at a time, with full context. No multiple-choice menus.
- American English, and never an em-dash, in prose, docs, code comments, commit messages, and pull request text.
- Every mechanism must come from the existing lore rather than being bolted onto it. The fourteen planet histories are long and specific, and almost every mechanism in this design was already sitting in them.
- Design docs live in this repo under `docs/design/`, flat. Never write a design or plan file outside the repo.
- Present content inline in chat rather than telling Nick to open a file.
