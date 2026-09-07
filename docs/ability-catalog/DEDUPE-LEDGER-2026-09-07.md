> **STRUCK, NOT APPLIED (Nick, 2026-09-07).** The one-cell-per-name rule this ledger enforces was struck: a name may sit in more than one cell where each placement is logically sound, and none of the removals below were kept. The parser fixes (unclosed notes and slash shorthand shipping as names) stayed. The file is kept only because its rows record where a name sits in a cell its definition does not support, which is reference material for a later move pass.

# Ability-catalog dedupe ledger, 2026-09-07

Every name in `docs/ability-catalog/consolidated-<element>.md` and `docs/ability-catalog/neutral-pools.md` that currently sits in more than one place, with one disposition per name. Computed from `lambda/src/json/abilityCatalog.json` (the bundle produced by `scripts/bundleAbilityCatalog.js`), so the locations below are exactly what the generator sees today. Names compare case-insensitively.

This file is the single source of the edits. `docs/ability-catalog/tools/apply-dedupe-ledger.js` parses the tables below and performs the removals; nothing is applied by hand.

## The rules applied

1. **One action cell per name, forever**, chosen by the action's registry definition in `docs/species-templates/REGISTRY-DEFINITIONS.md`. A name may not sit in two actions anywhere in the catalog.
2. **A name lives in exactly one element file.** A second element may only cross-reference it with a `(dual: x)` note when the definition audit passes for both media. Ratified duals carried in: the Tidal family and Vortex (water owned, dark dual), the Stasis family (dark and ice), Supernova and the Eclipse family (dark and light).
3. **A neutral name carries no elemental meaning.** A word claimed by an element's lexicon (its `step0-<element>.md` productive list) or that is a medium, substance or phenomenon of one element (ash, ray, corona, mist, surge, void, bloom, tonic) is not neutral and is removed from the neutral pool. A bare action noun or pure effect word with no medium meaning (Beam, Ward, Shield, Barrier, Blast, Ambush, Field, Presence, Glare, Vault, Jolt as an impact) is neutral by definition and is removed from the element cell that borrowed it.
4. **Element ownership is settled by the mechanical fantasy** in section 5a of `docs/design/xalian-creature-system-redesign.md`, then by the element's `step0` productive list. Where the definitionally correct action and the owning element point at different existing locations and neither location is both, the name is held rather than forced.
5. **Nothing is cut on taste or on register.** Only the four duplicate classes below are in scope. A losing entry is removed from that one location only; it survives everywhere the ledger says it survives.

## Counts

| | |
|---|---|
| Names with a duplicate placement | 470 |
| Class 1, one name in more than one element's cells | 141 |
| Class 2, one name in two actions inside one element | 75 |
| Class 3, a neutral-pool name that also sits in an element cell | 208 |
| Class 4, a neutral name in more than one neutral action | 73 |
| Dispositions surviving in an element cell | 298 |
| Dispositions surviving in the neutral pool | 169 |
| Dispositions carrying a `(dual: x)` cross-reference | 15 |
| `HOLD` (left untouched, needs a ruling) | 3 |
| Entry removals the apply script will perform | 514 |

Class counts overlap: 470 distinct names carry 497 class memberships. Each name is listed **once**, in the lowest-numbered class it belongs to, and its reason names the other classes it also settles.

## Disposition column

`element/action` : the one location that survives; every other location listed is removed.
`element/action (dual: x)` : that location survives and gains a `(dual: x)` note; element `x` loses its copy but keeps the cross-reference.
`HOLD` : no location satisfies both the action definition and element ownership. Left exactly as it is; the apply script skips it.

## Class 1: the same name in more than one element file

141 names settled here.

