# Reclamation: temperature weighs less (pass 68)

Status: shipped in pass 68. A rule change, asked for by Nick.

## The request

Nick, 2026-09-27: "I feel like the temperature bands have way too much weight on the factor of the creature's hold. I think I like the idea of keeping the concept in place, but instead of cutting the hold in half or in quarter, I feel like it should be something more along the lines of removing a quarter or removing 10% or something like that. I want the majority of the weight of your decision making to be based on the more important factors, and the planet's temperature band is a boring factor to base so much of the gameplay on."

## What changed

| A world that strains it by | Before | Now |
|---|---|---|
| Temperature, off (the bands overlap less than half, or miss by up to 30°C) | ×½ | ×0.9 (a tenth off) |
| Temperature, far off (the bands miss by more than 30°C) | ×¼ | ×¾ (a quarter off) |
| The wrong air or water around it | ×½ | ×½ (unchanged) |
| An air it cannot breathe | ×¼ | ×¼ (unchanged) |

The factor applies to a creature's hold and its blows, as before. Willpower and a bolster still lift one grade.

**The cause is part of the rule now.** The engine reports what sets a creature's grade: `strainCauseOf` returns breath, the wrong medium, cold or hot. `strainMultiplierFor(level, cause)` prices the grade by that cause, and the levers are `TEMPERATURE_STRAIN_MULTIPLIER` and `TEMPERATURE_SEVERE_MULTIPLIER`. Where a world is both the wrong medium and too hot, the medium's half is what counts, so a mild temperature never hides the wrong air.

**On the table:**
- A card's mark reads "×0.9" or "×¾".
- The words under a lifted creature say "Too cold for it: it holds nine tenths", or "three quarters" when it is far off.
- The key and How to play say the same.
- The words under a creature now give way one line at a time before they go entirely. The new rule moved the proving check's game to a crowded case: four lines beside two of your creatures in advanced mode, which hid every line at once.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Temperature costs a tenth, or a quarter far off | 85%: Nick's own numbers ("removing a quarter or removing 10%") | the request above |
| 2 | Leave the air and the medium at a half and a quarter | 60%: Nick named temperature only; each is one lever away (`STRAIN_MULTIPLIER`, `SEVERE_STRAIN_MULTIPLIER`) if he wants them softened too | `expeditionInterpretation.ts` |
| 3 | The wrong medium outweighs a temperature when both apply | 75%: otherwise a mild temperature would hide a harsher strain | `strainOf` in `creatureOnTable.ts` |

## Measured

Simulator, proctor mirror, 500 matches on each seed:

| Gauge | Band | Pass 62, seed 7 / 13 | Now, seed 7 / 13 |
|---|---|---|---|
| Round-one starter wins | about 50 | 50.2 / 44.6 | 48.2 / 50.4 |
| Comeback (trailing after world 1, won) | 30 to 40 | 28.7 / 32.4 | 29.4 / 29.0 |
| The Clash changes the leader | 25 to 40 | 27.3 / 26.4 | 31.7 / 30.6 |
| Downs per match | reported | 8.69 / 8.54 | 8.90 / 8.73 |
| Uncontested worlds | reported | 18.1 / 17.1 | 11.8 / 10.5 |
| Sends to a world that strains the creature | reported | 27.2 / 28.9 | 39.6 / 41.7 |
| Strike keeper win rate | 40 to 60 | 64.9 / 63.5 | 67.0 / 63.2 |
| Sweep keeper win rate | 40 to 60 | 53.5 / 52.8 | 51.5 / 54.0 |
| Shield keeper win rate | 40 to 60 | 54.7 / 51.6 | 50.7 / 51.2 |
| **Bolster keeper win rate** | 40 to 60 | 41.2 / 44.0 | **35.2 / 37.0** |
| Games with a stake | reported | 3.4 / 2.2 | 0.4 / 0.4 |

**What it did:**
- Temperature steers far less. The bot now sends a creature to a world that strains it 40 percent of the time, up from 28, and wins those worlds at the usual rate (51 percent).
- Worlds are more contested: 11 percent go uncontested, down from 18.
- The Clash changes the leader more often (31, up from 27).
- The starter seat is back in band on seed 13.

**What it cost: the bolster.** Its job was to lift a strained ally one grade, and a grade of temperature is now worth only a tenth. Bolster keepers fell from 41 to 44 percent to 35 to 37, below the band. The first lever to try next is the bolster's flat lift (`BOLSTER_FLOOR`, 1). Strike keepers stay over the band, as before.

## Verified

- **Rules:**
  - All 644 rules tests pass.
  - New tests cover the four factors, the cause of each, and the medium outweighing temperature.
  - Tests that priced a temperature grade at a half now use the lever. The bolster test now uses the wrong medium, whose grade still halves.
- **Web:** all 261 Reclamation tests pass.
- **Table checks:** proving, shift, actflip and hotseat all pass. The proving check's plate sum now skips a world while a creature pointed at previews itself on its bar, since that creature has no plate. This was a flake in its first run.
- **Paint:** at 1366 by 768, cards read ×0.9 under a flame or a snowflake.
