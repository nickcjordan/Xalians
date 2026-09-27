# Powerworks play screen: visual signal inventory

Compiled 2026-09-27 from the code for the intuitiveness audit (`powerworks-intuitiveness-audit.md`), by a separate agent reading `apps/web/src/pages/games/powerworks*`. Line numbers are as of commit 6fec9abe.

Compiled by reading code only (no rendering). Paths are relative to the repo root `apps/web/src/pages/games/` unless otherwise stated. Line numbers refer to the read snapshot of each file on 2026-09-27.

Files read: `powerworksPage.tsx` (2613 lines), `powerworksScene.tsx` (1071), `powerworksRadial.tsx` (1244), `powerworksVisuals.tsx` (1112), `powerworksStage.ts` (171), `powerworksPresentation.ts` (136), `powerworks.css` (2196), `powerworksScene.css` (1887), `powerworksRadial.css` (1412), `powerworksHud.css` (484), `powerworksLayout.css` (317). Design history: `docs/design/powerworks-radial-orders.md`, `docs/design/powerworks-move-value.md` (not separately quoted; its content is reflected in code comments throughout, especially the "readout pass" and "legible effects" comments in `powerworksVisuals.tsx` and `powerworksPage.tsx`).

## 1. Icons (lucide-react components and custom marks)

### 1a. Top bar / HUD

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `ArrowLeft` | Back to the Xalians home site | `powerworksPage.tsx:1511` (`.pw-brand`) | Visible on sight | Also used as the outcome-heading icon for the "extract/left early" state (`powerworksPage.tsx:1887`) and as the radial card's "Back to moves" control (`powerworksRadial.tsx:1237`) |
| `Volume2` / `VolumeX` | Sound on/off toggle state | `powerworksPage.tsx:1589` | Visible on sight; click toggles |, |
| `BookOpen` | Opens the field guide panel | `powerworksPage.tsx:1593` | Visible on sight; click |, |
| `ScrollText` | Opens the combat record panel | `powerworksPage.tsx:1601` (only shown once `started`) | Visible on sight; click |, |
| `Check` (in a circle) | A sector is cleared, in the room-progress nav | `powerworksPage.tsx:1546` | Visible on sight | Also: "cleared" marker in the route panel list (`powerworksPage.tsx:2128`); dialog "close" is `X`, not `Check` |
| bare number span | The current/upcoming sector's ordinal, in the room-progress nav | `powerworksPage.tsx:1547` | Visible on sight |, |
| `ChevronRight` | "View turn order / route" affordance on the round button | `powerworksPage.tsx:1575` | Visible on sight; click | Also used in the guide's step diagram between "creature / move / target" (`powerworksPage.tsx:2252`, `2257`); also the initiative panel's per-row chevron before the speed number (`powerworksPage.tsx:2186`); also the playback "Next" button (`powerworksPage.tsx:1799`) |

### 1b. Briefing screen

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `Shield` | "4 encounters" fact | `powerworksPage.tsx:1625` | Visible on sight | Also: guard/ward icon throughout combat (barrier mark, guard status, "Shields" move mark, camp outcome heading for the "camp" phase at `powerworksPage.tsx:1883`, field-guide "Practice expedition" section heading) |
| `Heart` | "1 revival" fact | `powerworksPage.tsx:1628` | Visible on sight | Also: revive button icon (`powerworksPage.tsx:1984`), "Survive the dungeon" guide section, "lost" outcome heading icon, recovery notice icon, camp-stat revival count icon |
| `Crown` | "1 guardian" fact | `powerworksPage.tsx:1631` | Visible on sight | Heavily overloaded, see Overloads section: also the signature-move badge, the boss-defeat banner icon, the sector-4 "Central guardian" label, the reward-XP icon, the route panel's XP stat icon, the field guide's "Cooldowns and the signature" section heading |
| `ArrowRight` | "Enter the facility" / forward-progress affirmation on primary buttons | `powerworksPage.tsx:1636` | Visible on sight | Reused on every "go forward" primary button (enter sector, start another expedition) and as the health-delta arrow glyph (`powerworksVisuals.tsx:930`) and order-chip target arrow (`powerworksScene.tsx:931`) |
| `ElementIcon` (custom, 14 variants) | The element of a starter roster creature | `powerworksPage.tsx:1658` | Visible on sight | Same component used on enemy plaques, the inspector hero, and the field guide |

