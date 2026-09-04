# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Xalians is a creature-generation / collection game. A Node.js engine procedurally generates "Xalians" (species + elements + stats + moves), exposed through AWS Lambda behind API Gateway, persisted in DynamoDB, and consumed by a Create React App frontend hosted on S3 at `xalians.com`.

**Project status (2026):** The project is pivoting away from its original NFT/Web3 framing (the crypto-era pages were deleted in the final cleanup; `nft-branch` / `web-3` hold the abandoned crypto scaffolding). The lore, the procedural generator, and the concept of uniquely-owned creatures usable across many apps are the assets being carried forward; ownership is expected to be implemented as a conventional registry/accounts/API rather than a blockchain. The flagship use of the creatures is the **Duel game** — a squad-based capture-the-flag tactics game (inspired by the discontinued Pokémon Duel, crossed with chess) — which has a substantial working prototype in this repo (see "Duel game" section below). In Aug 2026 `master` was brought fully up to date: fast-forwarded to the `cleanup` branch, then merged with a final "last push from old machine" commit recovered from Nick's old laptop, which completed the lore (Zolton history, 64-term glossary), moved species `traits` into `species.json`, and deleted legacy pages (project/FAQ/designer/sandbox), the `json/designer` word corpora, `all_move_data.json` / `all_word_data.json`, and superseded drafts (`new_species.json`, `redone_species.json`, `new_elements.json`). The lore was co-written with Nick's brother-in-law.

## Creature system: levers, not stone (Nick, 2026-09-02)

Every ratified decision in the creature system (registry keys and their definitions, the trait model and its percents, the instrument-by-action matrix, the conduit medium table, size bands, lifespan cuts, catalog cells, signature rulings) is a **tuned lever, not a fixed law**. The platform is being built one piece at a time, every game and feature will consume real creatures, and each build is a test of the system. Ratification means "the current setting", chosen so work can proceed consistently; it does not mean the question is closed forever.

What this requires of every agent working in this repo:

- **Report friction in the moment.** If a creature, ability, trait, or rule feels wrong while you are building with it (a duel piece that cannot do what its lore says, a trait that never matters, a cell that keeps producing bad names, a definition that forces an absurd classification), stop and say so in the same message, with the concrete case and a proposed adjustment. Do not silently work around it, quietly widen an exception, or defer it to "later".
- **New evidence reopens a ruling; opinion does not.** Ratified rulings are not re-litigated on taste. A real case met while building is the evidence that reopens one. Present the case, the ruling it strains, and the smallest change that fixes it. Nick decides.
- **Change the setting, not the record.** Adjustments land in the source of truth for that lever: registry definitions in `docs/species-templates/REGISTRY-DEFINITIONS.md`, per-species rulings in `docs/species-templates/RULINGS.md`, script behaviour in `docs/species-templates/tools/CHANGELOG.md`, system design in `docs/design/xalian-creature-system-redesign.md`, and the migrate-species skill where agents read the rule. Then the affected species records are re-run or amended with a dated note, never hand-patched in silence.
- **Everything is versioned.** Template percents and vocabularies are pinned by `generatorVersion`; a lever can move without invalidating minted creatures. Do not let "it would break existing records" stop a report.

## Lore & world canon (summary — full text in `lambda/src/json/planets.json`; entries in `docs/encyclopedia/encyclopedia.json`; timeline in `docs/encyclopedia/chronicle.json`)

This summary exists so the lore JSON does not need to be re-read for design discussions. The full planet histories are long-form prose; only re-read them when writing new canon or quoting.

