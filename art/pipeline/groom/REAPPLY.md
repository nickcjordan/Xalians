# Luceras B-gwvn groom

The builder reads a sculpt copy, transfers the approved pass 3 basecolor, creates region attributes, constructs guides and interpolated children as Blender hair curves, and saves a Cycles scene. It never changes existing mesh vertex coordinates, vertex order, or topology. Material assignments and smooth shading are updated. Original sculpt whisker meshes are retained but hidden in favor of white curves.

Run from Windows through the shared slot:

```powershell
python C:\dev\src\xalians-creature-pipeline\art\pipeline\slot\slot.py run blender --wait 3600 --owner "codex B-gwvn groom" -- wsl /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b -t 8 --python-exit-code 1 --python /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/groom/build_groom.py -- --input /mnt/c/path/to/rigged_sculpt.blend --out /mnt/c/path/to/new/groom-output --parameters /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/groom/parameters.json --iteration 1
```

Use a neutral rest pose when building. The body object must retain the name `luceras_blockout`, the approved vertex indices, local coordinate system, and topology. The script rejects evaluated topology changes. Armatures and other deformation-only modifiers can remain active. Lengths and radii are in meters. The seed fixes sampling. The input file is never saved over.

No UV map is required. Each curve carries its root triangle vertex indices and each point's offsets in an orthonormal triangle frame. The Geometry Nodes modifier reads evaluated body vertices and reconstructs the root from barycentric coordinates and rotates the strand offsets into the current orthonormal frame without skin scale or shear. This preserves exact root attachment while the surface bends. Because the original vertex indices are used, apply topology-changing modifiers only after deciding how to preserve or rebuild this binding. The saved `surface` pointer identifies the emitter.

Guide curves are hidden from rendering. Child curves are baked from a three-guide inverse-distance interpolation with same-region selection, local length scaling, clumping, and frizz. Their surface deformation remains live. Regenerate with the script after changing groom parameters. This version does not regenerate children automatically after interactive guide edits.

The pattern transfer uses the fixed pass3 `surface.blend` and `basecolor_2048.png` under `luceras-surface/pass3`. It samples the original game body, not the fur cards. Color is stored in the sculpt and curve attributes, so the saved groom does not need an external texture at render time. The studio setup imports the repository's `roster/lookdev.py`, then puts the lights, cameras, and ground into `SWAPPABLE neutral studio`. The world is named `lookdev_world` and can be replaced with that collection.

Final rendering uses `--mode render --views side,three_quarter,front,head,hind_leg,tail_plume,portrait,sprite`. Run `--mode deform` to create the separate temporary-armature proof. Both modes read `groom.blend` in the chosen output folder. They record wall-clock render times in `measurements.json`.

CPU rendering is intentional. GPU memory is not claimed as measured. Strand counts are exact, timings include scene synchronization and image writing, and denoising is recorded per frame. Final artistic approval remains with Nick after orchestrator review.
