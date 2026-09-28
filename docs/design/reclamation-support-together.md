# Reclamation: support creatures stand with their side (pass 70)

Status: shipped in pass 70. A bot change; no rule changed.

## The question

Nick, 2026-09-28, on pass 69's finding that a support creature almost always stands alone: "Can you determine the levers causing support creatures to be sent to a world by themselves? I would think that the bots would be doing the opposite of that." He also asked about two rule levers:
- a heal that weakens when the healer is hurt;
- counting a creature's full hold at the Ruling while it has any health left, so that knocking a creature out matters more than wearing it down.

## The cause: the bot's spread bias

The bot values a send by what it does to the world's margin. It then multiplies that value by `STACK_DISCOUNT` (0.6) for every creature of its own side already standing at the world. The discount exists to spread attackers across worlds, and it did. It also priced company as a cost for the one role whose whole value is company.

Measured at pass 69 (500 matches, seeds 7 / 13):

| | Seed 7 | Seed 13 |
|---|---|---|
| Support creature arrived first at its world | 95.1% | 95.9% |
| Support creature stood alone all round | 73.1% | 83.9% |
| Own creatures beside it | 0.27 | 0.16 |

So a support creature went to an empty world, and then every later send of its own side was discounted for going there.

This is the rival's behavior only: the table gives the player no suggestions (Nick's affordances rule), so nothing steered players the same way.

## The change

`SUPPORT_JOINS` (on) makes two changes to the spread bias:
- A support creature's send is not discounted for the company already at a world.
- A support creature standing at a world does not count against another creature's send there.

Company is still a cost for everyone else, so the bot still spreads its attackers. It is a rival weight (`supportJoins`), so a rival can be written that plays the old way.

## Measured

500 matches, seeds 7 / 13:

| | Pass 69 | Pass 70 |
|---|---|---|
| Own creatures beside a support creature | 0.27 / 0.16 | 0.81 / 0.79 |
| Stood alone | 73.1 / 83.9% | 22.3 / 25.0% |
| Arrived first at its world | 95.1 / 95.9% | 53.2 / 46.7% |
| **A side's share of a round's worlds with a support creature there** | 48.6 / 47.3 | **51.4 / 51.4** |
| The same side without one | 50.3 / 50.8 | 49.3 / 49.3 |
| Round-one starter wins | 47.0 / 51.0 | 51.4 / 48.6 |
| Comeback (band 30 to 40) | 26.7 / 31.3 | 28.5 / 26.1 |
| The Clash changes the leader (band 25 to 40) | 26.7 / 27.3 | 28.0 / 27.9 |
| Downs per match | 8.34 / 8.28 | 8.53 / 8.41 |
| Strike keepers (band 40 to 60) | 65.2 / 62.8 | 64.8 / 61.4 |
| Sweep keepers | 53.3 / 55.3 | 48.6 / 48.6 |
| Shield keepers | 51.9 / 51.2 | 45.9 / 47.6 |
| Bolster keepers | 43.2 / 39.0 | **67.1 / 64.7** |

**Sending a support creature now helps the round.** A side that fields one wins 51.4 percent of that round's worlds, against 49.3 without. That is 2 points up, where it was 2 to 3 points down.

**Bolster keepers are over their band. I think that is a selection effect, not strength.** A keeper win rate is the share of the worlds it stood on that its side won. A support creature now stands on the worlds its side stacked, which are the worlds its side was going to win anyway. That is why strike keepers have sat over the band since pass 57. The round share is the number that asks whether sending one helps, and it says a little, not a lot.

To test that, I weakened the support creature while keeping it joining:

| Joining, and | Bolster keepers | Round share with / without |
|---|---|---|
| mend at half | 60.2 / 55.9 | 49.6 / 49.9 against 49.9 / 50.2 |
| guard at 0.85 | 63.3 / 61.0 | 50.6 / 51.2 against 49.5 / 49.4 |
| both | 57.5 / 54.5 | 48.8 / 48.6 against 50.2 / 50.4 |
| only the support creature joins (others still discounted by it) | 59.2 / 56.5 | 50.2 / 50.3 against 49.7 / 49.7 |

Every weaker version brings the keeper rate into band by giving back the round share. That is what a selection effect predicts, and it is why I kept full strength.

## The two rule levers Nick asked about

**The heal is already full strength.** Pass 69 made a hurt support creature mend at full strength: priced like a blow, it spiralled, and support creatures won 26 to 30 percent. The other place hurt weakens a creature is the attacker (`HURT_ATTACKS_LESS`). Turning that off hurt support creatures (40.2 / 36.2) and helped strikers (68.0 / 66.0), so it stays on.

**Full hold while standing is an existing lever:** `CLAIM_COUNTING`, 'current' since pass 5, 'standing' being Nick's idea. Measured with the old bot:
- bolster keepers 45.6 / 42.0, against 43.2 / 39.0;
- round share with a support creature 49.2 / 48.2, against 49.9 / 50.4 without;
- the Clash changes the leader 26.1 / 26.3;
- downs unchanged.

With the new bot it adds nothing measurable (bolster keepers 68.6 / 65.8, round share 51.4 / 51.5).

It barely moves because of who chooses targets. The player never picks a target: each creature picks its own by its instinct (`pickAttackTarget`). So "go for the weak one to knock it out" is not a decision a player makes at the table. Under 'standing', a blow short of a down stops counting, but the player's only decision (who to send where) hardly changes. It would matter if players chose targets. It stays a lever, at 'current'.

## Verified

- **Rules:** 653 rules tests on the Mac mini, with a new one in `supportCarriesWeight.test.ts`:
  - a support creature is not discounted for joining its side;
  - an attacker's value at the same world is unchanged.

  The full run had generator and dungeon tests time out under load, and every file passed alone.
- **Web:** all 265 Reclamation tests pass.
- **Table checks:** proving, shift, actflip, hotseat and clash all pass against a preview of this build (the rival is the bot).
- **The clash check first failed.** Its round on seed 7 now opens with a seven-exchange fight: the rival's Bioflim, a support creature standing with a Kosanos, mends itself every exchange while two sweeps wear it down. That is about 50 beats at one world, which outlasted the check's 400 samples before the camera moved on. The check now samples up to 1500.

## A cost to watch: longer fights

A support creature standing with its side makes some fights longer:
- exchanges per fought world rose from 2.29 to 2.32 before, to 2.35 to 2.38 now;
- fights of six or more exchanges rose from 5.2 to 5.6 percent, to 6.1 to 7.0.

The check's round shows what that looks like at the table: the same two sweeps and the same mend, seven times over. A long fight of repeated exchanges could play faster from its second exchange on. That is a table change, not a rule change, and it is logged as an open item.