### 1c. Stage / scene (`powerworksScene.tsx`)

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| Custom "ground" ellipse (`.pw-ground`) | The floor mark under every unit's feet | `powerworksScene.tsx:782` | Visible on sight (a plain unlit oval; becomes colored per state below) |, |
| Custom "ground ring" (`.pw-ground-ring`) | This companion is currently selected (its move ring is open or about to open) | `powerworksScene.tsx:783` | Visible on sight while planning |, |
| Custom "target ring" (`.pw-target-ring`) | This unit is a legal target of the move in hand, or is reached by its area | `powerworksScene.tsx:786` | Visible once a move is chosen (armed) or hovered (faint) | Solid = direct legal target; dashed (`.area`) = only reached by area; brighter/thicker gold ring = the currently aimed target; coral (`.danger`) = a squadmate caught by area harm |
| Custom "target flash" (`.pw-target-flash`) | One-shot confirmation that an order just locked on this target | `powerworksScene.tsx:792` | Automatic, on commit of an order (one-shot animation) |, |
| `Link2` | Bound status icon, drawn on the figure | `powerworksScene.tsx:804`; also `powerworksVisuals.tsx:105` (`GroupIcon` for `binding` group) | Visible on sight when bound | Also the move-card control icon for a binding move (`MoveIcon`, `powerworksVisuals.tsx:259`); also the symbol-key legend "Binding opportunities" (`powerworksPage.tsx:2235`); also the order-chip target arrow's sibling icon slot is unrelated (`ArrowRight`, not `Link2`) |
| `Shield` (barrier mark) | Guarded/warded status, drawn on the figure | `powerworksScene.tsx:810` | Visible on sight when warded | See 1b overload note |
| `Zap` (charge aura) | This unit is charging a prolonged move, releases next opportunity | `powerworksScene.tsx:815` | Visible on sight while charging | Also: "Charged" status badge icon (`powerworksVisuals.tsx:718`); the radial disc's charge mark (`powerworksRadial.tsx:1088`); the field guide's "Read the charge" section icon; the "Zap" element icon for Electric (`powerworksVisuals.tsx:230`); "Ahead: +10 HP" station note icon on the camp screen (`powerworksPage.tsx:1953`); the shock-mark reaction icon (`powerworksScene.tsx:665`) |
| `Pull` arrow (`ArrowDownLeft`/`ArrowDownRight`/`ArrowDown`, chosen by direction) | The move in hand/hint would pull this unit off its footing, arrow points toward the puller | `powerworksScene.tsx:655, 818` | Visible only while a pulling move is armed/hinted, on the target (not faint) |, |
| `Ban` | Blocked action float ("Binding prevented the action") | `powerworksScene.tsx:834` | Visible only during that specific playback beat | Also the idle-order chip mark (`powerworksScene.tsx:925`); also the "no effect" value-bar mark (`powerworksVisuals.tsx:1057`); also the "No effect" move-card mark (`powerworksRadial.tsx:131`) |
| `CornerUpRight` | Redirect float ("target changed") | `powerworksScene.tsx:835` | Visible only during a redirect beat | Also the action-banner icon for a redirect beat (`powerworksScene.tsx:1016`) |
| floating damage/heal/status text (`pw-scene-float`) | The immediate outcome of a resolved action: `−N` damage, `+N` heal, status name, "Bound", "Resisted", "Charging", "Blocked", etc. | `floatLabel()`, `powerworksScene.tsx:194-238`, rendered at `powerworksScene.tsx:828-839` | Automatic, during playback, one-shot per beat |, |
| `GroupIcon` (custom, 9 variants: `Link2`, `Flame`, `Shield`, `Sparkles`, `EyeOff`, `HeartPulse`, `ZapOff`, `Snail`, `ScanEye`) | One icon per status-condition group (binding, degrading, guarding, attention, concealment, mending, shock, tempo, senses) | `powerworksVisuals.tsx:102-117` | Visible on sight on status badges (stage-compact and inspector-full forms) | Reused identically in ghost-preview status marks on the stage (`powerworksScene.tsx:682`) and in the inspector's condition list (`powerworksPage.tsx:2486`) |
| `Sparkles` | "Clears" a condition (removal effect) | `powerworksScene.tsx:699`; also `GroupIcon` for `attention` group | Visible on ghost preview marks and move-card marks | Overloaded: also the `attention`-group status icon (Sparkles), a different meaning from "clears" |
| `Crosshair` | The unit this move's value/worth is being read on ("referent") | `powerworksScene.tsx:854` (`.pw-referent`) | Visible while a move is in hand, on the plaque of the unit the value bar refers to | Heavily overloaded, see Overloads: also the default `MoveIcon` for a ranged/no-special move; also the radial card's "target" prompt icon; also the field guide's "Ranged attack" legend icon; also the "Choose a target" step in the guide's 3-step diagram; also the "holds up" inspector line icon for "machines pick it" |
| `Info` | Opens the inspector for this unit | `powerworksScene.tsx:865` (plaque button) | Visible on sight; click | Also the expedition-trail "Inspect route" button (`powerworksScene.tsx:186`) |

### 1d. Move value / threat badges

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `Skull` | This use/hit would knock the target out | `powerworksVisuals.tsx:932` (health delta), `1053` (value bar) | Visible once a lethal move is armed/hinted |, |
| `Ban` (value-bar "no effect" mark) | This move's value is worth nothing this round; tooltip explains why | `powerworksVisuals.tsx:1057` | Visible whenever a move's computed value is ≤0 (radial slot label, radial card, inspector "worth" column) | See 1c overload |
| `Swords` / `Crosshair` (ThreatBadge) | A machine's next blow is melee (`Swords`) or ranged (`Crosshair`) | `powerworksVisuals.tsx:1101` | Visible on every standing enemy's plaque while planning, and in the inspector | `Swords` also = melee `MoveIcon`, the field-guide "Melee attack" legend, the guide-grid "Reading a move" heading icon |
| `ArrowRight` (threat/health delta arrow) | Separates the "before" and "after" figures in a before→after readout | `powerworksVisuals.tsx:930, 1105`; `powerworksScene.tsx:931` (order-chip target arrow, different use) | Visible whenever a change is shown (health delta, threat stopped, order chip target) | Same glyph as the "go forward" primary-button arrow (different, non-informational meaning) |
| `Crosshair` (referent marker, again) | Marks the unit a value bar is being read on | `powerworksScene.tsx:854`; `powerworksVisuals.tsx:1213` (radial card value line), `1220` (radial card target prompt) | Visible | See above |
| `MatchupMark` (custom filled triangle SVG, 1 or 2 stacked) | Elemental matchup of the move against this target: up/bright = strong (double for ×2), down/muted = weak | `powerworksVisuals.tsx:798-820` | Visible beside a target's health bar whenever a move with a matchup is armed/hinted |, |

### 1e. Move card / radial wheel marks (`powerworksRadial.tsx` `cardMarks`)

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `PowerIcon` (custom starburst SVG) | Physical (non-elemental) harm | `powerworksRadial.tsx:74, 96`; component defined `powerworksVisuals.tsx:271-284` | Visible in the move card's icon row once expanded; also the move tray/inspector "power" figure icon | Also the field-guide symbol key "Base power" legend |
| `ElementIcon` | Elemental harm, names the element | `powerworksRadial.tsx:89` | Visible in the move card icon row for an elemental harmful move |, |
| `Magnet` | Pull effect | `powerworksRadial.tsx:103` | Visible in move card icon row when the move pulls |, |
| `GroupIcon` | Bind/status effect, by group | `powerworksRadial.tsx:107` | Visible in move card icon row |, |
| `HeartPulse` | Heal effect | `powerworksRadial.tsx:115`; also `GroupIcon` for `mending` | Visible in move card icon row and status badges | Also the move-card-content heal figure icon (`powerworksVisuals.tsx:586`) |
| `Shield` | Shield/guard effect on the move card | `powerworksRadial.tsx:121` | Visible in move card icon row | See 1b overload |
| `Sparkles` | "Clears" removal effect on the move card | `powerworksRadial.tsx:125` | Visible in move card icon row | See 1c overload |
| `Ban` | "No effect" (an unsupported effect on this move) | `powerworksRadial.tsx:131` | Visible in move card icon row only for moves with an unsupported effect | See 1c/1d overload |
| `Users` | "Hits squad", this move's burst also strikes the user's own squadmates | `powerworksRadial.tsx:136` | Visible in move card icon row for self-burst moves |, |
| `RotateCcw` | Recoil cost (Desperate Strike fallback) | `powerworksRadial.tsx:144` | Visible in move card icon row for the fallback move | Also the "Restart expedition" button icon (`powerworksPage.tsx:2398`); also the field-guide symbol-key "Health recoil" legend; also the "recovering" status warning icon (`powerworksPage.tsx:2503`) |
| `Crown` (mark badge) | Signature move (usable once per encounter) | `powerworksRadial.tsx:150` | Visible as a small badge by the card's name | See heavy overload note below |
| Rest pips (`Pips`, diamond marks) | Number of rounds the move rests after use | `powerworksRadial.tsx:195-203`, rendered `1189-1198` | Visible only while a disc is lifted/hovered/armed, or always on the expanded card | Same pip glyph as the move-card-content cooldown pips (`powerworksVisuals.tsx:627-629`) and the field-guide symbol-key "Cooldown rounds" legend |
| `Zap` (charge mark on card) | This move charges, lands next round | `powerworksRadial.tsx:1201-1206` (`CHARGE_LINE`) | Visible on the expanded card for a charging move | See 1c overload |
| `ArrowLeft` (radial card back control) | Returns from the expanded move card to the wheel | `powerworksRadial.tsx:1237` | Visible on the expanded card; click or Escape | See 1a overload |
| `MoveIcon` (custom, picks one of: `Link2`, `HeartPulse`, `Shield`, `Magnet`, `Swords`, `Crosshair`) | The kind of act a move is: bind / heal / guard / pull / melee strike / ranged strike, in priority order | `powerworksVisuals.tsx:257-270` | Visible on every disc, the card emblem, and the order chip | Central icon-choice function; see Overloads |

