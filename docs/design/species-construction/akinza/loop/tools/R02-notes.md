# R02 tool (finish_face_assembled.py): blocked, not built (toolsmith, round 26)

Status: ready false. The method cannot be built as a recipe step with the loop as it stands. Nothing was written to tools/R02.json (the round 22 record for author_face_parts_v2.py stays), no starter recipe and no check plan, because none of them could be run: a recipe built from them would assemble exactly as the baseline does and the readers would compare identical creatures.

## Why

The method puts the face cut after the assembly remesh. The recipe has no stage there:

- `recipe.py` `execute()` builds the DAG steps, calls `assemble()` once (loop_tools `assemble`, which runs `assemble_reconstructed_creature.py` at the hard-wired `ASSEMBLER` path) and stops. `run-plan`, `candidate` and `sweep` all go through that function and then `loop_tools.py check` and `packet` on the assembly directory it names. A step is a head or body component; its output feeds the assembler as `--head` or `--body`.
- The assembly step takes only numeric join keys (`JOIN_KEYS` in loop_tools.py, `DEFAULT_JOIN` in recipe.py), so no spec path can reach a script run inside the assembler, and the assembler cannot be repointed (`pin` lists it as "cannot be repointed").
- Any step placed before the assembly (the head chain, as rounds 22 and 25 did) is resampled by the assembler's .0028 world voxel remesh, which is the failure the method review found.
- The brief forbids editing shared helpers (recipe.py, loop_tools.py), and editing the assembler changes its pinned bytes, so every recipe's assembly would read CHANGED and rebuild.

Side finding: `loop_state.tool_list` takes the first `.py` in the methods.json steps text, which is `assemble_reconstructed_creature.py`, not `finish_face_assembled.py`. That is why the work order names the assembler. A tools record for this region must start its `script` field with a path whose stem matches `assemble_reconstructed_creature` or the loop will keep calling it a record for an older tool. Fix the steps text in methods.json (put the script first) when the method is rewritten.

## What would work

1. Smallest change (recommended): a post-assembly stage in recipe.py. Recipe JSON gains `assembly.post`, a list of steps `{id, regions, script, runner blender, args with {assembled} and {out}}` run after `assemble()` on the assembly directory, writing a new directory that keeps the assembly's layout (`akinza.blend`, `akinza.glb`, `assembly.json` with updated object stats, `render/`). Its script closure and args join the assembly cache key; `candidate`, `run-plan` and `sweep` name the post output as the assembly. `contain` and `quick` are unaffected (quick builds from head and body only, so face sweeps would use the check by packet). Roughly 80 lines in recipe.py plus its pin and key code; it needs the loop maintainers, not a toolsmith.
2. No infrastructure change: raise the assembly resolution so the existing v2 head-chain tool survives. `voxel-size` is an existing join key; .0014 world is .0028 head-local, the same resolution as the H29 bulk face that scored 8.3. The cost is about four times the skin faces (709k now) and a longer assembly (7 min now), and it changes every region's surface, so it is a join order on R05's step, not a face tool. Untested here.
3. If neither is wanted: the retopologized quad face patch in the method's "If it stalls" also runs after the assembly and needs the same stage.

## Feasibility of the script itself (checked, not built)

assembled-2751's skin is one closed component (709,462 vertices) with the eyes, irises, nose finish and mouth as separate retained objects, and `assembly.json` records `headTransform` and the join values (head scale .5, jaw anchor .5, depth offset -.02), so head-local coordinates are recoverable. author_face_parts_v2.py is top-level Blender script code, so the window replacement, fine level set and zipper would be copied into finish_face_assembled.py, not imported. Expect about one session (80 calls) once a post stage exists.