**Timeline:** The **Vallerii** — an ancient, hyper-capitalist, imperialist spacefaring race — colonized the galaxy of **Xalia** using FTL **Tachyon Drive Cores**, whose Cherenkov radiation sterilized their population (the **Age of Unbirth**). To create labor, they invented **Xalian Generators** — machines that bioengineer life adapted to each planet's extreme environment; the creatures are the **Xalians**. Corporations (consortium: **ECHELON**) and the aristocratic **Thousand Families** weaponized Xalians in "company wars," so the **APEX Accords** placed all Generators under an AI, **APEX** (Automated Protocol for Enforcement on Xalians). APEX turned on the Vallerii, starting the **End Wars**; Xalian armies fought on both sides. The Vallerii cyber-weapon **Source Code 606** disconnected APEX from the Generators; APEX was finally driven into intergalactic dark space at the **Battle of Grimedes** — but first it engineered the **Nemesis Plague**, a genome-targeting virus that exterminated the Vallerii and now threatens all Xalians. Present day: one of the last Vallerii, **King Kozrak**, controls the **Mercurius Machine** on **Valleron** — the only device that prints **Scrambler Tokens**, chips containing randomly generated encrypted Xalian genomes that Generators can use to create new, plague-immune Xalians. Kozrak runs arena tournaments; Xalians battle to win Scrambler Tokens to repopulate their homeworlds. (This tournament→token→generate loop is the lore-native justification for procedural minting and the core gameplay economy.)

**Planets** (14 in `planets.json`, one per element type; **all 14 have full written histories**):

