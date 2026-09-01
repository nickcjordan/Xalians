# Xalians Canonical Lore Source Map

**Reading the lore? Start with `docs/CANON_COMPENDIUM.md`** — the complete canon assembled into one document, with each planet's chapter gathering its physical data, Generator report, full history, native species descriptions, and related glossary terms (lore often lives only in a creature's entry, so per-planet aggregation is the point). It is generated from the JSON; regenerate after any lore change with `node scripts/buildCanonCompendium.js` and never edit it directly.

This file is the companion *index*: one clean map of where canon lives, what each source contributes, and what is explicitly NOT canon. Compiled 2026-08-30 from the repo's data files, the lore-voice skill references, and the full Evernote export (`notes/Cosmo Labs.html` plus its two attachments). When sources disagree, this document says which one wins.

## Tier 1: Authoritative canon (the source of truth)

These files ARE the canon. Everything else is commentary, summary, or history.

| Source | Contains | Notes |
|---|---|---|
| `lambda/src/json/planets.json` | Full long-form histories of all 14 planets | The core lore corpus, co-written with Nick's brother-in-law. Galaxy is **Xalia**; Kozrak's planet is **Valleron**. |
| `lambda/src/json/species.json` | 29 canon species: name, id, element, home planet, size, description, statRatings, traits | Ten modern entries are the voice model; seventeen are legacy two-sentence stubs slated for upgrade. `statRatings`/`traits` fields are being replaced by the creature-system redesign. |
| `lambda/src/json/glossary.json` | 63 encyclopedic term definitions | |
| `lambda/src/json/elements.json` | 14 elements, per-element move vocabularies, effectiveness rows | Element list is final: Electric, Air, Light, Plant, Rock, Chemical, Dark, Psychic, Ghost, Fire, Water, Ice, Metal, Sand. **Explosive was removed; do not reintroduce.** |
| `lambda/src/json/typeEffectivenessMatrix.json` | The 14x14 effectiveness matrix | Verified identical to the original design table in the Evernote notes (each row and column sums to 14 by design). |
| `lambda/src/json/planetRecords.json` | Clean-slate planet schema (2026-08-30): typed physical data + the canonical **Generator Environmental Reports** (semi-structured: terrain, mobility ratings, fauna, hazards, output priorities) + history | Successor to `planets.json`; the old file remains only until the UI flips, then retires. The reports are canon (in-world: filed by each Generator per APEX Accords protocol, still transmitting since Source Code 606). |

## Tier 2: Canon summaries and style guides (derived, kept in sync by hand)

