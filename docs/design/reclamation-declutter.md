# Reclamation: the declutter pass (pass 38)

Nick, 2026-09-22, after the one-screen pass: "there's so much on the screen, I don't even know where to go. It needs to be intuitive how to play the game." He asked for a full design pass over every piece of text on the table: remove what gives no value or has gone stale, move what belongs somewhere else, replace text with a visual where one works, and put reference material in a panel you open when you want it. He also made pass 37's rule permanent: everything stays on one view, and what shows adapts to the size of the view.

## How this pass is scoped so it cannot stop early

1. **The inventory is the definition of done.** Every visible string on the table was dumped from the DOM in six states (rest, creature lifted, after a send, mid-round, the Clash, the Ruling) at 1440x900 in both modes and at 390x844. Each one has a row below with a verdict. The pass is finished when every row is resolved, not when the screen "looks better".
2. **A blind critic reads the result.** A reviewer that has not seen the code or this document gets only the screenshots. For each state it answers what the next action is and what it can't read. Anything it names goes back through the inventory. The pass repeats until a round turns up nothing new.
3. **The one-screen check still holds.** `reclamation-shift.mjs`, `reclamation-proving.mjs`, `reclamation-actflip.mjs` and `reclamation-hotseat.mjs` must stay green.

## Principles

- **One place says what to do next.** The message slot in the top bar holds the one instruction for this moment. No other region repeats it: not the bench heading, not a bench lead line, not a coaching strip.
- **The board says what happened.** A send is visible because the creature lands on the world, so the table does not also narrate it. Narration is for what you cannot see: the rival's moves, the Clash, and the Ruling.
- **Every number appears once.** A hold is a number or a meter, not both. A score is pips and a number in one place.
- **Simple mode shows what a decision needs. Advanced mode adds the arithmetic.** Temperature bands, speeds, attribute lanes, place names, meters and the log are advanced-mode material, and every one of them stays reachable in simple mode through the dossier or a panel.
- **Reference lives in panels you open.** How to play, the full history, and settings are behind buttons in the top bar.
- **The way out is always visible** (design system core rule). The site navigation gives way to the game while a match is in play, so the top bar carries a visible Leave button.

## The inventory

Verdicts: **keep**, **cut** (no value, stale or duplicated), **move** (belongs elsewhere), **visual** (replaced by a non-text affordance), **panel** (moved into an opened panel), **advanced** (shown in advanced mode only), **reword**.

### Chrome above the game

| Text | Verdict | Why |
|---|---|---|
| Site navigation (Home, Encyclopedia, Generator, Play, Sign in, Create account) | move | 57px of links unrelated to play. The match is immersive, and the design system lets immersive play replace the chrome if the way out stays visible. It returns on the intro and the report. |
| "Kozrak's Charter" kicker | cut | Lore label already on the intro screen. |
| "Reclamation" title | cut | The player knows what game they started. |
| Simple / Advanced switch | panel | A setting, changed rarely. Moves to the settings panel. |
| "against the Court proctor" | move | Becomes the rival's name on the rival score. |
| Sound button | panel | A setting. |
| "seed 7" | panel | Debugging and reproduction only. |

### The top bar (was the status strip)

| Text | Verdict | Why |
|---|---|---|
| ●○○ dots plus "Round 1" | reword | One readout, "Round 1 of 3". |
| World chips "Zolton Stonera Telypso" | cut | The same three names head the worlds directly below. |
| "then Endessa Saiphus Luminax" | panel / advanced | Planning information. It stays in advanced mode and lives in the How to play panel's round list. |
| "You ▪▪▪▪▪ 0 / Rival ▪▪▪▪▪ 0" | keep, reword | The pips are the progress to five. The rival row names the rival. |
| "Deploy" phase chip | cut | Jargon, and it repeats the turn line. |
| "Your move" / "The rival is deciding" | keep | The turn lamp. |
| Coaching steps 1, 2, 3 plus "Got it" | cut | It restated the hint line and stayed up for the whole first round. The hint line does its job with one short step per moment. |
| Hint: "Lift a creature from the bench, then press a world. Or stake a world, once this Proving, to make it count two. Or pass." | reword | "Pick a creature from your squad." The stake and pass buttons explain themselves where they are. |
| Hint while lifted: "... is lifted. Press a world to send it there, or press it again to set it down." | reword | "Pick a world for Terragoyle." |
| Hint while rival: "The rival is deciding. Press space to hurry it." | reword | "The rival is choosing." Space still hurries it, and the help panel says so. |
| Hint in the Clash: "The worlds are clashing. Skip, or press space, to jump to the ruling." | reword | "The worlds clash." The Skip button sits beside it. |
| Hint at the Ruling plus the Court callout plus "The Court has ruled" | reword | Three sentences saying one thing become one: "You took 2 worlds, the rival 1." |
| Callout "You send Graviclaw to ..." | cut | The creature landing on the world is the news. The rival's sends and the Court still get a callout. |
| Reach line "Still yours to take: 4 more of the 9 worlds left clinches the Charter." | keep, reword | Useful late in a match. Shortened to "4 more of the 9 left wins it." |
| Simple-mode ticker (four lines of history) | panel | It repeats the board and the callout. The full history opens from the History button, and advanced mode keeps its log rail. |

