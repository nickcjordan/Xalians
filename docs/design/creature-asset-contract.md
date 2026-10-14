# Creature asset contract (part 1 of the pipeline design)

Status: draft 2, 2026-10-14, for Nick's sign-off. Draft 1 was challenged cold by an independent reviewer who compiled every species and sampled 5,280 generated acts against it; the twelve findings are folded in and listed in section 11. Part 1 of the six-part design program in [creature-pipeline-design.md](creature-pipeline-design.md). This is the API between the production pipeline and every game: what a game receives for a species, what it may rely on, what it must do itself. Everything downstream (budgets, rig modules, stages, tooling) exists to produce something that satisfies this contract, so it is designed first.

Software analogy, and where it breaks: this is an interface definition for a versioned package. A game is a client that pins a package version and calls into it by name (clip names, event names, socket names, parameter names). Unlike a code package there is no type checker at the boundary, so the contract ships with a validator, and every field a game reads is enumerated here rather than inferred from files. A second difference: timing numbers are part of the interface. A clip's length or the moment of its `hit` event changes a game's pacing the way a changed return type changes a caller, so those numbers are versioned like names.

## Vocabulary

- **Asset**: everything a game receives for one species. One asset per species, serving every individual of that species.
- **glTF** (`.glb` when binary): the open 3D file format browsers load. It carries mesh, skeleton, skinning, materials, textures and clips in one file.
- **Clip**: a named animation. **Event**: a named moment inside a clip (`hit` at 420 ms). A game acts on events; the asset never acts on game state.
- **Socket**: a named attachment point a game may read a position from or attach to (the emitter, the eyes, the ground point).
- **Parameter**: a value the game sets per individual at load time (scale, finish).
- **Act**: an action in a creature record. **Archetype**: the motion family a clip implements (lunge, strike, spit).
- **Tier**: a mesh detail level. `full` is the hero mesh; `low` is a cheaper copy on the same skeleton.
- **Sprite atlas**: a 2D image of frames plus a JSON manifest, rendered from the asset.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | One asset per species; individuals differ only through runtime parameters (size, finish). The asset never stores per-individual data | 90%: the generator rolls size and finish per individual and nothing else visible | `packages/content/src/creature/record.ts` |
| 2 | Assets are versioned independently of creature records. A record never names an asset version; a game pins a roster file. A new asset version never changes a creature's identity | 90%: creature genesis is immutable by platform rule; art will be revised | `docs/design/xalian-generation-system.md` |
| 3 | The glTF is self-contained: KTX2 textures and meshopt compression in one file; both tiers in the same file, selected by node name convention | 80%: one request per creature; standard three.js loader extensions | audit G17 |
| 4 | A game relies only on contract names: clips, events, sockets, parameters, tiers. Joint, mesh, material and texture names are implementation. Sockets are resolved by a tag on the node (`extras.xalians.socket`), not by joint name, so rigs can change underneath | 90% | reviewer finding 10 |
| 5 | Acts resolve to clips by a total function over the record's own fields (delivery mode, approach, area shape, effect types, timing), because generated act keys are renamed to `ordinary-1` through `ordinary-4` at generation and carry no identity; only authored signatures resolve by key. The function is tested against the whole compiled act space of every species | 90%: verified in `compiler.ts` line 394; the reviewer's sample found 31 percent of contact acts outside draft 1's instrument list and 45 percent of first effects not harm | reviewer finding 1, 2 |
| 6 | Timing is contract surface: clip durations, event times, travel and reach are versioned like names (a change is at least minor; a game may pin exact) | 85%: Powerworks already paces turns by act timing | reviewer finding 11; `packages/rules/src/dungeon` |
| 7 | The required clip set covers what the existing games already emit: idle, move, hurt, evade, guard, faint, act.light, act.heavy, plus displaced and held as loops. Parametric generation per skeleton class (design decision 19) makes the set cheap per species | 80%: Powerworks' `BattleEvent` emits missed, displace, bind, charge, ward, restore, stumble, react, hidden; Duel moves pieces and carries flags | reviewer finding 3; `packages/rules/src/dungeon/index.ts` |
| 8 | Sustained acts (stream, field, charge) are three clips (`.start`, `.loop`, `.end`); one-shot acts are one clip. Events are specified per archetype, not globally | 85% | reviewer finding 5 |
| 9 | Clips are in place (the root joint never translates) and each act clip declares `travel` and `reach` so the game can move the creature the right distance at the right time and place contact | 85% | reviewer finding 6 |
| 10 | Size is a declarative rule: the manifest names the record dimension (`heightCm` or `lengthCm`) and a reference value; the clamp is the species band divided by the reference, computed by the game from `reference` alone | 90%: `heightCm` is optional on the record; Frackworm declares only length | reviewer finding 7; `record.ts` |
| 11 | Finish ships as glTF material variants (`KHR_materials_variants`, one per finish, sharing textures) so any loader can switch it without the house shader; sprite profiles declare which finishes they render | 75%: four variants sharing textures do not multiply memory; the recipes wait for part 6 | reviewer finding 9 |
| 12 | Sprite atlases are a new breaking format, `xalians-frame-atlas-v2`, not a superset of v1: v1's reader rejects any other format id, places untrimmed frames, has one sheet per clip and no facings, and names markers differently. No game reads v1, so nothing breaks | 95%: `atlas-player.mjs` `validateManifest` and `drawFrame` | reviewer finding 8 |
| 13 | Two mesh tiers, `full` and `low`, on one skeleton, with `measured` per tier, plus a derived 2D token (silhouette PNG and SVG from the asset) to replace the hand-drawn tokens games use today. `low` is generated by decimation with weight transfer and may be absent in a species' first asset version | 75%: Reclamation deals two rosters of twelve; Duel and the site draw SVG tokens | reviewer finding 12; `xalianImage.js` |
| 14 | The manifest carries only contract facts; skeleton internals and build provenance live in the pipeline's build record, referenced by hash | 90% | reviewer finding 10 |
| 15 | The schema and validator live beside the pipeline (`art/pipeline/contract/`); promotion into `packages/content` waits for Nick because that package is shared | 90% | mission rules |

