# Creature asset contract (part 1 of the pipeline design)

Status: draft 1, 2026-10-14, for Nick's sign-off. Part 1 of the six-part design program in [creature-pipeline-design.md](creature-pipeline-design.md). This is the API between the production pipeline and every game: what a game receives for a species, what it may rely on, what it must do itself. Everything downstream (budgets, rig modules, stages, tooling) exists to produce something that satisfies this contract, so it is designed first.

Software analogy, and where it breaks: this is an interface definition for a versioned package. A game is a client that pins a package version and calls into it by name (clip names, event names, parameter names). Unlike a code package there is no type checker at the boundary, so the contract ships with a validator and every field a game reads is enumerated here, not inferred from files.

## Vocabulary

- **Asset**: everything a game receives for one species. One asset per species, serving every individual of that species.
- **glTF** (`.glb` when binary): the open 3D file format browsers load. It carries the mesh, skeleton, skinning, materials, textures and clips in one file.
- **Clip**: a named animation (idle, hurt). **Event**: a named moment inside a clip (`hit` at 0.42 s). A game acts on events; the asset never acts on game state.
- **Socket**: a named joint a game may attach something to or read a position from (the emitter, the eyes, the ground point).
- **Parameter**: a value the game sets per individual at load time (scale, finish).
- **Act**: an action in a creature record (`luceras-defining`, instrument `horns`, delivery `contact`). **Archetype**: the motion family a clip implements (lunge, spit, slam).
- **Sprite atlas**: a 2D image of frames plus a JSON manifest, rendered from the asset, in the existing `xalians-frame-atlas-v1` format.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | One asset per species; individuals differ only through runtime parameters (scale, finish). The asset never stores per-individual data | 90%: the generator rolls size and finish per individual and nothing else visible | `packages/content/src/creature/record.ts` lines 42 and 62; `creature.ts` size percentile |
| 2 | Assets are versioned independently of creature records. A record never names an asset version; a game pins a roster version. A new asset version never changes a creature's identity | 90%: creature genesis is immutable by platform rule; art will be revised | `docs/design/xalian-generation-system.md`; `creature-art-direction-review.md` ("art revisions need their own version") |
| 3 | The glTF is self-contained: textures embedded as KTX2, mesh compressed with meshopt, one file. Sprite atlases are separate files beside it | 80%: one request per creature; meshopt and KTX2 are standard three.js loader extensions | audit G17 |
| 4 | Every game acts only on the names in this contract: clip names, event names, socket names, parameter names. Joint names, mesh names and material names are not part of the contract | 90%: keeps rig changes from breaking games | this doc section 4 |
| 5 | Clip resolution for an act is three-tiered: an explicit map by act key, then by archetype derived from the act's instrument, delivery mode and mechanism, then the generic light or heavy act clip. A game never fails to find a clip | 85%: the act vocabulary is closed (7 delivery modes, 5 mechanisms, 27 instruments) | `docs/species-templates/v5/*.json`; `packages/content/src/creature/ability.ts` |
| 6 | The asset carries measured facts (triangles, joints, texture bytes, download bytes, clip lengths) in its manifest so a game can budget a scene without loading the file | 85% | audit G17 |
| 7 | The coordinate convention is glTF's: meters, Y up, the creature faces +Z, origin at the ground point under the body's center; floaters and the swarm keep the ground point as origin and declare a rest height | 95%: glTF specification | audit G13 |
| 8 | Sprite atlases keep the `xalians-frame-atlas-v1` manifest fields and add `facing` and trimmed-frame offsets as a `v2` superset; v1 readers still work | 80%: the two existing readers and tests cover v1 | `art/creature-motion-pilot/runtime/atlas-player.mjs` |
| 9 | The manifest is validated by a JSON Schema kept beside the pipeline (`art/pipeline/contract/`), run by the export stage and by any game's import; promotion of the schema into `packages/content` waits for Nick's approval because that package is shared | 90% | mission rules on shared packages |
| 10 | The finish is delivered as named material parameters (`finish.standard` and so on) whose visual recipe the style bible defines; the asset ships one material set, not four | 75%: four materials would quadruple texture memory; the recipes are undefined until the look is decided (part 6) | audit G20 |

## 1. Package layout

