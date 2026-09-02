# Xalian Ability Grammar — RATIFIED v2 (2026-08-30)

> Ratified by Nick 2026-08-30 (deferred to Claude's final judgment). Template 5 (hyphenated names) was cut. Archetype and instrument keys freeze at first mint; word pools remain additive forever.
>
> **RENAMED 2026-08-31 (Nick's ruling): "archetype" is now `action` everywhere in the ability grammar.** In gaming vernacular "archetype" means a character class/role, which is our *build* concept (the per-individual attribute-lean roll), so the word was attached to the wrong concept; it is now removed from the schema entirely. The grammar reads instrument × action × medium × intensity — what performs it, what it does, what it's made of, how strong. Table 1 below is the **Action table**; every "archetype" in this file means `action`. The 16 keys and all content are unchanged.

Companion to `xalian-creature-system-redesign.md` §8. These are the four static tables the mint-time ability assembler reads. Everything here is hand-authored once and consumed deterministically — no AI at mint. All names/words are freely editable until first mint; archetype and instrument *keys* freeze at first mint (word pools stay additive forever). Word pools draw on the existing `elements.json` move vocabularies and each element's ratified mechanical fantasy, in the canon voice (science register + gothic register, no modern idiom).

## Table 1 — Archetypes (the universal action vocabulary games interpret)

Sixteen archetypes (v2 — expanded after a cross-game taxonomy check against Pokémon move families, D&D 5e area-of-effect shapes, and tactics-game forced-movement verbs). `delivery` is the coarse shape hint for games (melee = adjacent, projectile = ranged target, cone = spreading arc from self, aura = radiates from self, field = placed area). Name words are the pools the name templates draw from.

Status effects (poison, burn, freeze, ...) are deliberately NOT archetypes: games derive them from archetype × medium (a Chemical `cloud` → poison, an Ice `snare` → freeze). Summoning is deliberately excluded as too game-specific (`swarm` as an instrument carries the flavor).

| Key | Delivery | Nature (what games interpret) | Noun pool | Verb pool |
|---|---|---|---|---|
| `strike` | melee | a single direct blow | Strike, Slam, Blow, Smash | Striking, Crushing |
| `lash` | melee | a sweeping arc hitting what it passes | Lash, Sweep, Whip, Flail | Lashing, Scouring |
| `crush` | melee | overwhelming sustained force; grips and compresses | Crush, Vise, Clamp, Grip | Crushing, Grinding |
| `rake` | melee | rapid repeated cuts | Rake, Flurry, Shred, Frenzy | Raking, Rending |
| `shove` | melee | forces the target out of position | Ram, Shove, Heave, Repulse | Battering, Repelling |
| `drain` | melee | leeches vitality from the target | Siphon, Leech, Sap, Drain | Draining, Sapping |
| `ambush` | melee | a burst of closing speed ending in a hit | Rush, Pounce, Dive, Charge | Charging, Plunging |
| `beam` | projectile | focused energy in a line | Beam, Ray, Lance, Bolt | Piercing, Searing |
| `hurl` | projectile | thrown or launched mass that detonates on the target (fireball, flung boulder) | Volley, Salvo, Barrage, Toss | Hurling, Launching |
| `spray` | cone | matter expelled in a spreading arc (acid stream, breath weapon, quill spray) | Spray, Torrent, Jet, Gout | Spewing, Scouring |
| `burst` | aura | violent radial release centered on self | Burst, Nova, Shock, Eruption | Erupting, Blasting |
| `cloud` | field | a lingering emitted area | Cloud, Veil, Miasma, Haze | Smothering, Shrouding |
| `snare` | field | holds, drags, or slows what it catches | Snare, Grasp, Well, Shackle | Binding, Dragging |
| `ward` | aura | protects self or those nearby | Ward, Aegis, Bulwark, Shell | Warding, Shielding |
| `mend` | aura | restores self or those nearby | Mending, Balm, Renewal, Pulse | Mending, Restoring |
| `terrorize` | aura | erodes the will of those nearby | Dread, Howl, Glare, Omen | Harrowing, Withering |

## Table 2 — Instrument vocabulary (shared across all species; each species template picks 1–3)

`allowed` is the no-nonsense guarantee: an ability can only pair an instrument with an archetype listed here. `nameForm` is the singular noun used in name templates.

| Key | nameForm | Kind | Allowed archetypes |
|---|---|---|---|
| `jaws` | Fang | physical | strike, crush, rake, ambush, drain |
| `beak` | Beak | physical | strike, rake, ambush |
| `crest` | Crest | physical | beam, burst, snare, mend, ward |
| `talons` | Talon | physical | strike, rake, ambush |
| `claws` | Claw | physical | strike, rake, lash |
| `fists` | Fist | physical | strike, crush, shove, hurl |
| `hooves` | Hoof | physical | strike, shove, ambush |
| `tail` | Tail | physical | lash, strike, snare, ward, shove, hurl |
| `horns` | Horn | physical | strike, ambush, ward, shove |
| `tusks` | Tusk | physical | strike, crush, ambush, shove |
| `wings` | Wing | physical | lash, burst, ambush, ward, shove |
| `tendrils` | Tendril | physical | lash, snare, crush, mend, drain, hurl |
| `spines` | Spine | physical | rake, burst, ward, spray |
| `stinger` | Stinger | physical | strike, ambush, snare, drain |
| `pincers` | Pincer | physical | crush, snare, hurl |
| `hide` | Hide | physical | ward, burst |
| `body` | — (uses medium words only) | physical | ambush, crush, burst, ward, shove |
| `breath` | Breath | innate | beam, cloud, burst, spray |
| `gaze` | Gaze | innate | beam, snare, terrorize |
| `voice` | Call | innate | burst, terrorize, mend, snare, spray |
| `aura` | Aura | innate | ward, mend, cloud, terrorize, burst, drain |
| `mind` | Will | innate | snare, terrorize, mend, beam, shove, hurl |
| `secretion` | — (uses medium words only) | innate | cloud, snare, mend, burst, spray |
| `swarm` | Swarm | innate | rake, cloud, snare, ward |
| `roots` | Root | physical | snare, crush, mend, ward, drain |

Authoring guidance for species templates: one physical instrument justified by the creature's written description, plus usually one innate one; limbless or non-violent species lean entirely on innate instruments — the non-damage archetypes (ward, mend, snare, cloud, terrorize) exist so those species roll interesting abilities.

## Table 3 — Element medium word pools

Each element contributes adjectives (`adj`) and nouns (`noun`) aligned to its ratified mechanical fantasy. The medium of an ability is the creature's primary element, or its secondary affinity when one was rolled (making the affinity visible in the ability list).

| Element | Fantasy | adj pool | noun pool |
|---|---|---|---|
| Fire | heat & relentless aggression | Molten, Cinder, Blazing, Scorching, Ashen, Infernal | Ember, Flame, Pyre, Slag |
| Water | flow & restoration | Tidal, Riptide, Abyssal, Cresting, Brine | Tide, Current, Deluge, Deep |
| Dark | gravity, void & time | Graving, Void, Entropic, Collapsing, Eventide | Gravity, Horizon, Umbra, Singularity |
| Light | radiance & precision energy | Ionized, Prismatic, Radiant, Searing, Solar | Photon, Ray, Corona, Dawn |
| Plant | growth & territory | Verdant, Thorned, Blooming, Rooted, Sporing | Bramble, Canopy, Spore, Vine |
| Electric | storm & surge | Voltaic, Stormforged, Static, Crackling, Crimson | Lightning, Thunder, Surge, Storm |
| Ghost | incorporeality & dread | Spectral, Wraithbound, Hollow, Phantom, Shrouded | Wraith, Shade, Dirge, Grave |
| Rock | permanence & immovability | Stonebound, Granite, Seismic, Unyielding, Ore-clad | Bedrock, Boulder, Ridge, Rubble |
| Chemical | reaction & corrosion | Caustic, Virulent, Corrosive, Volatile, Acrid | Venom, Reagent, Fume, Solvent |
| Air | wind & freedom | Gale, Shearing, Updraft, Zephyric, Squalling | Wind, Cyclone, Draft, Sky |
| Psychic | mind & perception | Lucid, Mesmeric, Clairvoyant, Dreaming, Fathomless | Trance, Psyche, Reverie, Aether |
| Ice | stasis & preservation | Frozen, Glacial, Rimebound, Stilling, Permafrost | Frost, Rime, Floe, Winter |
| Metal | machinery & precision | Forged, Chromium, Serrated, Burnished, Machined | Alloy, Piston, Blade, Chassis |
| Sand | erosion & attrition | Scouring, Sunken, Duneborn, Grinding, Buried | Dust, Dune, Sirocco, Sediment |

## NAME GENERATION REPLACED — Curated Name Catalog (RATIFIED 2026-08-31)

Template-fill naming (Table 4 below) is **struck**: it produced taxonomy-recital clunkers ("Graving Will Snare", "Spectral Pincer Vise") because it stuffed three metadata slots into every name and had no collocation sense. Names are already redundant with the stored structured fields, so they don't need to encode anything — they need to be *good*.

**The catalog:** a hand-authored registry file of ability names, each entry tagged `{name, action, medium, instruments?, minIntensity?}`. The action × medium pair is the entry's **cell** (a pigeonhole in the 16×14 grid); a name may hold multiple medium tags only when the definition audit passes for each (the Undertow rule: Undertow is a water word by definition — it can never be tagged dark, however good the gravity metaphor feels). At generation time the assembler rolls instrument/action/medium/intensity exactly as before, then **draws a name** from the rolled cell, filtered to entries that are instrument-neutral or tagged with the rolled instrument, weighted by the intensity-naming rule (heavy names to heavy rolls; sound-symbolism research retained). Shared names across creatures remain deliberate (comparison culture).

**Tagging rules:** entries are instrument-NEUTRAL by default (effect-words: "Event Horizon", "Collapse" — any instrument reads fine, the Pokemon pattern); tagging is MANDATORY when a name evokes anatomy or mechanism ("Wraith Vise" → pincers/jaws/tendrils; "Grave Glare" → gaze). Cells should be majority-neutral; tagged names are bonus flavor, never load-bearing coverage. Instrument is a subtractive filter, never a third catalog key (a 25×16×14 grid would be authoring death).

**Variety floors (safety net, NOT authoring targets):** an automated coverage checker (runs whenever the catalog or a species template changes) asserts ≥6 valid names for every reachable instrument × action × medium combination (valid = neutral + matching-tagged) and ≥30 total reachable names per species. Floors are tunable; simulated generation batches calibrate them.

**Pilot-validated audit rules (2026-08-31, from the 5-field pilot harvest — dark, water, snare, crush, mend; raw harvests + the consolidated dark × snare cell live in `xalian-catalog/`):** (a) NO Earth-fauna references (Python Coil, Boa Crush rejected — Xalia has no Earth species); (b) NO borrowed genre names (Hydro Pump is a real Pokemon move — excluded on sight); (c) neutral-name leakage is the known agent failure mode (agents listed Undertow and Gravity Well as "element-neutral") — Stage 2 consolidation re-audits every neutral list; (d) religious-register words are IN per Nick (abstract religion may enter lore someday); modern-tech idioms (Reboot) OUT on voice; Second Wind kept; (e) dual-tagging is real and valuable ("tidal" and "vortex" pass the definition audit for both water and dark); (f) combining forms are not words (Chrono Snare rejected; Time Snare kept); (g) names colliding with trait/system vocabulary are cut (Anchor Snare vs the `anchored` trait); (h) **signature names use a GRANDER register** — fancier, exempt from the two-word limit, collision-checked against the catalog at migration (Nick's ruling; replaces catalog-reservation — Gravity Well restored to dark × snare, Graviclaw's signature to be renamed grander, candidate "Point of No Return"). Consolidation standard (demonstrated on dark × snare, approved): exhaustive within the rules, kept-count maximized (never floor-satisfying), every cut individually justified in a per-cell kept/cut/reason ledger.

**Authoring methodology (Nick's ruling): exhaustive-harvest-then-curate, never fill-to-quota.** (1) HARVEST: sweep the ENTIRE semantic field of each element's mechanical fantasy and each action's effect-vocabulary from the outside world — dictionaries, thesauri, the web. **Nick's existing corpora (element word pools, elements.json move vocabularies, moves.json/qualifiers.json, Evernote lists) are first-pass gatherings and must be used only as a SECONDARY cross-check after the external sweep, never as the starting source** — starting from them caps the harvest at what was limitedly gathered. (2) AUDIT: definition audit per medium tag, mandatory instrument tagging, collocation quality, canon voice (no modern idiom, no em-dashes). (3) KEEP EVERYTHING GOOD: no cap; whittle only true redundancy; Nick spot-reviews per element like trait batches. Catalog size is an output of the language, not an input. Fan-out-friendly; authored lazily alongside the species migration (only reachable cells need stocking). Catalog ships as versioned registry data under the pinned-snapshot rule.

## Table 4 — Name templates (STRUCK 2026-08-31 — superseded by the Name Catalog above; kept for the intensity-weighting research note)

The assembler rolls one template per ability and fills it from the pools above. `{Instrument}` uses the instrument's `nameForm`; instruments marked "uses medium words only" restrict to templates without `{Instrument}`.

1. `{MediumAdj} {Instrument} {ArchetypeNoun}` → "Molten Talon Rake", "Glacial Tail Ward"
2. `{MediumAdj} {ArchetypeNoun}` → "Graving Snare", "Voltaic Burst"
3. `{MediumNoun} {ArchetypeNoun}` → "Thunder Lash", "Rime Shell"
4. `{ArchetypeVerb} {MediumNoun}` → "Binding Gravity", "Searing Corona"

(A fifth hyphenated template — "Frost-Fang Crush" — was considered and cut at ratification: it produced the most generated-sounding names.)

Collisions across creatures are expected and desirable (shared names enable intensity comparison, Pokémon-move style).

**Intensity-weighted naming (research-backed):** linguistic studies of Pokémon move names (Kawahara, sound-symbolism research) show players intuitively read longer names and heavier sounds as stronger moves. The assembler should exploit this: low-intensity abilities prefer the short templates (2–3) and lighter nouns; high-intensity abilities (7+) prefer template 1 and the grander pool words (Nova, Singularity, Eruption, Bombard). Free perceived-power legibility, zero extra data.

## Worked examples (sanity check)

- **Dromeus** (Fire; instruments `talons`, `jaws`; rolled Rock affinity 40): signature "Ignition Sprint" + rolled "Molten Talon Rake" (talons × rake × fire, intensity 6) + "Bedrock Fang Crush" (jaws × crush × rock — the affinity made visible, intensity 4).
- **Xylum** (Plant; instruments `roots`, `tendrils`): "Thorned Root Snare", "Verdant Mending" (tendrils × mend), "Bramble Vise" (roots × crush).
- **Tetrahive** (Dark; instrument `swarm`, innate `mind`): "Entropic Swarm Veil" (swarm × cloud), "Graving Will Snare" (mind × snare), "Umbra Rake".

## Review points for Nick

1. **Archetype set (Table 1)** — now 16 after the cross-game taxonomy pass added `hurl` (thrown mass — the fireball case Nick flagged), `spray` (cone), `shove` (forced movement, from tactics-game research), and `drain` (leech family, from Pokémon research). Keys freeze at first mint — final sanity check needed.
2. **Instrument list (Table 2)** — sanity-checked against all 29 species descriptions (2026-08-30): 27 mapped cleanly; the check added `beak` (Avilily) and `crest` (emissive growth — Crystorn's light-gems, Hypnopet's hypnotic horn). Several species validated the v2 archetypes specifically: Codazzo/Terragoyle need tail × hurl, Thirstaserp needs jaws × drain, Neph needs tendrils × drain, Venemist/Ectoghoul/Hippochamp need spray.
3. **Word pools (Table 3)** — read each element's row aloud; flag anything off-voice or off-fantasy. Pools are additive forever, so thin is fine to start.
4. **Template 5** (hyphenated forms) — keep or cut; it produces the most "generated-sounding" names.