### 1f. Field guide (dialog panel, `panel === "guide"`)

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `Swords` | "Melee attack" legend | `powerworksPage.tsx:2226` | Only in guide, on demand | See overloads |
| `Crosshair` | "Ranged attack" legend | `powerworksPage.tsx:2229` | Only in guide | See overloads |
| `PowerIcon` | "Base power" legend | `powerworksPage.tsx:2232` | Only in guide |, |
| `Link2` | "Binding opportunities" legend | `powerworksPage.tsx:2235` | Only in guide | See overloads |
| `Crown` | "Signature move" legend | `powerworksPage.tsx:2238` | Only in guide | See overloads |
| `RotateCcw` | "Health recoil" legend | `powerworksPage.tsx:2241` | Only in guide | See overloads |
| `.pw-key-pip` (bare CSS pip, not lucide) | "Cooldown rounds" legend | `powerworksPage.tsx:2244` | Only in guide |, |
| `Portrait` (small) + `Swords` + `Crosshair` in sequence | The 3-step "choose creature / move / target" flow diagram | `powerworksPage.tsx:2249-2261` | Only in guide |, |
| `Link2`, `Zap`, `Crosshair`, `Swords`, `Zap`, `Heart`, `Heart`, `Shield` | Section headings for: Binding, Charge, Targets can change, Reading a move, Size/speed/element, Helping a squadmate, Survive the dungeon, Practice expedition (and `Crown` for Cooldowns/signature) | `powerworksPage.tsx:2272-2393` | Only in guide | Purely decorative heading icons, reused meanings from elsewhere |

### 1g. Panels: initiative, route, extract, restart, inspect, record

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `ChevronRight` (initiative row) | Precedes the effective-speed number | `powerworksPage.tsx:2186` | Only in the Turn Order panel | See 1a overload |
| `Check` (route list) | This sector is cleared | `powerworksPage.tsx:2128` | Only in the Route panel | See 1a overload |
| `Crown` (route/camp stats) | Practice XP stat icon | `powerworksPage.tsx:2146, 1940, 2147` | Only in panels/outcome screens | See heavy overload |
| `Heart` (route/camp stats) | Revival count stat icon | `powerworksPage.tsx:2150, 1944, 2151` | Only in panels/outcome screens | See overloads |
| `X` | Close the open dialog panel | `powerworksPage.tsx:2104` | Visible on sight in every dialog; click |, |
| `Zap` (charge warning) | "A release is coming... target hidden" | `powerworksPage.tsx:2475` | Only in the inspector, for a charging unit | See overloads |
| `Shield` (ward warning) | "Guarded: incoming damage halved" | `powerworksPage.tsx:2497` | Only in the inspector, for a warded unit | See overloads |
| `RotateCcw` (recovery warning) | "Recovering: cannot start another charge" | `powerworksPage.tsx:2503` | Only in the inspector, for a recovering unit | See overloads |
| `PassiveIcon` (custom: `Undo2` reacts / `Infinity` always) | Whether a passive answers an event or is continuously active | `powerworksVisuals.tsx:183-186` | Only in the inspector's passive list |, |

### 1h. Outcome / camp / expedition-trail

| Signal | Meaning | Where (file:line) | Reached by | Also means |
|---|---|---|---|---|
| `Trophy` | "Powerworks silenced" (won) outcome heading | `powerworksPage.tsx:1881` | Visible on the outcome screen when `phase === "won"` |, |
| `Shield` | "Sector secured" (camp) outcome heading | `powerworksPage.tsx:1883` | Visible on the outcome screen when `phase === "camp"` | See overloads |
| `Heart` | "Expedition ended" (lost) outcome heading | `powerworksPage.tsx:1885` | Visible on the outcome screen when `phase === "lost"` | See overloads |
| `ArrowLeft` | Fallback (extracted/outlasted) outcome heading | `powerworksPage.tsx:1887` | Visible otherwise | See overloads |
| `Heart` (recovery notice) | Someone is knocked out; use revival | `powerworksPage.tsx:1909` | Visible only on camp screen with a downed companion | See overloads |
| `Crown` (reward reveal) | Practice XP earned this sector | `powerworksPage.tsx:1924, 1940` | Visible on outcome/camp screens | See heavy overload |
| `Zap` (station note) | "Ahead: +10 HP to standing companions" | `powerworksPage.tsx:1953` | Visible only entering room 2's camp screen | See overloads |
| `Heart` (revive button) | Revive a knocked-out companion | `powerworksPage.tsx:1984` | Visible/clickable only on camp screen, one downed companion, revival available | See overloads |
| Custom checkmark circle / crown / two-digit label (`ExpeditionTrail`) | Sector progress: passed (`Check`), current sector here (2-digit label "01"-"04"), the guardian sector (`Crown` instead of "04") | `powerworksScene.tsx:172-179` | Visible on the briefing and outcome/route screens |, |
| `Play` / `Pause` (readiness icon during playback) | Playback running/paused | `powerworksPage.tsx:1767` | Visible only during round playback | Also the playback control buttons themselves (`1787`) and "Replay last round" button (`2040`) |
| `SkipForward` | "Show round result", skip to the end of playback | `powerworksPage.tsx:1813` | Visible only during playback |, |
| `ChevronsLeft` / `ChevronsRight` (turn-order arrows) | This unit's position in turn order would move earlier/later because of the move in hand | `powerworksPage.tsx:635-636` (`turnStrip`) | Visible only while a move that reorders is armed |, |
| `Crosshair` / `Wind` (holds-up list) | "Machines pick it about N% of the time" (Crosshair), "Slips N% of each blow" (Wind) | `powerworksPage.tsx:695, 700` | Only in the inspector, for a standing companion | `Wind` unique to this use; see Crosshair overloads |
| `Smartphone` | "Turn your screen upright to play" rotate prompt | `powerworksPage.tsx:2056` | Visible only in landscape phone orientation, short viewport |, |

## 2. Colors that carry meaning