### The worlds

| Text | Verdict | Why |
|---|---|---|
| Index box "1 / 2 / 3" | cut | Numbers nothing: there are no keyboard shortcuts and nothing refers to "world 2". |
| Planet name | keep | |
| Place "The QED Manufactories" | advanced | Flavor. The place's description stays in the world name's tooltip, as deeper information. |
| Temperature scale "-40 to 20 C" while lifted | advanced | Strain already shows in the hold number and the meter's dim bulbs. |
| "Stake" button | keep | A real decision, visible only while it is available. |
| Tally labels "rival" / "you" | cut | The colors and the rank edges already say whose is whose. |
| Tally preview "+12.9" | cut | The hatched part of the balance bar and the seam's number already show it. |
| Rank edges "RIVAL" / "YOU" | keep | The legend for which side of a world is whose. |
| "no one" in an empty rank | cut | An empty rank is visibly empty. |
| Empty-world footing (four lines: "unclaimed", "8 of your 12 are at ease here", "the other 4 are strained", "2 of yours call Zolton home, and hold half again as much on it") | reword, visual | Keeps its purpose (which world suits this squad) at a glance: "8 of 12 at ease" and, when any, "2 at home". |
| Ghost "SEND HERE" call on all three worlds | cut | Three identical calls. The pressable world is outlined, and its number is the call. |
| Meter scale "0 5 10 15 20" | cut | The number beside the meter is the reading. |
| Ghost role line "Sweeps everyone here for 10" | keep, fix | It is the consequence of the send. It now says when a sweep would also hit your own creatures there, which was invisible before. |
| Figure name plate | keep | |
| Figure bulb meter plus hold number | advanced (meter) | One reading in simple mode: the number. |
| Figure role glyph | keep | A glyph, not text. |
| Threat tag "downed" / "-6" | keep | A warning that drives a decision. |
| Stamp "YOURS" / "THE RIVAL'S" | keep | The Ruling's result, on the world it belongs to. |

### The bench

| Text | Verdict | Why |
|---|---|---|
| "Your squad 12/12" | cut | The count is the plinths themselves, and "12/12" read as a score. |
| Heading "Lift a creature" / "Terragoyle is lifted" / "The rival is deciding" | cut | Repeats the top bar's instruction and turn line. |
| Lead line "Lift one and every world prints ..." | cut | Repeats the instruction. |
| Act picker "Terragoyle can [sweep] [strike]" | keep | A decision, shown only when there is a choice. |
| Send pips plus "11 sends left" | reword | "11 sends left". The pips repeated the number. |
| "Pass this round" | keep | |
| Pass suggestion sub-line "suggested: You have spent your share of creatures this round. Keep the rest for what comes next." | visual, move | The button is marked as suggested. The reason goes into the top bar's instruction. |
| "Move Thirstaserp" | keep | A swift creature's move, a real action. |
| Plinth name | keep | |
| Plinth speed "↑36 SPEED" | advanced | Speed sets attack order, which is arithmetic. It stays in the dossier. |
| Plinth attribute lanes | advanced | Cryptic glyphs. They stay in the dossier. |
| Plinth role glyph | keep | |
| Plinth lamps (where it holds well) | keep | Three dots, one per world in world order. A visual, explained in the help panel. |
| Plinth "suggested" | keep | Guidance for a new player. |
| Plinth sent tag "ZOLTON" | keep | Where it went. |
| Plinth read button (i) | keep | The way into the dossier. |

### The dock at the Ruling

| Text | Verdict | Why |
|---|---|---|
| "The Court has ruled on round 1. The frame loads Endessa, Saiphus, Luminax next; the rival sends first." | reword | "Next: Endessa, Saiphus, Luminax. The rival sends first." |
| "Load round 2" | reword | "Next round". "Load" is machine language. |

## New panels

- **How to play** (the ? button): the aim, a round, hold and strain, the four roles, stake, pass, what the lamps mean, the keyboard, and the rounds of this Proving with their worlds.
- **History** (simple mode): the full event log that used to be the ticker.
- **Settings** (the gear button): Simple / Advanced, sound, the rival, the seed, and abandon the Proving.

## Screen-size tiers

- **Desk, tall enough** (at least 761 wide, more than 820 tall): everything above.
- **Short desk** (820 tall or less): compact figures, no plinth lanes. This is pass 37's tier, kept.
- **Phone** (760 wide or less): the same hierarchy. The worlds keep only name, stake, balance and figures, and plinths keep picture, name and lamps. Tap targets stay at 32px or more.