## 1. Package layout

```
creatures/<species>/<assetVersion>/
  manifest.json          the contract document, validated, with sha256 of every other file
  <species>.glb          both tiers, skeleton, skinning, material variants, KTX2 textures, clips
  token.svg, token.png   derived 2D silhouette for lists, boards and tiles
  preview.png            one still at the standard three-quarter camera, 512 px
  sprites/<profile>/     derived atlases, one folder per profile (section 8)
```

A roster file, kept by each game, pins species to asset versions:

```json
{ "format": "xalians-roster-v1", "assets": { "luceras": "1.2.0", "imprit": "1.0.1" }, "base": "https://.../creatures/" }
```

## 2. Versioning

`assetVersion` is `major.minor.patch`.

- **Major**: a clip, event, socket, parameter or tier is removed or renamed; the size rule changes; an act maps to a different clip than before. A game must change.
- **Minor**: a name is added; a duration, event time, travel or reach changes; `reference` changes; `measured` grows by more than 10 percent. A game should re-check pacing and budgets.
- **Patch**: appearance only, every number in the manifest unchanged.

The manifest lists every file with its sha256, so a game or a cache can prove what it loaded.

## 3. Manifest

The schema at `art/pipeline/contract/manifest.schema.json` is normative; this is the readable copy. Every field is required unless marked optional.

