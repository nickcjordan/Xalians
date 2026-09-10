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

## Lore & world canon (summary — full text in `packages/content/json/planets.json`; entries in `docs/encyclopedia/encyclopedia.json`; timeline in `docs/encyclopedia/chronicle.json`)

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

The lore now has one structured home and one page. **Sources of truth:** `packages/content/json/planets.json` (the 14 histories), `docs/encyclopedia/encyclopedia.json` (every canon concept as an entry, species included under category `xalians`: key, title, category, definition, mechanical `related` links, element tag on planets), `docs/encyclopedia/chronicle.json` (the undated timeline: 7 eras, ordered events with verbatim source anchors, an era tag on every history paragraph; rulings in `docs/design/xalian-chronicle.md`), `docs/species-templates/<key>.json` (ratified species records, mechanical template fields only, no encyclopedia entry; `RATIFIED.json` lists which ship), and `docs/species-templates/registries.json` (display name and one-line nature for every registry key). One source location per kind of data (Nick's ruling, 2026-09-03): species records live only in `docs/species-templates/<key>.json`, and every encyclopedia entry, species included, lives only in `docs/encyclopedia/encyclopedia.json`. `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md` holds the editorial rules, source precedence, and the never-resolve constraints; read it before writing any entry. `glossary.json` is a legacy mirror kept only until the API side stops shipping it; nothing reads it any more. `encyclopedia.json` wins on conflict.

**Bundling:** `node scripts/bundleLore.js` (repo root) copies the encyclopedia, chronicle, registries, and ratified species records into `packages/content/json/` (`speciesRecords.json` is generated). Run it after any lore, template, or registry change; both `apps/api` and `my-app` read the result directly through `@xalians/content`, so there is no second sync step. The Codex (`node scripts/buildCodex.js`, or `npm run codex` from `my-app/`) is the long-form reading copy, generated into `my-app/public/lore/xalia.md` and never committed.

**The page:** `/encyclopedia` is told as one book since the story pass (2026-09-04, contract `docs/design/xalian-encyclopedia-story-pass.md`, which wins over `xalian-encyclopedia-ux-pass.md` and `xalian-encyclopedia-page.md` where they disagree). Six sections: Reading Room (front matter: narrator intro, Begin or Resume card, galaxy map with era scrubber, Contents, reference shelf), The Story (`/encyclopedia/story` contents; `/encyclopedia/story/:era` is one part per era: the narrator's beats from `tour.json`, then the era's history paragraphs in story order with world margin notes and read lamps, then Fixed points, then next part), Worlds, Bestiary, Powers, Index. The old `/tour`, `/chronicle`, `/read` routes redirect into `/story` (anchors `#beat-<key>`, `#event-<key>`, `#chapter-<planet>-<index>`). Record pages read story first, data last: a world opens with its narrator's lede from `docs/encyclopedia/narration.json`, then history, fauna, entries, "Continue the story", and two closed folds (Cross references, Generator survey); a species folds its mechanics under "Generator template"; an entry page's "In the story" walks the entry era by era through fixed points and excerpts. Data layer `my-app/src/lore/` (React-free, tested; `story.js`, `narration.js`, `getEntryStory`; UI never imports JSON), UI `my-app/src/components/encyclopedia/` (one component and one CSS file per section; `Story.js` owns the part page), shell CSS `public/assets/css/encyclopedia.css` (`.enc-fold` is the shared closed panel). A per-browser Trace strip (foot of the page), read marks and the story resume position live in `components/encyclopedia/trail.js`, localStorage only. All 29 species ship from their ratified templates (`RATIFIED.json` lists all 29 since 2026-09-03). The Codex (`node scripts/buildCodex.js`, served at `https://www.xalians.com/lore/xalia.md` with `.txt`, `.html`, `.json` twins and `/llms.txt`) is the same canon as one generated document for LLM tools; it is gitignored and rebuilt by `npm run build`.

**Adding lore:** new entries append to `encyclopedia.json` (lore-voice register, Nick's sign-off, keys append-only); new history paragraphs need an era tag in `chronicle.json`; a newly ratified species goes into `RATIFIED.json`; any new registry key needs a `registries.json` row or the species page prints the raw key. `docs/encyclopedia/tour.json` holds the narrator's beats: nine beats of derived prose in the historian's voice (one or two per era, the Deep Past included since 2026-09-04) that restate the histories and never add facts; keep every beat traceable through its `sources`. `docs/encyclopedia/narration.json` holds the fourteen world ledes (50 to 110 words each, at least two sources from that world), validated by `lore.narration.test.js` the same way. **Nick does not fact-check lore (ruling 2026-09-03):** every lore text passes the `lore-factcheck` skill (independent claim-by-claim check against the histories plus the structural validator `my-app/src/lore/__tests__/lore.tour.test.js`) before it is committed, and the report to Nick says what was checked and changed. Then bundle and copy.

## The generator and the Reclamation game (Sept 2026)

**Generator:** `packages/rules/src/generator/` (the `@xalians/rules` workspace package, TypeScript source with no build step, moved out of `my-app` in the backend modernization's rules-package pass) expands a seed into a full creature record from a ratified species template, following the pipeline in `docs/design/xalian-creature-system-redesign.md` section 9 (archetype, attributes, physiology, affinity, traits, appearance, abilities, temperament). `generate.ts` takes the tables as arguments; `index.ts` binds it to the bundled data (`speciesRecords.json`, `registries.json`, `abilityCatalog.json` from `@xalians/content`) and exports `generateXalian(speciesKey, seed)`, `generateBatch(count, seed)`, `speciesDisplayName(key)`. Every odd and tilt is a lever in `constants.ts`, pinned by `GENERATOR_VERSION` (**0.2.0**; 0.x until the bit-exact spec lands, and records only reproduce within a version). `prng.ts` is a 128-bit stream: the seed string is hashed with cyrb128 into four 32-bit words that seed xoshiro128**, and each pipeline step forks its own labelled sub-stream, so a Scrambler Token genome no longer collapses to 32 bits (0.1.0 did, and collided at about 65,000 mints). Records store traits as a flat array of the keys that landed. `abilityCatalog.json` is bundled from the markdown catalog by `scripts/bundleAbilityCatalog.js` (called by `bundleLore.js`): ~20,800 element names in action cells plus ~1,170 neutral names, with instrument tags and a computed **heft** (1 small, 2 ordinary, 3 grand, from word count, syllables and a grand-word list); a rolled ability's intensity picks a target heft and the name draw is weighted toward it, so heavy rolls get heavy names. Entry shape is a bare name, `[name, tags]`, or `[name, tags, heft]` when the heft is not 2. `my-app` and `apps/api` consume the package as `@xalians/rules/generator`; `npm run typecheck -w packages/rules` and `npm test -w packages/rules` run its own check and Vitest suite. To run generator code under plain node, use `node my-app/scripts/runNode.cjs <entry.ts>`, which esbuild-bundles the entry (type-stripping the TypeScript), runs it, and deletes the bundle. Tests: `packages/rules/src/generator/__tests__/generate.test.ts` checks every contract against all 30 species, plus seed width, fork independence and heft weighting.

**Reclamation** (`/reclamation`; rules in `my-app/src/gameplay/expedition/`, UI in `components/games/reclamation/`, design in `docs/design/reclamation-design.md`) plays real generated creatures: `expedition/roster.js` deals two rosters of twelve from a generated pool, deterministic under `?seed=`. Worlds come from `packages/content/json/sites.json` (three sites per planet) joined with `planetRecords.json` facts in `expedition/sites.js`. Site temperature bands are clamped to each planet's habitable band by `scripts/rebandSites.js` (the band is approximated from the native species' tolerances; sites wholly outside it stay as authored and are hostile to everyone). Strain is graded by how far a creature's tolerance sits from the site band (`creatureOnTable.strainLevel`). The bot-vs-bot simulator (`expedition/devtools/expeditionSimulator.js`, run with `node my-app/src/gameplay/expedition/devtools/runNode.cjs <path> --matches=300 --seed=7`) reports fairness, economy, combat and per-species balance; rerun it after any rule or data change and record the numbers in the design doc. The decision-quality validation tool (`expedition/devtools/expeditionValidation.js`, same runner, `--md=<path>` writes the report) measures naive-policy regret, option spread, point of no return, rule ablation and draft dominance per `docs/design/game-validation-principles.md`; the checked-in run is `docs/design/reclamation-validation-report.md`. The first design, Tribute, was deleted in PR #98; Reclamation is its redesign.

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
- **State:** playable end-to-end locally with animations, damage modals, drag-and-drop. Missing: server multiplayer, real-Xalian squads, secondary types (that code path would crash), status effects, terrain. (Per-move attack selection now exists — the attack chooser modal. The old "cell index 0 is falsy" bug in `duelUtil.xalianHasValidActionAvailable` was fixed in `10ef3d1`; the guard is `ind != null && ind >= 0`.) `my-app/src/gameplay/` + `src/constants/` are build-time copies from `apps/api/` (unlike the JSON, which is shared directly via `@xalians/content`).

## Commands

The repo is an npm workspace rooted here (`workspaces: ["apps/*", "packages/*", "my-app"]`); run `npm ci` once at the root, not inside each package.

Run the generator engine locally (no AWS needed) — `start.js` is a scratch driver that builds 10,000 Xalians and prints the best/worst:

```bash
npm start          # node start.js
```

Backend (`apps/api`, TypeScript/ESM, from the repo root):

```bash
npm run typecheck -w apps/api   # tsc --noEmit
npm test -w apps/api            # vitest run, the handler/repository suite (aws-sdk-client-mock)
npm run build -w apps/api       # esbuild: one bundle per handler at apps/api/dist/<name>/index.mjs
```

Frontend (from `my-app/`, or `-w my-app` from the root):

```bash
npm run dev          # vite (dev server on port 3000); npm start is an alias
npm run build        # vite build, emits to build/
npm test             # vitest in watch mode; npm test -- --run for a single run (what CI uses); npm test -- -t "name" filters by test name
npm run build-deploy  # build + aws s3 sync build s3://xalians.com
```

Infrastructure (from repo root):

```bash
npm run publish    # terraform apply -auto-approve
terraform plan     # preview; main.tf zips apps/api/dist (run `npm run build -w apps/api` first) into generate_xalian_lambda.zip and uploads it
```

There is no test suite for the legacy generation engine itself (`src/legacy/ai.js`, `xalianBuilder.js`, `moveBuilder.js`) — verification is done by running `start.js` and inspecting output. `apps/api/test` covers the handlers and repositories with Vitest and `aws-sdk-client-mock`. The frontend has tests for the duel rules (`my-app/src/gameplay/duel/__tests__/duelRules.test.js`), run under Vitest (`npm test -- --run` from `my-app/`); CI runs them on every PR. Add to them when changing combat or movement rules.

## Backlog & workflow

**GitHub Issues on this repo is the single backlog** — see `docs/BACKLOG.md` for the label taxonomy, milestones, and full workflow rules. The operational summary:

- File out-of-scope findings as issues immediately (labels: one of `P1`/`P2`/`P3` + type + area); don't park them in chat or docs.
- Reference tickets from PRs with `Fixes #N` so merges auto-close them.
- "Work the backlog" means P1s first; `question`-labeled issues need Nick's answer before implementation.
- CI/CD is fully automated: PRs run frontend build + terraform plan (both required checks on `main`); merging auto-deploys frontend (S3+CloudFront) and backend (terraform apply). Auto-merge on green is enabled — open the PR, run `gh pr merge <n> --auto --merge`, done. Never run `aws s3 sync` or `terraform apply` manually unless CI is broken.
- `docs/AUDIT_FINDINGS.md` is a historical record of the 2026-08-29 audit; its open items were migrated to issues.

## Architecture

### Generation engine (`apps/api/src/legacy/`)

The pre-record engine that still serves the free showroom (`GET /xalian`) and the legacy keep flow (`POST /db/xalian`). It is plain CommonJS kept under `allowJs`, quarantined rather than ported: the ratified generator in `my-app/src/gameplay/generator/` supersedes it, and this tree is deleted once generation moves server-side onto that generator (Wave D in `docs/design/backend-modernization-plan.md`). Everything flows through `xalianBuilder.buildXalian()`:

1. `ai.selectSpecies()` picks from `species.json`.
2. `ai.selectElements()` derives a primary type from the species and rolls a distinct secondary type from `elements.json`.
3. `ai.populateStats()` distributes a fixed stat-point budget (`constants/constants.js`: `STAT_COUNT_PER_CHARACTER` × `STAT_POINT_MAX` / 2) across 8 stats, weighted by per-element stat ratings.
4. `moveBuilder.getMove()` is called 4×, drawing from `moves.json` / `qualifiers.json` filtered by the Xalian's elements.

`ai.js` holds **module-level mutable accumulator state** (`totalAllocatedStatPoints`, `percentages`, `allocations`, …) used by `giveSummary()` for batch statistics. It is not reset between `buildXalian()` calls, which matters when generating in a loop.

The internal `character.js` model is *not* the API shape. `translator.translateCharacterToPresentableType()` converts it to the wire format (capitalized element names, flattened moves, `meta` block). Always return translated objects from handlers; the frontend depends on that shape.

`tools.getObject`/`getJson` load the four engine JSON files (`elements`, `species`, `qualifiers`, `moves`) via static `require('@xalians/content/<name>.json')` calls, one per name in a switch — static so esbuild can see them and inline the JSON directly into each handler bundle at build time. There is no CWD-relative fallback; `apps/api/src/legacy/package.json` pins `"type": "commonjs"` so this tree keeps working as CommonJS even though `apps/api/package.json` itself is `"type": "module"`.

Combat math lives in `legacy/gameplay/attackCalculator.js` — a multiplicative damage formula (base × targets × weather × badge × crit × random × STAB × type effectiveness × status), with tunables in `legacy/constants/attackCalculationConstants.js`.

### Lambdas and API

`apps/api/src/handlers/*.ts` are the nine route handlers, each `export const handler = withApi(fn, opts)`. `withApi` (`src/lib/api.ts`) parses and validates the body, query, and path params against zod schemas (`src/lib/schemas.ts`), derives the subject from the JWT claims (`src/lib/auth.ts`, reads both payload 1.0 and 2.0 claim shapes), calls the route function, serializes `{status, body}` into the Lambda response, maps a thrown `ApiError` to its status and errorCode and anything else to a logged 500 with a request id, and emits one structured log line per request (never headers or bodies). Persistence goes through promise-returning repositories (`src/repositories/users.ts`, `xalians.ts`, `registry.ts`) over one shared `DynamoDBDocumentClient` (`src/lib/db.ts`); user mutations use condition expressions (atomic `list_append` and indexed `REMOVE` for the id list, a `>=` condition for token spends), batch reads chunk at 100 keys and retry `UnprocessedKeys`. No callbacks anywhere in this tree.

Two creature flows coexist until issue #180 lands:

- **Legacy showroom** (the shape every current page renders): `GET /xalian` runs the legacy engine anonymously and returns `{ xalian, signature }`, an HMAC-SHA256 over canonical JSON (`src/lib/signing.ts`, secret `XALIAN_SIGNING_SECRET` from a `random_password` in `main.tf`, injected only into the two functions that sign and verify). `POST /db/xalian` verifies the signature, requires `createTimestamp` within 24 hours, persists to `XalianTable`, and appends the id to the caller's user record in one call. A client cannot keep stats it invented.
- **Registry** (the ratified record from `@xalians/rules`): `POST /xalians` generates server-side with a server-drawn seed, validates against `XalianRecordSchema`, persists to `XalianRegistry` (hash `xalianId`, GSI `byOwner` on `ownerId` + `generatedAt`) under the caller, returns 201. `GET /xalians` lists an owner's records newest first with a cursor; `GET /xalians/{xalianId}` reads one. No page renders these yet (#180).

Identity is the lowercased Cognito username from the JWT; a client-supplied `userId` is only ever "which profile to view" (`GET /db/user?userId=` returns the public profile: `userId` and `xalianIds`). The caller's own `GET /db/user` creates the record lazily if it is missing. `PATCH /db/user` accepts only `REMOVE_XALIAN_ID`; adding is a server-side effect of keeping, and token accounting is server-only (`ADD_TOKENS`, `REMOVE_TOKENS`, `ADD_XALIAN_ID` return 403).

Terraform wires one Lambda + API Gateway route per handler via the reusable `terraform/modules/lambda` module (payload format 2.0, Cognito JWT authorizer `aws_apigatewayv2_authorizer.cognito`):

| Route | Handler bundle | Auth |
|---|---|---|
| `GET /xalian` | `generateXalian/index.handler` | NONE (throttled: burst 10, rate 5) |
| `POST /db/xalian` | `createXalian/index.handler` | JWT |
| `GET /db/xalian`, `GET /db/xalians` | `retrieveXalian/index.handler` | JWT |
| `GET /db/user` | `retrieveUser/index.handler` | JWT |
| `POST /db/user` | `createUser/index.handler` | JWT |
| `PATCH /db/user` | `updateUser/index.handler` | JWT |
| `POST /xalians` | `generateRegistryXalian/index.handler` | JWT |
| `GET /xalians` | `listRegistryXalians/index.handler` | JWT |
| `GET /xalians/{xalianId}` | `retrieveRegistryXalian/index.handler` | JWT |
| (none -- Cognito post-confirmation trigger) | `postConfirmation/index.handler` (`XalianPostConfirmation`, `cognito.tf`) | Cognito invokes directly, no API Gateway route |

Adding an endpoint means: new `src/handlers/<name>.ts` exporting `handler`, a zod schema for its input, a test under `apps/api/test`, and a new `module "..._lambda_module"` block in `main.tf` pointing `lambda_handler_path` at `<name>/index.handler` (pass `has_environment = true` plus `environment_variables` only if it needs a secret). Merging applies it.

Every handler is bundled independently by esbuild (`apps/api/esbuild.config.mjs`, `npm run build -w apps/api`) to `apps/api/dist/<name>/index.mjs`: ESM, platform node, target node22, `@aws-sdk/*` external (the `nodejs22.x` runtime provides it), everything else (`zod`, `@xalians/content` JSON, `@xalians/rules` TypeScript, the legacy CommonJS engine) bundled in. `archive_file` zips `apps/api/dist` directly; the bundle has no runtime dependency on the workspace.

The three DynamoDB tables (`XalianTable`, `XalianUsersTable`, `XalianRegistry`) are Terraform-managed with point-in-time recovery and `prevent_destroy`; the Lambda role's inline policy names their ARNs exactly. Terraform state lives in the `xalians-terraform-state-*` S3 bucket with a lockfile; CI plans on every PR and applies on merge through the GitHub OIDC role in `github-oidc.tf`, which can manage its own policy, so permission additions apply from CI (the one-time bootstrap was done 2026-09-10).

Two API Gateway stages exist (`prod`, `test`) mapped to `api.xalians.com` and `testapi.xalians.com`, both with default throttling (burst 50, rate 20). The frontend hardcodes `https://api.xalians.com/prod/...` in `my-app/src/utils/dbApi.js`.

### Shared packages

- `packages/content` (`@xalians/content`): every game data and lore JSON (`json/`) plus zod schemas (`src/schema`, exported as `@xalians/content/schema`) for each file, the ratified creature record, and the user record. `z.infer` types from these schemas are the only shared TypeScript types across the API and the site. `npm test -w packages/content` validates every bundled file; `npm run check:bundle -w packages/content` fails when `docs/` and the committed bundle disagree (CI runs both).
- `packages/rules` (`@xalians/rules`): the ratified creature generator in strict TypeScript (`src/generator`), consumed by the site, the registry handler, and `scripts/checkCatalogCoverage.js`. Its integration test generates 200 records and validates each against `XalianRecordSchema`. Duel and expedition rules still live under `my-app/src/gameplay` (#184).
- Both ship TypeScript source with no build step; Vite, Vitest, esbuild, and Node 22.18+ read `.ts` directly.

### Frontend (`my-app/`)

Vite + React Router v5 (`App.js` is the full route table) + react-bootstrap. `vite.config.js` holds the JSX-in-`.js` loader, the CRA-style `ReactComponent` SVG import shim (vite-plugin-svgr), and the CommonJS shim for the legacy duel files under `src/gameplay` and `src/constants` that still use `module.exports` (they stopped being copies of `apps/api` when the copy scripts were deleted; #184 retires them). Auth is Amplify/Cognito, configured from `amplify/backend` (user pool `xalianSignUpSignInResource`, managed by Amplify for its clients and identity pool). The post-confirmation trigger itself is Terraform-managed (`cognito.tf`, `apps/api/src/handlers/postConfirmation.ts`, #182): it adds the user to the standard group and lazy-creates the `XalianUsersTable` record; the API also creates that record lazily on the first authenticated `GET /db/user` if the trigger somehow missed it. The `/db/*` routes are Cognito-JWT-authorized; `dbApi.js` sends `Authorization: Bearer <idToken>` from `Auth.currentSession()`.

Game data JSON is **a shared workspace package, not a build-time copy**: `packages/content/json/` is imported directly by both `apps/api` and `my-app` as `@xalians/content/<name>.json`. Edit the files there; there is nothing to re-sync. The encyclopedia, chronicle, registries, and species records are generated into `packages/content/json/` by `node scripts/bundleLore.js` from `docs/`, so edit those under `docs/` and bundle first.

`utils/valueTranslator.js` and `constants/constants.js` (element → theme color map) drive the element-themed styling used throughout charts and SVG rendering.

### Design system: one site, featured components, immersive experiences (version 4, ruled 2026-09-09)

**Before touching anything visual, read `docs/DESIGN_SYSTEM.md` and load the `build-ui` skill (`.claude/skills/build-ui/SKILL.md`).** No exceptions for "small" changes: a className, a chart color, a modal, a game screen.

**Stack (Nick, 2026-09-09: "strip all Bootstrap, replace it all"):** React 18, Vite, Tailwind 4, shadcn components restyled to the contract, Lucide icons, react-hook-form + zod, sonner. Contract and phase record in `docs/design/frontend-stack-migration.md`. There is no Bootstrap, no React-Bootstrap, no icon font, and no page CSS on the chrome tier.

- **Three tiers.** Site chrome (everything that reads, browses, configures or manages: one quiet system), featured components (rich pieces inside the chrome, built from the same tokens), immersive experiences (a game in progress; may replace the chrome, keeps the core, always a way out, needs a brief approved by Nick first). Lobbies, setup, results and reference are chrome; play itself is immersive. Generator and encyclopedia are chrome.
- **The accent is the viable signal**: the logo mint, meaning "alive" or "the one forward action", in three tiers. Danger is the Plague raspberry, never a highlight. Status colors only on interface state; the 14 element hues only on element-tagged content, through the `el-<element>` scope and `bg-el`/`text-el`.
- **Type**: Saira for legends and headings, Atkinson Hyperlegible for prose, Martian Mono for values, as the `type-*` role classes. **Corners square; the chamfer only on glass cards and the one primary key.** Loading is the helix spinner, never a skeleton. Plain copy on controls; the world speaks in the content.
- **Brand**: the DNA X mark stays; the wordmark is Iceland; the GSAP morph from the word's X into the helix stays.
- **Where things live.** Tokens: `my-app/src/styles/tokens.css` (the only file with a raw color, font name or size) mirrored by `src/constants/designTokens.js` and held equal by `src/__tests__/tokens.test.js`. Semantic layer, element scope, chamfer, type roles: `src/styles/globals.css`. Components: `src/components/ui` (shadcn) and `src/components/system` (house pieces); `/styleguide` (`src/pages/styleGuidePage.tsx`) renders every one of them. `designSystem.test.js` fails if a page is unclassified or the style guide stops importing the system. `scripts/design/snap.js` is the paint-check harness.
- **Legacy, do not extend.** The immersive pages (duel board and playground, Reclamation, training games, Long Return) still read `public/assets/css/legacy/*` (the v3 system, the old template, their page stylesheets) until each gets its immersive brief, which deletes those files. Never add a rule there and never load them on a chrome page.

## Conventions and gotchas

- Root-level `sandbox.js`, `jsonManipulator.js`, and the `my-app/src/pages/sandbox*.js` / `testPage.js` files are throwaway experiment scratchpads, not part of the app.
- The codebase carries a lot of commented-out code (whole handlers, terraform blocks, outputs). Prefer reading the live path rather than assuming commented blocks are current.
- Terraform state is remote (S3 backend with lockfile, see `main.tf`); `main.tf`, `variables.tf`, `outputs.tf`, `github-oidc.tf`, and `cognito.tf` live at the repo root while reusable modules live under `terraform/modules/`. Never `terraform apply` by hand unless CI cannot do it for itself (a permission the CI role does not yet have).
- Lambda runtime is pinned to `nodejs22.x` in `terraform/modules/lambda/lambda_instance.tf`; engine code must stay compatible with it.
- The root `package-lock.json` is generated on Windows. npm records only the current platform's native binaries (npm/cli#4828), so the root `package.json` pins the Linux variants of rollup, esbuild, Tailwind oxide, lightningcss, and TypeScript as `optionalDependencies`. Move those pins whenever one of those packages is upgraded, and add a `linux-x64-gnu` pin for any new package that ships platform binaries, or CI on ubuntu fails at startup.
- `.npmrc` sets `legacy-peer-deps=true`: strict peer resolution livelocks on a `maplibre-gl` conflict inside the Amplify UI package (documented in the file). Do not remove it without re-testing `npm install` from scratch.
- The post-confirmation trigger and the unused AdminQueries function moved out of Amplify into Terraform + `apps/api` in #182: `my-app/amplify/backend/function/xalianSignUpSignInResourcePostConfirmation` and `AdminQueriesc0a581bf` (plus `AdminQueries`'s API Gateway definition) no longer exist in the repo. The trigger is `apps/api/src/handlers/postConfirmation.ts`, deployed by `cognito.tf` alongside every other handler; the two live AWS resources those Amplify definitions used to describe are deleted by hand post-merge, not by Terraform (see the #182 PR description).