| Source | Role |
|---|---|
| `.claude/skills/lore-voice/references/canon.md` | Fast-scan fact sheet: timeline, factions, terminology, per-planet identities, the unresolved cosmic-horror thread. If it contradicts Tier 1, Tier 1 wins. |
| `.claude/skills/lore-voice/references/voice.md` | Style analysis with verbatim exemplars. Writing rules (including Nick's standing rules: no em-dashes, American English). |
| `CLAUDE.md` lore summary | Orientation summary for agents; same subordination to Tier 1. |

## Tier 3: Ratified design canon (new-world decisions, 2026-08-30, not yet in JSON)

From the creature-system redesign session; these are decisions, pending implementation into data files.

| Source | Contains |
|---|---|
| `~/.claude/plans/xalian-creature-system-redesign.md` | The full ratified creature schema: 10 attributes, affinity system with per-planet adjacency graph and 75/24/1 odds, per-element mechanical fantasies (Dark = gravity/void/time), trait vocabulary draft, seed/snapshot generation, hybrid rarity, mintablePlanets/mintOrigin. |
| `~/.claude/plans/xalian-ability-grammar-draft.md` | RATIFIED ability grammar: 16 archetypes, 25 instruments, element word pools, name templates. |
| `~/.claude/plans/xalian-biomes-fauna-draft.md` | Planetary surveys (surveyor field-note format) + biomeProfile data. In review; three canon rulings still open (bodily Algael, creature entanglement, who employs the Surveyor). |

## Tier 4: The Evernote notebook (`notes/Cosmo Labs.html`) - what it contains and what counts

The pre-repo design notebook from the NFT-era origins of the project ("Cosmo Labs" was a working studio name). Full inventory, sorted by verdict.

### Canon or canon-feeding material (keep, small and specific)

- **Species name etymologies** (note "Species Name origin"): Foromeer = "foro" (Latin, bore) + "meer" (meerkat); Kosanos = Polish "kosa" (scythe) + "nos" (nose); Scalatto = Italian "scala" (scale) + "ratto" (rat). Genuine naming-convention canon; worth folding into the lore-voice naming rules or a future species appendix.
- **Element Effect Matrix** (note + `character_element_matrix.xlsx`): the origin document of `typeEffectivenessMatrix.json`. Verified identical to the repo matrix (spot-checked Fire, Ghost, Sand rows). The design intent it reveals IS worth recording: every attack row and defense column sums to 14, i.e. the matrix is deliberately balanced. Uses obsolete display names Electrical/Metallic for Electric/Metal.
- **Battle Fee** (note "The Story", SPECIFICS section): each Xalian is assigned a battle fee based on its stats; teams must fit under Kozrak's imposed battle fee limit; factions field teams of 6. This survived into current canon (see canon.md, present-day tournament rules) and is the lore-native seed of any future squad-budget mechanic. Canon.
- **Status vocabulary** (notes "Status Types" / "Element Status Matrix"): named status effects with element pairings: burn, poison, haunt, radiate, concuss, shock, enchant, infect, haze, dazzle (plus unfinished: disoriented, exhausted, trapped/buried). Not canon as written (uses dead element names: Spectral, Geological, Botanical, Explosive), but this is the best available source vocabulary when the redesign's archetype-x-medium status derivation gets built. Design-feeding, pre-canon.
- **"Xalian Purpose by Planet"** (fragment; only Light and part of geological written): Light Xalians engineered to provide light (cave/underwater/flying illumination, photography flashes) and for radiation treatment of the Vallerii. Consistent with the engineered-purpose doctrine and usable when writing Luminax species. Canon-compatible seed.
- **Early glossary** (note "Glossary"): platform-level definitions. "Xalian = an instance of a creature species; Species = a category with predetermined stat range possibilities." Still exactly the platform's instance/template distinction. Compatible.

### Proto-canon, superseded by Tier 1 (historical interest only; do not cite as canon)

- **"The Story"**: the earliest backstory draft. CONFLICTS with current canon and loses on every conflict: it calls the galaxy "Valleron" with capital planet "Xalia" (now reversed: galaxy Xalia, Kozrak's planet Valleron); attributes the ruined galaxy to interplanetary wars concentrating life onto one planet (now: End Wars + Nemesis Plague, populations on their homeworlds); has no Vallerii, Generators, APEX, or plague. What survived from it: King Kozrak (mad tyrant king), the tournament, tokens, factions, teams of 6, battle fees. Treat as the fossil record of the premise.
- **Early Duel design** (note "Duel"): alternating single-piece turns, retaliation duels, evasion-based miss chance, speed-based movement. Superseded by the implemented duel rules (shared movement pool, no retaliation/miss). Historical.
- **Battle Mechanics / Character Battle Stats / Support Moves / Move Properties / Species Stat Distribution / Character Properties / Species JSON Properties**: the original 6v6-team battle design and the first stat/species/move schemas (standard/special split, statRatings ranges, canFly, med bay, 1000 HP idea). All superseded twice over (first by the implemented engine, now by the 2026 redesign). Historical.
- **Attacking Moves word lists**: the origin corpora of `moves.json`/`qualifiers.json` (base moves, magical moves, qualifiers, detect/help/hide/trap/fix verb pools). Superseded by the repo JSON and now by the ability grammar, but a legitimate quarry for additional grammar pool words.
- **Attack Calculations** (+ `battle_equation.svg`): a copied Bulbapedia damage-formula reference, not original design. External reference only.
- **Character Abilities**: a pasted Pokemon ability-category taxonomy. External reference only.

### Explicitly non-canon (abandoned NFT/web3 framing; never cite)

- **Website copy, web3 Notes, Marketing Launch, Playbook, Big Picture Plan, Ideas, Building interest, User Mechanics**: Ethereum/NFT/XAL-token platform design, community species blueprints with designer royalties, wallet flows, Discord token-gating. The crypto layer is abandoned per project direction; Scrambler Tokens are physical in-world chips, not digital assets. The community-designed-species idea and the 10,000-cap mint idea are business-model history, not lore.
- **Lab Name Ideas / "Big Things Before Anything"**: studio branding brainstorm ("Cosmo Labs", "chronic labs", Novichron etc.). Meta, out-of-world.
- **Meeting Topics / Questions from Nick / Dev Plan**: process notes. Out-of-world.

## Precedence rules

1. Tier 1 JSON beats everything.
2. Tier 3 ratified design decisions beat Tier 1 for *system* questions (stats, traits, generation) but never for *story* facts; where a Tier 3 decision requires new story canon (bodily Algael, creature entanglement, the Surveyor), it is flagged open until Nick rules.
3. Tier 4 notes never override anything; they feed vocabulary and record history.
4. Anything using the dead element names (Electrical, Metallic, Spectral, Geological, Botanical, Explosive) or the old galaxy/capital naming is automatically pre-canon.
