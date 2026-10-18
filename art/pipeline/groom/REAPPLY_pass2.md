# Luceras B-vmt3 reapplication

Run the delivered `build_groom.py` and `parameters.json` on a copy of the approved sculpt or an identically topologized rigged sculpt in its rest pose. The build reads the input and writes a new `groom.blend`. It never saves over the input. It adds materials and attributes but does not change any original mesh coordinates, vertex order, faces or topology.

```powershell
python C:\dev\src\xalians-creature-pipeline\art\pipeline\slot\slot.py run blender --wait 3600 --owner "codex B-vmt3 groom" -- wsl /home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b -t 8 --python-exit-code 1 --python /mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass2/build_groom.py -- --input /mnt/c/path/to/rigged_sculpt.blend --out /mnt/c/path/to/new/output --parameters /mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass2/parameters.json --iteration 1 --views side,head
```

The emitter must retain the name `luceras_blockout`, original vertex indices, local coordinate system and topology. Armature and deformation-only modifiers are supported. The script rejects evaluated topology changes. Disable subdivision, remeshing and other topology-changing modifiers before building this attachment.

No UV map is added or required. Every strand root stores original triangle indices and barycentric coordinates. Each point stores normal, tangent and bitangent offsets in an orthonormal triangle frame. The Geometry Nodes modifier samples evaluated surface vertices and reconstructs the curve. This follows surface rotation without stretching long strands with triangle shear. The native hair-curves surface pointer also identifies the emitter. Existing mesh and new hair colors remain attached as attributes.

Hidden guides and baked interpolated children are separate hair-curves objects. Children use three nearest same-region guides, local length, normal correction, pointed clumping, frizz and individual strand variation. Regenerate from the script to change guide/child distribution; this version does not automatically regenerate children after manual guide edits. The tail uses layered locks rooted on the rising shaft, with a continuous white underside group and dark outer tips. Whiskers and tiny dark follicle curves use the same binding method.

The base pattern is projected from the largest connected game-body component in `luceras-surface/pass3/surface.blend`, using its UVs and `basecolor_2048.png`. The script stores sampled linear color at sculpt vertices and strand roots. Requested local foreleg, paw, eyelid and plume corrections are deterministic geometric masks. The solved blaze, bib and body pattern remain based on the atlas. Material response is calibrated with lit render patches, not by recoloring proof images.

The studio imports `art/pipeline/roster/lookdev.py`. Lights, ground and cameras are in `SWAPPABLE neutral studio`; the world is named `lookdev_world`. Replace that collection and world for final production lighting. Head close-up framing is tighter than pass1. Portrait and full-body framing retain pass1 cameras for direct comparisons. The eye pupil remains horizontal as requested, despite round pupils in the final sheet art.

Run `--mode deliver --views side,three_quarter,front,head,hind_leg,tail_plume,portrait,sprite` for final renders and the separate temporary-armature bend proof. `--mode render` renders without the proof. `--mode deform` reruns the proof alone. These modes read `groom.blend` from the selected output folder. The temporary armature is saved only in `deformation_proof.blend`.

CPU rendering is deliberate. The GPU memory field is null because total GPU usage was not instrumented; no Cycles GPU rendering allocation is used. Frame times include render synchronization and image writing, but exclude slot wait. Samples, denoising, actual curve counts and process peak host memory are recorded. Host memory uses GiB from Linux `ru_maxrss`.

Use `compose_proof.py` for unretouched side-by-side reference comparisons and `measure_colors.py` for lit sRGB patches. The compositor uses fixed reference crops for details and copies the runtime panel from the supplied pass3 comparison. Portrait and sprite comparisons show pass2 beside pass1 at native output dimensions. Visual acceptance belongs to the orchestrator and Nick.
