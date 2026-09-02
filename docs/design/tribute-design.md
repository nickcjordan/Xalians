# Tribute: the expedition game (second design, replaces the row game)

Status: baseline agreed with Nick 2026-09-02 after two full brainstorming passes. Supersedes the first-attempt row-based ruleset (playable at `/tribute` on `feat/tribute-prototype`, kept as a reference implementation of the engine skeleton) and every earlier Tribute document. The working name is still Tribute; it was chosen for a game about presenting a roster to a court, and it may not survive a game about expeditions. Renaming is an open item.

## What changed and why

The first design took Gwent and plugged Xalians into it: three rows meaning attack ranges, a number per row, a summed score. Playtesting and a blind usability pass showed the seams. Rows were not a decision, because a creature with several eligible rows always went where its number was biggest. Elements were a chip on a card rather than the center of the game. Nothing on the table said where the fight was happening or why a creature would care. And the fight itself was arithmetic: the two sides never touched.

This design starts from the other end. The creature record says what a Xalian is: engineered for a world, with a body that tolerates some environments and not others, an element, a set of abilities that are verbs, a disposition, and traits. The Vallerii built Generators to make labor that could survive each planet's extremes. So the game is about deployment: which world, which site, what act, and how the creature behaves when it gets there. What survives from Gwent is only its skeleton, which was never about rows: a roster that must last the whole match, rounds you can concede, a permanent pass, and the bluffing those three create together.

## Principles (carried forward, reaffirmed)

