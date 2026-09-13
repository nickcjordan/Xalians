# Xalians Arcade

Status: initial release implemented, authorized 2026-09-13

## Product thesis

The Arcade redirects habits players already have. Someone who would otherwise open a
standalone game can play the familiar rules inside Xalians and turn that play into
progress toward another generated creature. The rules are familiar; the presentation,
code, names, records, and reward loop are Xalians originals.

The Arcade is one platform spoke. Its individual games are modules, not new top-level
products competing with Duel, Reclamation, or the Generator.

## Boundaries

- Reimplement mechanics, never another game's source, art, audio, rule text, level data,
  branded title, or distinctive combined presentation.
- Use descriptive rule-family labels where useful (`Klondike solitaire`, `artillery
  duel`) and original product names.
- Do not build a close Tetris, Puzzle Bobble/Bust-A-Move, Connect Four, Othello, Simon,
  Battleship, Yahtzee, or other branded replica.
- Creatures may appear as operators, companions, card art, and collection rewards. They
  do not gain levels and their immutable records do not change.
- Arcade performance does not create creature power.

## Experience structure

- `/arcade` is the chrome catalog and progression summary.
- `/arcade/:game` is a shareable game route. Setup and results are chrome; active play
  is immersive and always has a visible route back to the Arcade.
- `/train` redirects to `/arcade`; the old direct training URLs remain redirects.
- Games load lazily so adding a module does not grow every Arcade visit.
- Every module supplies metadata, rules copy, a deterministic seed, a result, and an
  action log that can be replayed for validation.

## Reward model (initial tuning)

Arcade Credits are a shared, capped progress meter rather than an uncapped per-win token
faucet.

- A qualifying completion awards credits according to the game's expected active time.
- The shared cap is 100 Arcade Credits per UTC day, across every game.
- Each 100 credits converts immediately into one Scrambler Token.
- A session id is redeemable once. The server replays the submitted seed and actions and
  awards only a valid terminal win.
- Guests can play and keep local records but cannot earn account rewards.
- After the daily cap, games continue to update local records and streaks.
- Reward constants are versioned levers. Their first values are deliberately modest and
  remain tuning values until play data exists.

## Initial catalog

1. **Crater Command** — turn-based artillery against a ranging bot or a second local
   player; seeded destructible terrain, angle, power, wind, projectile arc, craters, and
   three-hit integrity.
2. **Archive Patience** — Klondike solitaire with draw-one/draw-three, click and drag
   movement, undo, hints, autocomplete, resumable seeded deals, and local records.
3. **Hazard Sweep** — Minesweeper rules with safe first reveal, three board sizes,
   keyboard play, flags, timer, and deterministic fields.
4. **Relay Merge** — slide-and-merge number puzzle with keyboard/touch controls, undo,
   deterministic spawns, and a defined winning threshold.
5. **Xalian Match** — the existing memory game, migrated into the shared shell and
   progression contract.

The next wave is Supply Run (snake), Containment Break (brick breaker), signal
nonograms, and an original affinity-orb launcher. They are not required for the initial
Arcade to prove the product loop.

## Crater Command tactical redesign

Status: implemented as trial mechanics, 2026-09-13

The second-pass payloads were visibly different but not strategically different. A
200-field evaluation found a strict ranking at every field: the wide barb was always
easier to hit with than the core shell, and the bore was always harder. Fixed crawlers
also made crater depth mostly decorative, while wind changing after every shot erased
the value of learning from the previous impact. That model is retired.

The tactical redesign keeps the familiar artillery center—angle, power, an arc, wind,
and destructible terrain—but gives each extra control a different job:

- The unlimited core shell is the precise, dependable ranging round.
- Two Codazzo-pattern fan charges split into three smaller projectiles. They cover more
  possible landing points when the player is uncertain, but no individual barb has the
  core shell's blast tolerance.
- Two Drilltail-pattern bore charges penetrate beneath the surface before detonating.
  Their underground blast can reach a crawler through a ridge and creates the deepest
  crater, but has a narrower set of successful firing solutions than the core.
- Each crawler has two track moves per match. Advance or withdraw is previewed on the
  field and committed with the shot, changing both the launch origin and the opponent's
  next target. This makes terrain deformation and near-impact danger actionable.
- Wind stays fixed for both shots in a volley, then changes. The opponent gets the same
  condition, and the next shot can be corrected from a stable short/long readout.
- Every projectile path, blast marker, remaining special round, remaining track move,
  and final win or loss is represented directly in the play surface and control panel.

A coarse 30-field, 173,880-trajectory evaluation now measures different solution spaces
rather than a strict power ladder: the 57,960 holding-position trials produced 4.72%
successful core settings,
7.41% fan settings, and 4.04% bore settings. The limited fan remains the uncertainty
tool, the unlimited core the repeatable baseline, and the bore owns unique through-cover
solutions. These values remain Trial pending observation of ordinary players rather than
automated optimal play.

## Implementation checklist

### Foundation

- [x] Add the Arcade catalog, routes, navigation, and legacy redirects.
- [x] Add the shared game shell, session/seed helpers, result contract, local records,
      resume storage, and reward summary.
- [x] Add pure deterministic Arcade rules to `@xalians/rules` with unit tests.
- [x] Add authenticated completion/reward API with replay validation, idempotency, UTC
      daily cap, atomic credit/token accounting, tests, and Terraform route.
- [x] Add the frontend API client and signed-out/reward-unavailable recovery states.

### Games

- [x] Replace the Physics experiment with Crater Command.
- [x] Build Archive Patience.
- [x] Build Hazard Sweep.
- [x] Build Relay Merge.
- [x] Migrate Xalian Match into the shared completion and record contract.

### Quality

- [x] Every active game answers orient → decide → commit → experience → understand →
      continue without opening instructions.
- [x] Keyboard, touch, visible focus, 44 px targets, text alternatives, reduced motion,
      naturally pausable turns, and Solitaire reload recovery work.
- [x] Pure rules, replay validation, route contracts, and local/reward persistence have
      automated coverage; interaction and paint flows have browser smoke coverage.
- [x] Frontend/package/API typechecks and tests pass.
- [x] Production builds and bundle budgets pass.
- [x] `/arcade` and every game pass desktop and phone paint checks with no overflow or
      console errors.

## Definition of done

The concept is built when a visitor can open the Arcade, choose among the five initial
games, complete each on desktop or phone, retain local records, and—when signed in—see a
valid completion advance the shared daily meter and convert earned credits into the
existing Scrambler Token balance without allowing a duplicate claim. Old Training and
Physics links resolve cleanly into the new experience.
