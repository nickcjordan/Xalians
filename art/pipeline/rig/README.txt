Luceras B-v3g9 rig controls

The deformation object is luceras_rig. Luceras_Controls is a separate armature in CONTROLS_BLENDER_ONLY. Only the game meshes and luceras_rig are selected for glTF export.

Animator controls on Luceras_Controls:
- root: global control.
- spine_01: body control. spine_02 through spine_05 provide optional spine shaping.
- CTRL_foot_fl, CTRL_foot_fr, CTRL_foot_hl, CTRL_foot_hr: IK targets at wrists and hocks. Rotate these to orient the terminal foot segments.
- CTRL_pole_fl, CTRL_pole_fr, CTRL_pole_hl, CTRL_pole_hr: bend-plane targets.
- CTRL_head_look: head aim target.
- CTRL_tail_01 through CTRL_tail_03: paired tail-segment rotations.
- ear_l_01 and ear_r_01: ear controls. Ear blades use rigid base-bone weights. The second ear bones retain their original names for compatibility.

Object properties leg_ik, head_look and tail_controls blend their respective solvers from 0 to 1. Set them to 0 to use the inherited FK pose code. luceras_rig.controls_enabled blends the complete control input. Set it to 0 when playing a baked deformation action.

Actions:
- review.poses stores the eight requested review poses at frames 1, 11, 21, 31, 41, 51, 61 and 71, at 30 fps.
- control.bake_test stores the control-driven numerical bake test.

The GLB carries the review action for runtime inspection. These are deformation tests, not the stage 9 production move vocabulary.

Tooling:
- build_rig.py assembles frozen inputs, refines skin weights and renders clay evidence.
- controls.py builds controls, tests a bake, exports GLB and saves the editable rig.
- measure.py checks the weighted checkpoint and reopens the final rig to compare its baked poses.
- validate.mjs runs the installed Khronos validator and checks export contents.
- compose.py labels and pairs the original rendered PNGs without retouching bodies.

All Blender commands must run through the pipeline slot lock. Geometry fingerprints cover coordinates, vertex order, polygon topology, UVs and connected-part counts. The separate bind audit checks world-space rest coordinates after reparenting.

Selected delivery: iteration 3. Set RIG_SMOOTH=400 and RIG_ITERATION=3 in the Blender process environment when reproducing build_rig.py -- --stage build. On Windows-to-WSL launch, forward both names through WSLENV. Run compose.py final, validate.mjs with the pass1 directory, and check_glb_skinning.py after Blender finishes. Trial scripts corrective_trial.py and volume_trial.py are rejected experiments; do not promote them. finalize_corrective.py was prepared but never run.

Known incomplete work: inner-elbow pinches, leap hip puckering and the upper-thigh/rump ledge need further sculpt-only pose-space corrective work and game resynchronization. The current file has zero shape keys. Consult report.json and iter_notes.json before using this as approved art. The viewer pose picker uses exported frame times (1 + 10 * poseIndex) / 30 seconds.
