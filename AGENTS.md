# Xalians agent entry point

Read this before making platform, creature-lifecycle, economy, generation-access, restoration, or game-integration decisions. A new session does not inherit the design conversation that produced these rules.

1. Read `docs/design/generation-economy-open-threads.md` first. It is the self-contained current handoff, including agreed direction, provisional choices, deferred work, and implementation gaps.
2. Read `docs/design/xalian-generation-system.md` second. It is the current design of record for platform lifecycle, generation targeting, credits, Scrambler Tokens, development, trading, restoration, and game integration.
3. For immutable creature genesis and lore, follow the ratified creature schema and lore sources identified in that design of record. Older platform/economy proposals are historical when they conflict with it. Current code is not proof that a future policy was ratified or implemented.
4. If building or changing a local game, do not extract its engine, impose deterministic replay, add platform receipts, or integrate permanent rewards until Nick explicitly requests that game's cutover. Preserve gameplay iteration and report concrete design friction rather than silently changing platform rules.
5. Distinguish agreed direction, provisional defaults, deferred possibilities, and implemented behavior. Do not invent exact reward thresholds, development catalogs, or restoration missions before the relevant game or content is ready. A changed ruling should update both the design of record and the handoff brief.
6. Nick approved clearing current prototype creature and economy records at a future explicit cutover, not deleting them now. Confirm exact environment and record scope before any reset. Do not touch unrelated data, source, or lore.
7. Use American English and no em dash in new prose, docs, code comments, commit messages, or pull request text. Ask one consequential design question at a time. Explicit agreement is required before calling a proposal settled.
8. Ground new platform mechanisms in the published Xalians lore rather than attaching arbitrary game systems to it. Keep design records under `docs/design/` in this repository and report concrete friction with a current ruling when encountered.

`CLAUDE.md` contains additional repository and lore guidance. Its older economy descriptions do not override the current platform design of record.
