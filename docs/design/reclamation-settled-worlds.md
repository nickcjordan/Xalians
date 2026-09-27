# Reclamation: settled worlds and the send budget (pass 63)

Status: shipped in pass 63. It takes the first two weaknesses ranked by the self-audit (`reclamation-audit-2026-09-26.md`).

## The problem

The pass 62 blind critic gave decisions 5 and arc 4. It named these as its first two problems:

> **1. The send budget is hidden when you decide, and nothing flags overkill.** You sit at 36 vs 13 and 29 vs 13 with every rival creature already marked X, and sends left shows only as a small "3" beside unlabeled icons.

> **2. You can spend all your sends early, and the game then plays a final round in which you have no moves.**

The table already had the facts. The rival had passed, every one of its creatures was crossed out, and your bars led at all three worlds. But nothing said that a send to those worlds could no longer change who holds them. The budget was a numeral in the top bar. The line under the Ruling said only "The rival sends first", even when you had nothing left to send.

## What changed

**Settled worlds.** A world is settled for the round when the side behind there can no longer act:
- the rival has passed with nothing hidden, and you lead; or
- you are done (passed, or no sends left), and the rival leads.

What follows can only add to the side still acting, because a creature never harms its own side. So the forecast's leader holds the world. On the table:
- **The world:** the Ruling's pennant, in dashed outline, stands beside the leader's total. The Ruling fills it in when it rules.
- **The cards:** a column for a world already yours is drawn quiet, at a third of its strength. With the rival passed and all three worlds yours, the whole squad goes quiet.
- **The words under a creature pointed at** open with "Already yours this round. The rival has passed and cannot answer here; you lead by 25."
- **The top bar,** in place of "The rival has passed.", says what the pass settles: "The rival has passed: Magmuth and Saiphus are yours as they stand; Grimedes is the rival's by 6."

When nothing this round can change any more, the same line says what a send would spend: "The rival has passed: all 3 worlds are yours as they stand. You have 5 sends for the 6 worlds to come." This was added after the reader below asked for the budget beside the pass.

**The budget at the moment of choosing.** While a creature is lifted, the top bar says what the send leaves against what is still to come:
- "After this send: 4 sends left for the 6 worlds still to come."
- On your last send: "This is your last send: the 3 worlds still to come get none."

**The round after your last send.** The line under a Ruling says so: "Next: Zolton, Krystos, Drainov. You have no sends left, so the rival takes any of them it sends to, and it needs 1 to win." The engine already passes you automatically when you have no legal send.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Settle a world only when the side behind cannot act, never on a lead that merely looks safe | 90%: a lead the rival can still answer is not settled, and calling it so would be advice that can be wrong | `settledWorlds` in `reclamationMatch.js` |
| 2 | Nothing is settled for you while the rival has a hidden creature this round | 95%: a hidden send may stand at any world, and the forecast cannot see it | `hiddenSentThisRound` |
| 3 | Mark it with the Ruling's own pennant, in outline, not a word on the board | 80%: position and a mark the player already knows (pass 54), per the no-labels rule | `affordances-not-labels` |
| 4 | The budget line appears only while a creature is lifted | 75%: that is the moment a send is chosen; at rest the top bar is for news (pass 52) | critic, problem 1 |
| 5 | No new rule: the dead round still plays, and the line under the Ruling says what it holds | 70%: ending a game early changes the engine, and Nick has said the mechanics are in a decent place (2026-09-23) | `nextRoundLine` |

## Measured

Two blind readers, one per build, read the same three screens of seed 21 with the critic's line of play:
- round 1 after the rival passed, with every world yours;
- the same moment with Venemist lifted;
- the Ruling after all eleven sends went into round 1.

| | Live (pass 62) | Pass 63 |
|---|---|---|
| Whether a send still matters (1 to 10) | 3 | 8 |
| How many sends are left and what they must cover | 2 | 6 |
| How easily you could make a good move | 4 | 6 |

- **Before:** "nothing says the world is already decided", and "the big +11 previews look like gains".
- **After:** the reader read "Already yours this round" and "you lead by 25" straight off the table (sure). It read "4 sends left for the 6 worlds still to come" off the top bar (sure). It read what round 2 holds off the line under the Ruling.
- **The after-reader's remaining gap:** at rest the budget was only the tallies. The pass line now carries it when nothing this round can change. It also asked for the Pass key to be lit at that moment; that would be a suggestion, which the table does not make (pass 38).

## Verified

- New tests cover:
  - which worlds settle, and when nothing does;
  - the pass sentence;
  - the budget line;
  - the line under the Ruling;
  - "Already yours" as the first reason.
- All 1780 web tests pass.
- The four table checks are green: proving (both views at 1440, 1366 and 390), shift, actflip and hotseat.
- On a 390 phone, the longest pass line fits in three lines.
