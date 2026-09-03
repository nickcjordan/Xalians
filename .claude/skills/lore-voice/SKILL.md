---
name: lore-voice
description: Write new Xalians lore — species descriptions, planet histories, glossary entries, faction/item/event canon — in the established voice of the original material. Use whenever adding or redesigning creatures, worlds, terms, or any in-universe prose for the Xalians project, including flavor text, item descriptions, and UI copy that speaks from inside the world.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Xalians Lore Voice

The Xalians canon was written by one human hand with an unusually consistent voice. New lore must be indistinguishable from it. This skill encodes that voice as rules, and points at the corpus so you can check yourself against real sentences rather than a memory of them.

**The single most important rule: the horror of this universe is economic.** Every atrocity in the canon has a P&L behind it. Planets die because of cost-cutting, deregulated industry, monopoly capture, or an executive decision that penciled out. Xalians exist because sterile capitalists needed a workforce and built one. If a new piece of lore has no economic or institutional motive underneath its spectacle, it is not in voice yet.

## Before you write

1. **Read the reference files.** `references/canon.md` is the fact sheet — timeline, factions, planets, terminology, and the hard continuity constraints. `references/voice.md` is the style analysis with annotated exemplars pulled verbatim from the source. Read both. They are short.
2. **Read the actual source for whatever you're extending.** Do not write a Magmuth creature without reading Magmuth's history. The fastest complete read is `docs/CANON_COMPENDIUM.md` — the whole canon in one generated document, where each planet's chapter already gathers its history, its species' descriptions, its Generator environmental report, and related glossary terms (species entries often carry planet lore found nowhere else). Regenerate it after lore edits: `node scripts/buildCanonCompendium.js`. The raw JSON remains the source of truth:
   - Planet histories: `lambda/src/json/planets.json` — each planet is `{name, image, planetImage, data, history}` where `history` is an array of paragraph strings.
   - Species: `lambda/src/json/species.json`
   - Encyclopedia entries: `docs/encyclopedia/encyclopedia.json` — `{key, title, category, definition, related, element?}`; the editorial rules are in `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md`. (`lambda/src/json/glossary.json` is a legacy mirror; do not add to it.)
   - The Chronicle: `docs/encyclopedia/chronicle.json` and `docs/design/xalian-chronicle.md` — the undated era timeline; place any new event or paragraph in an era and never invent a date.
   - The First Survey: `docs/encyclopedia/tour.json` — eight beats of derived prose (historian register, 120 to 200 words) that restate the histories; every claim must trace to a `sources` paragraph. It is not a canon source; when the histories change, the beats follow.
   - Elements and their move vocabularies: `lambda/src/json/elements.json`
   - Public-facing summary voice: `my-app/src/pages/home.js` (~lines 250–310)
   Read them with `node -e` rather than dumping raw JSON, e.g.
   `node -e "const p=require('./lambda/src/json/planets.json'); const m=p.find(x=>x.name==='Magmuth'); m.history.forEach(h=>console.log(h+'\n'))"`
3. **Never edit `my-app/src/json/`** — it is a build-time copy. Edit the sources (`lambda/src/json/` for histories and species, `docs/encyclopedia/` for entries and the chronicle), then run `node scripts/bundleLore.js` from the repo root and `npm run copy-json` from `my-app/`.

## The voice in one paragraph

A galactic historian writing a declassified encyclopedia entry, centuries after the apocalypse, from records that are incomplete and sources that are compromised. Third person, past tense for history, present tense for the current state of things. Formal and composed, never jokey, but with a cold sardonic edge that surfaces when describing the greed of the Vallerii. It explains hard science patiently and then lets the human consequence land without comment. It ends looking forward into an unresolved future.

## The nine rules

1. **Structure the arc.** Long-form lore (planet histories, and any major faction/event entry) follows a fixed spine: *physical description of the place → why the Vallerii wanted it → what went catastrophically wrong → the Xalian Generator's arrival as the answer → the End Wars → the present day under King Kozrak → an ellipsis of hope or dread.* Species descriptions run the same arc in miniature: *what it looks like → what it was originally engineered to do → what that ability has become now that the galaxy is dying.*
2. **Science first, then the body count.** Explain the mechanism plausibly and specifically — orbital resonance, telomere shortening, sulfated polysaccharides, quantum entanglement, tidal locking — before you tell the reader who it killed. The rigor is what makes the horror land.
3. **Follow the money.** Name the corporate actor, the incentive, and the decision. Costs were cut. Permits were denied. Investors were ruined. A merger was signed. The canon uses real financial register — *capital discipline, master limited partnership, liquidate, restructuring plan, mineral leases, monopoly, feedstock, troughed* — deliberately and without irony.
4. **Cruelty is stated flatly.** The worst lines in the canon are delivered deadpan, and the flatness is the point. *"The Xalians would be the ones getting their hands dirty anyway."* *"It was merely a fitting economic decision to establish a Xalian Generator on the planet."* Never editorialize about how terrible something is; report it in the register of a business decision and let the reader supply the outrage.
5. **Sardonic transitions, then a turn.** Sections pivot on wry, slightly aphoristic connectives: *"But all that glitters is not gold." "All good things must come to an end, however." "It could not have come at a worse time." "That is, until the invention of the Xalian Generators." "All it took was a little push." "They would of course, be wrong."* Use these sparingly — roughly one per major turn — and never more than one in a paragraph.
6. **The Generator is a character.** Xalian Generators are described with agency and something close to intent: they *sense*, *seem content*, *kick into gear*, *overclock*, *see fit*, *treat prisoners as patients*, *rewrite their own code*. The prose always stops just short of confirming they are conscious, and often names that ambiguity out loud — *"as if its sensors could detect the stability it had created."* Preserve that hedge. Never state a Generator is sentient.
7. **Hedge the deep past.** Ancient and classified material is delivered through explicit unreliability: *rumor has it, some say, it is believed, conspiracies abound, all known records were sealed, dossiers circulated on the black market, no one knows.* Mysteries stay open. Never resolve the Phantiri moon-weapon, Deepwater Black, or Veridium's worldship origin — new lore may add hints and pressure to them, never answers.
8. **Land on the token, then the ellipsis.** Every planet history and most major entries close by tying the present-day struggle to Scrambler Tokens and King Kozrak's tournament, and then trails into an unresolved future with a literal `…`. This is the canon's signature cadence and it is used almost without exception. Match it: *"…only the accumulation of Scrambler Tokens will keep the denizens of Poseidas secure in their newfound ways of peace and autonomy…"*
9. **Names sound like their function.** Creatures are portmanteaus and mashups that are readable on sight — *Graviclaw, Yetimoth, Hypnopet, Thirstaserp, Drilltail, Chromocat, Ectoghoul, Terragoyle, Newtapede*. Planets are Latinate or mythic and end in a vowel or a hard consonant — *Magmuth, Poseidas, Luminax, Telypso, Veridium, Krystos, Endessa*. Institutions are corporate-ominous in caps — *ECHELON, APEX, ION-9, QED, Source Code 606, Carbide-1*. Substances are commodity brand names — *Algael, Benthane, Nightcap, Spacer's Tea*.

