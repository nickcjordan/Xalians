# Reclamation (second design of the game spoke formerly called Tribute)

Status: baseline agreed with Nick 2026-09-02 after two full brainstorming passes; named Reclamation the same day. Supersedes the first-attempt row-based ruleset (still playable at `/tribute` on `feat/tribute-prototype` as a reference implementation of the engine skeleton) and every earlier Tribute document. The engine for this design lives in `my-app/src/gameplay/expedition/` (a match is an expedition; the game is Reclamation).

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
| 15 | The trailing handler moves first on the next world, instead of pure alternation | 85% (approved by Nick 2026-09-02) | Simulator runs 2026-09-02, seeds 7, 99, 2024 |
| 16 | The vanguard falls back: the starter may relocate their first-sent creature once per world, free of tempo | 80% (Nick's idea, shaped by me as once per world and any time during Deploy before passing; the exact window is untested by humans) | Conversation 2026-09-02; `my-app/src/gameplay/expedition/expeditionRules.js` relocateVanguard |
| 17 | Anchored creatures cannot be routed off a site they were sent to, so they are unroutable in practice | 50% (my reading of the trait list; it makes anchored the strongest trait in simulation at 70 percent site wins and may need to become shove and terrorize immunity only) | Simulator run 2026-09-02, trait table |
| 18 | The table plays real creatures: rosters are generated from the 29 ratified species templates by the new generator (`my-app/src/gameplay/generator/`, version 0.1.0), which follows the ratified pipeline but is not yet the bit-exact spec; the provisional roller is retired for this game | 90% (Nick, 2026-09-03: "use the actual creatures and planets in all the real details everywhere possible") | `my-app/src/gameplay/generator/generate.js`, `docs/design/xalian-creature-system-redesign.md` section 9 |
| 19 | Strain is graded by distance, not binary: the creature's band covering the site band (or at least half of it) is comfortable; a smaller overlap or a gap of up to 30 C is strained; a wider gap, or a medium it cannot breathe, is severe | 70% (my change; with real bands the binary rule strained 80 percent of sends and meant nothing; the graded rule leaves 36 percent comfortable, 57 strained, 6 severe) | `creatureOnTable.strainLevel`; simulator seed 11, 600 matches, 2026-09-03 |
| 20 | Site temperature bands are clamped to the planet's habitable band, approximated as the intersection of its native species' tolerances (union when they do not meet); a site wholly outside that band keeps its authored band and is hostile to everyone (the Fissure Forges, Luminax's dark side, the Krystos catacombs) | 75% (the ratified species bands sit inside the habitable band, so a site wider than it strained natives at home; the true habitable bands are not bundled in this repo yet) | `scripts/rebandSites.js`; `docs/species-templates/RULINGS.md` "Planet rebuild" |
| 21 | Seven sites authored as liquid on worlds where no native breathes liquid now read as gas (the Chasm's mine workings, the acid swamp banks, the quicksilver riverbanks, the buried Deepwater Black, the Nightcap wells, the Grimedes battlefield, the Floria underforests); the two space sites stay vacuum and hostile | 70% (each description places the fight on ground; a site every native drowns at is a site nobody sends to) | `lambda/src/json/sites.json` `mediumNote` fields |
| 6 | Combat outcomes are qualitative (shrugged, staggered, routed) from one comparison of magnitude against hold, not hit points | 85% (Nick asked for something smarter than one-hit breaking without Pokemon-style duels; this is my answer, approved in principle) | Conversation 2026-09-02 |
| 7 | No site capacity; spread versus stack is the player's bet | 95% (Nick's argument, accepted) | Conversation 2026-09-02 |
| 8 | Incompatibility with a world strains a creature rather than excluding it | 90% (Nick: no outright exclusion, a status instead) | Conversation 2026-09-02 |
| 9 | No mulligan; twelve brought, ten may be sent, chosen as you go | 85% (my variation on the roster, approved with the rest) | Conversation 2026-09-02 |
| 10 | Sent creatures stay on their world for the match, won or lost, which is what makes the roster scarce | 85% (approved with the rest; it is the lore-honest reason for the economy) | Conversation 2026-09-02 |
| 11 | A stealthy creature may deploy hidden: the opponent sees that a creature was sent, not which one or to which site | 90% (Nick's own description) | Conversation 2026-09-02 |
| 12 | Decrees are parked until the core is settled; they will bind to the world in contest | 80% (parked, not rejected) | Conversation 2026-09-02 |
| 13 | The numeric formulas below (hold, magnitude, initiative, strain, thresholds) are first guesses to be tuned by simulation, exactly as Court Favor was | 70% (untested) | This document |
| 14 | Sites per world are new lore to author, three per planet, drawn from places the planet histories already name | 85% (14 x 3 = 42 site records; the histories name most of them) | `lambda/src/json/planets.json` |
| 22 | The Proving: the match is run on the Court of Arbitration's frame, a simulator built from the Generators' own environment models and linked over the QED network; a round loads three worlds side by side, each at one of its sites, nine distinct worlds per match; the unit the Court awards is a world. This supersedes assumption 1 | 90% (Nick proposed the simulator and chose the Court over Kozrak as its keeper, 2026-09-04; the site-per-world draw is his "keep the sites for variety") | Conversation 2026-09-04; `expeditionRules.drawFrames` |
| 23 | Shove and the vanguard's fall-back cross worlds: a neighbor in the frame is another world's model, and the frame reassigns the creature there, hold recomputed | 60% (the mechanical rule survived the pivot unchanged; whether being shoved from Zolton into Krystos reads as sense or as a glitch is untested with players) | `expeditionRules.neighborSiteId`, `relocateVanguard` |
| 24 | Hold is shown on a fixed 0 to 20 scale with notches at 10 and 20 and room past the last notch for home ground; the number stays beside the strip because the balance bars and the Court's tally use the same units | 70% (Nick asked what the scale was; a labeled fixed scale was the smallest fix, and the frame lore makes a fixed instrument scale natural) | `reclamationFigure.HoldMeter`, `reclamation.css` `.rec-hold-notch` |

## Fiction: the Proving (Nick, 2026-09-04)

The name says the why: the worlds were lost to war and plague, and the creatures are taking them back. The Charter is the Court's acknowledgment of a claim that has been proved.

The worlds are wreckage with value left in them: the Algael beds of Poseidas, the Benthane fields of Saiphus, the QED nodes of Zolton, the catacombs of Krystos, the ruins under Endessa's sand. Kozrak grants Charters over such worlds, and with them Token allotments, and he awards them by contest, because a galaxy competing for his favor is a galaxy not organizing against him. But the worlds are plague-hot, embargoed, or actively lethal, and expeditions that go in blind do not come back; Kozrak will not spend Scrambler Tokens on a faction whose creatures would die on arrival. So a claim is settled by proof before anyone ships out.

A Generator builds creatures fitted to one world, and to do that it must hold a model of that world: temperature, medium, chemistry, gravity. Every Generator is a planetary simulator with a creature factory bolted on. The Court of Arbitration on Poseidas, the galaxy's neutral ground, holds the environment models of all fourteen Generators, recovered or licensed one world at a time, and runs them on a **frame** without the factories, linked over the Zolto's QED network so a handler on Saiphus and a broker on Drainov can contest the same worlds in the same hour. A match is a **Proving**. A handler loads a roster into the frame. The frame loads three worlds, each at one site of its surface, chosen by the frame, so the same worlds never make the same table twice. Each side sends creatures into the worlds' models, and the frame reports how firmly each one holds there against the environment and against the rival's creatures. When the sends stop, the Court reads the frame and grants the Charter for each world to the side that holds more of it. Nothing dies in the frame; the roster comes home whole, and the platform history records what the frame said of each creature. The Charter carries the Token allotment and Kozrak's leave to go. That is the reward, and it is real. Only the fighting is simulated.

You are a handler for a faction, fielding creatures you own. Your opponent is a rival handler connected over QED: a Syndicate broker, a Zolto envoy, a Windsailor crew, an heir of the Thousand Families, the Court's own champion. Against the machine, the opponent is a Court proctor running a house roster. The models are Vallerii-era and imperfect, and the Court's line is that the frame is authoritative; that line is the in-world voice for anything the frame does that a world would not (a creature shoved out of one world's model and into the next), for Endessa's stolen prototype behaving strangely, and for a future hook where the frame reports something in a world that should not be there. (Proposed canon, not yet written into the lore files; the ingredients are all canon. The first fiction, one world per round with an expedition crossing three worlds, is superseded; its sites survive as the places the frame loads.)

## The table

No cards. The player holds a **roster** of creatures waiting to be sent and sees the **frame**: three **worlds** side by side, each loaded at one of its sites. A creature standing in a world is drawn the way the Duel draws it, the same being on the same plinth, so a Xalian looks like itself in every game. Inspecting a creature opens its dossier: hold per world, initiative, its acts with magnitudes, its conduct line, its strain at the loaded site. The dossier is a panel you open, not a face you stare at.

## The frame, its worlds and their sites

Each round the frame loads three worlds, drawn from the fourteen with no world repeated within a match (nine of the fourteen per Proving); the next frame is revealed at the end of the current round, worlds and sites, so that passing early is an informed choice. A world has an element and a home-ground bonus for its natives; hold is computed against the world of the site a creature stands at, never against a round-wide value. Every world carries three authored sites, each with its own environment (medium, temperature band), and the frame loads one of them, chosen by the seed, so the same three worlds make a different table on the next Proving: Krystos at its catacombs is enclosed and colder than Krystos at its surface; Poseidas may load as a drowned city, a reef, or an Algael bed. Sites are lore already authored, three per planet, from the places the histories name (the Chasm, the City of Wraiths, the Dreadscape, the Stellaris Superstructure, the World Trees, Deepwater Black, the Ghost Fleet). In the engine the contested unit is still called a site: it is one place on one world, and there are three of them in every frame.

## The creature on the table

Everything a creature is on the table is derived from its record; nothing is stored on the record.

- **Hold** is its staying power at a site and what it contributes to winning the site. Base hold is the mean of vitality, resilience, and endurance, divided by five (a 0 to 20 scale, typically 6 to 16). At a site it is scaled by the world matchup, home ground, and strain.
- **World matchup** reads the type chart with the creature as attacker and the world's element as defender (`matrix[creature][world]`), softened so a 0 becomes 0.25, and blended with a graded secondary affinity exactly as the first design did. A Plant creature on Poseidas holds double; a Fire creature holds half.
- **Home ground:** hold is multiplied by 1.5 on the creature's origin world.
- **Strain:** a creature outside a site's environment is strained: hold and act magnitudes halved, and it acts last regardless of initiative. Since 2026-09-03 the temperature test is graded (assumption 19): a creature whose tolerance covers the site band, or at least half of it, is comfortable; a smaller overlap, or a gap of up to 30 C between the bands, is strained; a wider gap is severe, as is a medium the creature cannot breathe: a quarter instead of a half. A medium the body merely does not tolerate around it is strained. Strain never excludes; a strained body still blocks nothing, still counts, and is still a bad idea unless the alternatives are worse.
- **Initiative** is the mean of reflex and agility. Higher acts first. Among equals, the creature sent earlier acts first.
- **Acts** are the creature's abilities (signature included), each with a magnitude of `max(1, round((intensity / 10) x (0.5 + governingAttr / 100)))` using the same governing-attribute table as the first design. Magnitude against a target is further scaled by the type chart, creature against target's element, blended with the target's secondary affinity, and by strain.
- **Conduct** is one printed sentence saying whom the creature chooses when it acts, derived from archetype, traits, and temperament. See below.
- **Traits** appear as keywords with fixed meanings. See below.

## The round: Deploy, Orders, Resolve, Judge

1. **Deploy.** Handlers alternate. The first world's starter is random; on each later world the handler holding fewer sites moves first, and if they hold the same number the starter alternates. There is no Court Favor. Moving first is the weaker seat (the other side deploys with more information), so the seat goes to whoever is behind; pure alternation left the round-one starter winning 37 to 44 percent of simulated matches. On your turn send one creature from your roster to one of the three sites, face up, or pass. **The vanguard falls back:** once per world, on their own turn and before passing, the world's starter may move the first creature they sent to a different site on the same world. It does not spend the turn; the handler still sends or passes afterward. The creature keeps its order of arrival and, if hidden, stays hidden. This is the starter's compensation for placing one creature with no information. Pass is permanent for the round. A stealthy creature may be sent **hidden**: the opponent sees that you sent a creature this turn, but not which creature or to which site, until orders are revealed. Any number of creatures may stand at a site. Deploy ends when both have passed.
2. **Orders.** Both handlers, at the same time and in secret, assign each of their deployed creatures one of its acts, or Hold (no act). A creature not given an order performs its favored act (the one its archetype prefers). Orders are revealed together.
3. **Resolve.** Ambush acts resolve first, in initiative order among themselves. Then wards. Then everything else in initiative order, strained creatures last. Each act targets by the creature's conduct given the board at the moment it acts. Outcomes are applied immediately, so a routed creature never gets to act and a staggered one hits for less if its magnitude depends on its own condition (it does not; only hold is halved by stagger).
4. **Judge.** Each site goes to the side with the greater surviving hold there, staggered hold counted at half. A tie reverts the site to the Court. Winners' banners are placed. Creatures at a won site stay to hold the claim; creatures at a lost or tied site withdraw. Either way they are out of the expedition. The next world is revealed.

The match ends when a handler holds five worlds, or after the third frame; more worlds held wins the Charter. Equal worlds held: the handler with more creatures still unsent wins; then the one who passed first in the final round; then the non-starter of the final round. (Written for one world of three sites per round; since the Proving, read "site" in the round text as "one of the frame's three worlds, at its loaded site": the phases, the fall-back, the pass, hidden sends and the judging are unchanged.)

## The acts

Sixteen actions, grouped by what they touch. Magnitudes are as above; "the target" is chosen by conduct.

**Contact (touches the site the creature stands at):**
- **strike, crush, rake, lash:** compare magnitude to the target's current hold. Below half: shrugged, nothing happens. At least half but below the full hold: **staggered**, the target's hold is halved for the rest of the round; a staggered target hit again at half or more of its current hold is routed. At least the full hold: **routed**, driven off the site and out of the expedition.
- **shove:** moves the target to a neighboring site in the frame instead of harming it, where its hold is recomputed against that site's world and environment. Since the Proving a neighbor is another world's model; the frame reassigns the creature (assumption 23). Anchored creatures cannot be shoved.

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

Public information only. Deploy is an allocation across three sites with a roster that must last three worlds, so the bot thinks in two currencies. Every (creature, site) pair is scored: flipping a site from losing or tied to winning is worth a fixed prize, less the hold spent (so a cheap flip beats an expensive one); adding hold to a site already winning is worth a smaller amount scaled by how much of the lead it adds; each own creature already at a site discounts sending another there, which is the spread bias; severe strain costs extra; and every hidden enemy send is treated as unseen hold at every site. The bot passes when it holds a majority with its even share of remaining sends spent and the opponent has already passed (never while the opponent can still answer), when it is over its share for this world with no flip on offer, or when the best candidate is not worth a creature. On the last world, or when the opponent could clinch, it spends freely. Orders: per creature, the act with the best expected outcome against the visible board using the same stagger and rout thresholds, area acts valued as enemy outcomes minus ally outcomes at the best site, wards valued by the threats present. All weights are exported constants.

## Interface principles (from the usability pass)

The table must always show whose turn it is, what a click will do, and what just happened, without scrolling. Every number on the table is the live value the rules will use. Every invalid action says why. A player can inspect any creature, theirs or the enemy's, and read its conduct line and thresholds. Resolution is narrated and animated in initiative order; the log stays.

### Two views of the same table (Nick, 2026-09-03)

The table has a simple mode and an advanced mode over the same engine and state, switchable at any moment from the masthead and remembered per browser; simple is the default. The rule for simple mode is to remove decisions, not to hide panels: each deploy turn shows one recommended move (the bot's own choice for the handler's seat, run without its randomizer) as a button with the reason in one sentence built from the engine's numbers, and marks the recommended creature and site on the table; the player may still pick any creature and any site. Orders becomes "each of your creatures acts by nature" with the preview sentences and a Go button, the full orders panel one tap away. The rail (log, dossier) is gone unless a dossier is open; the last two lines of the record ride under the status strip. Hidden sends, the fall-back button and the pass button's small print live in advanced mode; the recommended move carries them when the bot would use them. Advanced mode is the whole table as before.

### Every change is told twice (Nick, 2026-09-03)

A change on the table that simply appears reads as nothing having happened; the rival's move in particular was invisible, so the player could not tell that it had acted and the move was now theirs. So every engine step is told twice, once by the state and once by motion. A creature that lands drops onto its site (the rival's from above, yours from below), and the site takes the sender's tint for a beat. A callout on its own row above the sites says what happened in a sentence, in the colour of who did it (you, the rival, the Court, the table), shown one at a time for about a second and a half. The numbers that changed tick: site margins and totals, the score, a pip that lights. The turn readout is the loudest part of the story: while the rival thinks its dots walk; when it has moved the lamp stays red and the readout says what it did; only after that beat does "Your move" arrive, as its own change. The rival's delay is longer than your own beat so the table settles before the rival is seen deciding. Resolution keeps the outcome words over the figure it lands on, and adds the acting figure's lunge and the struck figure's jolt; the Court's stamps come down one site after another. None of it glows (panels stay matte; the lamps stay static), motion is position, tint and opacity only, and all of it is off under prefers-reduced-motion. The durations are levers in reclamationMatch.js (BOT_DELAY_MS, BEAT_MS, ARRIVE_MS, RESOLUTION_STEP_MS).

### The table in the Duel's parts (Nick, 2026-09-04)

Three complaints after the first sessions with real creatures: the roster was a fresh design of its own rather than the site's, the recommended-move button held the player's hand, and a site was circles in a square with nothing to say whose creature stood where. The redesign reuses the Duel's design system. The figure is the Duel's piece: the species silhouette standing on the floor with a rim of light in its side's colour, the element disc pinned at its foot, its name on a stencilled plate and its hold stamped beside it; the rival's face down the table, yours face up. Sides are the Duel's two paints, cyan for you and brass for the rival (tokens --g-team-one and --g-team-two, added to both halves of the design system), used everywhere a side is named: pips, margin bands, stamps, callouts, the floor. Each site is a floor with the rival's rank on the far edge and yours on the near one, each edge painted and labelled, so whose creature is where is read from the ground before the figures are; an empty rank says "no one". The roster is the Duel's rail: twelve fixed slots for the whole expedition (in hand, sent and where, holding a won site, routed), each with portrait, name, element, a bulb-strip hold meter, and one chip per site of this world saying what the creature would hold there, best site marked and strain named, so the twelve are compared on the list rather than by arming each in turn. The deploy turn is a two-step choice in the rail: choose a creature (pointing at a slot previews it on every site), then choose a site (the rail becomes the chosen creature's card and one row per site saying what the margin becomes; the sites on the table say the same; press either to send). The bot's pick is marked quietly as "suggested" on a slot and a site, in both modes; the recommended-move button is gone. Simple mode's orders plan moved into the rail beside the sites for the same reason. Hidden sends and fall back show in simple mode only when the suggestion would use them, always in advanced.

Second pass the same day. Nick: the two sides of a site needed more distinction without becoming two cards, and step two of the deploy repeated the three sites as rows beside the three sites on the table. So the site's two halves are now two grounds, the rival's hatched in brass and yours scored in cyan, each edge a painted band naming the side and carrying its own total, with a double rule as the front line. The margin band became a balance: one bar, the rival's hold pushing in from the left and yours from the right, meeting where the site stands; a previewed send extends your end as a hatched ghost with its number and the sentence below says what it would become. Step two of the deploy panel is the chosen creature, a cue to press a site, and the same three chips its slot carried, now pressable; the sites themselves are the choice surface.

Third pass the same day: numbers as pictures. Hold is a bulb strip in the side's colour on every figure, every slot chip and the front line, drawn on the Duel's meter construction; what the environment took is a hatched hazard segment past the filled part (severe in red), a stagger is a struck red segment, home ground a brass cap. Each site's environment is a temperature scale shared by every site (cold to the left, hot to the right, zero marked) with the site's band on it and a glyph for the medium; a previewed creature lays its own band over the site's, so strain is seen as two bands missing each other, and the medium glyph turns hazard or red when the body cannot bear or breathe it. Sends left are pips. The intro now says what hold is in one line: how firmly a creature keeps a site; built for one world, it holds less on the wrong one; acts strike at it; the Court gives the site to the side that still holds more.

Open after this pass: sites with many creatures scroll inside their floor (ten at one site hides the near edge); on a phone the three sites stack above the deploy panel, so choosing means scrolling; the log in advanced mode yields most of its height to the deploy panel.

## Open items

- The name. Tribute was named for the row game's fiction. "The Proving" is the fiction's name for a match; whether the game itself takes it is open.
- The Proving lore is proposed canon only: the Court's frame, the recovered Generator models, the QED link and the proctor need entries in the glossary and a paragraph in the Poseidas history before they ship in the encyclopedia.
- Sites: authored, three per world; since the Proving only one per world is loaded per round, so the other two are variety across Provings rather than texture within one.
- Shove across worlds (assumption 23) is untested with players.
- The generator exists (0.1.0) and the table plays real creatures. Open: strain still falls on 57 percent of sends (assumption 19 is a lever); sand creatures win 70 percent of their sites and psychic and fire creatures under 48; the round-one starter wins 45 percent (600 matches, seed 11); traits the table does not read yet (perceptive against hidden sends, slippery against snare, mind-sealed against terrorize, inspiring, healing, regenerative, toxic, volatile, reflective, ramming, hypnotic, foresighted, telekinetic, phasing) are shown in the dossier as recorded but unread.
- Decrees, as parked above.
- Tuning: every formula above is a first guess. The simulator gets rebuilt for the new round and the same batch statistics (starter advantage, sites per round, rout rate, act usage, pass behavior) drive the numbers.
- Whether staggered creatures should be able to act at full magnitude (currently yes, stagger only halves hold).

## Path to playing it

1. Sites data for the fourteen worlds (lore authoring, can start now).
2. Engine: world and site model, hold and strain, the four-phase round, the sixteen acts, conduct, judging, the match. Pure state machine with tests, as before.
3. Bot and simulator; tune.
4. Table UI on the Duel's creature representation: roster, the frame's three worlds, orders panel with preview, resolution playback.

## First numbers (bot vs bot, 2026-09-02)

The simulator (`my-app/src/gameplay/expedition/devtools/expeditionSimulator.js`, run through the esbuild runner) plays random twelve-creature rosters from the provisional roller against the real site data, 300 matches per seed.

1. The first bot never passed until it was out of creatures and stacked everything on one site, so 82 percent of sites went to the Court on ties. That was the bot, not the rules; the allocation and pass economy above replaced it.
2. With the current bot, across seeds 7, 99 and 2024: about four sites won per side per match, 11 to 12 percent of sites reverting to the Court, one to two creatures per site at most, ten creatures sent per match, around four routs and one to two staggers per match, hidden sends on about a tenth of turns, and nearly every match going to the third world.
3. The round-one starter won 37 to 44 percent under pure alternation. The trailing-handler-moves-first rule and a bot that no longer passes into an open opponent bring it to 41 to 45 percent. The remaining gap is the last-word advantage of deploying second and is the first thing human play should weigh in on.
4. Roster economy after the relocation rule and home-world tolerances (seed 7, 300 matches): the round-one starter wins 47 to 50 percent under random rosters and 42 percent in mirror matches, where both sides play the same twelve, so a seat bias of a few points remains and human play should weigh it. Relocation is used about twice a match and flips a losing vanguard to a winning site 18 percent of the time. Roster strength barely predicts the winner (the roster with higher mean hold wins 52 percent), and the bot beats a uniformly random opponent by 5.7 sites to 2.6, so the game is decisions rather than stats. Orders change the outcome of about one site in five (the leader after Deploy differs from the winner at Judge 21 to 24 percent of the time). Strain now falls on 60 percent of sends with 9 percent severe, and strained creatures win their site less often (53 percent versus 64 percent unstrained), so it is a real cost. The bots spend about four creatures on each of the first two worlds and arrive at the third with two each, so the third world is a closer decided by one or two sends; whether that is a feature or a bot habit is for human play to say.

5. Real creatures (2026-09-03, generator 0.1.0, 29 species dealt evenly, seed 11, 600 matches): the round-one starter wins 45 percent (CI 41 to 49); comebacks from behind after world one 23 percent; orders change the leader at 16 percent of sites; one site in five is uncontested. Strain under the graded rule: 36 percent of sends comfortable (site win rate 65), 57 strained (52), 6 severe (58); home ground on 5 percent of sends (win rate 73). By element, sand wins 70 percent of its sites and metal 67; fire 47 and psychic 48. By archetype, vanguard 75 (n=108), stalwart 67, juggernaut 65; rogue 45, sovereign 46, virtuoso 48. Base hold runs 4.4 to 16.5 across individuals; species means from 6.0 (Tizzie) to 15.4 (Yetimoth). These are the first real-data numbers and the levers to weigh are strain (assumption 19), the site bands (20) and whether the support archetypes need a hold floor.

The simulator's full readout (`--json` for diffing rule variants, `--mirror`, `--random=A|B`) lives in `my-app/src/gameplay/expedition/devtools/expeditionSimulator.js`.
