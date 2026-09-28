# Species construction workflow

Start with `docs/design/species-construction/WORKFLOW.md`. This directory contains a standard-library Python stage tracker and an optional Blender geometry probe. Neither calls a generation API. Subscription image generation remains an agent task using the saved prompt files.

```text
python art/species-construction/init_species.py <species-key>
python art/species-construction/pipeline.py docs/design/species-construction/akinza/package.json --report untracked/species-construction/akinza/status.json --markdown docs/design/species-construction/akinza/status.md
python -m unittest discover -s art/species-construction/tests -v
```

The initializer requires that species' existing SVG and record and refuses to overwrite work. It creates the brief, package and review files without copying another species' anatomy or approvals. Generation and semantic interpretation are still agent-operated stages, not an unattended one-click reconstruction service.

The tested local geometry-probe command is:

```text
wsl -e /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python /mnt/c/Users/njord/.codex/worktrees/1d07/Xalians/art/species-construction/blender_probe.py -- --spec /mnt/c/Users/njord/.codex/worktrees/1d07/Xalians/docs/design/species-construction/akinza/probe-spec.json --out /mnt/c/Users/njord/.codex/worktrees/1d07/Xalians/untracked/species-construction/akinza/probe-0001
python art/species-construction/review_probe.py untracked/species-construction/akinza/probe-0001
```

Adapt the checkout and Blender paths for another machine. Use a fresh versioned output directory for a changed study. `review_probe.py` uses Pillow from `art/species-views/requirements.txt`; the tracker and initializer use only Python's standard library. The probe exports a closed mesh, actual cameras and render hashes. The compositor verifies those hashes, derives occupancy from alpha, and builds a contact sheet and eight-view turntable. The probe spec's distances are proposed arbitrary units, not measurements recovered from images.

Exit 0 means artifact integrity passed, not that art is approved. Exit 1 reports changed or missing evidence; exit 2 reports an invalid package. The report's `productionReady` and each stage's `release` remain blocked until the exact evidence has recorded semantic review, explicit Nick approval, and approved dependencies. These records are not cryptographic authentication of Nick; the agent must transcribe actual user messages honestly.

The standard-library tracker/initializer tests also run in the `Species construction tracker` pull request workflow. Blender rendering and actual local evidence checks remain explicit local verification because working originals are not committed.

Each stage records artifact hashes, its own pose set, the specific decisions it consumes, dependency signatures, visual review, and nullable approval. A changed decision invalidates relevant studies and their descendants. Changed or absent files also block descendants. Branches can be explored using unapproved inputs, but cannot be released as approved construction assets. Re-recording inputs is only appropriate after actually revising or revalidating the study; it is not a way to erase a stale warning.

Package file hashes normalize CRLF to LF for Markdown, JSON, Python, text prompts, SVG and YAML so Git line-ending conversion does not invalidate otherwise identical evidence. Binary images and Blender files use exact bytes. The Blender geometry report separately records raw output hashes. Structural signatures use sorted compact JSON. This convention is fixed by tracker schema version 1.

Working image files and Blender outputs live in gitignored `untracked/species-construction/`. A fresh checkout without these files correctly reports missing evidence. Committed run metadata and review notes remain readable. When an asset is approved, preserve its original inputs and outputs in the approved package before marking it available to production.

The older `art/species-views/` utilities remain useful for complete six-view mask/registration checks. The construction tracker does not replace those checks or declare unfinished production validation complete. Detail crops and top views are not forced into a full-body six-view schema. Technical masks must be derived from their own images or actual geometry, never independently generated.

## Authored construction and portable handoff

`authored_surfaces.py` adds continuous section cages, integrated orbital surfaces, smooth ear shells and actual broad overlapping coat masses. `surface_math.py` provides tangent-continuous monotone interpolation so a section extremum does not create an artificial band. These are authored shape controls, not measurements inferred from the source. Optional weighted local smoothing blends a named intersection after union. Exact code and spec snapshots are captured at build start.

Akinza candidate 0020 passes internal readiness for Nick's clay review after independent feedback loops. This supersedes the failed primitive proxy as the current candidate, without changing the failed status of earlier studies or granting art approval.

`export_geometry.py` runs inside Blender against the saved scene. It exports a GLB, six actual camera transforms, depth, geometric normals and object identity arrays, then imports the GLB to check triangle count and world bounds. Arrays are top-to-bottom at pixel centers. Normals use camera coordinates; depth is forward distance from the orthographic camera plane, in arbitrary construction units. Background is NaN. Object IDs describe actual render objects, not anatomical segmentation of the fused body.

```text
blender -b <run>/blockout.blend --python art/species-construction/export_geometry.py -- --spec <spec.json> --out <fresh-export-directory>
python art/species-construction/review_export.py <export-directory> <run>
python art/species-construction/build_handoff.py --renders <run> --export <export-directory> --out <fresh-bundle-directory>
```

The export review verifies raw file hashes, array shape/coverage, finite unit normals, feature containment, ray/alpha occupancy agreement and projected landmark rows. It derives front feature cutouts from visible eye-white, nose and mouth geometry and occupancy from the corresponding render alpha. The style interpretation remains subject to visual review. The portable bundle includes source references, scoped decisions, exact authoring code, scene, GLB, images, masks and measurements. Its manifest and import contract explicitly remain unapproved. This workflow does not promote a final species pack or replace Nick's approval.

Use the GLB as a direct geometry reference. Existing numeric creature-template parameters cannot express the authored face and ear surfaces; the import contract reports that limitation instead of supplying a lossy parameter conversion. Production retopology, rigging and game integration remain downstream.

## Whole-body reconciliation

The earlier Akinza primitive runs did not achieve the preferred reference likeness. Runs 0007/0008 remain failed diagnostic studies, despite technical passes. Candidate 0020 uses the authored surfaces described above and passes internal readiness for Nick's review. Do not use this backend's output as a surface-ready creature by default.

`blender_blockout.py` extends the local volume/sweep approach to a continuous body with cupped ears, limbs, paws and three tails. Eye surfaces and claws are separate detail objects. It is a provisional construction backend, not the rigged production template. Use a fresh output directory for every run:

```text
blender -b --factory-startup --python art/species-construction/blender_blockout.py -- --spec docs/design/species-construction/akinza/blockout-spec-0004.json --out untracked/species-construction/akinza/blockout-new
python art/species-construction/review_blockout.py untracked/species-construction/akinza/blockout-new
```

The review tool checks output hashes, six principal camera conventions and registration, unclipped occupancy, figure-height and ground-row spread. It derives 14 masks and composes a six-view contact sheet and elevated turntable. Occupancy masks do not include the final front-feature cutouts, and these checks do not substitute for complete final-pack validation. The builder reports any removed isolated remeshing fragment, limited to 16 vertices and one voxel of extent; larger disconnected pieces still fail. Full likeness, continuity quality and biological plausibility require visual review.

`render_details.py` renders local orthographic close-ups from an existing saved scene with the same geometry and lights. Supply `joint-detail-cameras.json` and a new output directory after Blender's `--`. Its report binds the scene, camera spec and renderer hashes and records actual camera matrices. Local close-ups intentionally cut through limbs at the frame edge and are not full-body registration candidates.
