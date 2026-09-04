# Encyclopedia Xalia: Internal Companion

This file is the private half of the Encyclopedia. It never ships in the public bundle. It holds the working canon that constrains what the public entries may say, the editorial rules for writing new entries, and the source precedence for resolving conflicts. The public half is `encyclopedia.json` in this folder.

## What the Encyclopedia is

The Encyclopedia (masthead: **Encyclopedia Xalia**) is the single public canon reference for the world of Xalia, ratified 2026-09-01. The legacy glossary (`lambda/src/json/glossary.json`) merges into it; its definitions are carried verbatim as the canonical prose. The Encyclopedia adds structure the glossary never had: categories, cross-references, and element tags on planet entries. Species entries (category `xalians`) were written during species migration (the `migrate-species` skill), one per ratified record, and merged into this file with the Stage 3 merge (PR #73); the bundler still carries each record's copy, and the loader keeps this file's copy when both exist.

## Source precedence

1. `lambda/src/json/planets.json` histories and `docs/encyclopedia/encyclopedia.json` definitions are the source of truth for published lore (since 2026-09-02; `glossary.json` is a legacy mirror that nothing reads any more, kept only until the lambda side stops shipping it, and loses on conflict). If an entry contradicts a history, the history wins. `docs/encyclopedia/chronicle.json` and `docs/design/xalian-chronicle.md` govern where anything sits in time; the timeline is undated by ruling.
2. `.claude/skills/lore-voice/references/canon.md` is the fast-scan continuity sheet and carries the ratified internal constraints listed below.
3. The pre-repo Evernote material in `notes/` is reference only; nothing in it is canon unless it also appears in the histories or the entries.
4. The creature-system design doc (`docs/design/xalian-creature-system-redesign.md`) governs everything mechanical (records, registries, generation). Mechanics never leak into Encyclopedia prose.

## Working canon that constrains public entries

These are ratified constraints. Public entries must be consistent with them but must never announce them.

- **Xalians are sexless.** No mates, offspring, parents, breeding, or gendered pronouns. Every Xalian is printed by a Generator; that scarcity is the premise of the setting. Kinship-flavored bonds (packs, guardianship, twin mints from one Scrambler Token) are fine; biological lineage is not.
- **No Xalian speaks a language.** Comprehension without speech was an engineering requirement of a labor force. Depict communication as calls, signals, light patterns, or telepathic feeling. Never dialogue. Do not state the rule publicly; let it show in how creatures are written.
- **Lifespan is wear-out, not aging.** An engineered chassis has a service life. Mineral and metal bodies outlast flesh; non-corporeal Xalians do not wear out. Internal working canon only; not yet surfaced publicly.
- **The Nightcap telomere passage is about Vallerii citizens,** not Xalians. Who the players canonically are is an open question with no ratified answer; commit public lore to neither reading.
- **Reality-breaking powers do not exist.** No teleportation, no true invisibility, no puppeting of another's body, no time reversal, no creating life (only Generators create life), no permanent transformation. Bounded look-alikes are allowed; one-off exceptions exist only as hand-authored signature abilities.
- **No spellcasting.** What reads as magic decomposes into channels and emitters (mind, gaze, voice, breath, secretion, swarm, aura, light-organs, vents).
- **Scrambler Tokens are physical chips.** Never digital assets. No NFT, crypto, blockchain, minting, or wallet framing anywhere in public prose; the generation vocabulary is generate*, never mint*.
- **The genome chirality marker** (`levo | dextro | achiral`) is registry data, not lore. If an entry ever needs to gesture at it, the implementation docs explain the word; the Encyclopedia does not map it to gender or anything else.

## The unresolved thread: never resolve

Phantiri's moon-weapon, Deepwater Black on Endessa, and Veridium's worldship origin all point at one ancient cosmic-horror presence predating the Phantiri. APEX itself avoided Phantiri. New entries may add hints, pressure, and fresh unexplained artifacts to this thread. No entry may ever explain it, name it, or confirm that the three hints share one source.

## Open threads safe to develop in new entries

The Luminax dark-side rebellion; the Zolto network-building underground; Kozrak's agents fomenting a pretext to invade Poseidas; the Magmuth blood feuds; Veridium's black-market arms trade and the consciousness-upload rumors; possible APEX code fragments in Veridium's robots; the Krystian prisoners who served APEX; Floria's pre-End-Wars ancients; Stonera's captive labor; Endessa's leviathan glitches and uncovered ruins; Telypso's psychic sorrow; the Grimedite watch on the rim.

## Editorial rules for new entries

- Invoke the `lore-voice` skill before writing any entry prose. The glossary-entry register applies: one or two sentences, encyclopedic and definitional, leading with the category noun, no flourish, no ellipsis, cross-referencing other canon terms by name.
- The horror of this universe is economic. An entry about an atrocity names the incentive behind it.
- Hedge the deep past (rumor has it, records were sealed, it is believed). Mysteries stay open.
- No modern idiom, no game mechanics in prose, no hopeful resolution.
- Nuclear-age military register is out of voice (Nick's ruling, 2026-09-01, via the ability catalog: Nuclear Winter and Fallout were cut on these grounds). The Vallerii idiom is industrial and corporate, not Cold War.
- American English. No em-dashes.
- New entries append to `encyclopedia.json` with the same schema; definitions written for the Encyclopedia are canonical from the moment Nick ratifies them. After any change run `node scripts/bundleLore.js` and `yarn copy-json`. `glossary.json` no longer has a reader; it is kept only until the lambda side stops shipping it, so there is no need to back-port fixes to it.

## Relationship to the shipped bundle

`encyclopedia.json` is the public structured file. The flip happened on 2026-09-02: `scripts/bundleLore.js` copies it, `chronicle.json`, `docs/species-templates/registries.json`, and the species records listed in `docs/species-templates/RATIFIED.json` (as `speciesRecords.json`, mechanical template fields only) into `lambda/src/json/`, and `copy-json` mirrors them into the frontend, where `my-app/src/lore/` is the only reader and the `/encyclopedia` page renders them (contract: `docs/design/xalian-encyclopedia-page.md`). Per Nick's ruling on 2026-09-03 (one source location per kind of data), species encyclopedia entries live only in `encyclopedia.json` under category `xalians`, written straight into `entries` during migration; `speciesRecords.json` carries no entries at all, and there is no per-species side file. `tour.json` (the First Survey) is bundled the same way; it is derived prose, outranked by the histories and by this file's entries, and is edited only with Nick's sign-off. The demonym entries (`magmuthites`, `grimedites`, `luminarii`, `the-zolto`, `krystians`, `veridians`, `phantiri-xalians`) stay in category `factions` (append-only) and the Powers page regroups them under Xalian Peoples. The old `/glossary`, `/planets`, and `/species` pages were retired (2026-09-03); their routes now redirect into the Encyclopedia. This companion file stays out of the bundle permanently.

## Maintenance

- One entry per concept, keyed by kebab-case title. Keys are append-only once shipped; corrections edit the definition, never the key.
- `related` links are mechanical: a key appears in `related` only if that entry's title appears in the definition text. No thematic linking.
- An entry may carry an optional `aliases: string[]` -- alternate proper names that unambiguously name it and nothing else (e.g. `"Kozrak"` on `king-kozrak`, `"Vallerii Empire"` on `vallerii`). Aliases link and index like the title (`my-app/src/lore/linkify.js`, `search.js`), count as a "present" mention for connections (`connections.js`), and are excluded from the coverage sweep (`scripts/loreCoverage.js`) same as the title. `my-app/src/lore/loaders.js` asserts at load time that no alias collides with any entry title, any other alias, or any world/species/era name -- never add an alias that could plausibly mean two things.
- Species entries are added at species migration with category `xalians`, one per species, definition written fresh in the modern species register (appositive body description, engineered purpose, present-day curdling).
- The Codex generator (`scripts/buildCodex.js`, writing `my-app/public/lore/xalia.md`) remains the tool for the long-form aggregate document; the Encyclopedia is the structured reference, not a replacement for the planet histories.
