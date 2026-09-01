# Anatomy Vocabulary — Consolidated Proposal (draft for Nick's review, 2026-09-01)

Sources: anatomy-harvest-{vertebrate, invertebrate, aerial-aquatic, exotic, emission}.md (~200 raw candidates) + anatomy-demand-sweep.md (29-species demand + 25-instrument classification). Consolidation standard: every cut justified in the ledger; species-demand coverage verified.

## Structural decisions (proposed)

**D1 — One vocabulary plus innate channels.** The anatomy registry IS the physical-instrument vocabulary: an ability's `instrument` is either an anatomy key (physical — must appear in the species' `anatomy` list) or one of a small closed set of **innate channels** (non-physical — validated by machine-readable predicates against other record facts). This resolves the open one-vs-two question: one parts vocabulary, one small channel list, no duplication.

**D2 — Keys are functional, material is elsewhere.** The record already stores `composition` and `covering`, so anatomy keys never encode material. A stone golem's fists are `fists` (composition mineral); a crystal creature's growths are `spines` (composition mineral); a treant's lashing limbs are `tendrils` (composition plant); Chromocat's energy sickles are `blades`. This collapses ~60 material-flavored harvest duplicates (stone-fists, crystal-growths, bark-hide, arc-tendrils, vines, blade-limb...) into their functional parents and keeps the vocabulary small and legible.

**D3 — Parts, not effects or capacities.** Effect-named candidates (toxic-cloud, pollen-cloud, chilling-touch, wail) and abstract capacities are excluded — effects belong to abilities, capacities to traits/senses. Emission SUBSTANCE abilities ride the `secretion`/`breath` innate channels; only distinctive physical delivery structures get anatomy keys (stinger, spinnerets, light-organs, vents).

**D4 — Whole-body and formless bodies stay armed.** `body` remains the whole-body catch-all (Smokat, Luceras, Scalatto). `coils` is the serpentine body-as-weapon. `pseudopods` is the shared formless-limb key for amorphous/gas/energy/spectral bodies (the harvests' "coalescing limb" pattern, one key, flavor from composition). Swarm bodies need no special key: `bodyPlan: swarm` + ordinary keys (a swarm's `jaws` are many tiny jaws).

**D5 — Dual-role sensory parts.** Only `antennae` earns a key (sense + lash/probe). Barbels, whiskers, and pure sensory organs are senses, not anatomy.

## Proposed launch vocabulary (34 keys)