```json
{
  "format": "xalians-creature-asset-v1",
  "species": "luceras",
  "assetVersion": "1.0.0",
  "files": { "luceras.glb": "sha256...", "token.svg": "sha256...", "token.png": "sha256...", "preview.png": "sha256..." },
  "units": { "length": "meters", "up": "+Y", "forward": "+Z" },
  "size": { "dimension": "heightCm", "referenceCm": 57, "bandCm": [48, 66], "restHeightCm": 0 },
  "bounds": { "rest": { "min": [-0.18, 0, -0.32], "max": [0.18, 0.57, 0.30] }, "footprintRadiusM": 0.22, "maxExtentM": 0.95 },
  "tiers": { "full": { "node": "luceras_full" }, "low": { "node": "luceras_low" } },
  "sockets": ["ground", "head", "eye_l", "eye_r", "emitter", "status", "carry"],
  "parameters": { "finish": { "values": ["standard", "gleam", "prismatic", "eclipse"], "default": "standard", "variants": true } },
  "clips": {
    "idle":      { "durationMs": 3000, "loop": true,  "events": [] },
    "move":      { "durationMs": 800,  "loop": true,  "events": [{ "name": "foot_down", "timeMs": 0 }, { "name": "foot_down", "timeMs": 400 }], "travel": { "distanceM": 1.1 } },
    "hurt":      { "durationMs": 500,  "loop": false, "events": [{ "name": "impact", "timeMs": 80 }] },
    "evade":     { "durationMs": 600,  "loop": false, "events": [{ "name": "clear", "timeMs": 200 }] },
    "guard":     { "durationMs": 900,  "loop": true,  "events": [{ "name": "set", "timeMs": 250 }] },
    "displaced": { "durationMs": 700,  "loop": false, "events": [{ "name": "impact", "timeMs": 60 }, { "name": "settle", "timeMs": 600 }] },
    "held":      { "durationMs": 1500, "loop": true,  "events": [] },
    "faint":     { "durationMs": 1200, "loop": false, "events": [{ "name": "down", "timeMs": 900 }] },
    "act.light": { "durationMs": 900,  "loop": false, "archetype": "strike", "events": [{ "name": "hit", "timeMs": 380 }, { "name": "recover", "timeMs": 700 }], "reachM": 0.35 },
    "act.heavy": { "durationMs": 1400, "loop": false, "archetype": "slam",   "events": [{ "name": "hit", "timeMs": 620 }, { "name": "recover", "timeMs": 1100 }], "reachM": 0.40 },
    "sig.horns-first-descent": { "durationMs": 1500, "loop": false, "archetype": "lunge", "events": [{ "name": "launch", "timeMs": 300 }, { "name": "hit", "timeMs": 700 }, { "name": "recover", "timeMs": 1200 }], "travel": { "distanceM": 1.6, "startMs": 300, "endMs": 700 }, "reachM": 0.45 }
  },
  "acts": {
    "signatures": { "luceras-defining": "sig.horns-first-descent" },
    "passives": { "harmed": "react", "contact": "react" },
    "archetypes": { "lunge": "sig.horns-first-descent", "strike": "act.light", "slam": "act.heavy", "spit": "act.light", "burst": "act.heavy", "brace": "guard", "sweep": "act.heavy" }
  },
  "measured": {
    "full": { "triangles": 9800, "drawCalls": 2 },
    "low":  { "triangles": 2600, "drawCalls": 1 },
    "joints": 42, "influencesPerVertex": 4, "morphTargets": 2, "materials": 2,
    "textureBytes": 1310720, "fileBytes": 361000, "clipBytes": 48000
  },
  "build": "B-01M4...",
  "builtAt": "2026-11-01T00:00:00Z"
}
```

Optional: `size.restHeightCm` defaults to 0; `tiers.low`; `clips.move.travel`; `sig.*` and the `.start/.loop/.end` triplets; `acts.passives`.

## 4. Coordinates, size and placement

- Meters, Y up, facing +Z, origin at the ground point under the body's center. A game places the origin on its floor and rotates about Y to face.
- `size`: the mesh is built at `referenceCm` along `dimension`. A game scales uniformly by `individual.physiology[dimension] / referenceCm`; the valid range is `bandCm / referenceCm`. Nothing to evaluate, two numbers to divide.
- Floating, serpentine and swarm species keep the origin at the ground point and declare `restHeightCm`, the rest height of the body center above it.
- `bounds` and `footprintRadiusM` are for spacing, health bars and camera framing; `maxExtentM` is the largest reach of any clip, for culling.
- Root motion: clips are in place. Act clips that close distance declare `travel` (how far, between which times) and `reachM` (distance from the origin to the contact point at `hit`). The game moves the creature `distanceM` over that window and places it so `reachM` touches the target.

## 5. Names a game may rely on

