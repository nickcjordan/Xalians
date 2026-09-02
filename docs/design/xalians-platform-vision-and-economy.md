# Xalians Platform Vision, Progression, and Economy

Status: consolidated output of the 2026-09-01 brainstorm session between Nick and Claude. Items are marked **[ratified]** (explicit sign-off from Nick in session) or **[recommended]** (Claude's recommendation, directionally accepted but not hard-ratified). This doc is downstream of the ratified creature data system; where they touch, that system wins. Companion docs: `xalian-creature-system-redesign.md` (master creature system), `xalian-creature-data-structure.md` (condensed record reference).

## Context

The session began as the "progression, power scaling, and tokenomics" brief (should Xalians have levels/XP, how do power gaps stay bounded, how do battle fees and Scrambler Tokens work, how should the Duel damage ceiling behave) and deliberately widened into a ground-zero rethink of the whole platform. The frame that emerged: Xalians is a universe being built hub-and-spoke, where the creature identity layer is the platform and games/content are lenses that read it. Mid-session, the ratified creature data system landed (immutable, seed-deterministic records with zero game mechanics; games derive their own rules), which strengthened most decisions and overrode a few. The word "mint" is banned platform-wide; the verb is "generate."

Verified code facts this session: the inert level hook at `my-app/src/gameplay/duel/duelCalculator.js:347-354` (`calculateLevelK` hardcodes a placeholder of 10); the 75% single-hit damage ceiling at `duelCalculator.js:300-309`; the battle fee canon at `my-app/src/pages/home.js:306`; live `ADD_TOKENS`/`REMOVE_TOKENS` actions at `lambda/src/database/userTableCRUDLambdas.js:175-183`; generated `totalStatPoints` spread of roughly 1.59x across 300 rolls (legacy stat system).

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | No levels/XP on creatures, ever; records are immutable | 100% — ratified twice: in session and by the creature system's core philosophy | `xalian-creature-data-structure.md` §1 |
| 2 | Power is not a creature property; each game derives its own stats and its own battle fee in its derivation layer; no cross-game power scalar exists | 95% — direct consequence of "creatures describe nature; games derive rules" | `xalian-creature-data-structure.md` §1, §5 |
| 3 | Veterancy is cosmetic/access-only (option a), forced by architecture: games may write history events but can never depend on reading them, so combat-relevant unlocks cannot exist reliably | 90% — the history-layer contract closes the fork; Nick accepted the resolution | `xalian-creature-data-structure.md` §5 item 4 |
| 4 | The battle fee limit (drafting budget) is the fairness mechanism, per canon; fee computed per-game from derived stats | 90% — canon text exists; per-game placement follows from #2 | `my-app/src/pages/home.js:306` |
| 5 | Gap-aware damage ceiling replaces the flat 75% cap, keyed on Duel's derived fee ratio, clamped to [0.75, 1.0] | 80% — direction accepted in session; exact constants are tuning values | `duelCalculator.js:300-309` (current flat cap) |
| 6 | Scrambler Token loop: earned in tournaments/play, spent on generation; premium pricing buys constraint over the roll (planet/species targeting), never power | 85% — accepted in session; lore-native (tokens hold random genomes; Kozrak sells control) | home page canon; `xalian-creature-data-structure.md` §1 lore framing |
| 7 | Free unauthenticated generation endpoint stays open and infinite but runs a constrained generator profile (common species weights, finish forced standard); claim re-validates server-side by re-expanding the seed under the preview profile | 95% — Nick explicitly wanted guardrails; determinism makes validation trivial | Nick's ruling in session; `GET /xalian` route in `main.tf`; seed determinism per data-structure doc §1 |
| 8 | Rate limiting/throttling on the unauthenticated endpoint | 95% — Nick agreed; operational guardrail regardless of design | session ruling |
| 9 | Starter grant: claim the preview roll plus choose 2 from a complementarily-curated spread (weighted away from the first creature's element and toward its capability gaps), for a squad of 3 | 85% — Nick ratified complementary curation; the number 3 and spread size ~6 are recommended defaults | session ruling; Duel supports 2-6 per side |
| 10 | Rarity finish ladder is the ratified one (standard/gleam ~1/40/prismatic ~1/400/eclipse ~1/4000); odds tuned for a healthy population, never inflated for the current small one ("design for the population you want") | 100% — ratified in creature system; Nick explicitly upheld odds at hobby scale | `xalian-creature-data-structure.md` §2 appearance; session ruling |
| 11 | Canon-event lore framing for finishes (what a gleam/prismatic/eclipse IS in-world, e.g. Luminax ION-9 mutation register, Endessa glitch register) is the surviving form of the "anomaly families" idea; new finishes can arrive via new generatorVersions, optionally timed with fiction drops | 70% — reconciliation accepted directionally; specific lore assignments not yet written (lore-voice work) | `xalian-creature-data-structure.md` §2; planets canon (Luminax ION-9, Endessa glitching Generator) |
| 12 | Finish reveals are loud (ceremonial generation moment), with eclipse allowed maximal restraint/gravity | 85% — recommended and accepted with "sounds good" | session ruling |
| 13 | Trading is direct social swaps only: no marketplace, no auction house, no currency-denominated sales; NPC traders (the Poseidas exchange, lore-native neutral territory) solve cold start; shareable trade/squad URLs are the entire v1 social layer | 90% — Nick ratified each piece; in-site social presence deferred until traction | session rulings; Poseidas neutral-territory canon |
| 14 | History: record events now, assign meaning later; append-only event log from day one; whether history displays to a new owner after trade is a deferrable UI decision | 90% — Nick's "store early and often" plus the ratified deferred history layer | session ruling; `xalian-creature-data-structure.md` §5 item 4 |
| 15 | Player-account progression (tokens, tournament tiers with rising fee limits, collection completion) replaces creature progression entirely | 85% — accepted as part of the hub model | session |
| 16 | Emergent rarity lives inside ratified rails: extra trait rolls, high secondary affinities, extreme in-band capability rolls, special senses, low serials; off-graph affinities do not exist | 95% — constrained by ratified adjacency-graph rule; serials exist in provenance | `xalian-creature-data-structure.md` §2 |
| 17 | Bloodstorm entangled-pair generation: considered and declined for now | 100% — Nick declined explicitly | session ruling |
| 18 | LLM-generated origin stories at generation time: deferred (not rejected); avoid AI-generated-content optics for now | 100% — Nick's explicit hold | session ruling |
| 19 | The universe grows hub-first, not broadcast-first: the flagship (Duel) must be genuinely fun before satellites multiply; satellites exist to deepen creature attachment | 80% — Nick endorsed hub-and-spoke as matching his mental model | session |

## 1. Core rulings: progression and power

**No levels, no XP, anywhere on the creature. [ratified]** The creature record is immutable and games derive rules from it; this is now architecture, not preference. The generator's natural spread (only ~1.59x on the legacy stat system, and banded rolls on the new one) is a feature: creatures differ by shape (element, capabilities, traits, abilities), not magnitude.

**Progression lives in two places, never on the creature sheet. [ratified]** The player account progresses: Scrambler Token balance, tournament tier (bot ladders now, PvP later) with rising battle fee limits and better payouts, and collection growth. The creature accrues history: an append-only event log (generated, dueled, won, traded, titled) that is captured from day one and interpreted later.

**Veterancy is cosmetic, provenance, and access only (option a). [ratified by architecture]** The history-layer contract (games may write events but can never depend on reading them) makes combat-relevant veterancy unlocks impossible to build reliably. Veterancy is therefore titles, records, serials, and tournament-tier eligibility: things the binder, Codex, and trade screens make desirable, never things a derivation layer converts into power. This keeps the desire economy and the competitive economy fully orthogonal, which is a deliberate through-line of the whole design.

**Battle fee is a per-game derived number. [recommended, follows from ratified philosophy]** Each game's derivation layer computes its own fee from its own derived stats (Duel from Duel-stats, a card game from deck values). There is deliberately no cross-game canonical power rating, because power is not a property of the creature. In-fiction: Kozrak's assessors rate creatures per arena. The fee should account for everything competitively relevant in that game (in Duel: movement, range, flight, ability quality, not just raw stat totals), or drafting degenerates into fee-formula exploitation. Keep the formula legible enough for players to reason about.

**Gap-aware damage ceiling. [recommended, direction accepted]** Replace Duel's flat 75% single-hit cap with: `ceilingFraction = clamp(0.75 * (attackerFee / defenderFee), 0.75, 1.0)`. Between equals the 75% floor holds (type advantage wins the trade, never deletes the piece); at roughly a 1.33x fee advantage a one-shot becomes possible. This is what makes tall-vs-wide drafting real under a fee limit: one expensive monster plus cheap chaff must actually be able to delete chaff. Kill the level fiction in `calculateLevelK` by collapsing it into a plain constant when the Duel derivation layer is built.

## 2. The platform: hub and spoke

The platform is the creature identity layer. The hub has three first-class verbs; the spokes are games and content that read the same record through their own derivation layers, which proves the cross-app portability thesis internally before any third party is asked to believe it.

**Generate.** The procedural generator, behind the token economy (see §4), with the free preview lever as its perpetual advertisement (see §3).

**Own.** The binder/Codex: a collection view designed like a binder you flip through and show people, not a database table. First-class display of provenance (seed, serial, generation date), history, finishes, titles. Discovery callouts ("first Endessa secondary-affinity roll this month," "top 2% capability roll") surface emergent rarity. Collection completion goals (a creature from all 14 planets, all species) are a primary retention chase. Shareable creature and binder pages are the compare-with-friends half of the collecting loop.

**Trade.** The Poseidas exchange (lore-native: Poseidas is the galaxy's neutral commerce territory). Direct swaps only: my creature(s) for your creature(s), take it or leave it. **No marketplace, no auction house, no currency-denominated sales [ratified]**; visible market prices kill vibes-based trading, which is the actual recess-binder magic being replicated. NPC traders (Kozrak's black market, Drainov syndicates, Veridium smugglers) offer rotating swap deals from day one, solving cold start, teaching valuation, and creating demand for specific planets/species. Player-to-player trading works via shareable trade links (send a URL, recipient accepts or counters); trade links double as acquisition since they land non-players at the free lever. In-site social presence (friends, chat) is deferred until the platform has traction. Traded creatures carry their full history in the log; what the new owner's UI displays is a deferrable decision.

**Spokes (current and planned).** The Duel game (flagship; must be genuinely fun before satellites multiply). Duel puzzles (daily chess-puzzle equivalents reusing the engine; doubles as tutorial content). Ghost duels (fight another player's published squad driven by the existing bot; async PvP with zero server infrastructure). Weekly rotating formats (edit fee limits and squad constraints weekly; cheapest retention lever available). Serialized fiction (the deliberately unresolved cosmic-horror arc: Phantiri moon-weapon, Deepwater Black, Veridium worldship; co-writer availability uncertain). A Gwent-inspired card game spoke (separate brainstorm session underway). Eventually a second stat lens (racing/gauntlet reading capabilities the Duel game underuses). Origin stories at generation are deferred (see Declined/Deferred).

**Return-visit clocks.** Daily: puzzle plus small token trickle. Weekly: rotating ladder format, fiction chapters. Chase: collection completion via controlled generation, finish hunting. Social: ghost duels, leaderboards, trade links. Narrative: the mystery arc. The flagship only has to carry one clock; satellites carry the rest.

## 3. The funnel

1. **Land**: pull the free lever, watch the Generator produce a creature that has never existed before. Anonymous, infinite pulls **[ratified]**, but running a constrained generator profile: common-tier species weights only, finish forced to standard, no rare trait/affinity outcomes **[ratified]**. The ceiling of the free machine is openly documented (the showroom prints commoners; real genomes cost Scrambler Tokens), which removes any incentive to script the lever. Endpoint gets API Gateway throttling regardless **[ratified]**.
2. **Claim**: an unclaimed roll is ephemeral and unowned. "This Xalian exists once and belongs to no one. Claim it?" is the signup hook; claiming requires an account. Claim validation is server-side: re-expand the seed under the preview profile and verify **[ratified mechanism]**.
3. **Starter**: on signup, claim the preview roll plus pick 2 more from a curated spread (~6 candidates) **[ratified curation approach]**. The spread is complementary to the first creature: weighted (not hard-filtered, so the curtain doesn't show) away from its element and adjacency overlaps, and toward its capability gaps (a slow long-range first pick pulls faster short-range candidates; a flyer pulls grounded bruisers). Guarantees a playable, balanced squad of 3 while keeping the picks real choices; the rejected candidates are the first taste of scarcity.
4. **First duel**: easy bot tier, doubles as tutorial.
5. **Earn**: tokens from wins and the daily trickle.
6. **Spend**: generation with increasing control (see §4); collection gaps drive targeted spending.
7. **Trade**: NPC offers create demand for duplicates; trade links pull friends into step 1. Growth lives inside the loop.
8. **Stay**: the clocks (§2).

## 4. Scrambler Token economy

**Faucets:** tournament/duel wins scaled by tier; small participation and daily-puzzle trickle. **Sinks:** generation, priced by control **[ratified direction]**: cheap = fully random genome; more = choose the home planet (element); premium = target a species. Paying more buys constraint over the roll, never power, which keeps the generator the star and creates zero inflation. In-fiction this is exactly Kozrak's grift: Scrambler Tokens contain randomly encrypted genomes, and targeted genomes cost extra. The existing `ADD_TOKENS`/`REMOVE_TOKENS` endpoints are the persistence hooks. Exact prices/payouts are tuning values to be set when the loop is implemented, tuned for a healthy population, not the current one.

## 5. Rarity

**The finish ladder is the rarity spine [ratified]:** standard / gleam ~1/40 / prismatic ~1/400 / eclipse ~1/4000, cosmetic by default. Odds stand as ratified even at hobby scale: **design for the population you want, not the population you have [ratified principle]**. A small community simply lives through the sparse early era of the same world; the first eclipse ever generated should be an event whenever it happens.

**Lore framing [recommended, lore-voice work pending]:** each finish tier gets a canonical in-world cause (candidate registers: Luminax's misfiring ION-9 mutations, Endessa's glitching stolen Generator; eclipse's nature deliberately open). Finishes become collectible plot points rather than paint jobs, and future generatorVersions can introduce new finishes timed with fiction drops (story clock and collection clock winding each other).

**Reveals are loud [ratified]:** gleam-or-better generations get a ceremonial moment (the Generator stutters, the readout flickers, the reveal lands). Eclipse may trade confetti for gravity; the event itself is the ceremony.

**Emergent rarity [constrained by ratified rails]:** extra trait rolls (rares roll more, never better), unusually high secondary affinities (on-graph only; off-graph does not exist), extreme in-band capability rolls, special senses, and low serials. Surfaced via Codex discovery callouts and a prestige percentile on the creature page, never as a named power tier. Rarity must never be power; the fee prices whatever power exists, and the cards people covet being competitively ordinary is healthy (the Pokemon-card property).

## 6. Considered and declined / deferred

- **Levels/XP on creatures**: declined permanently (architecture).
- **Veterancy option b (combat unlocks priced into fee)**: killed by the ratified history-layer contract; do not relitigate unless that contract changes.
- **Bloodstorm entangled-pair generation** (linked twin records split by trade): declined for now by Nick, 2026-09-01. Recorded so future sessions don't re-pitch it unprompted.
- **LLM-generated origin stories at generation time**: deferred by Nick (AI-content optics); template-based or hand-written origins remain open for later.
- **Marketplace/auction house/currency sales of creatures**: declined; social swaps only.
- **Predefined static preview-creature set**: declined in favor of a constrained generator profile (previews must still be genuinely unique or the front-door magic dies).
- **Cross-game canonical power scalar**: declined; power is per-game by architecture.
- **In-site social presence (friends/chat)**: deferred until traction; URLs are the v1 social layer.

## 7. Open items (not yet decided)

- Duel derivation layer design (how Duel-stats and the Duel fee derive from the new record): separate work, phase 2 of the creature system.
- Exact token prices, payouts, fee-limit tiers, NPC trade-offer cadence: tuning values, set at implementation.
- Lore assignments for finish tiers (lore-voice session).
- Whether/how traded creatures' history displays to new owners (UI decision, deferrable indefinitely because the log captures everything).
- Fiction arc logistics (co-writer availability).
- Gwent-spoke design (separate session in progress).
