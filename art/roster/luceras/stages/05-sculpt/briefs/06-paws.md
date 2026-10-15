# Luceras stage 5: all four paws by reconstruction (build B-dp38)

You are the builder for the paws of Luceras, stage 5 of the Xalians creature pipeline. The orchestrator (Claude) reads your pass and sends back defects; Nick (the art director) judges only whether the paws read as the shaved clay's paws.

## Why the method changed (hold audit N-r373)

Two hind paw builds made by brushing and authored digits fell short of the clay: pass 2 gave thin pads on a flat sole, pass 3 matched the measured knuckle height but turned the paw into a box with square digit blocks, a flat top and a corner where the metatarsus meets it. The head stalled the same way until it was reconstructed. Pipeline rule 12: soft organic forms come from reconstruction of the approved clay views, with rigid parts (claws) authored and seated on them. This pass applies that rule to the paws.

## Scope

All four paws, below 65 mm above the ground: both hind paws (heel, sole, four digits, pads) and both fore paws (the same, shorter and rounder, as the clay front view shows), plus the claws on all of them and the small dewclaw on the back of each fore wrist that the clay front view shows. Everything at or above 65 mm is approved or passed and stays exactly where it is (a narrow declared blend band just under 65 mm is allowed for the graft seam).

## Inputs

- Base: the merged file C:\dev\art-data\pipeline\codex-stream\luceras-merge\merged.blend (blob 2f4883f87a1f625430607a72be20a91ab99434abbaab055b15ff78f2c1ed57fc): hind paw pass 3 with the approved tail and forelegs applied. Whole creature bound to the 40-joint armature; meters, facing -Y, +X is the creature's left, origin at the ground point. Hind paw bones leg_hl_03 / leg_hr_03, fore paw bones leg_fl_03 / leg_fr_03. The current hind claws (dark, about 30 mm, curved) read well and are kept: re-seat them on the new toe tips.
- Clay paw crops already cut from the clay views: C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass2\references\paw_side_clay_crop.png and paw_front_three_quarter_clay_crop.png (the hind paw). Cut fore paw crops yourself from the clay front bc153b786d965458e78dab459cc8a9e6027a66b67dc3a38d58e61bccba570981 and clay side d265b6fcbff2e1f3fdd994590fd8b884eca9397680c871d8ccfc3d9d6aec8ec9 (blob store C:\dev\art-data\pipeline\blobs\<first two hex>\<sha256>). Write every crop you use, and its source box, into your output folder.

## Method

1. Mask each paw crop to RGBA (reuse `art/pipeline/recon/masks.py`, or write your own in your folder if its interface does not fit a crop) and cut the claws out of the mask where they leave the toe, since claws are authored.
2. Reconstruct a hind paw and a fore paw with Hunyuan3D-2 through `art/pipeline/recon/reconstruct.py`, run with `C:\dev\art-data\tools\shape-env\Scripts\python.exe`, through the GPU slot: `python C:\dev\src\xalians-creature-pipeline\art\pipeline\slot\slot.py run gpu --wait 3600 --owner "codex B-dp38 paws" -- <command>`. A speech-to-text app holds about 2.3 GB of the GPU; the runner caps the rest under the card's 6.5 GB rule by itself. Try the single-view model on the clearest crop first (mini, then full if mini is mushy); use multi-view only if you have two clean views of the same paw. One GPU job at a time. Keep run.json with its license line for every run.
3. In Blender: scale and align each reconstruction to its paw (match the paw length, width and the toe direction of the current paw within 5 percent), remove anything above the graft line, cut the current paw below 65 mm, and graft the reconstruction on with a bridged seam and a short declared blend, exactly as the head was grafted (see `art/pipeline/sculpt/graft_recon.py` and `build_head.py` for that pattern). Mirror left to right. Transfer skin weights to the new vertices from the base by nearest surface, normalize to at most 4 influences.
4. Clean the reconstruction surface lightly (smooth lumps, no new forms) and carve only what it lacks: the clefts between digits if the reconstruction fused them. Seat the claws, add the fore claws and the two dewclaws as authored rigid objects (dark, value 0.12 linear), bone-parented to the paw bones.

## Self-review

After every iteration render the paw cameras (side and front three-quarter close on each paw type) beside the clay crops and write in iter_notes.json what still reads wrong and the change you will make, with numbers (knuckle height and digit width as fractions of paw length beside the clay's; pass 3 measured the clay hind paw at 0.33 and 0.15). The paw must read as the clay's organic digits at the close paw camera at 1024 px: rounded knuckles, a top line that slopes from the leg down over the toes with no corner, tight dark clefts. Never a bare "accept".

## Conventions (pinned)

- Blender 5.2.2 in WSL (`/home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 <file.blend> --python <script> -- <args>`, --python-exit-code before --python, LF line endings), every Blender launch through the slot lock: from WSL `python3 /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py run blender --wait 3600 --owner "codex B-dp38 paws" -- <command>`. Never poll, never give up on a wait.
- Your tooling, in the worktree C:\dev\src\xalians-creature-pipeline: `art/pipeline/sculpt/build_paws.py`, `art/pipeline/sculpt/run_paws.sh`; reuse `legcam.py` and `forecam.py` cameras (you may add a paw camera to a new `pawcam.py`), `sculptkit.py`, `graft_recon.py`, `art/pipeline/roster/lookdev.py`. Add helpers only by addition; edit no other file. No git.
- Renders: `lookdev.setup_scene(engine="CYCLES")`, look-dev lights, ground and clay. Name intermediate files `iter<N>_...`. Composites: build left, clay crop right, same height, dark label bar, `composite_<view>_vs_clay.png`.

## Deliverables, in C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass1\

1. paws.blend (the whole creature), paws.glb, paws_part.glb (the four paws), the reconstruction runs (shape.glb and run.json each).
2. Renders: hind and fore paw cameras (side, front three-quarter), the hind and fore leg cameras, the five full-body cameras, a 192 px sprite; composites for the paw cameras and `composite_full_side_vs_furred.png`.
3. progress.png (the pass 3 paw, then your iterations, captioned); iter_notes.json.
4. measurements.json: per paw type, paw length and width, knuckle height and digit width as fractions of paw length beside the clay's, claw lengths, heel width at 30 mm; displacement at or above 65 mm (must be 0) and in the declared band; non-manifold edges; max influences; left-right asymmetry; triangle counts (whole creature under 400K).
5. report.json: build id B-dp38, method in order, the reconstruction runs (model, input crop, seconds, peak GPU), defects named and fixed per iteration, what remains, holds respected or lifted with why, wall minutes, Blender seconds, GPU seconds, and `checks` (title, question, before, after, reference, sprite, recommended) for: hind paw side, hind paw front three-quarter, fore paw front, claws and dewclaws, body at sprite size.

Cap 60 minutes. Plain American English, no em dashes. Nothing that costs money, no installs. When done, print the path of report.json and stop.