1. **The game bends to the creatures, never the reverse.** Records and species templates are never modified for this game. What the game needs to know is registry fact, usable by any game.
2. **Games may read as much of the record as they want.** This design reads physiology, element, abilities, attributes, archetype, temperament, and traits, each for a different job.
3. **Temperament is never read for power.** It is read here for conduct: who a creature chooses, never how hard it hits. That is the boundary the platform drew and this design stays inside it.
4. **Everything stays readable.** Resolution is deterministic. Every number and every behavior a creature has is printed on it in words a player can learn. A player who reads the table before passing can know what will happen if nothing else is added.
5. **Hobby-scale, bot-first, no server**, mirroring the Duel prototype.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | One world per round, three sites on that world; a match is an expedition across three worlds | 90% (Nick raised the problem of creatures acting across different worlds; one world per round was the answer he accepted) | Conversation 2026-09-02 |
| 2 | The goal is sites held across the match (nine opened, five clinches), not rounds won | 90% (Nick: "I liked the recommendation you gave, let's go with that") | Conversation 2026-09-02 |
| 3 | A round is Deploy, Orders, Resolve, Judge, with simultaneous secret orders | 95% (Nick proposed the two-phase split; simultaneous orders was my addition, accepted) | Conversation 2026-09-02 |
| 4 | Resolution is deterministic; chance is a possible later layer | 95% (explicit ruling) | Conversation 2026-09-02 |
| 5 | Creatures choose their own targets by nature; the handler chooses creature, site, and act | 95% (explicit ruling, with Nick's own reasoning) | Conversation 2026-09-02 |
| 6 | Combat outcomes are qualitative (shrugged, staggered, routed) from one comparison of magnitude against hold, not hit points | 85% (Nick asked for something smarter than one-hit breaking without Pokemon-style duels; this is my answer, approved in principle) | Conversation 2026-09-02 |
| 7 | No site capacity; spread versus stack is the player's bet | 95% (Nick's argument, accepted) | Conversation 2026-09-02 |
| 8 | Incompatibility with a world strains a creature rather than excluding it | 90% (Nick: no outright exclusion, a status instead) | Conversation 2026-09-02 |
| 9 | No mulligan; twelve brought, ten may be sent, chosen as you go | 85% (my variation on the roster, approved with the rest) | Conversation 2026-09-02 |
| 10 | Sent creatures stay on their world for the match, won or lost, which is what makes the roster scarce | 85% (approved with the rest; it is the lore-honest reason for the economy) | Conversation 2026-09-02 |
| 11 | A stealthy creature may deploy hidden: the opponent sees that a creature was sent, not which one or to which site | 90% (Nick's own description) | Conversation 2026-09-02 |
| 12 | Decrees are parked until the core is settled; they will bind to the world in contest | 80% (parked, not rejected) | Conversation 2026-09-02 |
| 13 | The numeric formulas below (hold, magnitude, initiative, strain, thresholds) are first guesses to be tuned by simulation, exactly as Court Favor was | 70% (untested) | This document |
| 14 | Sites per world are new lore to author, three per planet, drawn from places the planet histories already name | 85% (14 x 3 = 42 site records; the histories name most of them) | `lambda/src/json/planets.json` |

## Fiction

The worlds are wreckage with value left in them: the Algael beds of Poseidas, the Benthane fields of Saiphus, the QED nodes of Zolton, the catacombs of Krystos, the ruins under Endessa's sand. Kozrak grants Charters over such sites, and with them Token allotments, and he awards them by contest, because a galaxy competing for his favor is a galaxy not organizing against him. You are a handler for a faction, fielding creatures you own. Your opponent is a rival handler: a Syndicate broker, a Zolto envoy, a Windsailor crew, an heir of the Thousand Families, the Court's own champion. A match is an expedition across three worlds, and the prize is the Charter. Whether that Charter is one prize among many in a wider tournament is left to the tournament lore, which is expected to hold several contests of which this is one. (Proposed canon, not yet written into the lore files; the ingredients are all canon.)

## The table

No cards. The player holds a **roster** of creatures waiting to be sent and sees a **world** with three **sites**. A creature standing at a site is drawn the way the Duel draws it, the same being on the same plinth, so a Xalian looks like itself in every game. Inspecting a creature opens its dossier: hold per site, initiative, its acts with magnitudes, its conduct line, its strain on this world. The dossier is a panel you open, not a face you stare at.

## The world and its sites

Each round opens one world, drawn from the fourteen with no repeats within a match; the next world is revealed at the end of the current round so that passing early is an informed choice. A world has an element and three sites. Each site has its own environment (medium, temperature band) so a world has texture: Krystos's catacombs are enclosed and colder than its surface; Poseidas has a drowned city, a reef, and an Algael bed. Sites are lore to author, three per planet, from the places the histories already name (the Chasm, the City of Wraiths, the Dreadscape, the Stellaris Superstructure, the World Trees, Deepwater Black, the Ghost Fleet).

## The creature on the table

Everything a creature is on the table is derived from its record; nothing is stored on the record.

- **Hold** is its staying power at a site and what it contributes to winning the site. Base hold is the mean of vitality, resilience, and endurance, divided by five (a 0 to 20 scale, typically 6 to 16). At a site it is scaled by the world matchup, home ground, and strain.
- **World matchup** reads the type chart with the creature as attacker and the world's element as defender (`matrix[creature][world]`), softened so a 0 becomes 0.25, and blended with a graded secondary affinity exactly as the first design did. A Plant creature on Poseidas holds double; a Fire creature holds half.
- **Home ground:** hold is multiplied by 1.5 on the creature's origin world.
- **Strain:** a creature outside a site's temperature band or medium is strained: hold and act magnitudes halved, and it acts last regardless of initiative. A creature that cannot breathe the site's medium at all is severely strained: a quarter instead of a half. Strain never excludes; a strained body still blocks nothing, still counts, and is still a bad idea unless the alternatives are worse.
- **Initiative** is the mean of reflex and agility. Higher acts first. Among equals, the creature sent earlier acts first.
- **Acts** are the creature's abilities (signature included), each with a magnitude of `max(1, round((intensity / 10) x (0.5 + governingAttr / 100)))` using the same governing-attribute table as the first design. Magnitude against a target is further scaled by the type chart, creature against target's element, blended with the target's secondary affinity, and by strain.
- **Conduct** is one printed sentence saying whom the creature chooses when it acts, derived from archetype, traits, and temperament. See below.
- **Traits** appear as keywords with fixed meanings. See below.

## The round: Deploy, Orders, Resolve, Judge

1. **Deploy.** Handlers alternate; the round's starter alternates each round and there is no Court Favor. On your turn send one creature from your roster to one of the three sites, face up, or pass. Pass is permanent for the round. A stealthy creature may be sent **hidden**: the opponent sees that you sent a creature this turn, but not which creature or to which site, until orders are revealed. Any number of creatures may stand at a site. Deploy ends when both have passed.
2. **Orders.** Both handlers, at the same time and in secret, assign each of their deployed creatures one of its acts, or Hold (no act). A creature not given an order performs its favored act (the one its archetype prefers). Orders are revealed together.
3. **Resolve.** Ambush acts resolve first, in initiative order among themselves. Then wards. Then everything else in initiative order, strained creatures last. Each act targets by the creature's conduct given the board at the moment it acts. Outcomes are applied immediately, so a routed creature never gets to act and a staggered one hits for less if its magnitude depends on its own condition (it does not; only hold is halved by stagger).
4. **Judge.** Each site goes to the side with the greater surviving hold there, staggered hold counted at half. A tie reverts the site to the Court. Winners' banners are placed. Creatures at a won site stay to hold the claim; creatures at a lost or tied site withdraw. Either way they are out of the expedition. The next world is revealed.

The match ends when a handler holds five sites, or after the third world; more sites held wins the Charter. Equal sites held: the handler with more creatures still unsent wins; then the one who passed first in the final round; then the non-starter of the final round.

## The acts

Sixteen actions, grouped by what they touch. Magnitudes are as above; "the target" is chosen by conduct.

**Contact (touches the site the creature stands at):**
- **strike, crush, rake, lash:** compare magnitude to the target's current hold. Below half: shrugged, nothing happens. At least half but below the full hold: **staggered**, the target's hold is halved for the rest of the round; a staggered target hit again at half or more of its current hold is routed. At least the full hold: **routed**, driven off the site and out of the expedition.
- **shove:** moves the target to a neighboring site on the same world instead of harming it, where its hold is recomputed against that site's environment. Anchored creatures cannot be shoved.

**Reach (touches the site with a condition):**
- **snare:** the target cannot be moved, mended, or warded for the rest of the round, and if it has not yet acted this resolution it loses its act.
- **drain:** a strike whose successful stagger also raises the drainer's hold by half of what the target lost.
- **ambush:** a strike that resolves before initiative is counted. A hidden creature that ambushes reveals itself as it strikes.

**Projection (reaches any site on the world):**
- **beam, hurl:** a strike against one target at any site.
- **burst, spray, cloud:** a strike against every creature at one site, both sides, at the full magnitude each. This is the answer to a stacked site and the risk of standing in one.

**Support (touches allies):**
- **ward:** the next hostile act against the target ally this round is absorbed entirely. A ward with no ally wards the caster.
- **mend:** removes stagger from the target ally.
- **terrorize:** the target enemy withdraws to its handler's roster, unsent, unless it is anchored. It costs the opponent tempo, not the creature.

**Hold:** the creature does nothing and keeps its full hold.

## Conduct: whom a creature chooses

One sentence per creature, derived, never authored. First pass:

| Archetype | Attacking | Supporting |
|---|---|---|
| predator, prowler | the weakest enemy in reach (staggered first) | the ally with the least hold |
| juggernaut, berserker | the strongest enemy in reach | the ally with the most hold |
| vanguard, balanced | the enemy sent earliest | the ally sent earliest |
| bulwark, stalwart | the enemy threatening the ally with the least hold | the ally with the least hold |
| survivor | the enemy with the lowest magnitude | itself |
| skirmisher, runner | the enemy with lower initiative than itself, weakest first | the fastest ally |
| seeker, sage | the enemy its element is most effective against | the ally most vulnerable to the enemies present |
| virtuoso, sovereign | the enemy with the highest magnitude | the ally with the highest magnitude |
| rogue | the enemy with the highest hold it can rout, else the weakest | the ally with the highest magnitude |

Temperament refines the choice without touching any number: high boldness prefers the stronger of two candidates, low boldness the weaker; high sociability shields kin (same species) before strangers; high curiosity, for projection acts, prefers targets at a site other than its own; high aggression breaks ties toward attacking rather than shielding when an act could do either. Energy is unused for now. Traits: pack-bonded creatures gain one hold for each kin at their site; solitary creatures lose one for each ally; menacing creatures draw attacks aimed at their site's weakest ally to themselves; armored creatures raise both thresholds (stagger at three quarters, rout at one and a half); anchored creatures cannot be shoved, terrorized, or routed off a site they were sent to; resilient creatures recover from stagger at the Judge step, before hold is counted; stealthy creatures may deploy hidden; nocturnal creatures are never strained on Grimedes; luminous creatures are never strained on Luminax's dark side.

The resolution preview shows, during Orders, the initiative order and each of your own creatures' chosen targets given the board, without the enemy's orders.

## Roster economy

Bring twelve owned creatures. Over the match you may send ten; the two you never send are the reserve, chosen as you go. There is no mulligan. Sent creatures stay on their world. Routed creatures are out of the expedition but are yours again after the match; the platform history records the rout.

## Decrees (parked)

Kept as a later layer. The intended shape: each handler registers two, each bound to a world; a Decree can be invoked only while its world is the round's world, once per match, during Deploy, and it doubles the elemental scaling at its site for both sides. The names already fit (Zolton Bloodstorm, Krystos Whiteout).

## The bot

Public information only. Deploy: an allocation scorer that values each candidate (creature, site) by its hold there, the site's current margin, and the reserve value of the creature, with the spread-versus-stack tension expressed as a preference for the site where the marginal hold most changes who is winning; pass when every remaining creature would be strained or when the sites it can still swing are not worth the roster. Orders: for each creature, pick the act with the best expected outcome against the visible board using the same resolution rules, since conduct makes targets predictable; ward the site the opponent's projection can most profit from. Match states (must-hold, can-yield) as before, with the site count replacing round wins. The first-design bot's pass economy carries over in spirit.

## Interface principles (from the usability pass)

The table must always show whose turn it is, what a click will do, and what just happened, without scrolling. Every number on the table is the live value the rules will use. Every invalid action says why. A player can inspect any creature, theirs or the enemy's, and read its conduct line and thresholds. Resolution is narrated and animated in initiative order; the log stays.

## Open items

- The name. Tribute was named for the row game's fiction.
- Sites: authoring three per world with environments, from the planet histories.
- The generator: conduct derivation needs archetype and temperament, which exist in the ratified record but not yet in any generated corpus; provisional rolls continue until then.
- Decrees, as parked above.
- Tuning: every formula above is a first guess. The simulator gets rebuilt for the new round and the same batch statistics (starter advantage, sites per round, rout rate, act usage, pass behavior) drive the numbers.
- Whether staggered creatures should be able to act at full magnitude (currently yes, stagger only halves hold).

## Path to playing it

1. Sites data for the fourteen worlds (lore authoring, can start now).
2. Engine: world and site model, hold and strain, the four-phase round, the sixteen acts, conduct, judging, the match. Pure state machine with tests, as before.
3. Bot and simulator; tune.
4. Table UI on the Duel's creature representation: roster, world with three sites, orders panel with preview, resolution playback.