| Color / token | Meaning | CSS selector | File:line |
|---|---|---|---|
| `--lime` (`#d8edac` base skin / `#ecd69a` HUD skin) | The game's "go" / primary-action / positive-emphasis color: primary buttons, "ready" states, current-sector marker, chosen move card border, order-just-locked flash | `.pw .pw-primary`, `.pw-room-bar nav .current`, `.pw .pw-move-card.chosen` | `powerworks.css:68-71`; `powerworks.css:260-264`; `powerworks.css:729-733` |
| `--danger` (`#ec947e`) | Critical/danger emphasis: low-health bar fill, squadmate caught in a harmful area, blocked-action banner border | `.pw-health-track > span.critical`, `.pw-target-ring.danger`, `.pw-action-banner.blocked` | `powerworks.css:355-357`; `powerworksScene.css:1374-1377`; `powerworksScene.css:1180-1182` |
| Gold/amber family (`#f0d596`, `#e9bb52`, `#fff0bc`, `#f2d68b`, `#c6a767`, `#ffe6a6`, etc.) | The wheel/targeting/order-locking "highlight" family: target ring, ground ring for selection, aimed-target brighter ring, order-chip glow on set, charge aura, signature disc rim, radial arc trim, matchup-strong triangle, referent crosshair, health-delta arrow, order-chip idle target icon color | many, see 1c/1e/1g rows | `powerworksRadial.css:858-870` (ground ring); `powerworksScene.css:1355-1399` (target ring); `powerworksRadial.css:181-185` (signature disc); `powerworksVisuals.tsx:1521-1523` (health-delta arrow) |
| Red/coral (`#ffc6b6`/`#b9533c` hatch, `#e0735c`) | Health taken: the damage chunk on a health bar, the value bar's "harm" segment, the threat badge, the health-delta "hit" tag | `.pw-health-track > i.pw-hp-chunk`, `.pw-value-track > i.harm`, `.pw-threat`, `.pw .pw-hp-delta.hit .pw-hp-to` | `powerworksScene.css:1468-1477`; `powerworksRadial.css:1308-1310`; `powerworksRadial.css:1364-1377`; `powerworksScene.css:1533-1537` |
| Gold hatch (`#fff0bc`/`#d19a3e`) | Health kept for the squad: the value bar's "saved" segment, the threat "stopped/prevented" arrow-to number | `.pw-value-track > i.saved`, `.pw-threat-to` | `powerworksRadial.css:1311-1313`; `powerworksRadial.css:1395-1401` |
| Green (`#d3f7dc`/`#5fae7a`) | Health restored: the value bar's "healed" segment, the heal extension on a health bar, the health-delta "heal" tag, the mending status-group color | `.pw-value-track > i.healed`, `.pw-health-track > b.pw-hp-heal`, `.pw .pw-hp-delta.heal .pw-hp-to`, `.pw-status-badge.group-mending` | `powerworksRadial.css:1354-1356`; `powerworksScene.css:1490-1497`; `powerworksScene.css:1538-1542`; `powerworks.css:478-482` |
| Purple/lavender (`#d9c7ef`/`#3a2e4b`/`#a48cc6`) | Binding-group status color (badge, binding visual ring on the figure, inspector condition list) | `.pw-status-badge.group-binding`, `.pw-binding` | `powerworks.css:453-457`; `powerworksScene.css:246-270` |
| Orange/rust (`#f3c7ab`/`#4a2d20`/`#c58152`) | Degrading-group status color (damage-over-time ticks) | `.pw-status-badge.group-degrading`, `.pw-scene-float.tick` | `powerworks.css:458-462`; `powerworksScene.css:437-440` |
| Blue (`#aad7ed`/`#203d50`/`#719eba`) | Guarding-group status color (shields, wards, barrier visual) | `.pw-status-badge.group-guarding`, `.pw-barrier` | `powerworks.css:463-467`; `powerworksScene.css:271-285` |
| Pink/magenta (`#efd7ea`/`#47273f`/`#bd82ab`) | Attention-group status color (fear/entrance) | `.pw-status-badge.group-attention` | `powerworks.css:468-472` |
| Slate/gray-blue (`#c4ccd4`/`#2a3138`/`#7d8894`) | Concealment-group status color | `.pw-status-badge.group-concealment` | `powerworks.css:473-477` |
| Pale yellow (`#f1e3a6`/`#463c1c`/`#c2a64f`) | Shock-group status color | `.pw-status-badge.group-shock` | `powerworks.css:484-488` |
| Cool blue-gray (`#c9d8e8`/`#26313f`/`#8298b2`) | Tempo-group status color (slowed/sedated) | `.pw-status-badge.group-tempo` | `powerworks.css:489-493` |
| Tan (`#e6d2bd`/`#3d3024`/`#a98a69`) | Senses-group status color (blinded/disoriented) | `.pw-status-badge.group-senses` | `powerworks.css:494-498` |
| Element hue (`--el-<element>` / `--color-el-<element>`, 14 variants) | The element of a move or creature: disc rim/wash, card frame/wash, order-chip icon, shock-mark border, species silhouette fill | `.pw .el-<element>`, `.pw-radial-slot.elemental`, `.pw-radial-card.elemental`, `.pw-shock-mark` | `powerworks.css:87-131`; `powerworksRadial.css:186-205, 497-505`; `powerworksScene.css:1715-1740` |
| Dim/greyscale (`grayscale(1)`, `opacity: 0.3`–`0.65`) | Down/fallen/knocked-out state; also "cannot be a legal target right now" (ineligible) | `.pw .down .pw-portrait`, `.pw-scene-unit.fallen .pw-actor-art`, `.pw-theater.targeting .pw-scene-unit.ineligible` | `powerworks.css:748-751`; `powerworksScene.css:235-245`; `powerworksScene.css:1333-1335` |
| Faint/opacity states (0.45–0.65, dashed borders) | "This is a preview, not committed" (hovered/hinted, not armed); "muted" (a non-aimed alternative target while one is aimed); "idle order" (would do nothing) | `.pw-target-ring.faint`, `.pw-health.faint`, `.pw-theater.targeting .pw-scene-unit.muted`, `.pw .pw-unit-plaque .pw-order-chip.idle` | `powerworksScene.css:1662-1677`; `powerworksScene.css:1350` (`.muted .pw-actor-art`); `powerworksRadial.css:976-982` |

## 3. Shapes/positions with meaning

