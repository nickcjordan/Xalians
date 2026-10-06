# R02 tool (finish_face_assembled.py)

Built in round 27 once the loop gained post-assembly recipe steps (loop v3.10). The round 26 block note is superseded; see `R02.json` for the parameters and checks. The starter recipe `recipes/tool-R02.json` adds F-bulk (donor) and the post step A-face to the baseline recipe.

Known limits for the first order: `recipe.py sweep` does not handle post steps (use plan variants with `set` edits on A-face); candidate reports the F-bulk donor head against R01, R03 and R04, which never enters the assembly (read regionShift instead); a post build is 8 min alone and 20 or more when builds share the machine.