Head and mouth (10): `jaws` (full biting mechanism, incl. mandibles), `fangs` (piercing/venom teeth), `beak` (keratinous bill, bird or cephalopod), `tusks` (external goring teeth), `horns` (permanent cranial spikes, incl. drill-horns), `antlers` (branched sparring rack), `trunk` (muscular flexible snout — Hippochamp's water-cannon snout), `tongue` (projectile/sticky/lashing tongue), `crest` (emissive or display head-growth — Crystorn gems, Hypnopet horn), `lure` (dangled bait appendage).

Limbs (8): `claws`, `talons` (raptorial grip-and-pierce variant), `fists` (blunt striking hands — Yetimoth), `hooves`, `pincers` (opposing grip — Graviclaw, Drilltail), `blades` (limb ending in a cutting edge — Chromocat sickles, Kosanos trunk-blade), `spurs` (limb spikes), `wings` (strike/gust/shroud as well as flight).

Tail and trunk-body (4): `tail` (club/whip/prehensile variants are species flavor), `stinger` (venom-injecting spike), `rattle` (sound-warning tail organ — Thirstaserp), `coils` (serpentine wrap-and-crush body).

Surface and armor (3): `hide` (the body surface used defensively — material from covering), `shell` (rigid enclosing casing permitting withdrawal — Scalatto), `spines` (rigid projections: quills, barbs, thorns, crystal growths).

Reach and grasp (3): `tendrils` (flexible reaching limbs: tentacles, vines, streamers — Neph, Xylum-adjacent), `roots` (ground-anchored gripping/erupting structures — Xylum), `pseudopods` (temporary limbs coalesced from a formless body).

Emission structures (4): `spinnerets` (thread/web extruders), `light-organs` (light-producing surfaces — photophores; Luminax space), `vents` (pressurized discharge openings: gas, steam, heat — constructs, gas bodies), `core` (exposed radiant/crystal focal mass capable of beam/burst).

Sensory-dual (1): `antennae`.

Catch-all (1): `body` (whole-body mass as instrument: ram, roll, slam, atomize).

## Innate channels (instrument registry, non-physical; validation predicates)

- `mind` — predicate: species template declares psychic support (element `psychic`, a psychic special sense, or `telekinetic`/`hypnotic` in guaranteed traits). Tizzie, Figzy.
- `gaze` — predicate: `senses.sight > 0` plus species declaration. Tizzie.
- `voice` — predicate: `communication` contains `vocal`.
- `breath` — predicate: `breathes` is non-empty (a lovely free consequence of the environmental block). Neph, Hippochamp delivery.
- `secretion` — species-declared emitted-substance channel (Bioflim, Avilily, Venemist, Thirstaserp, Ectoghoul, Neph). No record predicate beyond declaration; authoring must justify from lore.
- `swarm` — predicate: `bodyPlan == swarm`. Tetrahive.
- `aura` — **CUT from launch** (demand sweep: zero species demand it; additive-forever means it can return the day a species needs it).

## Species coverage check (all 29)

Directly covered by lore-demanded keys: Xylum (roots, tendrils), Dromeus (jaws, wings), Tetrahive (swarm channel + jaws), Bioflim (hide + secretion), Voltish (claws, body), Tizzie (tail + gaze/mind), Crystorn (crest), Codazzo (tail, spines), Foromeer (hide, horns), Venemist (jaws + secretion), Kosanos (blades, tail), Imprit (tail, hide), Scalatto (hide, shell, body), Avilily (beak + secretion), Thirstaserp (jaws, tail, rattle + secretion), Graviclaw (pincers, hide), Yetimoth (tusks, fists), Chromocat (claws, blades), Ectoghoul (tail + secretion), Hippochamp (trunk + breath), Neph (tendrils + breath/secretion), Terragoyle (tail, wings), Hypnopet (crest), Drilltail (stinger, pincers, claws).

Need authored anatomy at migration (lore names no clean part — same class as the buried-auto-trait pass): Smokat (`body`; pseudopods candidate), Newtapede (`body`; authoring may add jaws/claws), Luceras (`body`; hind-leg ram is body-level), Figzy (mind channel; needs at least `body`), Akinza (needs authored parts — likely claws/jaws for an ice stalker).

## Cut ledger (by theme; every raw candidate accounted for in one of these)

1. **Material-flavored duplicates → functional parent (D2):** stone-fists/boulder-fists→fists; crystal-growths/shard-spire/crystalline-barbs→spines; bark-hide/plating(mineral, metal)/spike-plating/exoskeleton-plating/carapace/plates→hide or shell; vines/arc-tendrils/trailing-tendrils/choking-tendrils/tendril(slime)/stinging-tentacles/oral-arms/feeding-tentacles/arms/tentacles→tendrils; blade-limb/hammer-limb/driving-limb/grasping-claw→blades/fists/pincers; energy-limb/condensing-fist/spectral-limbs/ectoplasmic-mass/false-limb→pseudopods; mineral-mass/frame/vapor-mass/corona/levitating-mass/undercarriage/engulfing-mass/constricting-body→body (or coils); mist-body→body.
2. **Effect-named or capacity-named (D3):** toxic-cloud, pollen-cloud, chilling-touch, possessing-touch (phasing trait covers), wail/dread-presence, absorptive-body (trait territory), converging-mass (tactic, not part), ink-sac-jet-as-action.
3. **Emission mechanisms → secretion/breath channels + kept delivery keys (D3):** spitting-glands, water-jet-mouth, glue-spit-fangs, chemical-jet-abdomen, regurgitation-crop, ink-sac, smoke-gland, dust-scales, glow-slime, musk-gland, spray-gland, pheromone-gland, slime-coat, sticky-pads, bioacid-glands, sap-glands, spore-pods/seed-pod/spore-cap/spore-bladder, venom-delivery/toxic-skin. (Delivery hardware that survived: stinger, fangs, spinnerets, light-organs, vents.)
4. **Hyper-specific mechanisms → parent key notes:** raptorial-forelegs/smashing-claw→pincers or blades; chelicerae/pedipalps/mandible-pincer-hybrid→jaws/pincers; venom-proboscis→stinger; sucker-mouth/proboscis(leech)→fangs-or-tongue notes; net-casting-forelimbs/web-shooters/silk-mouth-glands→spinnerets; lure-appendage/flash-organ/light-lash/beam-eye→light-organs or lure; electric-organ/shock-quills→cut (element system carries electric flavor; instrument = body/claws etc.); rostrum→horns-or-blades note; tongue-lash/projectile-tongue→tongue; gular-pouch→cut (niche); baleen→cut (niche, non-violent); trunk/proboscis(vertebrate)→trunk.
5. **Fin/wing/flipper family:** feathered/membranous/buzzing wings→wings (covering + bodyPlan differentiate); fins/flukes/flippers→cut as instruments (swim capability + tail cover aquatic propulsion; a tail-slap is `tail`); wing-claws/wing-clap→wings note; fin-spines/gill-cover-spines/stinger-tail→spines or stinger.
6. **Sound organs:** rattle KEPT; tymbal/drumming-membrane/stridulation-organ/throat-resonator→cut (voice channel or rattle cover the space; additive later).
7. **Display-only thin parts:** mane, dewlap/throat-fan, sail, hood, mantle-flare, canopy/frond-crown→cut (menacing trait + species art carry display; crest covers the emissive head-growth case).
8. **Internal or metabolic:** book-lungs, compound-eyes (sensory-only), eversible-stomach, air-bladder, gasbag/buoyancy-sac→cut; geode-core/radiant-core SURVIVE as `core` (externally visible and externally acting — the ruled exception).
9. **Colonial/micro-part concepts:** swarm-node/polyp-colony-mat/hive-body→bodyPlan swarm + swarm channel; tube-feet/pedicellariae/suckers/parapodia/bristles/urticating-hairs/venom-bristles/fireworm-bristles→spines/tendrils notes or cut (micro-parts below key granularity); barbels/whiskers→senses.
10. **Locomotion-only:** legs, paws, webbed feet, flippers(hind)→cut per action-relevance (capabilities carry locomotion); hooves KEPT (kick/trample is a real instrument).

## Instrument-list reconciliation (the current 25)

Kept as anatomy keys (17): jaws, beak, crest, talons, claws, fists, hooves, tail, horns, tusks, wings, tendrils, spines, stinger, pincers, hide, body, roots (18 with roots). Kept as innate channels (6): breath, gaze, voice, mind, secretion, swarm. Cut (1): aura. New keys the instrument list lacked (16): fangs, antlers, trunk, tongue, lure, blades, spurs, rattle, coils, shell, pseudopods, spinnerets, light-organs, vents, core, antennae.

## Open items for the registry spec

- Per-key allowed-action sets (the instrument × action matrix) need re-derivation over the 34-key set; harvest logs carry per-candidate action mappings as the raw material.
- Each key ships as registry data: key + display + one-line nature + allowed actions + kind (anatomy | innate).
- Deterministic fallback when no declared instrument is eligible (Codex audit item) becomes trivial: `body` is universal-eligible by construction.

## RATIFIED 2026-09-01 (Nick) — with amendments

All five structural decisions ratified. Amendment: `aura` RESTORED as the seventh innate channel (Nick's exhaustive-first ruling; declared channel like secretion, lore-justified — a radiated whole-body field; ward/cloud/terrorize/drain/mend). lure, core, talons, hooves all KEPT by the same principle. No-spellcasting note ratified: every projected power decomposes into mind (willed), aura (radiated), breath/secretion (expelled), crest/light-organs/core (emitted), or body (discharged).

## Allowed-actions matrix (ratified 2026-09-01)

Actions: strike, lash, crush, rake, shove, drain, ambush, beam, hurl, spray, burst, cloud, snare, ward, mend, terrorize. Grain ruling: stab/gore/impale = strike; slash/cut/tear = rake; specificity is carried by catalog names, never new actions.

| Instrument | Allowed actions |
|---|---|
| jaws | strike, crush, rake, drain, snare |
| fangs | strike, drain, ambush |
| beak | strike, crush, rake, drain, ambush |
| tusks | strike, shove, rake, crush, terrorize |
| horns | strike, shove, crush, ward, terrorize |
| antlers | strike, shove, snare, terrorize |
| trunk | lash, snare, shove, spray, strike |
| tongue | lash, snare, strike, drain |
| crest | beam, burst, terrorize, ward |
| lure | ambush, beam, snare |
| claws | strike, rake, crush, shove, ambush |
| talons | strike, rake, crush, snare |
| fists | strike, crush, shove |
| hooves | strike, crush, shove |
| pincers | strike, crush, snare, shove, ward, hurl |
| blades | strike, rake, lash |
| spurs | strike, rake, ambush |
| wings | strike, lash, shove, hurl, ward |
| tail | strike, lash, crush, shove, snare, hurl |
| stinger | strike, drain, ambush, terrorize |
| rattle | ward, terrorize |
| coils | crush, snare, shove, ward |
| hide | ward, shove |
| shell | ward, shove, crush |
| spines | strike, rake, ward, hurl, burst |
| tendrils | lash, snare, crush, drain, shove, strike |
| roots | snare, strike, shove, drain, ward |
| pseudopods | strike, crush, shove, snare, lash, drain |
| spinnerets | snare, ward, hurl |
| light-organs | beam, burst, ward, terrorize, mend |
| vents | spray, cloud, burst, ward |
| core | beam, burst, ward |
| antennae | lash, snare |
| body | strike, crush, shove, ward, burst, terrorize |
| mind (channel) | snare, shove, hurl, crush, drain, ward, terrorize, mend |
| gaze (channel) | terrorize, snare, drain, beam |
| voice (channel) | terrorize, ward, burst |
| breath (channel) | spray, cloud, burst, beam |
| secretion (channel) | spray, cloud, burst, drain, snare, ward, mend |
| swarm (channel) | cloud, strike, drain, snare, rake, terrorize |
| aura (channel) | ward, cloud, terrorize, drain, mend |