```
creatures/<species>/<assetVersion>/
  manifest.json          the contract document, validated
  <species>.glb          mesh, skeleton, skinning, materials, KTX2 textures, clips
  preview.png            one still at the standard three-quarter camera, 512 px
  sprites/<profile>/     derived atlases, one folder per profile (see section 7)
    manifest.json        xalians-frame-atlas-v2
    <clip>.<facing>.png
```

`assetVersion` is `major.minor.patch`. Major changes when a clip, event, socket or parameter name is removed or renamed (a game must change). Minor adds names. Patch changes only appearance within the same names. A game pins a roster version, which is a list of species to asset versions, kept in the game, never in creature records.

## 2. Manifest

```json
{
  "format": "xalians-creature-asset-v1",
  "species": "luceras",
  "assetVersion": "1.0.0",
  "file": "luceras.glb",
  "units": { "length": "meters", "up": "+Y", "forward": "+Z", "origin": "ground point under the body center" },
  "reference": { "heightCm": 57, "lengthCm": null, "restHeightCm": 0, "speciesBandCm": [48, 66] },
  "skeleton": { "class": "quadruped", "modules": ["spine", "neck_head", "leg_front", "leg_hind", "tail", "ear", "horn", "jaw"], "joints": 42, "influencesPerVertex": 4 },
  "sockets": { "ground": "root", "emitter": "horn_tip", "eye_l": "eye_l", "eye_r": "eye_r", "carry": "spine_02", "head": "head" },
  "clips": {
    "idle":        { "durationMs": 3000, "loop": true,  "events": [] },
    "hurt":        { "durationMs": 500,  "loop": false, "events": [{ "name": "impact", "timeMs": 80 }] },
    "faint":       { "durationMs": 1200, "loop": false, "events": [{ "name": "down", "timeMs": 900 }] },
    "act.light":   { "durationMs": 900,  "loop": false, "events": [{ "name": "hit", "timeMs": 380 }, { "name": "recover", "timeMs": 700 }] },
    "act.heavy":   { "durationMs": 1400, "loop": false, "events": [{ "name": "hit", "timeMs": 620 }, { "name": "recover", "timeMs": 1100 }] },
    "sig.horns-first-descent": { "durationMs": 1500, "loop": false, "archetype": "lunge", "events": [{ "name": "hit", "timeMs": 700 }, { "name": "recover", "timeMs": 1200 }] }
  },
  "acts": {
    "byKey": { "luceras-defining": "sig.horns-first-descent" },
    "byArchetype": { "lunge": "sig.horns-first-descent", "strike": "act.light", "slam": "act.heavy" }
  },
  "parameters": {
    "scale": { "from": "individual.physiology.heightCm / reference.heightCm", "clamp": [0.84, 1.16] },
    "finish": { "values": ["standard", "gleam", "prismatic", "eclipse"], "default": "standard" }
  },
  "measured": { "triangles": 9800, "joints": 42, "morphTargets": 2, "materials": 2, "drawCalls": 2, "textureBytes": 1310720, "fileBytes": 361000, "clipBytes": 48000 },
  "provenance": { "pipeline": "creature-pipeline", "build": "B-xxxx", "blender": "5.2.2", "sourceHash": "sha256", "builtAt": "2026-11-01T00:00:00Z" }
}
```

Every field above is required except `reference.lengthCm` (for creatures measured by length) and `clips.*.archetype` (signature clips only). The schema in `art/pipeline/contract/manifest.schema.json` is the normative definition; this listing is the readable copy.

## 3. Coordinates, scale and placement

- The glTF is in meters, Y up, facing +Z, with the origin at the ground point under the body's center. A game places the origin on its floor and rotates about Y to face.
- `reference.heightCm` is the species' 50th percentile height; the mesh is built at exactly that height. A game scales uniformly by `individual.heightCm / reference.heightCm`, clamped to the band, so every individual's size is right without a second asset.
- Floating, serpentine and swarm species keep the origin at the ground point and declare `restHeightCm`, the height of the body's rest center above it, so a game can draw a shadow or a water line.
- Root motion: clips are in place. The root joint never translates in a clip; a game moves the creature. (Lever. Reopened if a game needs traveling attacks.)

## 4. Names a game may rely on