| Shape/position | Meaning | Where (file:line) |
|---|---|---|
| Radial wheel (arc of octagonal discs above the selected figure) | The set of moves this companion can choose from this round | `powerworksRadial.tsx` entire component; layout math `356-376` |
| Octagon disc / chamfered card | A move: disc = collapsed state, card = expanded/chosen state, grown in place from the disc (round-2 "expand" animation) | `powerworksRadial.css:150-160` (disc octagon), `459-496` (card chamfer) |
| Ground ellipse under a figure, solid vs. ringed vs. glowing | Idle floor (`.pw-ground`), selected companion (gold ring), aimed target (brighter gold ring), area-reached target (dashed ring) | `powerworksScene.css:147-166`; `powerworksScene.css:1355-1399` |
| Health bar chunk (hatched red block at bar's end) | Damage a move-in-hand would deal (bright, outlined) vs. damage the standing orders already plan (quieter, `pw-hp-planned`) | `powerworksScene.css:1468-1489` |
| Health bar green block | A heal this move would restore | `powerworksScene.css:1490-1497` |
| Value bar / segmented track (red-gold-green hatched strip, 12 HP scale, 2 HP segments) | A move's total worth this round in one currency (health): harm / saved / healed | `powerworksVisuals.tsx:1026-1061`; CSS `powerworksRadial.css:1273-1359` |
| Threat badge (sword/crosshair pill) | A machine's next blow, and how much of it the squad's orders stop (before → after) | `powerworksVisuals.tsx:1070-1111`; CSS `powerworksRadial.css:1361-1411` |
| Matchup triangle (filled, single or stacked double) | Elemental matchup: up = strong (double = ×2), down = weak | `powerworksVisuals.tsx:798-820` |
| Plaque (rounded panel under each figure) | A unit's identity card: name, element icon (enemies only), health, order chip, status badges | `powerworksScene.tsx:842-958`; CSS `powerworksScene.css:167-218`, `powerworksHud.css` (defender variant) |
| Order chip (pill on a companion's plaque) | That companion's standing order: move icon + name → target, or "no order"/"cannot act"/"knocked out" | `powerworksScene.tsx:882-949`; `chipText()` at `powerworksScene.tsx:241-244` |
| Turn order strip (row of circular portraits) | The round's resolution order left to right; dashed rim = no order yet, solid+dot = order set, scaled+glowing = currently acting, dimmed = already acted or down | `powerworksPage.tsx:583-645`; CSS `powerworksLayout.css:14-153` |
| Sector-progress diamonds (rotated squares in the HUD nav) | Which of the 4 sectors is cleared/current/ahead | `powerworksPage.tsx:1523-1549`; CSS `powerworksHud.css:39-53` |
| Expedition trail circles (briefing/outcome) | Sector-by-sector progress, same semantics as the HUD nav but a horizontal row of circles | `powerworksScene.tsx:154-191` |
| Action banner (bottom-centered bar with a bottom border) | Names the current playback beat: actor, move name, one outcome line; border color flags block/redirect vs. normal vs. signature | `powerworksScene.tsx:998-1051`; CSS `powerworksScene.css:1153-1216` |
| Dashed "intent line" path (SVG) between a companion and its queued target | This companion's standing order aims at this target | `powerworksScene.tsx:542-551`; CSS `.pw-queued-path` `powerworksScene.css:1147-1152` |
| Dashed "aim path" (brighter gold) | The move in hand is currently aimed at this specific target | `powerworksScene.tsx:552-561`; CSS `powerworksScene.css:1649-1656` |
| Ghost status badge (dashed outline badge on the figure) | A status this move would apply, shown before commit, with its chance | `powerworksScene.tsx:672-687`; CSS `powerworksScene.css:1568-1587` |
| Skull mark | A hit would knock this target out | `powerworksVisuals.tsx:932, 1053` |

## 4. Numbers shown on screen

| Number | Counts | Unit | Screen says whose/what unit? |
|---|---|---|---|
| Health figure ("14 / 22" or delta "14 → 6") | Current / max hit points of a unit | HP | Implicit from context (attached to that unit's plaque/hero); the delta form is explicitly framed as before→after but never labeled "HP" on-screen except via `aria-label="{name} health"` |
| Base power number on move card ("60") | The move's base power figure before matchup/guard | Unlabeled raw number, `moveFigure()` | No explicit unit shown at rest in the trimmed round-3 card (removed per design doc); still shown in the inspector's `MoveCardContent` figure with a small "power"-adjacent icon only, no word "power" printed except via `aria-label`/tooltip text |
| Value bar total ("7", with skull if knockout) | A move's total worth this round: harm + saved + healed, in health | Health (implicit, no unit word on the bar itself; tooltip says "Worth N health...") | Tooltip only; the bare bar number has no visible unit |
| Threat badge number ("7" or "7 → 4") | The health a machine's next blow is expected to take from one companion | Health (implicit) | Tooltip/aria-label says "health"; visible number alone does not |
| Rest/cooldown pips (diamond count) | Rounds until a move is usable again | Rounds | Not numeric text, a count of pips; tooltip spells it out ("Unavailable for 2 rounds") |
| Cooldown pip strip on move-card-content (`i` blocks, filled vs empty) | Rounds elapsed vs. remaining of a move's cooldown | Rounds | Not labeled on-screen; tooltip-free, relies on the "Cooling" text state label beside it |
| Turn-order shift arrow with no number | Whether the move in hand moves a unit earlier/later in turn order | Ordinal position (no number shown, just a direction chevron) | Not numeric, a directional icon only, aria-label spells out "later/earlier with this move" |
| Speed number (initiative panel, "22") | A unit's effective speed | Speed (implicit, header context "Fastest acts first") | Small-text "speed"/"slowed"/"sedated" word under the number |
| Practice XP ("+30", "128") | Score accumulated this run | Practice XP (explicitly labeled "Practice XP earned"/"practice XP" beside the number) | Yes, labeled |
| Revival count ("1") | Emergency revivals remaining | Count (labeled "emergency revival left"/"revival kit") | Yes, labeled |
| Round number ("Round 3") | Current round within the current encounter | Ordinal (labeled "Round") | Yes |
| Sector label ("SECTOR 2/4") | Current sector out of 4 | Ordinal fraction (labeled "SECTOR") | Yes |
| "Machines pick it about N% of the time" | Share of enemy targeting attention this companion draws | Percent (labeled in the sentence) | Yes |
| "Slips N% of each X blow" | Damage reduction from being faster than an attacker | Percent (labeled in the sentence) | Yes |
| Status badge chance ("75%") | Likelihood a status effect lands | Percent (implicit, no % context beyond the bare number+percent sign) | Sentence-form tooltip gives full context; the compact badge shows bare "75%" |
| Seed number ("Seed 4821") | The run's deterministic seed | Unitless identifier (labeled "Seed") | Yes |
| Action count in playback readout ("Action 2 of 7") | Position within the current round's resolved event list | Ordinal fraction (labeled "Action... of...") | Yes |
| Readiness counter ("2/4" or check) | How many standing companions have orders set vs. total living | Fraction (unlabeled unit, but context "Plan your squad"/"Squad ready" beside it) | Contextual, not explicit |

## 5. Animations (`@keyframes` and meaningful transitions)

| Keyframe / transition | Says | Plays when | File:line |
|---|---|---|---|
| `pw-hit` | An impact flinch on a struck figure (unused directly in current markup but defined) | Legacy/possibly dead, no direct class reference found besides definition | `powerworks.css:1360-1374` |
| `pw-float` | A floating number/label rises and fades in | Any generic floating feedback text appears | `powerworks.css:1375-1384` |
| `pw-charge` | A pulsing dim/scale, generic charge cue | Defined; used via class association with charge states | `powerworks.css:1385-1390` |
| `pw-env-turn` | A rotor/fan element spins continuously | Idle ambient background animation in the facility environment art | `powerworksScene.css:37-42, 68-70` |
| `pw-env-beacon` | A beacon/core/conduit light pulses | Idle ambient background | `powerworksScene.css:31-49, 71-73` |
| `pw-env-drift` | Haze layer drifts sideways and fades | Idle ambient background | `powerworksScene.css:43-44, 74-76` |
| (env animations paused) | Background stops animating once a round starts playing, so attention goes to the action | `.pw-theater.playing .pw-facility .pw-env-* { animation-play-state: paused }` | `powerworksScene.css:50-56` |
| `pw-projectile` | A ranged attack's flight path draws in and fades | A ranged hit/status/heal beat plays | `powerworksScene.css:541-559` |
| `pw-impact` | An impact ring expands and fades at the point of contact | A hit/bind/status/etc. beat's blow lands | `powerworksScene.css:560-575` |
| `pw-gather` | The actor briefly brightens/glows while charging | A "charge" beat plays | `powerworksScene.css:576-587` |
| `pw-feedback` | Text/reward slides up and fades in | Generic feedback appears (floating numbers, reward reveal) | `powerworksScene.css:588-597`; used at `powerworksScene.css:745` (reward reveal) |
| `pw-arrival` | Sector-name banner fades in, holds, fades out | Entering a new sector | `powerworksScene.css:598-611` |
| `pw-walk-in` | A figure slides/fades in from off-position | Squad figures appear at the start of a sector or on the outcome/travel screen | `powerworksScene.css:612-621`; `powerworksScene.css:743` (travel squad) |
| `pw-contact` | A contact-mark X/circle fades out | A melee-range contact hit's impact mark plays | `powerworksScene.css:388-391` |
| `pw-lunge` | The actor steps toward its target and back | A melee attack action plays | `powerworksScene.css:1808-1823` |
| `pw-cast` | The actor lifts slightly and glows | A ranged attack or ward action plays | `powerworksScene.css:1824-1839`; also `powerworksHud.css` ward variant |
| `pw-recoil` | The receiving unit flinches sideways and brightens | A hit lands on a target | `powerworksScene.css:1840-1854` |
| `pw-stopped` | The actor wobbles and snaps back | A "blocked" (binding-prevented) beat plays | `powerworksScene.css:1225-1235` |
| `pw-collapse` | A defeated unit tilts, dims, desaturates | A knockout beat plays (`just-fallen`) | `powerworksScene.css:1236-1251` |
| `pw-ring-in` | A target ring scales in from 0.7 and fades in | A target ring first appears (legal target shown, or the aimed ring) | `powerworksScene.css:1389-1394` |
| `pw-ring-breathe` | The aimed target's ring gently pulses its glow | The move card is aimed at a specific target (loops while aimed) | `powerworksScene.css:1395-1399` |
| `pw-target-flash` | A ring flashes bright and expands, then fades | An order just locked on this target | `powerworksScene.css:1412-1423` |
| `pw-chip-set` | The order chip glows briefly | An order was just set (locks onto the plaque) | `powerworksScene.css:1427-1438` |
| `pw-fade-in` | Generic opacity fade-in | Many small marks appear: ghost badges, matchup chevrons, shock marks, target-orders list, pull arrow, health deltas, aim path, radial arc, etc. | `powerworksRadial.css:56-60`; referenced throughout both CSS files |
| `pw-fade-out` | Generic opacity fade-out | Radial arc disappears when the wheel folds/closes | `powerworksRadial.css:61-67` |
| `pw-disc-in` | A move disc scales/translates in from the creature's center | The wheel opens, staggered per disc | `powerworksRadial.css:75-81, 112-114` |
| `pw-disc-out` | A move disc scales/translates back into the creature | The wheel folds/closes, staggered per disc | `powerworksRadial.css:82-94, 138-140` |
| Card "expand" WAAPI clip-path/transform animation (not a CSS keyframe; JS-driven) | The chosen disc visually grows into the full move card | A move is chosen from the wheel | `powerworksRadial.tsx:775-808` (`WHEEL_MOTION.expand`) |
| Card "collapse"/"return" WAAPI animation | The move card shrinks back into its disc | The player backs out of a chosen move | `powerworksRadial.tsx:811-846` (`WHEEL_MOTION.collapse`) |
| Card "lock" WAAPI animation | The card collapses into the plaque's order chip | An order is confirmed and the ring closes | `powerworksRadial.tsx:850-929` (`WHEEL_MOTION.lock`) |
| Camera push/pan (`beatZoom`, transform on `.pw-stage-zoom`) | The stage leans toward the beat's actor and target | During round playback, per beat; holds still while planning | `powerworksStage.ts:56-111`; applied `powerworksScene.tsx:445-490` |
| Spotlight vignette fade | The room's edges darken to focus attention on the action | While a round plays (`data-lit="on"`), fades back out when idle | `powerworksScene.css:1774-1789` |
| Playing-state brightness/saturation dim on background and non-focused units | Attention narrows to the current beat's actor/target | During playback, non-focused units dim | `powerworksScene.css:1794-1806` |
| Selected-unit `.pw-scene-character` transform transition | Smooth lift when selection changes | Selecting a different companion | `powerworksRadial.css:900-903` (plaque translateY) |
| `.pw-scene-unit` filter transition (ineligible/resting) | Smooth fade to grayscale/dim | A move is armed (ineligible targets dim) or a companion is selected (others rest back) | `powerworksScene.css:1330-1335`; `powerworksRadial.css:910-913` |

All animations are disabled under `prefers-reduced-motion: reduce` and under the page's own `reducedMotion` state (`data-motion="reduced"`), confirmed at `powerworks.css:1796-1804`, `powerworksScene.css:910-928, 1297-1303, 1855-1861`, `powerworksRadial.css:1183-1202`.

## 6. Interaction states

| State | Meaning | Where it is expressed | File:line |
|---|---|---|---|
| Hover (pointer, `hover: hover and pointer: fine` only) | Pointer is over a control; lifts/glows a disc, softens siblings, shows tooltips | `.pw-radial.open .pw-radial-slot:hover`, `.pw-mark:hover` | `powerworksRadial.css:1207-1263` |
| Focus-visible | Keyboard focus; same visual treatment as hover for parity, plus a dashed focus ellipse on figures | `.pw-radial-slot:focus-visible`, `.pw-scene-character:focus-visible::after` | `powerworksRadial.css:251-277`, `858-895` |
| Armed (touch) | First tap on a disc lifts/previews it without choosing; a second tap chooses | `.pw-radial-slot.armed` | `powerworksRadial.tsx:940-952`; CSS `powerworksRadial.css:251-264` |
| Chosen/held | This disc's move is the one currently expanded into the card | `.pw-radial-slot.held`, `.pw-radial-slot[data-card]` | `powerworksRadial.css:142-145` |
| Current (standing order) | This disc represents the companion's already-set order | `.pw-radial-slot.current` | `powerworksRadial.css:234-236` |
| Dim (ineligible move) | This move cannot be chosen this round (cooldown, bound, spent, charging, recovering) | `.pw-radial-slot.dim`, `slotState()` | `powerworksRadial.tsx:206-244`; CSS `powerworksRadial.css:265-272` |
| Selected (companion) | This companion's ring is open / was last interacted with | `.pw-scene-unit.selected` | `powerworksScene.css:158-166`; `powerworksRadial.css:896-904` |
| Aimed | The move in hand is currently pointed at this target (hover/focus on a legal target) | `.pw-scene-unit.aimed`, `.pw-target-ring` (bright variant) | `powerworksScene.css:163-166`; `powerworksScene.css:1340-1349, 1378-1385` |
| Targetable / valid-target | This unit can legally receive the move in hand | `.pw-scene-character.pw-target.valid-target` | `powerworksScene.tsx:751-756` |
| Ineligible | This unit cannot be named or reached by the move in hand (dims to grayscale) | `.pw-theater.targeting .pw-scene-unit.ineligible` | `powerworksScene.css:1333-1335` |
| Muted | Another target is being aimed at; this one's preview steps back (not the aimed one, not eligible for its own separate meaning) | `.pw-scene-unit.muted`, `.pw-health.muted` | `powerworksScene.css:1350-1352`; `powerworksScene.css:1563-1565` |
| Faint / hinted | A disc is only hovered/focused, not armed/chosen; its preview shows at reduced strength | `.pw-target-ring.faint`, `.pw-health.faint`, `.pw-scene-unit.hinted` (via class list) | `powerworksScene.css:1662-1677` |
| Idle (order or preview) | A standing order or a squadmate-move preview would do nothing useful right now | `.pw-order-chip.idle`, `UnitPreview.idle` | `powerworksRadial.css:974-1010`; `powerworksPage.tsx:1020-1025` |
| Resting | The rest of the squad steps back visually while one companion is selected | `.pw-scene-unit.resting` | `powerworksRadial.css:908-913` |
| Fallen / down | This unit is knocked out (0 HP) | `.pw-scene-unit.fallen`, `.pw-status-badge.down`, `.down .pw-portrait` | `powerworksScene.css:235-245`; `powerworksVisuals.tsx:705-710`; `powerworks.css:748-751` |
| Charged | This unit is mid-charge on a prolonged move | `.pw-scene-unit.charged` | `powerworksScene.css:306-309` |
| Restrained / bound | This unit is bound this opportunity | `.pw-scene-unit.restrained` (class applied, styled via `.pw-binding` mark) | `powerworksScene.tsx:718` |
| Protected / warded | This unit has an active shield/ward | `.pw-scene-unit.protected` (class applied, styled via `.pw-barrier` mark) | `powerworksScene.tsx:719` |
| Performing / receiving | This unit is the actor / target of the current playback beat | `.pw-scene-unit.performing`, `.pw-scene-unit.receiving` | `powerworksScene.css:392-414` |
| In-focus | This unit is the camera's current lean target during playback | `.pw-scene-unit.in-focus` | `powerworksScene.tsx:714`; `powerworksScene.css:1800-1806` |
| Danger | A squadmate is caught in a harmful area effect (distinguishes from a normal reached target) | `.pw-scene-unit.danger`, `.pw-target-ring.danger`, `.pw-health.danger` | `powerworksScene.css:1374-1377`; `powerworksScene.css:1474-1477` |
| Reached (vs. target) | This unit is only caught by an area effect, not the directly aimed target | `.pw-scene-unit.reached`, `.pw-target-ring.area` | `powerworksScene.css:1368-1373`; role field `powerworksScene.tsx:723` |
| Playing / paused | The round is actively resolving vs. held for inspection | `.pw-theater.playing`, `.pw-theater.paused` | `powerworksScene.css:529-539` |
| Arriving | The sector-entry banner and squad walk-in animation are active | `.pw-theater.arriving` | `powerworksScene.css:520-525`; state `powerworksScene.tsx:338-346` |
| Signature-action / boss-defeat / knockout-action | A special playback beat is underway, drives extra visual emphasis (dimming, vignette, banner scale) | `.pw-theater.signature-action`, `.pw-theater.boss-defeat`, `.pw-theater.knockout-action` | `powerworksScene.css:57-64, 1192-1224`; `powerworksScene.tsx:519-522` |

## Overloads: signals used for more than one meaning

### Icons

| Icon | Meanings |
|---|---|
| `Crown` | (1) Signature move badge on a disc/card; (2) "1 guardian" briefing fact; (3) boss-defeat action-banner icon; (4) "Central guardian" sector-4 stage heading; (5) sector-4 icon in the expedition trail (replaces the "04" digit); (6) Practice-XP reward icon on outcome/camp screens; (7) XP stat icon in the route panel and camp stats; (8) field-guide "Cooldowns and the signature" section heading; (9) route-panel XP stat icon |
| `Crosshair` | (1) Default `MoveIcon` for a ranged/no-special move; (2) "referent" marker on a plaque (which unit a value is read on); (3) radial card's target-prompt icon; (4) field-guide "Ranged attack" legend; (5) guide 3-step diagram "choose a target" icon; (6) threat badge ranged-attack icon; (7) inspector "holds up", "machines pick it" bullet icon |
| `Shield` | (1) "4 encounters" briefing fact; (2) guard/ward status icon on the figure (barrier mark); (3) "Shields" move-card mark; (4) "Sector secured" camp outcome heading; (5) field-guide "Practice expedition" section heading; (6) inspector ward warning ("Guarded: incoming damage halved"); (7) `GroupIcon` for the `guarding` status group |
| `Heart` | (1) "1 revival" briefing fact; (2) revive button icon; (3) "Expedition ended" (lost) outcome heading; (4) recovery notice icon; (5) camp-stat revival count icon; (6) field-guide "Survive the dungeon" section heading; (7) route-panel revival stat icon |
| `Zap` | (1) charge-aura mark on a charging figure; (2) "Charged" status badge icon; (3) radial disc/card charge mark ("Lands next round"); (4) Electric element icon (`ElementIcon`); (5) "+10 HP" camp station note icon; (6) field-guide "Read the charge" section heading; (7) shock-mark reaction icon; (8) inspector charge warning |
| `Link2` | (1) Bound-status icon on the figure; (2) `MoveIcon` for a binding move; (3) field-guide "Binding opportunities" legend; (4) `GroupIcon` for the `binding` status group |
| `RotateCcw` | (1) Recoil-cost move-card mark; (2) "Restart expedition" button; (3) field-guide "Health recoil" legend; (4) inspector "Recovering" warning/status badge icon |
| `ArrowRight` | (1) "Go forward" affirmation on every primary button (enter facility/sector, start another expedition); (2) health-delta before→after arrow; (3) order-chip target arrow; (4) threat-badge before→after arrow |
| `Ban` | (1) "Blocked" playback float; (2) idle order-chip mark; (3) value-bar "no effect" mark; (4) "No effect" move-card mark |
| `Sparkles` | (1) "Clears" removal-effect mark (move card and ghost preview); (2) `GroupIcon` for the `attention` status group (an unrelated meaning, fear/entrancement, not clearing) |
| `Check` | (1) Sector-cleared marker in the HUD nav; (2) sector-cleared marker in the route panel; (3) "passed" marker in the expedition trail |
| `Swords` | (1) Melee `MoveIcon`; (2) field-guide "Melee attack" legend; (3) field-guide "Reading a move" section heading; (4) threat-badge melee icon |
| `ArrowLeft` | (1) Back-to-site brand link; (2) fallback outcome-heading icon (extracted/outlasted); (3) radial card "Back to moves" control |
| `Info` | (1) Plaque inspect button; (2) expedition-trail "Inspect route" button |
| `HeartPulse` | (1) Heal-effect move-card mark; (2) `GroupIcon` for the `mending` status group; (3) move-card-content heal figure icon |

### Colors

| Color | Meanings |
|---|---|
| Gold/amber family | (1) "This is selectable/interactive and currently highlighted" (hover/focus lift glow); (2) "this is the aimed target" (bright ring); (3) "this order just locked" (flash/chip glow); (4) "this is a signature move" (disc/card rim); (5) "health kept for the squad" (value-bar gold segment, unrelated to selection/targeting), the same hue family covers both an interaction-state cue and a data-value meaning |
| Red/coral | (1) "Health taken" (damage chunk, value-bar harm segment); (2) "danger, a squadmate is caught in harmful area" (`--danger` token); (3) low-health critical bar fill, three distinct triggers sharing one palette region |
| `--lime`/gold "go" color | (1) Primary-button "confirm/forward" color; (2) "current sector" marker; (3) "chosen move card" border/background, conflates the "call to action" meaning with a "this is the selected state" meaning |

### Overloads count and rationale

- `Crown`, `Crosshair`, `Shield`, `Heart`, and `Zap` each carry 5 or more distinct meanings depending on where they render, spanning briefing facts, statuses, section headings, and playback events.
- The gold/amber color family is the single busiest carrier of meaning on the screen: it means "interactive/hovered," "aimed," "just confirmed," "signature," and "value kept" depending on context, with no other distinguishing channel (shape or icon) present in some of those cases (e.g., a hovered disc and an aimed target both glow gold, differentiated only by which control has the glow).
- Red/coral does triple duty as "damage" (a neutral outcome number), "danger" (a warning about a squadmate), and "critical health" (a threshold state), all in the same visual register.

## Summary counts

- **Distinct lucide-react icon components used:** 47 (`ArrowLeft`, `ArrowRight`, `BookOpen`, `ScrollText`, `Check`, `X`, `Play`, `Pause`, `SkipForward`, `RotateCcw`, `Heart`, `Shield`, `Zap`, `Link2`, `Crosshair`, `Wind`, `Swords`, `Trophy`, `Info`, `ChevronRight`, `ChevronsLeft`, `ChevronsRight`, `Crown`, `Volume2`, `VolumeX`, `Smartphone`, `ArrowDown`, `ArrowDownLeft`, `ArrowDownRight`, `CornerUpRight`, `Ban`, `Sparkles`, `Plus`, `HeartPulse`, `Magnet`, `Users`, `Undo2`, `Infinity`, `Moon`, `Leaf`, `Sun`, `Droplets`, `Mountain`, `Hourglass`, `Flame`, `EyeOff`, `Snowflake`) plus `Pickaxe`, `Cog`, `FlaskConical`, `Ghost`, `Brain`, `Skull`, `ScanEye`, `Snail` (element-icon and group-icon sets), see note below on exact count.
- **Distinct custom (non-lucide) marks:** 9, octagon discs, ground ellipse, ground ring, target ring (solid/dashed/aimed variants counted as one family), target flash, matchup triangle, value bar, threat badge, `PowerIcon` starburst.
- **Distinct meaningful colors:** 13, lime/primary, danger coral, gold/amber highlight family, red/coral damage, gold health-kept, green health-restored, and the 9 status-group hues (binding, degrading, guarding, attention, concealment, mending, shock, tempo, senses) counted collectively as one "status palette" of 9, plus the 14-hue element palette counted as one family. Counting the status-group hues individually: 9 status colors + lime + danger + damage-red + kept-gold + healed-green + element-family = 15 meaningfully distinct color roles.
- **Distinct `@keyframes` animations:** 26 (`pw-hit`, `pw-float`, `pw-charge`, `pw-env-turn`, `pw-env-beacon`, `pw-env-drift`, `pw-projectile`, `pw-impact`, `pw-gather`, `pw-feedback`, `pw-arrival`, `pw-walk-in`, `pw-contact`, `pw-lunge`, `pw-cast`, `pw-recoil`, `pw-stopped`, `pw-collapse`, `pw-ring-in`, `pw-ring-breathe`, `pw-target-flash`, `pw-chip-set`, `pw-fade-in`, `pw-fade-out`, `pw-disc-in`, `pw-disc-out`), plus 3 JS/WAAPI-driven transform sequences (card expand, collapse/return, lock) and the camera lean (`beatZoom`), 26 CSS keyframes + 4 script-driven motions = 30 total animated behaviors.
- **Overloaded signals (icon or color carrying 2+ distinct meanings):** at least 18 icons (`Crown`, `Crosshair`, `Shield`, `Heart`, `Zap`, `Link2`, `RotateCcw`, `ArrowRight`, `Ban`, `Sparkles`, `Check`, `Swords`, `ArrowLeft`, `Info`, `HeartPulse`, `GroupIcon`'s `Sparkles`/`attention` clash, `MoveIcon`'s priority-order overloading of `Link2`/`HeartPulse`/`Shield`/`Magnet`/`Swords`/`Crosshair`) and 3 color families (gold/amber, red/coral, lime).

Icon-count caveat: several icons appear only inside the 14-element (`ELEMENT_ICONS`) or 9-status-group (`GroupIcon`) maps and are each used for exactly one fixed meaning within that map (e.g., `Moon` always means Dark element); those are not overloads by themselves, but several of the group/element icons collide with unrelated meanings used elsewhere on the same screen (documented above, e.g. `Sparkles`, `HeartPulse`, `Link2`, `Zap`).
