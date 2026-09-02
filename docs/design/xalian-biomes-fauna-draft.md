# Generator Environmental Reports — v6 MERGED (2026-08-30)

> RENAMED per Nick: "assay" is now "report" everywhere; in-world title is "Standardized Environmental Report, filed per APEX Accords reporting protocol." MERGED: the semi-structured form of all 14 reports now lives in `lambda/src/json/planetRecords.json` (new clean-slate planet schema: key/name/element/images/physical (typed numbers)/report/history), synced to `my-app/src/json/` via copy-json. `planets.json` remains untouched for the current UI; the frontend flips to planetRecords.json during the UI redesign, then planets.json retires. The `biomeProfile` concept is retired: the generator reads `report.mobility[*].rating` directly. The v5 prose below is the display-text source the structured data was transcribed from (read "assay" as "report").

Design ratified 2026-08-30: each planet's biome/fauna record is a single **Standardized Environmental Assay filed by that planet's Xalian Generator** under the APEX Accords reporting protocol. The Generators never stopped filing after Source Code 606 severed them from APEX; every assay is current-cycle and its receipt is unconfirmed. Tone: pure instrumentation output, no personality (which also preserves the canon's sentience hedge). This register extends the existing factual `data` block in `planets.json` (Terrain, Gravity, Temperature, etc.).

Mobility ratings map 1:1 onto the machine-readable `biomeProfile` (bottom): OPTIMAL = rewarded, VIABLE = viable, INEFFICIENT = punished, UNSUPPORTED = impossible, NOT APPLICABLE = meaningless.

Endessa's unit is the stolen pre-Accords prototype; its assay carries a nonstandard header but files factually like the rest.

The multi-era human storytelling entries from draft v4 are PARKED (appendix at bottom) for a separate future discussion; they are not part of this deliverable.

---

**MAGMUTH — Standardized Environmental Assay. Unit: Magmuth Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Obsidian island masses on active lava seas. Mean surface renewal interval: approximately fifty local years. Ash deposition: near total. Stable features: volcanic crags, legacy mining shafts, tar fields.
- **Mobility:** Sprint: OPTIMAL; surface transit windows between flow shifts are brief. Climb: OPTIMAL; crag networks are the only persistent ground. Flight: VIABLE; ash storm cycles ground airborne units for multi-day intervals. Burrow: INEFFICIENT; legacy shafts hold, new excavation intersects magma seepage. Swim: UNSUPPORTED.
- **Extant fauna:** Heat-shielded integument universal. Observed adaptations: high-speed flow crossing, crag pathing, firestorm grazing tolerance. Predation pattern: extended immobility followed by sustained maximum output. Inter-pack aggression elevated; engagement persistence exceeds nutritional explanation.
- **Hazards:** Firestorms, geyser discharge, pyroclastic flows, structural ground failure, ambient temperature excursions.
- **Output priorities:** Thermal shielding, burst locomotion, aggression regulation deprioritized by demand.

**POSEIDAS — Standardized Environmental Assay. Unit: Poseidas Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Global ocean. Surface layer: storm-dominant. Deep layer: stable; settlement structures active along submerged continental ridgelines. Landmass: none of significance.
- **Mobility:** Swim: OPTIMAL; depth tolerance stratifies population distribution. Burrow: VIABLE in ridge silt. Flight: INEFFICIENT; surface storm frequency. Sprint: NOT APPLICABLE. Climb: NOT APPLICABLE.
- **Extant fauna:** Current-riding pelagic forms; pressure-adapted deep forms; filtration-metabolism forms that reduce harvested algae to cured Algael at rates exceeding barrel decomposition by three orders of magnitude. Harvest remains rig-based; filtration stock performs finishing only. Aggression suppressed within settlement perimeters.
- **Hazards:** Surface storm systems, crush depth, semiannual toxic bloom events (airborne microbial dispersal at surface).
- **Output priorities:** Depth tolerance, filtration metabolism, low-aggression settlement compatibility.

**GRIMEDES — Standardized Environmental Assay. Unit: Grimedes Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Planar rock under permanent night. Surface flora: infrared-absorbent scrub, full coverage. Wetland systems: present, fog-covered. Illumination: infrared only, declining with stellar output.
- **Mobility:** Sprint: VIABLE. Burrow: VIABLE. Swim: VIABLE in wetland systems. Flight: VIABLE; no observational advantage conferred. Climb: NOT APPLICABLE; no vertical features of significance. Note: extant fauna substitute local gravitational manipulation for the majority of pursuit locomotion.
- **Extant fauna:** Gravitational-field manipulation confirmed in multiple lineages: prey attraction, retention wells, self-anchoring. Wetland forms generate submerged collapse-points. Sensory apparatus registers mass and motion; anticipatory response precedes stimulus in repeated trials. This unit reports the measurement and does not explain it.
- **Hazards:** Gravitational inconstancy, localized temporal desynchronization, instrument drift.
- **Output priorities:** Non-visual sensory systems, gravitational tolerance, low-light metabolism.

**LUMINAX — Standardized Environmental Assay. Unit: Luminax Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Sunward face: crystalline-leafed flora oases, legacy solar farm grids, ION-9 misfire blast zones (expanding). Dark face: wind-planed plains, standing water bodies without registered life. Tidal lock: total.
- **Mobility:** Sprint: OPTIMAL and Flight: OPTIMAL; sightlines unbroken, concealment unavailable sunward. Burrow: VIABLE; primary light-avoidance strategy. Climb: VIABLE, low utility. Swim: INEFFICIENT; dark-face waters sustain no forage.
- **Extant fauna:** Radiation-tolerant integument universal sunward: albino coats, refractive carapaces, crystalline emitter growths with focused-beam discharge. Predation at range along uninterrupted lines. Blast-zone populations exhibit mutation rates exceeding this unit's cataloging cycle; records from those sectors are provisional.
- **Hazards:** Cumulative radiation load, reflective glare, uncommanded ION-9 discharge events.
- **Output priorities:** Radiation shielding, photonic focusing structures, accelerated catalog revision.

**FLORIA — Standardized Environmental Assay. Unit: Genesis Prototype, Floria. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Full canopy coverage: World Tree crowns at city scale, load-bearing branch networks. Understory: fungal thickets, root-saturated marsh. Open ground: none of significance. Annual deluge cycle: discontinued since Tree establishment.
- **Mobility:** Climb: OPTIMAL. Flight: OPTIMAL within and above canopy. Burrow: OPTIMAL in understory substrate. Swim: VIABLE in marsh systems. Sprint: INEFFICIENT; ground-level obstruction density.
- **Extant fauna:** Canopy stratum: branch-runners, fliers. Understory stratum: burrowers, sessile rooted forms. Territorial strategy: growth, entanglement, and regrowth in place of engagement. Coordinated ecosystem response to cutting and clearing confirmed at planetary scale. Oldest specimens predate this unit's regulated output records and decline cataloging.
- **Hazards:** Coordinated ecosystem response, toxic fungal blooms, unstable root substrate.
- **Output priorities:** Grip and climb morphology, regenerative tissue, ecosystem-integration compatibility.

**ZOLTON — Standardized Environmental Assay. Unit: Zolton Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Vertical relief: conductive metallic spires functioning as natural lightning rods. Canyon systems: dense cryogenic gas saturation. Surface current rivers: active, cyclical. Strike frequency: approximately 2.5 billion events per local day.
- **Mobility:** Climb: OPTIMAL on spire networks with insulation. Sprint: VIABLE where timed to discharge cycles. Burrow: VIABLE for storm shelter. Flight: INEFFICIENT; strike exposure in all air corridors. Swim: UNSUPPORTED; canyon gas is not a swimming medium.
- **Extant fauna:** Insulated climbing forms, discharge-timed sprinters. Universal adaptation: energy conduction and redirection rather than storage. Entangled pair lineages persist from the discontinued relay program; paired individuals register synchronized responses at arbitrary separation. Black lightning dead zones are avoided by all cataloged forms without exception.
- **Hazards:** Continuous lightning, bloodstorm entanglement events, black lightning neutron emission, cryogenic canyon exposure.
- **Output priorities:** Insulation, conduction pathways, discharge-cycle response timing.

**PHANTIRI — Standardized Environmental Assay. Unit: Phantiri Xalian Generator (operating under Leviticus Overdrive revision). Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Surface stratum: compacted organic remains at continental scale, fluid runoff basins, persistent windless fog. Precursor structures: buried, depth undetermined. Prior terrain: inaccessible beneath deposition.
- **Mobility:** Flight, swim, burrow, climb, sprint: NOT APPLICABLE. Current output is non-corporeal; matter does not obstruct transit.
- **Extant fauna:** Spectral-energy forms per Leviticus Overdrive parameters. Confirmed capabilities: matter transit, null acoustic and trace signature, reanimation of organic remains in a minority of lineages. Territorial behavior mediated by proximity aversion in other populations.
- **Hazards:** Lunar weapon discharge terminates all organic life on detection. Organic output: discontinued; survival duration under current conditions was zero across all trials.
- **Output priorities:** Non-corporeal architectures exclusively. Organic production remains suspended pending environmental change. No environmental change is projected.

**STONERA — Standardized Environmental Assay. Unit: Stonera Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Impact-cratered ridge systems, sinkhole plains, atmospheric dust saturation with static discharge. Annual Jorian Belt transit: sustained meteoric bombardment. Chasm: exposed subsurface liquid-metal ocean, partially roofed by orbital ejecta.
- **Mobility:** Burrow: OPTIMAL; rapid subsurface retreat is the primary survival adaptation. Climb: VIABLE. Sprint: INEFFICIENT; low utility against overhead hazard. Flight: INEFFICIENT; debris and static exposure. Swim: INEFFICIENT; surface water limited to mineral-saturated lakes of marginal extent.
- **Extant fauna:** Deep-excavation forms without depth aversion, high-mass armored forms, self-anchoring forms resistant to displacement. Attrition tolerance is the dominant selected trait across all lineages.
- **Hazards:** Meteoric bombardment, sinkhole collapse, static discharge, extraction-labor attrition in Chasm operations.
- **Output priorities:** Excavation morphology, impact-resistant plating, displacement resistance.

**DRAINOV — Standardized Environmental Assay. Unit: Drainov Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Industrial ruin fields in progressive subsidence into acid swamp systems. Atmospheric toxin load: saturated. Precipitation: corrosive. Orbital debris infall: ongoing. Automated legacy facilities continue uncommanded operation with periodic containment failure.
- **Mobility:** Climb: VIABLE on ruin superstructure. Swim: VIABLE for chemically immune forms only. Sprint: INEFFICIENT; substrate integrity unreliable. Flight: INEFFICIENT; airborne particulates degrade tissue and instrumentation. Burrow: INEFFICIENT; subsurface saturation with unclassified waste.
- **Extant fauna:** Full-spectrum toxin immunity universal. Observed adaptations: atmospheric filtration organs, synthesized solvent and venom secretion, reactive discharge on structural breach.
- **Hazards:** Atmosphere, hydrosphere, precipitation, substrate, and a subset of fauna, in descending order of incident frequency.
- **Output priorities:** Chemical immunity, filtration organs, containment-grade integument.

**SAIPHUS — Standardized Environmental Assay. Unit: Saiphus Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** No solid surface. Buoyant island archipelago suspended on supercritical atmospheric fluid. Storm systems: continuous, planetary scale. Island collision events: periodic. Sulfuric cloud banks: mobile.
- **Mobility:** Flight: OPTIMAL. Sprint: OPTIMAL as inter-island leaping on high-mass builds. Climb: VIABLE on island undersides. Burrow: VIABLE in island substrate for nesting only. Swim: UNSUPPORTED; descent into the fluid layer is not recoverable.
- **Extant fauna:** Buoyant grazing forms in herd distribution, including Benthane-filtering tentacled forms under pastoral management. Wind-manipulating pursuit forms employing directed gusts for prey displacement. Restraint tolerance across all lineages: minimal.
- **Hazards:** Storm systems, sulfuric cloud contact, island collision, unrecoverable descent.
- **Output priorities:** Buoyancy structures, storm-tolerant flight surfaces, atmospheric filtration.

**TELYPSO — Standardized Environmental Assay. Unit: Telypso Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Fungal forest systems, fluid bodies of variable behavior, terrain deformation correlated with ambient emotional state. Physical constants: locally advisory. Measurements in this section repeat poorly.
- **Mobility:** Flight, swim, burrow, climb, sprint: VIABLE; all ratings unstable under observation. Transit outcomes correlate more strongly with subject intent than with locomotion mode.
- **Extant fauna:** Empathic forms with emotional-state regulation function; trance-induction forms; perception-mediating forms; anticipatory-response forms. Population function is therapeutic per this unit's standing directive. Ambient psychic distress has increased since plague onset; inter-population aggression is rising in affected sectors.
- **Hazards:** Ambient psychic amplification of observer state, environmental reactivity, navigational unreliability.
- **Output priorities:** Psychic stabilization capacity, emotional regulation function, distress-tolerance thresholds.

**KRYSTOS — Standardized Environmental Assay. Unit: Krystos Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Frozen ocean sheet over geothermal vent fields, mountain drift systems, ruin sites of estate and penal classification. Subsurface compute infrastructure: dormant, outside this unit's assessment scope. Atmospheric debris layer: persistent.
- **Mobility:** Burrow: OPTIMAL through ice and drift. Swim: VIABLE in vent-warmed subsurface water. Climb: VIABLE. Sprint: VIABLE for high-mass builds on pack ice. Flight: INEFFICIENT; storm cycle interference.
- **Extant fauna:** Insulated high-mass tunneling forms; metabolic-suspension forms capable of full vital arrest through storm duration; guard-pattern forms retained from penal commissions. Ornamental catalog: discontinued; environmental support withdrawn.
- **Hazards:** Sustained lethal cold, blizzard cycles, avalanche, preservation of organic material where it falls.
- **Output priorities:** Cold-proof insulation, metabolic suspension, endurance morphology.

**VERIDIUM — Standardized Environmental Assay. Unit: Veridium Xalian Generator. Filed per APEX Accords reporting protocol. Cycle: current. Receipt unconfirmed.**
- **Terrain:** Worked metal to maximum sensor depth. Factory trench systems, liquid metal channels, drone salvage fields, active forge districts. Flora: metallic, harvested and reforged in industrial rotation.
- **Mobility:** Climb: OPTIMAL on trench and gantry structures. Sprint: VIABLE on planar metal. Flight: INEFFICIENT; crane, cable, and thermal plume density. Swim: UNSUPPORTED except for forms of compatible material in metal channels. Burrow: UNSUPPORTED; substrate is worked metal.
- **Extant fauna:** Furnace-tolerant plated forms, metal-shaping harvest forms, self-repairing frame architectures. A minority of forms incorporate salvaged components predating all available catalogs; provenance unresolved.
- **Hazards:** Industrial machinery operating without regard to proximity, discharge arcs, molten pours.
- **Output priorities:** Plated chassis, metallurgical manipulation, self-repair routines.

**ENDESSA — Environmental Report. Unit: unregistered prototype, Endessa. Format nonconforming: unit predates APEX Accords reporting protocol. Cycle: irregular. Receipt unconfirmed.**
- **Terrain:** Dune systems of vitreous particulate over ocean-floor substrate. Subsurface: excavation tunnel networks, hydrocarbon stasis-oil pools, structures of increasing exposure as dunes migrate. Surface insolation: lethal without adaptation, dual-star.
- **Mobility:** Burrow: OPTIMAL, including sustained particulate-swimming. Sprint: VIABLE in low-insolation hours. Flight: VIABLE with elevated detection cost to the flier. Swim: UNSUPPORTED; no standing water. Climb: NOT APPLICABLE.
- **Extant fauna:** Subsurface ambush forms, vibration-hunting forms, desiccation-immune surface-crossing forms. Predation strategy: attrition. Recent output includes aquatic-class forms inconsistent with current environment; this unit's environmental reference data contains unresolved marine parameters.
- **Hazards:** Thermal load, desiccation, tunnel collapse, vibration-triggered predation.
- **Output priorities:** Water retention, particulate locomotion, thermal shielding. Aquatic-class output: unintended; recurrence probable.

---

## biomeProfile (machine-readable companion; out-of-world; ratings mirror assay vocabulary)

```jsonc
{
  "magmuth":  { "flight": "viable",  "swim": "impossible", "burrow": "punished",  "climb": "rewarded", "sprint": "rewarded" },
  "poseidas": { "flight": "punished", "swim": "rewarded",  "burrow": "viable",    "climb": "meaningless", "sprint": "meaningless" },
  "grimedes": { "flight": "viable",  "swim": "viable",     "burrow": "viable",    "climb": "meaningless", "sprint": "viable" },
  "luminax":  { "flight": "rewarded", "swim": "punished",  "burrow": "viable",    "climb": "viable",   "sprint": "rewarded" },
  "floria":   { "flight": "rewarded", "swim": "viable",    "burrow": "rewarded",  "climb": "rewarded", "sprint": "punished" },
  "zolton":   { "flight": "punished", "swim": "impossible", "burrow": "viable",   "climb": "rewarded", "sprint": "viable" },
  "phantiri": { "flight": "meaningless", "swim": "meaningless", "burrow": "meaningless", "climb": "meaningless", "sprint": "meaningless" },
  "stonera":  { "flight": "punished", "swim": "punished",  "burrow": "rewarded",  "climb": "viable",   "sprint": "punished" },
  "drainov":  { "flight": "punished", "swim": "viable",    "burrow": "punished",  "climb": "viable",   "sprint": "punished" },
  "saiphus":  { "flight": "rewarded", "swim": "impossible", "burrow": "viable",   "climb": "viable",   "sprint": "rewarded" },
  "telypso":  { "flight": "viable",  "swim": "viable",     "burrow": "viable",    "climb": "viable",   "sprint": "viable" },
  "krystos":  { "flight": "punished", "swim": "viable",    "burrow": "rewarded",  "climb": "viable",   "sprint": "viable" },
  "veridium": { "flight": "punished", "swim": "impossible", "burrow": "impossible", "climb": "rewarded", "sprint": "viable" },
  "endessa":  { "flight": "viable",  "swim": "impossible", "burrow": "rewarded",  "climb": "meaningless", "sprint": "viable" }
}
```

---

## PARKED: multi-era human survey entries (v4 material, held for a separate future discussion)

The dated human-authored entries from draft v4 (prospecting surveys, colonization assessments, the Telypso expedition log, the Syndicate prospectus, etc.) are a storytelling concept, distinct from the assay data deliverable above. Nick parked them 2026-08-30. They remain in this repo's git history (draft v4 of this file) and can be revived as their own lore artifact type later.