**Clips.** Every asset has exactly these five: `idle` (loop), `hurt`, `faint`, `act.light`, `act.heavy`. It may have `sig.<slug>` signature clips and later additions such as `move` (loop), `celebrate`, `guard`. A game must handle a missing optional clip by falling back to the nearest required one.

**Events.** `hit` (the moment a strike or emission lands or leaves), `emit` (a projectile or stream leaves the emitter; may coincide with `hit`), `impact` (the creature is struck, in `hurt`), `down` (in `faint`), `recover` (the creature can be interrupted or queued from here), `foot_down` (optional, for sound). Event times are in milliseconds from clip start.

**Sockets.** `ground`, `head`, `eye_l`, `eye_r`, `emitter` (where the species' output leaves), `carry` (where a held object sits). A socket names a joint in the glTF; the joint's own name may change between asset versions without a major bump as long as the socket resolves.

**Parameters.** `scale` (number), `finish` (one of four). Nothing else.

Not part of the contract: joint names, mesh names, material names, texture names, vertex counts, the internal module list. A game that reads those is reading implementation.

## 5. Resolving a clip for an act

Given a creature record's action (`key`, `instrument`, `delivery.mode`, `delivery.approach`, `effects[0].mechanism`):

1. If `acts.byKey[key]` exists, play it.
2. Else derive the archetype from the act and play `acts.byArchetype[archetype]` if present.
3. Else play `act.heavy` if the act's intensity is in the species' upper half, otherwise `act.light`.

Archetype derivation (the whole closed vocabulary; a lever, amended when a creature's act does not fit):

| Delivery mode | Approach | Archetype |
|---|---|---|
| contact | closing | lunge |
| contact | stationary | strike (instrument in jaws, fangs, horns, claws, blades, fists, pincers, spurs, tail: strike; body, shell, trunk: slam) |
| projectile | any | spit |
| stream | any | spray |
| pulse, field, signal | any | burst (an in-place emission, the emitter socket flares) |
| self | any | brace |

The pipeline implements each archetype once per skeleton class as parametric code (design decision 19), so a species gets a correct generic clip for every act it can have before any signature work.

## 6. What the asset guarantees and what the game must do

The asset guarantees: it loads with the standard three.js loaders plus the KTX2 and meshopt extensions; every required clip and event is present; the `measured` block is accurate for the shipped file; it renders correctly under the house runtime look (part 6) and under a plain lit material; the finish parameters are applied by the house material only.

The game must: decide every outcome itself (a `hit` event is a visual moment, never a result); trigger clips and read events; apply `scale` and `finish` at load; budget its scene from `measured`; pin its roster version; handle a missing optional clip.

## 7. Sprite atlases (derived)

A sprite profile is a named render setting: facing set, cell height, frame rate, look. Profiles are declared in the roster layer, not per creature. The pipeline renders every clip of the asset through the browser runtime (so sprites and live 3D share the same look) and packs `xalians-frame-atlas-v2`: every v1 field (`format`, `canvas`, `origin`, `clips` with `sheet`, `fps`, `loop`, `duration_ms`, `markers`, `frames`) plus `facing` per sheet (`side`, `front`, `back`, `three_quarter`), per-frame trim offsets, and the `assetVersion` it came from. Markers are the clip events. A v1 reader ignores the additions and still plays.

## 8. Validation

`art/pipeline/contract/validate.mjs <folder>` checks: the manifest against the schema; the glTF against the Khronos glTF validator; that every clip, event and socket named in the manifest exists in the file; that `measured` matches the file; that the required clips are present; that the root joint does not translate; that scale and forward match the convention. The export stage runs it; a game's import may run it. A failed validation is engine-breaking by definition (design decision 12).

## 9. Open levers

Clip length budgets (section 4 example times), the archetype table, the clamp on scale, the optional clip list, the sprite profiles, and whether `carry` is needed before a game asks for it. Each is reopened by a concrete case from a game.

## 10. What Nick is approving

That a game receives exactly this: one versioned folder per species, one self-contained glTF plus a manifest with the names in section 4, resolved for an individual by the two parameters, with acts mapped to clips by the three-tier rule, and sprites derived from the same runtime. Approving it fixes what every later part of the design must produce.