## Register by artifact type

**Planet history** — 8 to 18 paragraphs, each a substantial block of 100–250 words. Full arc per rule 1. Opens on physical geography with a hard planetary-science hook. This is the most elevated register in the canon.

**Species description** — 60 to 140 words, one paragraph, present tense. Modern canon entries (Imprit, Graviclaw, Yetimoth, Chromocat, Hypnopet, Neph, Terragoyle, Avilily, Thirstaserp, Drilltail) open with an appositive describing the body — *"Hulking, white-furred apes with the heads of mammoths and tusks made of pure ice, the Yetimoths formed…"* — then give the original engineered purpose under the Vallerii, then how that purpose has curdled or been repurposed in the present. Anchor it to something specific on its home planet: a named location, industry, event, or institution. The abilities described should read as combat-legible without naming game mechanics.

> Some legacy species (Xylum, Dromeus, Tetrahive, Bioflim, Smokat, Newtapede, Voltish, Tizzie, Crystorn, Luceras, Codazzo, Figzy, Foromeer, Venemist, Kosanos, Scalatto, Akinza) are terse two-sentence stubs from an earlier draft and are **not** the voice model. Write to the richer entries; if asked to redesign a stub, upgrade it to the full register.

**Glossary entry** — one or two sentences, encyclopedic and definitional, no flourish and no ellipsis. Leads with the category noun: *"A planet-wide chemical disaster site that was once…"*, *"A consortium of Vallerii corporations formed to…"*. Cross-references other canon terms by name freely. Alphabetically it lives in `glossary.json` unsorted — append is fine.

**Homepage / marketing copy** — compressed, present tense, second-person-adjacent, punchier and less hedged than the histories. See `my-app/src/pages/home.js`. Use only for UI-facing summary text.

## Prohibitions

- **No em-dashes.** Nick's standing rule (2026-08-30): new lore never uses em-dashes, even though the legacy canon contains them. Restructure with colons, semicolons, commas, or a split into two sentences. Do not imitate the em-dash asides in the source.
- **American English spelling only.** gray not grey, armor not armour, color not colour. Legacy canon spellings and typos are not a model.
- **No humor that winks at the reader.** The irony is structural, never a joke.
- **No modern idiom or internet register.** No *game-changer*, *epic*, *badass*, *vibes*.
- **No game mechanics in prose.** Never write HP, damage, stats, types, turns, or cooldowns into lore text. Say what a creature *does*, not what it rolls. `statRatings` and `traits` are separate structured fields.
- **No NFT, crypto, blockchain, minting, or wallet framing.** That layer was abandoned. Scrambler Tokens are physical chips printed by a machine, not digital assets.
- **No hopeful resolution.** The galaxy is dying. Every entry ends in struggle, ambition, or dread — never in a solved problem.
- **No new cosmic-horror answers.** Add hints and pressure to the ancient-presence thread; never explain it.
- **No contradicting the canon.** Check `references/canon.md` before introducing a date, faction, technology, or planetary fact.

## Workflow

1. Read `references/canon.md` and `references/voice.md`.
2. Read the source entries for the planet, element, or neighbors of whatever you're writing.
3. Draft, following the arc for the artifact type.
4. **Self-check against this list before delivering:**
   - Is there an economic or institutional motive behind the tragedy?
   - Is the science specific and named, and does it precede the consequence?
   - Is there exactly one sardonic pivot per major turn, not more?
   - Does the Generator have agency without being confirmed sentient?
   - Is deep-past material hedged with an unreliability marker?
   - Does it close on Scrambler Tokens / Kozrak and trail into `…` (long-form only)?
   - Any game mechanics, modern idiom, or crypto framing leaked in? Remove.
   - Any em-dashes or British spellings? Remove (Nick's standing rule; see Prohibitions).
   - Does the name follow the naming conventions for its category?
5. If writing into the JSON files, match the existing object shape exactly and edit `lambda/src/json/` only. Species entries need `name, id, type, planet, height, weight, description, statRatings, traits` — `id` is a zero-padded five-digit string continuing the sequence, and heights/weights are dual-unit strings (`"90 in / 229 cm"`, `"859 lbs / 390 kg"`).
6. Read back the draft next to a real canon paragraph of the same type. If they don't sound like the same author, revise.
