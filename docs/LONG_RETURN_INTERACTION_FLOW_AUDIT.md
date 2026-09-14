# Long Return interaction-flow audit

2026-09-10 · Trial implementation, pending human playtest

## Interaction contract

- Select: highlight an option, no cost and no navigation.
- Details: an explicitly labelled disclosure, never the side effect of selecting.
- Act: a specific verb naming what happens; costs and animation begin here.
- Continue: leave a persistent outcome after the player has had time to read it.

## Pass across the expedition

| Surface | Decision |
| --- | --- |
| Crew setup | Keep choose-three and launch: launch really starts the expedition. |
| Scout | Stable compact cards; separate cost explanation. Selection no longer expands a card. Send names the creature. |
| No scout | Remove the empty report gate; go directly to crossing choices. |
| Scout report / physical return | Keep: report contains new intelligence; returning is an actual resource-consuming action. |
| Route and crew | Merge route selection and suggested crew approval. Keep the comparison visible and one Cross now action. |
| Custom crew | Optional advanced branch with an explicit Back to crossing choices control. |
| Encounter | Keep separate response choice because this is new information; commitment names the response, not “Take this action.” |
| Crossing animation and result | Keep the outcome persistent; no automatic dismissal. |
| Repairs | Keep select/preview/spend: salvage is consumed only by the spend action. |
| Push deeper / extract | Keep explicit alternatives: they change the mission outcome. |

## Verification

### Composition follow-up

Implemented a shared quieter workspace treatment across setup, scout selection, route/crew choice, encounters, sector arrival, repairs, and mission end. Crossing outcomes now have an arrival/story column and a settled resource receipt. Scout reports and native outcomes use a creature-source column beside the report rather than repeated banners. Route recommendations are no longer repeated above the comparison. Optional-depth resource duplication is removed; live resources remain in the header. Advanced data and disclosure content are preserved.

Desktop visual checks covered crossing outcome, next-sector arrival, scout selection, native response selection, companion outcome, and scout report. Automated coverage also exercises optional extraction, repairs, failure and full mission paths. Narrow-screen visual validation remains a separate follow-up, not claimed complete here.

- Automated regression covers complete expeditions, native encounters, companions, repairs, extraction, saved runs, and advanced-mode access.
- New regression checks selection retains focus and the same comparison DOM, no second approval gate, and Cross now starts the crossing.
- Desktop browser checked scout layout, skipping scout, route selection, action bar, and actual crossing animation.
- Still requires human validation of confidence before each click; narrow-screen and touch review remain follow-up quality work.