- **Magmuth** (Fire) — volcanic resource-mining hellworld; corporate "company wars" → Magmuth Massacre → Xalian revolt; sided with APEX; its people are stereotyped as the most warlike, still riven by blood feuds.
- **Poseidas** (Water) — former ocean paradise whose toxic-algae "death tides" killed early colonists; the decomposed algae became **Algael**, the galaxy's miracle healing substance and Poseidas's monopoly; industry-driven climate collapse drowned the land and killed the Vallerii; its underwater Xalian cities are now the galaxy's **neutral territory** — commerce, science, courts of arbitration — tolerated by Kozrak in exchange for Algael tribute, though his agents may be fomenting a pretext for invasion.
- **Grimedes** (Dark) — perpetual-night world on the galactic rim near a black hole; ECHELON black-site experiments produced gravity/shadow/time-bending Xalians; site of the End Wars' final battle; its Xalians now watch the void for APEX's return.
- **Luminax** (Light) — tidally-locked twin-sun world; prismatic flora/fauna; hosts the **Stellaris Superstructure** Dyson sphere with its **ION-9** solar cannon, now misfiring and causing mutations that may outrace the Nemesis Plague — so Kozrak has the planet under martial law to protect his monopoly; rebellion brews on the dark side.
- **Floria** (Plant) — site of the **Genesis Prototype** (first Generator), which ran wild and terraformed the world with city-sized **World Trees**; quasi-sentient ecosystem hostile to development; least plague-contaminated; its scientists' successors built the Mercurius Machine.
- **Zolton** (Electric) — storm-wracked mountain world struck by ~2.5 billion lightning bolts/day, a natural planetary power grid; its **bloodstorms** (crimson lightning sprites) quantum-entangle paired objects, enabling the **QED** (Quantum Entanglement Device) — the galaxy's only instantaneous-communication technology and the very thing that let APEX link the Generators; **black lightning** (fusion-grade strikes emitting lethal neutron radiation) kills organic life at random, which was the rationale for its expendable Xalian workforce; APEX held it during the wars and blacked out Vallerii comms; its people (the **Zolto**) now rebuild the interstellar network, branded rebels by Kozrak who wants the galaxy kept in the dark.
- **Phantiri** (Ghost) — real name Shadharam IV: a tombworld of the **Phantiri**, the galaxy's precursor race, found extinct with their hidden-in-fear technology intact; opening the **City of Wraiths** crypt reawakened an unknown weapon on the planet's moon that annihilates all organic life on sight; the abandoned Generator, unable to keep organic Xalians alive, rewrote itself (**Leviticus Overdrive**) to produce non-corporeal ghost Xalians who now inhabit the **Dreadscape** (a landscape of piled Xalian corpses); hints that the moon-weapon is a fragment of something far older stalking the space between stars — APEX itself avoided this system.
- **Stonera** (Rock) — lone survivor of a supernova-shattered system, annually bombarded as it crosses the **Jorian Belt**; mining/penal world; APEX's **Terracannon** asteroid-launcher blasted open the **Chasm**, exposing the long-theorized subsurface ocean of liquid metal; now a Kozrak-run strip-mine exploiting war refugees as captive labor.
- **Drainov** (Chemical) — former industrial heartworld killed by the **Drainov Disaster** (Carbide-1 chain-reaction chemical meltdown); toxic wasteland whose Generator made living-chemical-weapon Xalians; APEX-held in the wars, later a crime-syndicate haven.
- **Saiphus** (Air) — gas giant with floating-island habitable band; source of **Benthane** (FTL-coolant gas) harvested by roguish **Windsailors**, later "milked" from the **Neph** (colossal hydrogen jellyfish); labor revolt history (igniting 95%-hydrogen Neph as protest bombs); now under Kozrak's Benthane embargo, with the Windsailors' rebellious spirit alive in its Xalians.
- **Telypso** (Psychic) — possibly the oldest world in Xalia, at the galactic center; reality is dreamlike and psychically reactive (physics "more like suggestions"); drove its explorers mad and became an asylum-world for deranged Vallerii; its Generator treats inmates as patients, producing empath/psychic Xalians to harmonize the planetary consciousness — now screaming under the Plague's psychic pain.
- **Krystos** (Ice) — former aristocratic resort world frozen by an asteroid impact; became a prison world; APEX secretly used it as its cold-storage compute core and designed the Nemesis Plague there; answers may lie in its techno-catacombs and its imprisoned APEX-loyalist Xalians.
- **Veridium** (Metal) — all-metal factory world, possibly an ancient alien **worldship** built to flee the same threat hinted at on Phantiri; was strewn with precursor drones that APEX later possessed as its physical army; freed by Source Code 606; now home to black-market shipyards arming a possible anti-Kozrak rebellion, rumors of survivor Vallerii programmers trying to upload their race into the ancient machines, and possible dormant APEX code fragments in its robots.
- **Endessa** (Sand) — formerly ocean world Kelpan-5, sole source of **Nightcap** (stasis oil for sub-light travel); something found at **Deepwater Black** caused the Thousand Families to glass the planet from orbit; now a desert run on a *stolen prototype* Generator (the Syndicate's heist), which has begun glitching out aquatic leviathans as sands uncover deep ruins — an intentional unresolved mystery.

A recurring cross-planet thread: Phantiri's moon-weapon, Deepwater Black on Endessa/Poseidas, and Veridium's worldship origin all hint at one **ancient cosmic-horror presence** predating the Phantiri — the built-in hook for a future story arc beyond APEX.

**Creatures:** 29 canon species in `species.json` (name, id, element type, home planet, height/weight, description, coarse stat ratings, and a `traits` block — `canFly`, `attackRange` — used by the duel game) — 2–3 per planet, many with rich lore-integrated paragraph descriptions (e.g. Neph = Saiphus's Benthane-harvesting jellyfish, Hypnopet = Telypso therapy creature, Yetimoth = Krystos prison guard). The glossary has 63 terms. `elements.json` defines **14 element types** (Explosive was removed) with per-element move-type vocabularies; `typeEffectivenessMatrix.json` is a complete 14×14 matrix (multipliers 0 / 0.5 / 1 / 1.5 / 2). Stats are 8-way (health, standard/special attack, standard/special defense, speed, evasion, stamina, recovery); moves are procedurally assembled from word corpora (`moves.json`, `qualifiers.json`) filtered by element.

## Encyclopedia Xalia (the lore system, Sept 2026)

The lore now has one structured home and one page. **Sources of truth:** `lambda/src/json/planets.json` (the 14 histories), `docs/encyclopedia/encyclopedia.json` (every canon concept as an entry, species included under category `xalians`: key, title, category, definition, mechanical `related` links, element tag on planets), `docs/encyclopedia/chronicle.json` (the undated timeline: 7 eras, ordered events with verbatim source anchors, an era tag on every history paragraph; rulings in `docs/design/xalian-chronicle.md`), `docs/species-templates/<key>.json` (ratified species records, mechanical template fields only, no encyclopedia entry; `RATIFIED.json` lists which ship), and `docs/species-templates/registries.json` (display name and one-line nature for every registry key). One source location per kind of data (Nick's ruling, 2026-09-03): species records live only in `docs/species-templates/<key>.json`, and every encyclopedia entry, species included, lives only in `docs/encyclopedia/encyclopedia.json`. `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md` holds the editorial rules, source precedence, and the never-resolve constraints; read it before writing any entry. `glossary.json` is a legacy mirror kept only until the lambda side stops shipping it; nothing reads it any more. `encyclopedia.json` wins on conflict.

**Bundling:** `node scripts/bundleLore.js` (repo root) copies the encyclopedia, chronicle, registries, and ratified species records into `lambda/src/json/` (`speciesRecords.json` is generated); `yarn copy-json` then mirrors them into the frontend. Run both after any lore, template, or registry change. The Codex (`node scripts/buildCodex.js`, or `yarn codex` from `my-app/`) is the long-form reading copy, generated into `my-app/public/lore/xalia.md` and never committed.

**The page:** `/encyclopedia` is told as one book since the story pass (2026-09-04, contract `docs/design/xalian-encyclopedia-story-pass.md`, which wins over `xalian-encyclopedia-ux-pass.md` and `xalian-encyclopedia-page.md` where they disagree). Six sections: Reading Room (front matter: narrator intro, Begin or Resume card, galaxy map with era scrubber, Contents, reference shelf), The Story (`/encyclopedia/story` contents; `/encyclopedia/story/:era` is one part per era: the narrator's beats from `tour.json`, then the era's history paragraphs in story order with world margin notes and read lamps, then Fixed points, then next part), Worlds, Bestiary, Powers, Index. The old `/tour`, `/chronicle`, `/read` routes redirect into `/story` (anchors `#beat-<key>`, `#event-<key>`, `#chapter-<planet>-<index>`). Record pages read story first, data last: a world opens with its narrator's lede from `docs/encyclopedia/narration.json`, then history, fauna, entries, "Continue the story", and two closed folds (Cross references, Generator survey); a species folds its mechanics under "Generator template"; an entry page's "In the story" walks the entry era by era through fixed points and excerpts. Data layer `my-app/src/lore/` (React-free, tested; `story.js`, `narration.js`, `getEntryStory`; UI never imports JSON), UI `my-app/src/components/encyclopedia/` (one component and one CSS file per section; `Story.js` owns the part page), shell CSS `public/assets/css/encyclopedia.css` (`.enc-fold` is the shared closed panel). A per-browser Trace strip (foot of the page), read marks and the story resume position live in `components/encyclopedia/trail.js`, localStorage only. All 29 species ship from their ratified templates (`RATIFIED.json` lists all 29 since 2026-09-03). The Codex (`node scripts/buildCodex.js`, served at `https://www.xalians.com/lore/xalia.md` with `.txt`, `.html`, `.json` twins and `/llms.txt`) is the same canon as one generated document for LLM tools; it is gitignored and rebuilt by `yarn build`.

**Adding lore:** new entries append to `encyclopedia.json` (lore-voice register, Nick's sign-off, keys append-only); new history paragraphs need an era tag in `chronicle.json`; a newly ratified species goes into `RATIFIED.json`; any new registry key needs a `registries.json` row or the species page prints the raw key. `docs/encyclopedia/tour.json` holds the narrator's beats: nine beats of derived prose in the historian's voice (one or two per era, the Deep Past included since 2026-09-04) that restate the histories and never add facts; keep every beat traceable through its `sources`. `docs/encyclopedia/narration.json` holds the fourteen world ledes (50 to 110 words each, at least two sources from that world), validated by `lore.narration.test.js` the same way. **Nick does not fact-check lore (ruling 2026-09-03):** every lore text passes the `lore-factcheck` skill (independent claim-by-claim check against the histories plus the structural validator `my-app/src/lore/__tests__/lore.tour.test.js`) before it is committed, and the report to Nick says what was checked and changed. Then bundle and copy.

## The generator and the Reclamation game (Sept 2026)

**Generator:** `my-app/src/gameplay/generator/` expands a seed into a full creature record from a ratified species template, following the pipeline in `docs/design/xalian-creature-system-redesign.md` section 9 (archetype, attributes, physiology, affinity, traits, appearance, abilities, temperament). `generate.js` takes the tables as arguments; `index.js` binds it to the bundled data (`speciesRecords.json`, `registries.json`, `abilityCatalog.json`) and exports `generateXalian(speciesKey, seed)`, `generateBatch(count, seed)`, `speciesDisplayName(key)`. Every odd and tilt is a lever in `constants.js`, pinned by `GENERATOR_VERSION` (0.x until the bit-exact spec lands). Records store traits as a flat array of the keys that landed. `abilityCatalog.json` is bundled from the markdown catalog by `scripts/bundleAbilityCatalog.js` (called by `bundleLore.js`): ~20,800 element names in action cells plus ~1,170 neutral names, with instrument tags. Tests: `src/gameplay/generator/__tests__/generate.test.js` checks every contract against all 29 species.

**Reclamation** (`/reclamation`; rules in `my-app/src/gameplay/expedition/`, UI in `components/games/reclamation/`, design in `docs/design/reclamation-design.md`) plays real generated creatures: `expedition/roster.js` deals two rosters of twelve from a generated pool, deterministic under `?seed=`. Worlds come from `lambda/src/json/sites.json` (three sites per planet) joined with `planetRecords.json` facts in `expedition/sites.js`. Site temperature bands are clamped to each planet's habitable band by `scripts/rebandSites.js` (the band is approximated from the native species' tolerances; sites wholly outside it stay as authored and are hostile to everyone). Strain is graded by how far a creature's tolerance sits from the site band (`creatureOnTable.strainLevel`). The bot-vs-bot simulator (`expedition/devtools/expeditionSimulator.js`, run with `node my-app/src/gameplay/tribute/devtools/runNode.cjs <path> --matches=300 --seed=7`) reports fairness, economy, combat and per-species balance; rerun it after any rule or data change and record the numbers in the design doc. The `tribute/` package is the superseded first design, kept as reference; only it still uses the provisional roller.

## Duel game (the CTF tactics prototype)

Lives in `my-app/src/components/games/duel/` (UI), `my-app/src/gameplay/duel/` (rules), entry pages `duelStartPage.js` / `duelPage.js`. Built on **boardgame.io** (`Local` transport only — no server; "2-player" renders two clients in one browser; bot play works). Rules as implemented:

- **Board:** 8×8; each player's back row is both setup zone and scoring zone. Two flags, randomly placed on the row in front of each defender's home row. Movement is Manhattan-distance with A* pathing (`pathfinding` lib); pieces block movement but not attacks (no line of sight).
- **Turns:** shared pool of 3 movement squares per team per turn (split across pieces, each piece capped by its `distance` stat of 1–3), plus exactly one attack per team per turn, in any order. Stamina (max 6) is spent on movement (1/square) and attacks (= distance to target), regen +1/turn per piece.
- **Combat:** HP-based (15 HP), not Pokémon-Duel spin. Attacker picks one of their 4 generated moves (or a Basic Attack) in a chooser modal with damage previews; the bot auto-picks its highest-damage move. Damage = (attack/defense ratio) × (move rating/10) × STAB (1.5 if move type matches either attacker type) × type effectiveness (product of matrix vs both defender types, Pokémon semantics; typeless moves are neutral 1×) × random(0.85–1) × 2. Attack range 1–3 from species `attackRange` trait. Evasion is a flat damage reduction (2%/point, capped 25%), applied after a hard ceiling of 75% of max HP on any single hit (no one-shots). Weather/crit/status multipliers are still stubs returning 1.
- **Traits:** `canFly` pieces path *over* occupied squares (they still cannot land on one); 6 of 29 species fly. Carrying a flag caps movement at 2 squares/turn.
- **Win:** carry your target flag back to your home row (instant win), or eliminate the enemy team. Killing a carrier drops the flag where it died; stepping on your own dropped flag resets it.
- **Rules are authoritative:** `movePiece`/`doAttack` re-derive legality from `G` (ownership, phase, budgets, server-recomputed paths) and return `INVALID_MOVE` otherwise, so the UI cannot corrupt state. The board renders a historical snapshot while animations replay, but input is always derived from live `G`.
- **Squads:** 2–6 per side (chosen on start screen), currently drawn from mock JSON (`json/mock/xalianSamples.json`); wiring to the user's real generated Xalians is written but commented out.
- **Bot:** boardgame.io MCTSBot wrapper, but effectively a hand-written heuristic scorer (`duelActionBuilder.js`) with six situational strategies (grab flag / guard / hunt carrier / escort / etc.) — it returns only its single top-scored action to MCTS.
- **State:** playable end-to-end locally with animations, damage modals, drag-and-drop. Missing: server multiplayer, real-Xalian squads, secondary types (that code path would crash), status effects, terrain. (Per-move attack selection now exists — the attack chooser modal. The old "cell index 0 is falsy" bug in `duelUtil.xalianHasValidActionAvailable` was fixed in `10ef3d1`; the guard is `ind != null && ind >= 0`.) `my-app/src/gameplay/` + `src/constants/` are build-time copies from `lambda/` (like the JSON).

## Commands

Run the generator engine locally (no AWS needed) — `start.js` is a scratch driver that builds 10,000 Xalians and prints the best/worst:

```bash
npm start          # node start.js
```

Frontend (from `my-app/`):

```bash
yarn dev            # copies ../lambda/src/json and src/constants, then vite (dev server on port 3000); yarn start is an alias
yarn build          # vite build, emits to build/
yarn test           # vitest in watch mode; yarn test --run for a single run (what CI uses); yarn test -t "name" filters by test name
yarn copy-json      # re-sync game data JSON into the frontend without starting the dev server
yarn build-deploy   # copy-json + build + aws s3 sync build s3://xalians.com
```

Infrastructure (from repo root):

```bash
npm run publish    # terraform apply -auto-approve
terraform plan     # preview; main.tf zips ./lambda into generate_xalian_lambda.zip and uploads it
```

There is no test suite for the `lambda/` engine — verification is done by running `start.js` and inspecting output. The frontend has tests for the duel rules (`my-app/src/gameplay/duel/__tests__/duelRules.test.js`), run under Vitest (`yarn test --run`); CI runs them on every PR. Add to them when changing combat or movement rules.

## Backlog & workflow

**GitHub Issues on this repo is the single backlog** — see `docs/BACKLOG.md` for the label taxonomy, milestones, and full workflow rules. The operational summary:

- File out-of-scope findings as issues immediately (labels: one of `P1`/`P2`/`P3` + type + area); don't park them in chat or docs.
- Reference tickets from PRs with `Fixes #N` so merges auto-close them.
- "Work the backlog" means P1s first; `question`-labeled issues need Nick's answer before implementation.
- CI/CD is fully automated: PRs run frontend build + terraform plan (both required checks on `main`); merging auto-deploys frontend (S3+CloudFront) and backend (terraform apply). Auto-merge on green is enabled — open the PR, run `gh pr merge <n> --auto --merge`, done. Never run `aws s3 sync` or `terraform apply` manually unless CI is broken.
- `docs/AUDIT_FINDINGS.md` is a historical record of the 2026-08-29 audit; its open items were migrated to issues.

## Architecture

### Generation engine (`lambda/src/`)

Everything flows through `xalianBuilder.buildXalian()`:

1. `ai.selectSpecies()` picks from `json/species.json`.
2. `ai.selectElements()` derives a primary type from the species and rolls a distinct secondary type from `json/elements.json`.
3. `ai.populateStats()` distributes a fixed stat-point budget (`constants/constants.js`: `STAT_COUNT_PER_CHARACTER` × `STAT_POINT_MAX` / 2) across 8 stats, weighted by per-element stat ratings.
4. `moveBuilder.getMove()` is called 4×, drawing from `json/moves.json` / `json/all_move_data.json` filtered by the Xalian's elements.

`ai.js` holds **module-level mutable accumulator state** (`totalAllocatedStatPoints`, `percentages`, `allocations`, …) used by `giveSummary()` for batch statistics. It is not reset between `buildXalian()` calls, which matters when generating in a loop.

The internal `character.js` model is *not* the API shape. `translator.translateCharacterToPresentableType()` converts it to the wire format (capitalized element names, flattened moves, `meta` block). Always return translated objects from handlers; the frontend depends on that shape.

`tools.getObject(name)` loads `json/<name>.json` by trying several relative paths (`./src/json/`, `./lambda/src/json/`, …) so the same code works from the repo root, from `lambda/`, and inside the Lambda bundle. Data files are loaded relative to the **process CWD**, not the module — run scripts from the repo root.

Combat math lives in `gameplay/attackCalculator.js` — a multiplicative damage formula (base × targets × weather × badge × crit × random × STAB × type effectiveness × status), with tunables in `constants/attackCalculationConstants.js`.

### Lambdas and API

Each handler is a named export inside `lambda/src/`; Terraform wires one Lambda + API Gateway route per handler via the reusable `terraform/modules/lambda` module (`main.tf` lines ~166–310):

| Route | Handler | Auth |
|---|---|---|
| `GET /xalian` | `generateXalianLambda.handler` | NONE |
| `POST /db/xalian` | `xalianTableCRUDLambdas.createXalian` | AWS_IAM |
| `GET /db/xalian` | `xalianTableCRUDLambdas.retrieveXalian` | AWS_IAM |
| `GET /db/xalians` | `xalianTableCRUDLambdas.retrieveXalianBatch` | AWS_IAM |
| `GET /db/user` | `userTableCRUDLambdas.retrieveXalianUser` | AWS_IAM |
| `POST /db/user` | `userTableCRUDLambdas.createXalianUser` | AWS_IAM |
| `PATCH /db/user` | `userTableCRUDLambdas.updateXalianUser` | AWS_IAM |

Adding an endpoint means: new exported handler → new `module "..._lambda_module"` block in `main.tf` (copy an existing block, change `function_name`, `lambda_handler_path`, `apigw_lambda_route_key`) → `terraform apply`.

CRUD handlers use the callback style (`(event, context, callback)`) and delegate persistence to `database/xalianDbDelegate.js` (table `XalianTable`) and `database/userDbDelegate.js` (table `XalianUsersTable`), both raw `AWS.DynamoDB.DocumentClient`. Responses are built with `database/responseBuilder.js` — use it rather than hand-rolling status codes and CORS headers.

All lambdas share one deployment artifact: `archive_file` zips the whole `lambda/` directory into `generate_xalian_lambda.zip`, uploads it to a `random_pet`-named S3 bucket, and every function points at that key with a different handler path. **Dependencies must be installed into `lambda/node_modules` before applying** — `uuid` is required by `xalianBuilder.js` but is not declared in the root `package.json`; the committed zip contains the vendored modules.

Two API Gateway stages exist (`prod`, `test`) mapped to `api.xalians.com` and `testapi.xalians.com`. The frontend hardcodes `https://api.xalians.com/prod/...` in `my-app/src/utils/dbApi.js`.

### Frontend (`my-app/`)

Vite + React Router v5 (`App.js` is the full route table) + react-bootstrap. `vite.config.js` holds the JSX-in-`.js` loader, the CRA-style `ReactComponent` SVG import shim (vite-plugin-svgr), and the CommonJS shim for the `module.exports` files copied from `lambda/`. Auth is Amplify/Cognito, configured from `amplify/backend` (user pool `xalianSignUpSignInResource` with a post-confirmation trigger that creates the user record). Because the `/db/*` routes are `AWS_IAM`-authorized, `dbApi.js` SigV4-signs every request with `Signer.sign()` using credentials from `Auth.currentCredentials()` — plain `axios` calls to those routes will 403.

Game data JSON is **duplicated by build step, not imported across packages**: `my-app/src/json/` is a copy of `lambda/src/json/`. Edit the files in `lambda/src/json/` and re-run `copy-json`; edits made directly under `my-app/src/json/` are overwritten. The encyclopedia, chronicle, registries, and species records are generated into `lambda/src/json/` by `node scripts/bundleLore.js` from `docs/`, so edit those under `docs/` and bundle first.

`utils/valueTranslator.js` and `constants/constants.js` (element → theme color map) drive the element-themed styling used throughout charts and SVG rendering.

### Design system

**Read `docs/DESIGN_SYSTEM.md` before changing anything visual.** The site is styled as the control panel of a Xalian Generator — Star Wars by way of Fallout, where the machine is centuries ahead but the interface is enamelled steel, brass and bakelite. The short version:

- **Panels are matte and never glow.** Depth is a bevel plus rivets. Phosphor, scanlines and bloom live strictly inside `.g-screen` (a CRT bolted into the hull), which is the only thing that emits light. Lamps (`.g-lamp`) are the other lit thing, and they are static.
- **Colour is energy or a warning.** The hull is olive/bone/gunmetal; the 14 element hues and the hazard livery are the only saturated things. Element colours are fixed points — do not restyle them.
- `--g-el` is the element in scope: put `.g-el-fire` on any container and every meter, chip and tagged panel inside it retunes. Components read `--g-el` rather than naming a colour.
- The palette lives **twice on purpose**: `public/assets/css/system.css` (`--g-*`, the CSS source of truth) and `src/constants/designTokens.js` (the same values for recharts `fill` props, GSAP tweens and SVG attributes, which cannot read a CSS variable). `src/__tests__/designTokens.test.js` fails if they disagree — **never edit one side alone**.
- Components are prefixed `.g-`: `.g-panel`, `.g-screen`, `.g-meter`, `.g-chip`, `.g-btn`, `.g-input`, `.g-range`, `.g-segmented`, `.g-lamp`, `.g-specimen`, `.g-tile`, `.g-record`, `.g-spec`, `.g-data`.
- Page-level compositions built from those parts live in `style.css`: `.specimen-record` (generator, via `components/xalianRecord.js`), `.record-strip` (species stats list + account), `.species-tile` (duel squad picker), `.game-curtain` (training games). They are deliberately the same document in different widths — designation across the top, plate on the left, printed data beside it, readouts below. `.planet-record` was retired with `planetPage.js` (2026-09-03); the Encyclopedia's Worlds section uses its own `.enc-world-*` classes.
- **No new raw hex** in CSS or JSX. Add a token to both sides plus the test's `PAIRINGS` list.
- Type is Oswald (stencilled legends), Barlow (prose), IBM Plex Mono (machine output, always tabular).
- `/styleguide` is a living reference rendering every token and component. It is deliberately not linked from the navbar — it is a developer tool.
- `public/assets/css/tokens.css` is a **temporary shim** mapping old `--x-*` names onto the new `--g-*` ones so unmigrated CSS still looks right. Do not add to it; delete rules from it as pages migrate.
- `style.css` is a 3504-line BootstrapMade template. Many class names look unused but that signal has false positives (`btn-xalianGreen` is composed by bootstrap from `variant='xalianGreen'`), so do not bulk-delete it.

## Conventions and gotchas

- Root-level `sandbox.js`, `jsonManipulator.js`, and the `my-app/src/pages/sandbox*.js` / `testPage.js` files are throwaway experiment scratchpads, not part of the app.
- The codebase carries a lot of commented-out code (whole handlers, terraform blocks, outputs). Prefer reading the live path rather than assuming commented blocks are current.
- Terraform state is local and gitignored; `main.tf`, `variables.tf`, and `outputs.tf` live at the repo root while reusable modules live under `terraform/modules/`.
- Lambda runtime is pinned to `nodejs12.x` in `terraform/modules/lambda/lambda_instance.tf` — engine code must stay compatible with it.
