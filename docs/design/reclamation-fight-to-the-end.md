# Reclamation: each world fought to the last side standing (pass 56)

Status: shipped in pass 56. It changes the Clash (the base redesign's step 2) and the Ruling that reads it. The rulebook's "How a Clash resolves, exactly" in `reclamation-design.md` is updated to match.

## What Nick asked

Nick, 2026-09-23:

> What do you think about allowing each world to play until there's only one side remaining? I feel like that's a much better version of this game because right now there's just one round of attacks and then whoever has the most life wins, but that's kind of dumb. I feel like it should start with one round of attacks and then just continue cycling that way for second and third and however many rounds are needed until one side or the other has no more characters with health. This way the winner goes to who has creatures remaining, not whose creatures had more combined health after 1 round. Also I feel like that would also allow you to implement the concepts like burning and other statuses that are multi-turn ... And when you do this battle, I feel like you should make a big cinematic scene out of it for each of the worlds as all the attacks play out.

And, on the -13 cards: "I don't think a sweeping attack should inflict damage on your own team ... go ahead and [turn friendly fire off]. I don't like the idea of friendly fire unless there's a particular reason you can think to keep it."

## The rule

- **A world is fought exchange after exchange.** Each exchange is the Clash as it was: attacks declared, shields cancel, attacks land in speed order, a creature at nothing falls.
- **Between exchanges**, each bolster gives its allies back its share of what the exchange took, statuses tick (a burning creature burns, an expiring pin releases), and holds are recomputed for the company still standing.
- **It stops** when one side has nobody standing, when nobody standing can attack (two shields have nothing to fight with), or when an exchange changes nothing. `clashExchanges` (12) is a safety cap that 0.2 percent of worlds reach.
- **The Ruling** still reads the hold standing, so after a fight to the end the world goes to the side still standing. When a fight stops with both sides standing (no attackers left, a stalemate, the cap), the side holding more takes it, as before.
- **No friendly fire.** A sweep lands on the other side only (`friendlyFire` false).
- **A shield cancels the other side's biggest attack every exchange, whole and for free** (`shieldCap` 'none'). Paying half of every cancel wore shields down before a long fight was over.
- **A world is fought to its end before the next begins**, so each world's battle is told whole. That is what lets the table play each one as its own scene.

The single exchange stays as a lever (`clashExchanges` 1), and the tests that pin one exchange's mechanics run it.

## The scene

While a world fights it takes the table. Its column opens to most of the width, its creatures grow with it (they size to their rank, up to 150px a piece), and the caption grows. The two worlds waiting their turn narrow at its side, dimmed, keeping their names and bars. Each new exchange is announced ("The fight goes on: exchange 2"). A status that bites between exchanges is told ("Kosanos loses 2 to burning"), and so is a bolster's mending. At the Ruling all three worlds stand side by side again, with the pennant on each winner's bar. The Skip key still ends the Clash at once.

## Measured

The simulator ran three seeds at 500 matches each, bot against bot, with friendly fire off in every column.

| | Single exchange | Fight to the end, as shipped |
|---|---|---|
| Round-one starter's win rate | 44.0 / 47.2 / 45.4 (biased against the starter) | 49.2 / 45.2 / 53.0 |
| The Clash changes the leader (band 25 to 40) | 22.8 / 19.5 / 23.3 (under) | 32.3 / 27.5 / 30.2 (in) |
| Comeback from behind after round 1 | 31.8 / 30.9 / 29.8 | 31.6 / 30.3 / 27.6 |
| Falls per match | 3.6 / 2.9 / 3.7 | 8.7 / 8.4 / 8.4 |
| Shield keeper win rate (band 40 to 60) | 48.9 / 49.8 / 48.7 | 45.4 / 51.3 / 48.9 |
| Bolster keeper win rate | 54.9 / 55.6 / 54.1 | 43.4 / 41.4 / 43.4 |
| Sweep keeper win rate | 54.3 / 58.2 / 54.8 | 46.9 / 52.8 / 49.6 |
| Strike keeper win rate | 65.5 / 63.8 / 66.3 | 69.6 / 67.5 / 69.2 |
| Attacks per match | 18.8 | 40 to 44 |

The fight ends like this:

- 99.6 percent of worlds end with one side standing.
- Fights run 1 exchange 45 percent of the time (mostly uncontested worlds), 2 exchanges 36 percent of the time, and 3 or more 19 percent of the time.
- 0.2 percent reach the cap.

**How the settings were chosen.**

| Fight to the end with... | Shields | Bolsters | Clash changes the leader | Attacks per match |
|---|---|---|---|---|
| half-price shields | 37 to 40% | 33 to 37% | 31 to 34.5% | 35 to 38 |
| bolsters mending between exchanges | 37% | 41.6% | | |
| whole-cancel shields (as shipped) | 45 to 51% | 41 to 43% | 27.5 to 32% | 40 to 44 |
| lower damage too (`magnitudeScale` 1.3) | 50 to 54.5% | 50 to 52% | 23.5 to 27% (edge of band) | 49 to 55 |

- With half-price shields, supports could not finish a fight.
- Mending between exchanges gave bolsters a job: 41.6 percent on seed 7.
- Whole-cancel shields brought shields into band while keeping the Clash deciding worlds.
- Lower damage balanced supports a little better, but the Clash mattered less and the scene ran longer, so it was not taken.

**The falls band.** Falls per match used to be held to 3 to 5. That band described a single exchange. In a fight to the end the losing side falls by design, so the band no longer describes the rule, and the gauge is reported rather than held.

## Open

- **Strike keepers win about 69 percent**, over the band. They were already 64 to 66 percent under the single exchange, and no lever tried here moved them; this is the next balance item.
- Nobody has watched a whole Proving of fights as a player yet.
- The validation tool flags always-presence-first within five points of the proctor (45.8 against 49.3, 400 matches). By the design's own reading of that policy (presences too cheap only if it beats the proctor), whole-cancel shields are priced about right; half-price shields put it 9 points behind but leave shields under band. Watch it.
