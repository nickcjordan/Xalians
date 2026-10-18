# Luceras B-spm3 pass 4 reapplication

Delivered state is iteration 5. Its script, parameters, blend and all eight final renders match. Iteration 6 candidate files were prepared but never acquired the shared slot and are not delivered proof. See delivery_selection.json and report.json. The delivered body strand paths are preserved, but exact per-strand tone assignments remain an open issue; the unbuilt candidate contains the proposed correction.

Run build_groom.py with parameters.json on a copy of the approved sculpt or its identically topologized rig in rest pose. The source is read only. No original vertex coordinates, vertex order or faces are changed. No UV is added.

```powershell
python C:\dev\src\xalians-creature-pipeline\art\pipeline\slot\slot.py run gpu --wait 3600 --owner "codex B-spm3 groom" -- wsl /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b -t 6 --python-exit-code 1 --python /mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass4/build_groom.py -- --input /mnt/c/path/to/rigged_sculpt.blend --out /mnt/c/path/to/new/output --parameters /mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass4/parameters.json --iteration 1 --mode build
```

The body object must retain the name luceras_blockout and its original local coordinate system and topology. Armature and deformation-only modifiers are supported. Evaluated topology changes are rejected. The existing game pass3 surface.blend and basecolor_2048.png remain read-only color-transfer inputs.

The body uses the frozen pass3 iteration11 generator. That iteration was not built in pass3: its delivered blend is iteration10 and its head render is older. The pass4 report distinguishes the code baseline from those old comparison images. A deterministic fingerprint verifies inherited body strand coordinates before the requested head, paw and plume changes.

Each plume tuft is named in parameters.json. Station0 is y0.640m at the rising tail curve, and station1 is y0.695m near its physical tip. Angle is in degrees from +Z toward +Y in the side plane. Length and width are in meters. Side and color identify the dark upper/outer crest and white lower/inner band. One guide is generated per named tuft. Children sample only that guide and form locally tapered small clumps. They never interpolate across tuft groups. The authored plume has17 points per strand; inherited body strands retain9 points.

Eyelid guide rings project roots onto the unmodified skin. Short overlapping children follow the globe border outside its radius, with a slate mantle and a narrow dark terminal line. Eye geometry remains unchanged. The pupil is a moderate horizontal ellipse, and the cornea supplies the soft catchlight. Face pigment adjustment protects the transferred white blaze, muzzle and chin. Paw fur follows individual surface normals toward the toe tips.

Every curve stores original triangle vertex indices, root barycentrics and orthonormal tangent-frame offsets. A Geometry Nodes modifier samples the evaluated sculpt and reconstructs the strands. This is the no-UV equivalent of Deform Curves on Surface. It follows surface position and rotation without stretching long strands under triangle shear. Children are baked editable hair curves; regenerate the script after changing parameters or guide authoring. Manual guide edits do not automatically regenerate children.

Lights, ground and cameras are isolated in SWAPPABLE neutral studio; replace that collection and the lookdev_world world for another lighting style. Cycles renders on CPU with6 threads. The required gpu slot is used as requested even though Cycles uses no GPU device. GPU telemetry reports sampled whole-device usage separately from CPU rendering and excludes slot wait in the final measurements.

The default final build renders all8 requested views, then writes a separate deformation_proof.blend with a temporary hind-leg and tail bend. Every curve object is checked against the evaluated surface. The original groom.blend remains in rest pose. Frame timing includes render synchronization and image writing, but excludes build time and slot wait. Peak host memory is recorded in GiB.

Use --mode render --views side,three_quarter,front,head,hind_leg,tail_plume,portrait,sprite to rerender an existing output groom.blend. Use --mode deform for the bent proof alone. For quick edits set deliver_on_build=false and select --views. Set it true for complete delivery.

The compositor copies rendered pixels without retouching, aligns reference height, and crops only the specified reference detail areas. Side and head three-column comparisons use pass3 delivered images with an explicit stale-baseline label. Artistic approval remains with Nick.
