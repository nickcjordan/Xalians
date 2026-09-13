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