**Required clips** (every asset): `idle` (loop), `move` (loop, keyed to the species' traversal), `hurt`, `evade`, `guard` (loop), `displaced`, `held` (loop), `faint`, `act.light`, `act.heavy`.
**Optional clips**: `react` (a passive firing; defaults to `hurt` with no impact), `celebrate`, `sig.<slug>`, and `<name>.start`, `<name>.loop`, `<name>.end` triplets for sustained acts. A missing optional clip falls back as this table says, never to a surprise:

| Missing | Plays instead |
|---|---|
| `react` | `guard` first 300 ms |
| `celebrate` | `idle` |
| `sig.*` | the archetype's clip |
| `<name>.start/.loop/.end` | `act.heavy` as a one-shot |

**Events**, by archetype (section 6). Common ones: `hit`, `emit`, `launch`, `recover`, `impact`, `clear`, `set`, `settle`, `down`, `foot_down`. Times in milliseconds from clip start.

**Sockets**: `ground`, `head`, `eye_l`, `eye_r`, `emitter`, `status` (where a status mark floats), `carry`. Resolved by the node tag, never by joint name.

**Parameters**: size (from the rule, not a parameter the game invents), `finish` (one of four, a material variant).

**Tiers**: `full`, `low`.

## 6. Resolving a clip for an act

Given an action from a record (`delivery.mode`, `delivery.approach`, `spatial.area`, `effects[].type`, `timing.preparation`, `timing.recovery`) and the species signature:

1. If the action is the species' signature action and `acts.signatures[key]` exists, play it.
2. Derive the archetype (table below) and play `acts.archetypes[archetype]`.
3. Weight: `act.heavy` when `timing.preparation` is longer than brief or `recovery` is longer than brief, else `act.light`. The game may also scale the windup it shows by `timing`.

| Delivery mode | Approach | Area | Archetype | Required events |
|---|---|---|---|---|
| contact | closing | any | lunge | `launch`, `hit`, `recover` |
| contact | stationary | none or location | strike (instrument body, shell, trunk, coils, roots: slam) | `hit`, `recover` |
| contact | stationary | sweep or radial | sweep | `hit` (may repeat), `recover` |
| projectile | any | any | spit | `emit`, `recover` (no `hit`; the game owns travel) |
| stream | any | any | spray (sustained: `.start`, `.loop`, `.end`) | `emit` in start, `recover` in end |
| pulse, signal | any | any | burst | `emit`, `recover` |
| field | any | any | aura (sustained) | `emit` in start, `recover` in end |
| self | any | any | brace (effect type restore: mend; protect: brace; status on self: focus) | `set`, `recover` |

Passives resolve by trigger: `acts.passives[trigger]` or `react`. The function is total: the validator plays every act of every compiled species through it and fails if any act resolves to nothing. Instruments do not enter the table (the reviewer counted 32 on contact acts alone); they shape the signature clip's look, not its archetype.

## 7. What the asset guarantees and what the game must do

The asset guarantees: it loads with standard three.js loaders plus the KTX2, meshopt and material-variants extensions; every required clip, event and socket is present; `measured` is accurate for the shipped file per tier; it renders under the house look (part 6) and under a plain lit material; the finish variants work without the house shader; `token.svg` reads at 48 px.

The game must: decide every outcome itself (a `hit` is a visual moment, never a result); trigger clips, read events, apply `travel` and `reachM`; compute size from the rule and set `finish`; pick a tier and budget its scene from `measured`; pin a roster file; apply the fallback table for missing optional clips.

## 8. Sprite atlases (derived)

A sprite profile is a named render setting declared in the roster layer: facings (`side`, `three_quarter`, `front`, `back`), cell height, frame rate, look, finishes rendered. The pipeline renders every clip through the browser runtime, so sprites and live 3D share one look, and packs `xalians-frame-atlas-v2`: per clip and facing a sheet, trimmed frames with offsets, the clip's events as markers in `timeMs`, and per-frame positions of every socket so a game can spawn a projectile where the emitter is on that frame. v2 is a new format id with its own reader; v1 stays frozen for the old studies.

## 9. Validation

`art/pipeline/contract/validate.mjs <folder>` checks: manifest against schema; sha256 of every file; the glTF against the Khronos validator; every clip, event, socket, tier and variant named in the manifest exists in the file; `measured` matches the file; the root joint never translates; up, forward and the reference size match the mesh; the act resolver is total over every compiled species; v2 atlases match their manifest. The export stage runs it; a game's import may run it. A failure is engine-breaking by definition.

## 10. Open levers

Clip length budgets, the archetype table, the required clip list, the sprite profiles, the fallback table, and whether `carry` is needed before a game asks. Each reopens on a concrete case from a game.

## 11. The cold challenge of draft 1

Twelve findings; all accepted. Generated act keys carry no identity (resolver rebuilt as a total function over record fields); light or heavy from timing, not an intensity the record lacks; clips for the receiving side and for movement; passive signatures; events per archetype and split clips for sustained acts; travel and reach; a declarative size rule; v2 atlases as a breaking format; finish as material variants; internals out of the manifest; timing as versioned surface with a roster schema and hashes; a low tier and a 2D token. Not changed: still one glb per species. Noted: Duel still runs on its old move data with no instrument or delivery and cannot use section 6 until it moves to v5 records; that is a game cutover, not a contract matter.

## 12. What Nick is approving

That a game receives exactly this: one versioned folder per species; one self-contained glTF with two tiers, four finish variants and the required clips; a manifest carrying the names, timings and measurements in section 3; size from a two-number rule; acts resolved by the table in section 6; sprites and a 2D token derived from the same runtime. Approving it fixes what every later part of the design must produce.