| Name | Current locations | Disposition | Reason |
|---|---|---|---|
| Ash Fume | fire/cloud, ghost/cloud | fire/cloud | ash is fire's combustion residue; ghost has no ash medium |
| Ash Hail | fire/hurl, ghost/hurl | fire/hurl | ash is fire's combustion residue; ghost has no ash medium |
| Ash Haze | fire/cloud, ghost/cloud | fire/cloud | ash is fire's combustion residue; ghost has no ash medium |
| Ash Plume | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Rain | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Shower | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Spew | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Spray | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Sweep | fire/spray, ghost/lash | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Ash Vapor | fire/cloud, ghost/cloud | fire/cloud | ash is fire's combustion residue; ghost has no ash medium |
| Ash Wash | fire/spray, ghost/spray | fire/spray | ash is fire's combustion residue; ghost has no ash medium |
| Baleful Glare | light/terrorize, ghost/terrorize, neutral/terrorize | neutral/terrorize | baleful is a fear word with no medium, so the name is neutral (also class 3) |
| Blazing Ray | fire/beam, light/beam | fire/beam | blazing is fire's productive word carrying the composition; ray is the generic beam noun here |
| Blinding Glare | light/terrorize, electric/terrorize | light/terrorize | blinding is light's effect word |
| Bolt Beam | electric/beam, metal/beam | electric/beam | a beam of lightning is electric; metal has no beam of bolts |
| Bolt Blow | light/strike, metal/strike | metal/strike | bolt as a driven metal fastener; light owns no bolt |
| Bolt Hail | electric/hurl, metal/hurl | metal/hurl | hurl is a launched solid, so the quarrel sense (metal) owns the thrown-bolt names |
| Bolt Jab | light/strike, electric/strike | electric/strike | lightning-bolt sense with an impact verb; light owns no bolt |
| Bolt Punch | light/strike, electric/strike | electric/strike | lightning-bolt sense with an impact verb; light owns no bolt |
| Bolt Ram | light/shove, electric/strike, metal/crush, electric/shove | electric/shove | a ram is shove by definition and electric owns the impact sense of bolt; token added to electric/shove by hand (orchestrator, 2026-09-07) |
| Bolt Salvo | electric/hurl, metal/hurl | metal/hurl | hurl is a launched solid, so the quarrel sense (metal) owns the thrown-bolt names |
| Bolt Slam | light/strike, electric/strike | electric/strike | lightning-bolt sense with an impact verb; light owns no bolt |
| Bolt Snap | light/lash, electric/strike, metal/strike | electric/strike | lightning-bolt sense with an impact verb; light owns no bolt |
| Bolt Strike | electric/strike, metal/strike, neutral/ambush | electric/strike | lightning-bolt sense; the neutral ambush entry is both elemental and the wrong action (also class 3) |
| Bolt Volley | electric/hurl, metal/hurl | metal/hurl | hurl is a launched solid, so the quarrel sense (metal) owns the thrown-bolt names |
| Bolt Whip | light/lash, electric/lash | electric/lash | lightning-bolt sense with a whipping verb; light owns no bolt |
| Cascade Sweep | water/lash, electric/lash | water/lash | a cascade is falling water |
| Chain Charge | electric/ambush, metal/ambush | electric/ambush | chain effects are electric by 5a and a charge is a closing rush |
| Chain Lash | electric/lash, metal/lash | metal/lash | a physical chain is a metal flexible part; electric's chain is an adjective for linked effects |
| Chain Rush | electric/ambush, metal/ambush | electric/ambush | chain effects are electric by 5a and a rush is a closing rush |
| Corona | light/burst, electric/burst, neutral/burst | light/burst | a corona is a radiance phenomenon, not neutral (also class 3) |
| Corona Beam | light/beam, electric/beam | light/beam | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Burst | light/burst, electric/burst, neutral/burst | light/burst | a corona is a radiance phenomenon, not neutral (also class 3) |
| Corona Charge | light/ambush, electric/ambush | light/ambush | corona is a radiance phenomenon; both cells are ambush |
| Corona Discharge | light/hurl, electric/burst | electric/burst | corona discharge is literally an electrical phenomenon, and a discharge is an outward release, not a thrown solid |
| Corona Drain | light/drain, electric/drain | light/drain | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Nimbus | light/cloud, electric/cloud | light/cloud | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Plume | light/spray, electric/spray | light/spray | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Push | light/shove, electric/shove | light/shove | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Ring | light/burst, electric/burst | light/burst | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Rush | light/ambush, electric/ambush | light/ambush | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Sap | light/drain, electric/drain | light/drain | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Sheath | light/cloud, electric/cloud | light/cloud | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Shower | light/hurl, electric/hurl | light/hurl | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Spray | light/spray, electric/spray | light/spray | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Strike | light/strike, electric/strike | light/strike | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Sweep | light/lash, electric/lash | light/lash | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Corona Wreath | light/cloud, electric/cloud | light/cloud | a corona is a radiance phenomenon (light), not an arc phenomenon |
| Current Beam | water/beam, electric/beam | water/beam (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Charge | water/shove, electric/ambush | water/shove (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Drain | water/drain, electric/drain, air/drain | water/drain (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Ebb | water/drain, electric/drain, air/drain | water/drain (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Grip | water/snare, electric/drain | water/snare (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Intercept | water/ambush, electric/ambush | water/ambush (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Lash | water/lash, air/lash | water/lash | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Leech | water/drain, electric/drain | water/drain (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Ray | water/beam, electric/beam | water/beam (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Rush | water/ambush, electric/ambush | water/ambush (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Sap | water/drain, electric/drain, air/drain | water/drain (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Siphon | electric/drain, air/drain | electric/drain | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Snare | water/snare, electric/snare | water/snare (dual: electric) | current is definitionally both a flow of water and a flow of charge; water owns it, electric is a true dual, air is not an owner |
| Current Strike | electric/ambush, air/strike, water/strike | water/strike (dual: electric) | a strike is a direct blow and current is water owned with the electric dual; token added to water/strike by hand (orchestrator, 2026-09-07) |
| Ebb | water/drain, dark/drain, light/drain, neutral/drain | water/drain (dual: dark) | ebb is the tide going out and the tidal family is water-owned with a ratified dark dual (also class 3) |
| Eddy Snap | water/lash, air/ambush | water/lash | an eddy is a swirl in water first; air is not the owner |
| Effusion | ghost/spray, air/spray, neutral/spray | neutral/spray | an effusion is a pouring out with no elemental medium (also class 3) |
| Flash Blitz | light/ambush, electric/ambush | light/ambush | a flash is a burst of light |
| Flash Charge | light/strike, electric/ambush | electric/ambush | a charge is a closing rush (ambush), not a direct blow |
| Flash Pounce | light/ambush, electric/ambush, neutral/ambush | light/ambush | a flash is a burst of light, and flash is not neutral (also class 3) |
| Flash Strike | light/strike, electric/ambush | light/strike | a flash is a burst of light |
| Glare | light/terrorize, ice/beam, neutral/beam, neutral/terrorize | neutral/terrorize | glare is neutral by definition and a glare acts on courage, not as a projected line (also class 3 and 4) |
| Magnetic Pull | electric/snare, metal/drain | electric/snare | snare's definition names pulls; drain requires taking something, which a magnetic pull does not |
| Mist | water/cloud, air/cloud, neutral/cloud | water/cloud | mist is water's medium, named in the standing rule (also class 3) |
| Mist Curtain | water/cloud, air/ward | water/cloud | mist is water's medium; both readings are defensible so ownership decides |
| Mist Shroud | water/cloud, air/ward | water/cloud | mist is water's medium; both readings are defensible so ownership decides |
| Mist Spray | water/spray, air/spray | water/spray | mist is suspended water droplets; water owns it, air carries it where water has no cell |
| Mist Veil | water/cloud, air/ward | water/cloud | mist is water's medium; both readings are defensible so ownership decides |
| Mist Wash | ghost/spray, air/spray | air/spray | mist is suspended water droplets; water owns it, air carries it where water has no cell |
| Momentum Drain | dark/drain, air/drain | dark/drain | momentum is mass-motion, dark's inertia and inevitability |
| Momentum Push | dark/shove, air/shove | dark/shove | momentum is mass-motion, dark's inertia and inevitability |
| Momentum Shove | dark/shove, air/shove | dark/shove | momentum is mass-motion, dark's inertia and inevitability |
| Momentum Slam | dark/strike, air/strike | dark/strike | momentum is mass-motion, dark's inertia and inevitability |
| Numbing Lash | electric/lash, ice/lash | ice/lash | numbness is the canonical cold effect; electric's word is stun |
| Numbing Sap | electric/drain, ice/drain | ice/drain | numbness is the canonical cold effect; electric's word is stun |
| Overload Press | light/crush, electric/crush | electric/crush | overload is a circuit word; light's 5a word is overcharge |
| Overload Punch | light/strike, electric/strike | electric/strike | overload is a circuit word; light's 5a word is overcharge |
| Overload Push | light/shove, electric/shove | electric/shove | overload is a circuit word; light's 5a word is overcharge |
| Overload Slam | light/strike, electric/strike | electric/strike | overload is a circuit word; light's 5a word is overcharge |
| Overload Strike | light/strike, electric/strike | electric/strike | overload is a circuit word; light's 5a word is overcharge |
| Petrifying Glare | light/terrorize, ice/terrorize, neutral/terrorize | neutral/terrorize | petrifying is a fear idiom with no medium, so the name is neutral (also class 3) |
| Piercing Jab | light/strike, ice/strike | light/strike | light owns pierce by 5a (precision energy, pierce) |
| Piercing Rake | light/rake, ice/rake | light/rake | light owns pierce by 5a (precision energy, pierce) |
| Pressure Crush | water/crush, dark/crush, air/crush | water/crush | orchestrator override: hydrostatic pressure is the crush identity water was consolidated on (Crushing Depths, Water Pressure, Hydrostatic Crush); air keeps the other pressure names |
| Pressure Drain | dark/drain, air/drain | air/drain | pressure is air's barometric medium by 5a (weather, push and pull) |
| Pressure Jet | water/beam, air/beam | air/beam | pressure is air's barometric medium by 5a (weather, push and pull) |
| Pressure Tap | dark/drain, air/drain | air/drain | pressure is air's barometric medium by 5a (weather, push and pull) |
| Searing Blow | fire/strike, light/strike, ice/strike | fire/strike | sear is fire's heat word; ice's searing cold is a figure of speech |
| Searing Strike | fire/strike, ice/strike | fire/strike | sear is fire's heat word; ice's searing cold is a figure of speech |
| Squall Burst | electric/burst, air/burst | air/burst | ratified: squall is air-owned on the wind-first definition |
| Static Drain | electric/drain, ice/drain | electric/drain | static is electric's medium; ice's reading is the stasis pun |
| Surge | water/shove, light/shove, electric/shove, neutral/mend | water/shove (dual: electric) | surge is water-owned with an electric dual; mend is false for a surge (also class 3) |
| Surge Barrage | light/rake, electric/hurl | electric/hurl | a barrage is launched solids (hurl); light owns no surge |
| Surge Buffet | water/shove, light/shove | water/shove | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Burst | water/burst, electric/burst | water/burst (dual: electric) | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Charge | water/strike, light/strike, electric/ambush | electric/ambush | a charge is a closing rush (ambush), not a direct blow; electric is the dual medium holding that cell |
| Surge Flurry | water/rake, light/rake | water/rake | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Push | light/shove, electric/shove | electric/shove | light owns no surge; electric is the dual medium |
| Surge Rend | water/rake, light/rake | water/rake | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Shove | water/shove, light/shove | water/shove | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Slam | water/strike, light/strike | water/strike | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Strike | water/strike, light/strike, electric/ambush | water/strike (dual: electric) | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Thrust | water/shove, light/shove | water/shove | surge is definitionally both a storm surge and an electrical surge; water owns it, electric is a true dual, light is not an owner |
| Surge Volley | water/rake, electric/hurl | electric/hurl | a volley is launched solids (hurl); water's cell is rake, which is false for a volley |
| Talon Crush | air/crush, metal/crush | air/crush | talons are the flier's instrument and air owns the winged register; metal's talon is a machine metaphor |
| Vacuum Absorb | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vacuum Drain | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vacuum Draw | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vacuum Extraction | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vacuum Pull | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vacuum Siphon | dark/drain, air/drain | air/drain | a vacuum is a pressure state of a medium, which is air's fantasy; dark owns void, not vacuum |
| Vapor Discharge | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Drain | ghost/drain, air/drain | air/drain | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Gout | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Jet | ghost/beam, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Spew | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Spray | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Vent | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Vapor Wash | ghost/spray, air/spray | air/spray | vapor is an airborne phase of matter, not a spectral substance |
| Void Clasp | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Clutch | dark/snare, air/snare | dark/snare | void is dark's medium by 5a (gravity, void and time) |
| Void Collapse | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Compact | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Compress | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Crumple | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Dread | dark/terrorize, air/terrorize | dark/terrorize | void is dark's medium by 5a (gravity, void and time) |
| Void Grip | dark/crush, air/snare | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Implode | dark/crush, air/crush | dark/crush | void is dark's medium by 5a (gravity, void and time) |
| Void Loom | dark/terrorize, air/terrorize | dark/terrorize | void is dark's medium by 5a (gravity, void and time) |
| Void Presence | dark/terrorize, air/terrorize | dark/terrorize | void is dark's medium by 5a (gravity, void and time) |
| Void Stare | dark/terrorize, air/terrorize | dark/terrorize | void is dark's medium by 5a (gravity, void and time) |
| Wire Whip | electric/lash, metal/lash | metal/lash | wire is a metal artifact; electric's medium is current, not hardware |
| Withering Sap | fire/drain, ghost/drain | ghost/drain | decay-drain is ghost's fantasy; fire's word is burning |

## Class 2: the same name in two actions inside one element

75 names settled here.

| Name | Current locations | Disposition | Reason |
|---|---|---|---|
| Acid Arc | chemical/lash, chemical/spray | chemical/spray | an arc or fan of liquid is a projected sheet (spray), not a whipping blow |
| Acid Cascade | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Acid Deluge | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Acid Discharge | chemical/beam, chemical/spray | chemical/spray | a discharge or emission is an unfocused release (spray); beam requires focus |
| Acid Emission | chemical/beam, chemical/spray | chemical/spray | a discharge or emission is an unfocused release (spray); beam requires focus |
| Acid Fan | chemical/lash, chemical/spray | chemical/spray | an arc or fan of liquid is a projected sheet (spray), not a whipping blow |
| Acid Jet | chemical/beam, chemical/spray | chemical/beam | a jet is a focused line; standing ruling puts jet in beam |
| Acid Rain | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Acid Shower | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Acid Torrent | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Acid Vapor | chemical/spray, chemical/cloud | chemical/cloud | a vapor lingers in place, which is cloud by definition |
| Acid Vent | chemical/spray, chemical/burst | chemical/spray | a vent projects a stream (spray) rather than releasing outward from the body |
| Antidote | chemical/ward, chemical/mend, neutral/mend | chemical/mend | antidote is chemical's medium and an antidote restores (mend), not shields (also class 3) |
| Baleful Aura | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Baleful Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Cold Clutch | ghost/drain, ghost/crush | ghost/crush | a clutch is a squeezing hold; the name does not say it takes anything |
| Corrosive Discharge | chemical/beam, chemical/spray | chemical/spray | a discharge or emission is an unfocused release (spray); beam requires focus |
| Corrosive Grip | chemical/snare, chemical/crush | chemical/snare | standing ruling: grip lives in snare |
| Dread Aura | ghost/cloud, ghost/terrorize, neutral/terrorize | ghost/cloud | an aura is an occupied volume (cloud); the ghost terrorize copy and the neutral copy both lose (also class 3) |
| Dread Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Dreadful Aura | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Effluvium | chemical/spray, chemical/cloud, neutral/cloud | chemical/cloud | effluvium is chemical's medium and it lingers (cloud), not sprays (also class 3) |
| Fear Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Fume Choke | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Fume Screen | chemical/cloud, chemical/ward | chemical/ward | an interposed covering (screen, curtain, veil, mantle) protects the user, which is ward |
| Fume Smother | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Gas Choke | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Gas Smother | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Grave Gloom | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Grave Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Grave Shroud | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |
| Grave Veil | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |
| Horror Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Neutralizer | chemical/ward, chemical/mend | chemical/mend | an antidote or neutralizer restores rather than shields |
| Phantom Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Piercing Gaze | psychic/strike, psychic/beam | psychic/beam | a gaze is a projected line, not a physical blow |
| Piercing Stare | psychic/strike, psychic/beam | psychic/beam | a stare is a projected line, not a physical blow |
| Reagent Volley | chemical/hurl, chemical/spray | chemical/hurl | a volley is launched solids (hurl) |
| Shade Clutch | ghost/drain, ghost/crush | ghost/crush | a clutch is a squeezing hold; the name does not say it takes anything |
| Shade Grasp | ghost/drain, ghost/snare | ghost/snare | a grasp seizes and holds; standing ruling puts grip and grasp in snare |
| Sinister Aura | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Sinister Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Sludge Deluge | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Sludge Torrent | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Spectral Aura | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Spectral Gloom | ghost/cloud, ghost/terrorize | ghost/cloud | an aura or gloom is an occupied volume, which is cloud |
| Spectral Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Spectral Shroud | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |
| Spectral Veil | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |
| Terror Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Tide Slam | water/strike, water/shove | water/strike | slam is an impact verb; standing ruling sends impact verbs to strike |
| Toxic Arc | chemical/lash, chemical/spray | chemical/spray | an arc or fan of liquid is a projected sheet (spray), not a whipping blow |
| Toxic Blast (same flag) | chemical/spray, chemical/burst | chemical/burst | a blast is an outward release from the body |
| Toxic Choke | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Toxic Curtain | chemical/cloud, chemical/ward | chemical/ward | an interposed covering (screen, curtain, veil, mantle) protects the user, which is ward |
| Toxic Deluge | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Toxic Emission | chemical/beam, chemical/spray | chemical/spray | a discharge or emission is an unfocused release (spray); beam requires focus |
| Toxic Fan | chemical/lash, chemical/spray | chemical/spray | an arc or fan of liquid is a projected sheet (spray), not a whipping blow |
| Toxic Flare | chemical/beam, chemical/burst | chemical/burst | a flare is an outward release, not a focused line |
| Toxic Mantle | chemical/cloud, chemical/ward | chemical/ward | an interposed covering (screen, curtain, veil, mantle) protects the user, which is ward |
| Toxic Rain | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Toxic Repel | chemical/shove, chemical/ward | chemical/shove | repel drives the target back, which is shove by definition |
| Toxic Shower | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Toxic Smother | chemical/cloud, chemical/crush | chemical/cloud | gas smothers as a lingering volume; crush is mechanical pressure applied and held |
| Toxic Veil | chemical/cloud, chemical/ward | chemical/ward | an interposed covering (screen, curtain, veil, mantle) protects the user, which is ward |
| Uncanny Strike | psychic/strike, psychic/ambush | psychic/strike | the name says strike, a single direct blow |
| Vengeful Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Venom Deluge | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Venom Discharge | chemical/beam, chemical/spray | chemical/spray | a discharge or emission is an unfocused release (spray); beam requires focus |
| Venom Jet | chemical/beam, chemical/spray | chemical/beam | a jet is a focused line; standing ruling puts jet in beam |
| Venom Shower | chemical/hurl, chemical/spray | chemical/spray | a downpour of liquid is a projected shower (spray), not a launched solid |
| Wraith Clutch | ghost/drain, ghost/crush | ghost/crush | a clutch is a squeezing hold; the name does not say it takes anything |
| Wraith Presence | ghost/cloud, ghost/terrorize | ghost/terrorize | a presence is felt on the will, which is terrorize |
| Wraith Shroud | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |
| Wraith Veil | ghost/cloud, ghost/ward | ghost/ward | a shroud or veil is an interposed covering that protects the user |

## Class 3: a neutral-pool name that also sits in an element cell

194 names settled here.

| Name | Current locations | Disposition | Reason |
|---|---|---|---|
| Abrasion | sand/rake, neutral/rake | sand/rake | abrasion is erosion, sand's 5a fantasy |
| Aegis | psychic/ward, neutral/ward | neutral/ward | a bare defensive noun with no medium |
| Aftershock | rock/burst, neutral/burst | rock/burst | aftershock is a seismic word, rock's medium |
| Ambush | sand/ambush, neutral/ambush | neutral/ambush | the bare action noun is neutral by definition |
| Anvil Press | metal/crush, neutral/crush | metal/crush | the anvil is metal's machinery vocabulary |
| Attrition | dark/drain, neutral/drain | dark/drain | attrition is dark's wearing-down vocabulary, claimed by its lexicon |
| Aura | light/ward, neutral/cloud, neutral/terrorize | neutral/cloud | aura is a registry channel and a generic emanation; an aura is an occupied volume (cloud) (also class 4) |
| Aureole | light/ward, neutral/burst | light/ward | an aureole is a halo, a light phenomenon (cell tension noted: burst would read better) |
| Avalanche | ice/burst, neutral/crush | ice/burst | an avalanche is snow, ice's medium (cell tension noted: burst is a poor fit) |
| Baleful Stare | light/terrorize, neutral/terrorize | neutral/terrorize | baleful is a fear word with no medium |
| Barrier | chemical/ward, neutral/ward | neutral/ward | named neutral by the standing rule |
| Bastion | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Beam | light/beam, neutral/beam | neutral/beam | the bare action noun is neutral by definition |
| Benediction | light/mend, neutral/ward | neutral/ward | a religious-register protection word with no medium |
| Blast | air/burst, neutral/beam, neutral/spray, neutral/burst | neutral/burst | named neutral by the standing rule; a blast is an outward release (also class 4) |
| Blessing | light/mend, neutral/ward | neutral/ward | a religious-register protection word with no medium |
| Bloom | plant/mend, neutral/burst, neutral/mend | plant/mend | bloom is plant's medium, named in the standing rule (also class 4) |
| Blowback | air/shove, neutral/shove | air/shove | blow is air's lexicon word |
| Blowout | sand/burst, neutral/burst | neutral/burst | a bare burst word with no medium |
| Bolt | metal/ambush, neutral/ambush, neutral/beam, neutral/hurl | metal/ambush | bolt is element-claimed (lightning and quarrel), so it cannot sit in the neutral pool; the quarrel-speed sense stays in metal (also class 4) |
| Bolt Throw | metal/hurl, neutral/hurl | metal/hurl | bolt as a quarrel is metal's artifact |
| Bone Chill | ice/terrorize, neutral/terrorize | neutral/terrorize | a fear idiom naming an emotion, not cold |
| Boring Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Boulder | rock/hurl, neutral/crush | rock/hurl | boulder is rock's medium |
| Bounty | plant/mend, neutral/mend | plant/mend | bounty is plant's growth vocabulary |
| Bristling Display | electric/terrorize, neutral/terrorize | neutral/terrorize | an anatomy display, instrument-tagged, with no medium |
| Buffer | chemical/ward, neutral/ward | neutral/ward | a bare defensive noun with no medium |
| Bulwark | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Buttress | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Canopy | plant/ward, neutral/cloud | plant/ward | canopy is plant's medium |
| Chilling Presence | psychic/terrorize, neutral/terrorize | neutral/terrorize | a fear idiom with no medium |
| Clamp Down | metal/crush, neutral/crush | metal/crush | clamp is metal's machinery vocabulary |
| Cloak | sand/ward, neutral/cloud | sand/ward | cloak is claimed by sand's lexicon (conceal is sand's 5a fantasy) |
| Collapse | sand/crush, neutral/crush | neutral/crush | a bare structural effect word with no medium |
| Collapsing Grip | dark/snare, neutral/crush | dark/snare | collapse under gravity is dark's medium |
| Compaction | dark/crush, neutral/crush | neutral/crush | a bare pressure noun with no medium |
| Concentrated Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Constriction | plant/crush, neutral/crush | neutral/crush | a bare pressure noun with no medium |
| Convergence | light/beam, neutral/beam | neutral/beam | an abstract geometry word with no medium |
| Converging Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Courage Drain | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Cowing Stare | psychic/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Creeping Strike | ghost/ambush, neutral/ambush | neutral/ambush | a stealth manner word; concealment is the stealthy trait, never elemental |
| Crushing Presence | rock/terrorize, neutral/terrorize | neutral/terrorize | crushing is an action word, not a medium |
| Deluge | water/burst, neutral/spray | water/burst | deluge is water's medium (cell tension noted: spray reads better) |
| Directed Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Discharge | electric/drain, neutral/beam, neutral/spray, neutral/burst | neutral/burst | a discharge is an outward release; drain is false because a discharge gives rather than takes (also class 4) |
| Discharge Volley | electric/hurl, neutral/spray | electric/hurl | a volley is launched solids (hurl), not a shower |
| Dread | psychic/terrorize, neutral/terrorize | neutral/terrorize | a bare fear word with no medium |
| Drifting Veil | air/cloud, neutral/cloud | air/cloud | drift is air's lexicon word |
| Drilling Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Elixir | chemical/mend, neutral/mend | chemical/mend | elixir is chemical's alchemical medium |
| Essence | chemical/mend, neutral/drain | chemical/mend | essence is chemical's extract vocabulary |
| Essence Siphon | chemical/drain, neutral/drain | chemical/drain | essence is chemical's extract vocabulary |
| Etching Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Fan | air/spray, neutral/spray | neutral/spray | a bare spray-shape word with no medium |
| Fell Blow | ghost/strike, neutral/strike | neutral/strike | fell means cruel; no medium |
| Field | electric/cloud, neutral/cloud | neutral/cloud | named neutral by the standing rule |
| Film | chemical/ward, neutral/cloud | chemical/ward | film is chemical's slick-layer medium |
| Fine Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Flare | light/burst, neutral/burst | light/burst | a flare is a light phenomenon |
| Flare Burst | light/burst, neutral/burst | light/burst | a flare is a light phenomenon |
| Flourish | plant/mend, neutral/mend | plant/mend | flourish is plant's growth vocabulary |
| Focal Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Focus Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Focused Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Fog | water/cloud, neutral/cloud | water/cloud | fog is condensed water vapor |
| Fountain Spray | water/spray, neutral/spray | water/spray | a fountain is water's medium |
| Fume | chemical/cloud, neutral/cloud | chemical/cloud | fume is chemical's medium |
| Geyser | water/burst, neutral/spray | water/burst | a geyser is water's medium |
| Gleam | ice/beam, neutral/beam | ice/beam | a gleam is a light phenomenon and so not neutral; ice supplies the reflecting medium here |
| Gloom | ghost/cloud, neutral/cloud, neutral/terrorize | ghost/cloud | gloom is a dimness phenomenon claimed by ghost's lexicon (also class 4) |
| Gout | air/spray, neutral/spray | neutral/spray | a bare projection noun with no medium |
| Grace | light/mend, neutral/ward | neutral/ward | a religious-register protection word with no medium |
| Grinding Press | metal/crush, neutral/crush | metal/crush | grinding is metal's machinery vocabulary |
| Hairline Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Halo Burst | electric/burst, neutral/burst | electric/burst | halo is a light phenomenon so the name is not neutral; kept in electric because no light cell holds it (flagged for a later move) |
| Hammer Blow | rock/strike, neutral/strike | neutral/strike | hammer is a tool word with no medium |
| Hanging Murk | psychic/cloud, neutral/cloud | psychic/cloud | murk is an elemental dimness word, so the name is not neutral |
| Haze | air/cloud, neutral/cloud | air/cloud | haze is air's medium |
| Impaling Lance | light/beam, neutral/beam | neutral/beam | lance is a weapon word with no medium |
| Insulation | electric/ward, neutral/ward | neutral/ward | a bare defensive noun with no medium |
| Jolt | electric/mend, neutral/strike, neutral/shove | neutral/strike | jolt as an impact is neutral by definition, and a jolt is a direct blow (also class 4) |
| Jolt Strike | electric/ambush, neutral/strike | neutral/strike | jolt as an impact is neutral; ambush is false for a named strike |
| Looming Presence | ghost/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Lurking Strike | ghost/ambush, neutral/ambush | neutral/ambush | a stealth manner word; concealment is the stealthy trait |
| Malevolent Presence | ghost/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Mantle | light/ward, neutral/cloud, neutral/ward | neutral/ward | the garment sense has no medium and a mantle is worn cover (ward) (also class 4) |
| Mass Hurl | dark/hurl, neutral/hurl | dark/hurl | mass is dark's gravity vocabulary |
| Miasma | chemical/cloud, neutral/cloud | chemical/cloud | miasma is chemical's medium |
| Millstone | dark/crush, neutral/crush | dark/crush | millstone is dark's weight vocabulary, claimed by its lexicon |
| Momentum Strike | air/strike, neutral/shove | air/strike | momentum is not neutral; kept in air because no dark strike cell holds it (flagged for a later move to dark) |
| Murk | ghost/cloud, neutral/cloud | ghost/cloud | murk is a dimness phenomenon, ghost's medium |
| Narrow Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Needle Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Nerve Breaker | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Nerve Fray | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Nimbus | light/ward, neutral/cloud | light/ward | a nimbus is a halo, light's phenomenon (cell tension noted: cloud reads better) |
| Numbing Dread | electric/terrorize, neutral/terrorize | neutral/terrorize | a fear word; the numbing modifier names the emotion, not a medium |
| Overawing Presence | light/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Pall | ghost/cloud, neutral/cloud | ghost/cloud | a pall is a funeral cloth, ghost's medium |
| Paralyzing Glare | psychic/terrorize, neutral/terrorize | neutral/terrorize | a fear idiom with no medium |
| Piercing Lance | light/beam, neutral/beam | neutral/beam | lance is a weapon word with no medium |
| Piercing Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Pinpoint Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Plummeting Mass | dark/hurl, neutral/hurl | dark/hurl | mass is dark's gravity vocabulary |
| Precision Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Predatory Glare | light/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Predatory Stare | light/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Presence Field | psychic/cloud, neutral/cloud | neutral/cloud | presence and field are both neutral words |
| Pressure Lock | air/snare, neutral/crush | air/snare | pressure is air's medium and a lock holds the target (snare) |
| Pressure Wave | air/shove, neutral/shove | air/shove | pressure is air's medium |
| Prowling Strike | ghost/ambush, neutral/ambush | neutral/ambush | a stealth manner word; concealment is the stealthy trait |
| Radiant Pulse | light/burst, neutral/burst | light/burst | radiance is light's medium |
| Rampart | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Rapier Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Ray | light/beam, neutral/beam | light/beam | ray is light's medium, named in the standing rule |
| Redoubt | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Regeneration | plant/mend, neutral/mend | plant/mend | regrowth is plant's 5a fantasy |
| Regrowth | plant/mend, neutral/mend | plant/mend | regrowth is plant's 5a fantasy |
| Reprieve | psychic/mend, neutral/mend | neutral/mend | an abstract relief word with no medium |
| Resistance | electric/ward, neutral/ward | neutral/ward | a bare defensive noun with no medium |
| Resolve Breaker | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Respite | psychic/mend, neutral/mend | neutral/mend | an abstract relief word with no medium |
| Revival | electric/mend, neutral/mend | neutral/mend | a bare restoration word with no medium |
| Rockslide | rock/ambush, neutral/crush | rock/ambush | rockslide is rock's medium |
| Rubble | rock/hurl, neutral/crush | rock/hurl | rubble is rock's medium |
| Rushing Strike | air/ambush, neutral/ambush | neutral/ambush | a bare speed word with no medium |
| Sanctuary | psychic/ward, neutral/ward | neutral/ward | a bare defensive noun with no medium |
| Searing Line | light/beam, neutral/beam | light/beam | searing is fire-claimed so the name is not neutral; kept in light because no fire cell holds it (flagged) |
| Second Wind | air/mend, neutral/mend | neutral/mend | a fixed idiom for renewed energy; ratified as neutral in the grammar draft |
| Shackle | metal/snare, neutral/snare | metal/snare | a shackle is an iron restraint, metal's artifact |
| Shield | psychic/ward, neutral/ward | neutral/ward | named neutral by the standing rule |
| Shroud | ghost/cloud, neutral/cloud, neutral/ward | ghost/cloud | a shroud is a burial cloth, ghost's medium (cell tension noted: ward reads better) (also class 4) |
| Sighted Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Silent Menace | ghost/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Sinkhole | sand/snare, neutral/crush | sand/snare | a sinkhole is a sand and rock landform |
| Sinking Grip | sand/snare, neutral/snare | sand/snare | sinking is sand's burial vocabulary |
| Siphon | water/drain, neutral/drain | water/drain | a siphon is a liquid transfer, water's medium |
| Skewering Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Skulking Strike | ghost/ambush, neutral/ambush | neutral/ambush | a stealth manner word; concealment is the stealthy trait |
| Sledge Blow | rock/strike, neutral/strike | neutral/strike | sledge is a tool word with no medium |
| Solace | psychic/mend, neutral/mend | neutral/mend | an abstract relief word with no medium |
| Solid Strike | rock/strike, neutral/strike | neutral/strike | a bare state word with no medium |
| Soothing Aura | psychic/mend, neutral/mend | neutral/mend | soothing and aura both carry no medium |
| Spearing Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Spirit Crush | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Spreading Gloom | psychic/cloud, neutral/cloud | psychic/cloud | gloom is an elemental dimness word, so the name is not neutral |
| Spring | metal/ambush, neutral/ambush | neutral/ambush | in the ambush cell spring is the leap verb, which carries no metal meaning |
| Sputter | air/spray, neutral/spray | neutral/spray | a bare projection noun with no medium |
| Stalking Presence | ghost/terrorize, neutral/terrorize | neutral/terrorize | a stealth and fear word with no medium |
| Stalking Strike | ghost/ambush, neutral/ambush | neutral/ambush | a stealth manner word; concealment is the stealthy trait |
| Standing Mist | water/cloud, neutral/cloud | water/cloud | mist is water's medium |
| Steady Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Straight Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Streak | light/lash, neutral/ambush, neutral/beam | light/lash | a streak is a line of light, claimed by light's lexicon (cell tension noted: beam reads better) (also class 4) |
| Streaking Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| Stronghold | rock/ward, neutral/ward | neutral/ward | a fortification word with no medium |
| Suffocating Presence | sand/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Sustained Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Sweep | light/lash, neutral/lash | neutral/lash | a bare sweeping-manner noun with no medium |
| Sweeping Charge | air/ambush, neutral/shove | air/ambush | a charge is a closing rush (ambush); the neutral shove copy is the wrong action |
| Sweeping Strike | air/ambush, neutral/lash | neutral/lash | a sweeping blow is lash by definition and the name carries no medium |
| Swoop | air/ambush, neutral/ambush | air/ambush | a swoop is a flight maneuver, air's 5a fantasy |
| Thickening Haze | psychic/cloud, neutral/cloud | psychic/cloud | haze is an elemental word, so the name is not neutral |
| Threaded Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Toll | dark/drain, neutral/drain | dark/drain | toll is dark's inevitability vocabulary, claimed by its lexicon |
| Tonic | chemical/mend, neutral/mend | chemical/mend | tonic is chemical's medium, named in the standing rule |
| Torrent | water/lash, neutral/spray | water/lash | torrent is water's medium (cell tension noted: spray reads better) |
| Torrent Volley | water/hurl, neutral/spray | water/hurl | torrent is water's medium and a volley is launched solids |
| Torrent Wash | water/spray, neutral/spray | water/spray | torrent is water's medium |
| Tracing Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Trained Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Transfixing Ray | light/beam, neutral/beam | light/beam | ray is light's medium |
| True Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Unbroken Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Unsettling Presence | light/terrorize, neutral/terrorize | neutral/terrorize | a fear word with no medium |
| Upheaval | sand/burst, neutral/shove, neutral/burst | sand/burst | upheaval is an earth-heaving word claimed by rock and sand (also class 4) |
| Vacuum | air/drain, neutral/drain | air/drain | a vacuum is a pressure state of air |
| Vapor | air/cloud, neutral/cloud | air/cloud | vapor is an airborne phase of matter |
| Vault | rock/terrorize, neutral/ambush | neutral/ambush | named neutral by the standing rule; the rock terrorize placement fails the definition |
| Vector Beam | light/beam, neutral/beam | neutral/beam | beam is the neutral action noun and the modifier carries no medium |
| Veil | psychic/ward, neutral/cloud, neutral/ward | neutral/ward | the garment sense has no medium and a veil is interposed cover (ward) (also class 4) |
| Vent | air/spray, neutral/spray | neutral/spray | a bare projection noun with no medium (instrument-tagged) |
| Vise Grip | metal/snare, neutral/crush | neutral/crush | a vise is a clamping tool, which is crush by definition; the metal snare placement is the wrong action |
| Vise Lock | metal/snare, neutral/crush | neutral/crush | a vise is a clamping tool, which is crush by definition; the metal snare placement is the wrong action |
| Ward | psychic/ward, neutral/ward | neutral/ward | the bare action noun is neutral by definition |
| Watchful Ward | psychic/ward, neutral/ward | neutral/ward | ward is the neutral action noun and watchful carries no medium |
| Willbreaker | psychic/terrorize, neutral/terrorize | neutral/terrorize | a will-effect word, the action's own vocabulary |
| Windmill Strike | air/lash, neutral/lash | air/lash | windmill is a wind machine, air's word, and a windmill blow is a sweeping one |
| Withering Clutch | ghost/drain, neutral/drain | ghost/drain | wither is a decay phenomenon claimed by ghost's lexicon and the name says it takes |
| Withering Glare | light/terrorize, neutral/terrorize | neutral/terrorize | withering glare is a fixed idiom about a look, not about decay |
| Withering Grasp | ghost/drain, neutral/drain | ghost/drain | wither is a decay phenomenon claimed by ghost's lexicon and the name says it takes |
| Withering Touch | ghost/drain, neutral/drain | ghost/drain | wither is a decay phenomenon claimed by ghost's lexicon and the name says it takes |

## Class 4: a neutral name in more than one neutral action

60 names settled here.

| Name | Current locations | Disposition | Reason |
|---|---|---|---|
| Arc | neutral/lash, neutral/spray | neutral/lash | an arc is a swept curve, which is lash |
| Backlash | neutral/shove, neutral/burst | neutral/shove | a backlash drives the target back |
| Barge | neutral/strike, neutral/shove | neutral/shove | a displacement verb; standing ruling sends barge to shove |
| Barrage | neutral/rake, neutral/hurl, neutral/spray | neutral/hurl | a barrage is launched solids |
| Barreling Charge | neutral/shove, neutral/ambush | neutral/ambush | a charge is a burst of closing speed |
| Bash | neutral/strike, neutral/shove | neutral/strike | an impact verb; standing ruling sends bash to strike |
| Bind | neutral/snare, neutral/crush | neutral/snare | binding holds the target in place |
| Body Check | neutral/strike, neutral/shove | neutral/shove | a check displaces rather than wounds |
| Body Slam | neutral/strike, neutral/shove | neutral/strike | an impact verb; standing ruling sends slam to strike |
| Bolster | neutral/ward, neutral/mend | neutral/ward | bolstering braces the user |
| Brace | neutral/ward, neutral/mend | neutral/ward | bracing is ward by definition |
| Buckle | neutral/shove, neutral/crush | neutral/crush | to buckle is to fail under held pressure |
| Buffet | neutral/strike, neutral/shove | neutral/shove | a displacement verb; standing ruling sends buffet to shove |
| Butt | neutral/strike, neutral/shove | neutral/strike | a single direct blow |
| Charge | neutral/strike, neutral/shove, neutral/ambush | neutral/ambush | a charge is a burst of closing speed that ends in a hit |
| Chop | neutral/strike, neutral/rake | neutral/rake | a chop opens the target; cut and tear are rake |
| Clasp | neutral/snare, neutral/crush | neutral/snare | clasping holds the target in place |
| Clout | neutral/strike, neutral/shove | neutral/strike | a single direct blow |
| Clutch | neutral/snare, neutral/crush | neutral/snare | standing ruling: grip and its family live in snare |
| Coil | neutral/snare, neutral/crush | neutral/snare | coiling binds the target in place |
| Collision | neutral/strike, neutral/shove | neutral/strike | lands with impact |
| Compress | neutral/crush, neutral/mend | neutral/crush | compression is crush by definition |
| Concussion | neutral/strike, neutral/shove, neutral/burst | neutral/strike | a concussive blow lands with impact |
| Crack | neutral/strike, neutral/lash | neutral/lash | the whip-crack sense; a crack is the sound of a swept blow |
| Emission | neutral/beam, neutral/spray | neutral/spray | an emission is unfocused, so spray rather than beam |
| Expulsion | neutral/spray, neutral/burst | neutral/spray | expulsion ejects matter outward as a stream |
| Flail | neutral/lash, neutral/rake | neutral/lash | flailing is a wild sweeping blow |
| Fortify | neutral/ward, neutral/mend | neutral/ward | fortifying braces the user |
| Full Discharge | neutral/spray, neutral/burst | neutral/burst | a total release outward from the body |
| Fusillade | neutral/rake, neutral/hurl, neutral/spray | neutral/hurl | a fusillade is launched solids |
| Grip | neutral/snare, neutral/crush | neutral/snare | standing ruling: grip lives in snare |
| Heave | neutral/shove, neutral/hurl | neutral/hurl | a heave lifts and throws |
| Hold Fast | neutral/ward, neutral/snare | neutral/ward | holding fast braces the user |
| Impact | neutral/strike, neutral/shove | neutral/strike | lands with impact |
| Jab | neutral/strike, neutral/ambush | neutral/strike | a single direct blow |
| Jet | neutral/beam, neutral/spray | neutral/beam | standing ruling: jet is beam's |
| Onslaught | neutral/rake, neutral/ambush | neutral/ambush | an onslaught closes and lands |
| Plume | neutral/spray, neutral/cloud | neutral/cloud | a plume lingers in place |
| Presence | neutral/cloud, neutral/terrorize | neutral/terrorize | named neutral by the standing rule, and a presence is felt on the will |
| Ram | neutral/strike, neutral/shove, neutral/crush | neutral/shove | the registry names rams under shove |
| Reeling Blow | neutral/strike, neutral/shove | neutral/strike | a blow wounds; shove is force that moves rather than wounds |
| Reinforcement | neutral/ward, neutral/mend | neutral/ward | reinforcing braces the user |
| Repel | neutral/shove, neutral/ward | neutral/shove | repelling drives the target back |
| Repulse | neutral/shove, neutral/ward | neutral/shove | repulsing drives the target back |
| Screen | neutral/cloud, neutral/ward | neutral/ward | a screen is interposed cover that protects |
| see below) | neutral/rake, neutral/hurl, neutral/ward, neutral/crush | HOLD | not a name: a bundler artifact from a parenthetical note containing a comma; the fix belongs in the parser or the note, not in a dedupe pass |
| Shaft | neutral/beam, neutral/hurl | neutral/beam | a shaft is a focused line |
| Shockwave | neutral/shove, neutral/burst | neutral/burst | a shockwave releases outward and hits everything close |
| Shoulder Charge | neutral/strike, neutral/shove | neutral/shove | no ambush cell holds it; a shoulder charge displaces |
| Slam | neutral/strike, neutral/shove | neutral/strike | an impact verb; standing ruling sends slam to strike |
| Slash | neutral/lash, neutral/rake | neutral/rake | standing ruling: slash, cut and tear are rake |
| Smash | neutral/strike, neutral/crush | neutral/strike | an impact verb; standing ruling sends smash to strike |
| Snap | neutral/strike, neutral/lash, neutral/ambush | neutral/strike | the snapping-jaws sense lands with impact |
| Staggering Blow | neutral/strike, neutral/shove | neutral/strike | a blow wounds; shove is force that moves rather than wounds |
| Tackle | neutral/strike, neutral/ambush | neutral/ambush | a tackle closes distance and ends in a hit |
| Vigor | neutral/drain, neutral/mend | neutral/mend | vigor restores |
| Vitality | neutral/drain, neutral/mend | neutral/mend | vitality restores |
| Volley | neutral/rake, neutral/hurl, neutral/spray | neutral/hurl | a volley is launched solids |
| Wallop | neutral/strike, neutral/shove | neutral/strike | a single heavy blow |
| Wide Arc | neutral/lash, neutral/spray | neutral/lash | a wide arc is a swept blow |

## Resulting removals per file and cell

514 entry removals across 104 cells and 15 files. A cell's declared count in its `**action (N):**` header is rewritten to the count the apply script parses after the removal, so a header may move by more or less than the number below if it was already out of step with its list.

| File | Entries removed | Per cell |
|---|---|---|
| `consolidated-air.md` | 36 | strike -1, lash -1, crush -6, shove -2, drain -5, ambush -3, spray -6, burst -1, cloud -1, snare -2, ward -3, mend -1, terrorize -4 |
| `consolidated-chemical.md` | 45 | lash -4, crush -7, beam -6, hurl -12, spray -6, burst -1, cloud -4, ward -5 |
| `consolidated-dark.md` | 11 | crush -2, drain -9 |
| `consolidated-electric.md` | 53 | strike -1, lash -5, shove -2, drain -9, ambush -10, beam -3, hurl -4, spray -2, burst -5, cloud -4, snare -1, ward -2, mend -2, terrorize -3 |
| `consolidated-fire.md` | 1 | drain -1 |
| `consolidated-ghost.md` | 60 | strike -1, lash -1, drain -5, ambush -5, beam -1, hurl -1, spray -14, cloud -20, terrorize -12 |
| `consolidated-ice.md` | 8 | strike -3, rake -1, drain -1, beam -1, terrorize -2 |
| `consolidated-light.md` | 65 | strike -12, lash -3, crush -1, rake -3, shove -6, drain -1, beam -24, hurl -1, ward -2, mend -3, terrorize -9 |
| `consolidated-metal.md` | 10 | strike -2, crush -1, drain -1, ambush -3, beam -1, snare -2 |
| `consolidated-plant.md` | 1 | crush -1 |
| `consolidated-psychic.md` | 24 | strike -2, ambush -1, cloud -1, ward -6, mend -4, terrorize -10 |
| `consolidated-rock.md` | 11 | strike -3, ward -6, terrorize -2 |
| `consolidated-sand.md` | 4 | crush -1, ambush -1, burst -1, terrorize -1 |
| `consolidated-water.md` | 5 | strike -1, crush -1, rake -1, shove -1, beam -1 |
| `neutral-pools.md` | 180 | strike -9, lash -3, crush -18, rake -6, shove -22, drain -12, ambush -7, beam -21, hurl -5, spray -17, burst -13, cloud -24, snare -3, ward -3, mend -14, terrorize -3 |

## Held names

| Name | Current locations | Why it is held |
|---|---|---|
| Bolt Ram | light/shove, electric/strike, metal/crush | ram is shove by definition but the only electric location is strike and the only shove location is light, which owns no bolt; needs an added electric/shove entry |
| Current Strike | electric/ambush, air/strike | current is water-owned with an electric dual, but the electric location is ambush (wrong for a strike) and the strike location is air, which is not an owner |
| see below) | neutral/rake, neutral/hurl, neutral/ward, neutral/crush | not a name: a bundler artifact from a parenthetical note containing a comma; the fix belongs in the parser or the note, not in a dedupe pass |

## Defects found while auditing, out of scope for this pass

These are parser or authoring defects the duplicate sweep surfaced. They are recorded here and deliberately not touched by the apply script.

- `consolidated-chemical.md` carries inline `(same flag)` notes inside name tokens. The bundler only strips `(dual: ...)`, `(cross ...)` and `(see ...)` parentheticals, so `Toxic Blast (same flag)` ships as a literal ability name. The ledger disposes it as the duplicate it is, but the note itself should be moved out of the token.
- `consolidated-chemical.md` also ships three tokens that are the tails of broken parentheticals: `Rock/Metal-leaning)`, `Fire/Light-leaning)` and `HIGH RISK)`. They are not duplicates, so no row here disposes them.
- `neutral-pools.md` carries notes with commas inside parentheses, for example the three-word cut note on `Flurry of Cuts`. The neutral parser splits on commas first, so the tail `see below)` ships as a name in four pools. It is listed as `HOLD` above; the fix belongs in the note or the parser.
- Ghost and air words leak into psychic's cloud cell (`Hanging Murk`, `Spreading Gloom`, `Thickening Haze`). They are single-placement names, so they are out of this pass's scope, but they are the same kind of leak class 1 exists to catch.
- `Halo Burst` (electric), `Searing Line` (light) and `Momentum Strike` (air) each carry a word owned by another element and have no cell in the owning element. They survive where they are, flagged in their rows, and want a later move rather than a removal.

## Class 5: surfaced after the bundler parser fix (2026-09-07, orchestrator)

The first bundle hid these behind unclosed parenthetical notes that shipped as garbage names; stripping the notes exposed the duplicates. Bolt Ram and Current Strike were the two held rows: their surviving tokens were added by hand to the cells named here before the apply script ran, so the script only removes.

| Name | Current locations | Disposition | Reason |
|---|---|---|---|
| Venom Bolt | chemical/ambush, chemical/hurl | chemical/hurl | a bolt of venom is a launched mass, not a closing rush |
| Toxic Discharge | chemical/beam, chemical/burst | chemical/burst | a discharge is an outward release, not a focused line |
| Acid Discharge | chemical/spray, chemical/burst | chemical/spray | the projected stream reading matches its siblings in spray |
| Caustic Discharge | chemical/spray, chemical/burst | chemical/spray | the projected stream reading matches its siblings in spray |
| Corrosive Discharge | chemical/spray, chemical/burst | chemical/spray | the projected stream reading matches its siblings in spray |
| Toxic Vapor | chemical/spray, chemical/cloud | chemical/cloud | a vapor lingers as a volume |
| Toxic Presence | chemical/cloud, chemical/terrorize | chemical/terrorize | a presence is felt on the will (the ghost rule) |
| Noxious Presence | chemical/cloud, chemical/terrorize | chemical/terrorize | a presence is felt on the will (the ghost rule) |
| Toxic Aura | chemical/cloud, chemical/terrorize | chemical/cloud | an aura is an occupied volume (the ghost rule) |
| Venomous Aura | chemical/cloud, chemical/terrorize | chemical/cloud | an aura is an occupied volume (the ghost rule) |
| Avalanche Barrage | ice/rake, ice/hurl | ice/hurl | a barrage is launched mass |
| Avalanche Charge | ice/shove, ice/ambush | ice/ambush | the ratified avalanche ruling homes it in ambush |
| Repulsion | psychic/shove, neutral/shove | neutral/shove | a bare physics word with no medium |
| Cloaking Veil | psychic/cloud, neutral/cloud | neutral/cloud | a cloak is no element's word; the neutral copy already exists |
| Boulder Bash | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Stone Bash | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Boulder Wallop | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Stone Wallop | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Boulder Jolt | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Stone Jolt | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Seismic Jolt | rock/strike, rock/shove | rock/strike | a bash, wallop or jolt is a landed blow; the shove copy came from an expanded slash shorthand |
| Boulder Charge | rock/strike, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); the strike copy came from an expanded slash shorthand |
| Granite Charge | rock/strike, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); the strike copy came from an expanded slash shorthand |
| Stone Charge | rock/strike, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); the strike copy came from an expanded slash shorthand |
| Hulking Charge | rock/strike, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); the strike copy came from an expanded slash shorthand |
| Cliff Charge | rock/strike, rock/shove, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); token added to rock/ambush by hand |
| Monolith Charge | rock/strike, rock/shove, rock/ambush | rock/ambush | charge compounds home in ambush (ratified); token added to rock/ambush by hand |
