# Reclamation: one number (the "plain" rules)

Status: proposed 2026-10-03. Nick approved the direction; no rules have changed yet. This is the variant to build, simulate and play next. Log: `reclamation-ownership-log.md`.

## Why

Nick, 2026-10-03, on the game as it plays:

> it feels like keeping both of these concepts at the level of granularity that they are simply does not work and creates a scenario where there's too many variables at play for a user to understand if what they're doing is a good move. As a user, if you are making a move and you don't understand how that move would affect the game, then the game's not going to be fun.

Every creature carries two numbers today, a hold from 3 to 18 and an attack from 1 to about 20. Each is adjusted by fine factors:
- **On hold:** home ×1.25; strain ×0.9, 0.75, 0.5 or 0.25; world element ×0.9; willpower, bolster lift, pack-bonded and solitary.
- **On attack:** the element chart (×0.25 to 2), the sweep discount ×0.6, armor ×0.75, the guard of a bolster ×0.75, and "hurt attacks less".
- **In the fight:** targets picked by instinct lanes, and order set by strain, speed and reach.

To judge a send, a player has to run all of it in their head. Pass 72 hides the outcome on purpose, so they never learn the mapping.

## What Nick wants kept (the pillars)

1. **Watch the fight.** Prepare, then sit back and watch the creatures battle it out back and forth, with some randomness.
2. **Read the map.** See where the rival has loaded up, and choose between attacking the stronghold and grabbing a thinly held world.
3. **Acts that matter.** Whether a creature hits one, hits all, mends or guards should change the result in a way you can see coming.
4. **World fit and element, kept as concepts.** A world that suits a creature helps it, and one that doesn't hurts it. An attack the target is weak to lands harder, and one it resists lands softer.

## The change in one line

Hold is the only number. An attack is not a number: it is what the act does, a fixed small amount, and the element and the world each move things by one step at most.

## The rules

### Hold

- **Range:** a small whole number from 2 to 6, read from the same record attributes as today. Today's base hold of 3 to 18 is divided by 3 and rounded, then held to 2 to 6.
- **Spread:** species means of about 7 to 14 today become about 2 to 5, which keeps strong and weak creatures distinct.
- **Who wins:** a world goes to whoever holds more of it after the fight, as now. A tie goes to nobody.
- **Totals stay small:** a stronghold of four creatures is around 14, against a lone 3 elsewhere, so the map reads at a glance.

### World fit: three steps

| The world | Hold there |
|---|---|
| Suits it: its home world | +1 |
| Neutral: everything else, including the mild strain today's rules call "strained" | 0 |
| Hostile: today's "severe" strain, or a medium it cannot breathe | −1, never below 1 |

Today's ×0.9 world-element penalty, willpower, the bolster's strain relief, pack-bonded and solitary all go.

### Acts: fixed effects

Each creature has one act, as now, chosen from its record by the existing role rules. The act's hit is fixed and is the same for every creature with that act.

| Act | What it does each exchange |
|---|---|
| Strike | takes 2 off one rival at the world |
| Sweep | takes 1 off every rival at the world (not your own side) |
| Mend | gives 1 back to your most hurt creature there, never above its hold |
| Guard | stops the first hit aimed at your side there, entirely |

**Element: one step either way.** It uses the existing chart, read in three tiers:
- **Strong** (chart 1.5 or 2): the hit takes 1 more (strike 3, sweep 2).
- **Neutral** (1): unchanged.
- **Weak** (0.5 or less): the hit takes 1 less (strike 1, sweep 0).

That keeps every hit between 0 and 3, so a player can read the fight off the board.

Today's strike-power and sweep-power attributes, the sweep discount, armor, the bolster's guard, "hurt attacks less", statuses, mend size by charisma and the attrition bite all go.

### The fight

- **Simultaneous exchanges.** Every standing creature acts, and the hits land together. Then the next exchange begins, up to 4 exchanges, until one side has nobody standing or nobody standing can hit.
- **No order.** Speed, strain order and reach no longer matter.
- **The randomness to watch:** a strike picks its rival at random among those standing, drawn from the match's seed so a replay repeats it. A sweep and a guard are certain. A fight between strikers swings back and forth, while a sweep against a crowd is a sure thing. That gives the player a real choice between a gamble and a sure thing.

### What stays

These are unchanged: the frames of three worlds, 11 sends from 12, first to 5 worlds, the stake, placement stacking, and creatures that hold a won world staying there.

## What the player sees

- **The tile:** hold as the one number, then the act glyph and its word (strike, sweep, mend, guard) with no number beside it, and the world strip carrying +1, 0 or −1.
- **The rival chip:** pointing at or lifting a creature puts the hit it would take on each rival there, for example "−2", or "−3" in green when the element is strong.
- **The worlds' totals:** the sums of these small holds.

Because every number is small and every effect is fixed, a player can count a fight before it happens, roughly. Pass 72 still keeps the exact outcome hidden, and whether it still needs to is a question for after the first playtest (see the open decisions).

## How it gets checked before Nick plays it

1. **Build it as a rules variant.** `RULES_PLAIN` is a `RulesInput` exported beside `DEFAULT_RULES`, with new rules keys for the parts that are hard-coded today (strain steps, act effects, fight shape). The shipped rules keep working.
2. **Simulate.** Run `expeditionSimulator` with `--rules` set to the variant, against the current rules at the same seeds and match counts. Compare:
   - seat fairness;
   - tie rate;
   - how often the fight changes a world's leader;
   - win rates by act, so no act is dead or dominant;
   - species balance.
3. **Validate.** Run `expeditionValidation`. Decision quality has to rise or hold:
   - naive-policy regret;
   - option spread;
   - point of no return.

   It must also pass three checks that are the pillars made measurable:
   - **the map read:** sending to the thinner world beats piling onto a stronghold when the numbers say it should;
   - **acts:** sweep has to beat strike against a crowd of three or more, and strike has to beat sweep against a lone big defender;
   - **fit and element:** a +1 or −1 world and a strong or weak hit have to move win rates in the direction a player expects.
4. **Test both creature sets.** Run against the real catalog and against the sample creatures (`packages/rules/src/samples`), reported in separate columns.
5. **Ship it as a mode.** When the numbers hold up, the variant becomes a playable mode on the live site for Nick to play. The current rules stay selectable until he rules.

## Open decisions (each is a lever, set here so work can proceed)

| # | Decision | Setting for now | Why |
|---|---|---|---|
| 1 | Hold range | 2 to 6 | Small enough to count, wide enough that a stronghold reads |
| 2 | Strike hit, sweep hit | 2 and 1 | A strike downs a weak creature in one exchange when strong. A sweep needs a crowd to beat it. |
| 3 | How a strike chooses | at random among standing rivals | This is the randomness Nick likes watching. The alternative is "the biggest rival", which is predictable but dull. |
| 4 | Sweep hits your own side | no | One fewer thing to count. Today's default already has friendly fire off. |
| 5 | Exchanges per fight | up to 4 | Enough back and forth to watch, short enough to read |
| 6 | Mild strain | neutral, no step | Three steps were the ask. Only severe strain and breath cost a step. |
| 7 | Pass 72, hiding the outcome | kept for now | To revisit after Nick plays: with small fixed numbers, a forecast may now help more than it spoils |
| 8 | Creatures differ by | hold, element, act and home world only | Attack strength between two strikers no longer differs. If creatures feel samey, a creature's record could give a strike that is "heavy" (one more), as a later lever. |
