# Review gate: nothing reaches Nick as "fixed" without passing this

Written 2026-10-21 after a run of misses on Akinza (ear tuft, eyeliner gap, head-side blue, fan placement, the crouch). The pattern every time: a builder reported a fix against its own metric, I relayed it, and Nick saw at a glance it was not fixed. The builder grading itself and me trusting the grade is the failure. This gate replaces both.

## 1. Setup check before building (rig, anatomy, placement)
Before any build that places or moves anatomy, I look myself at the setup drawn on the rest model: joints and bone lines over the bare mesh (side, front, back), hinge axes, weight regions, or the feature's placement measured from the model. I compare it with real-anatomy reference for that exact part (see LESSONS: research per anatomy part). The build starts only when the setup is right.

## 2. Builder proof, per point
Every brief lists Nick's points verbatim, numbered. The builder must return, for each point, a before/after crop at the same framing as Nick's own screenshot or comment (or the view he judged), at full size. A metric may support a crop, never replace it. "Fixed" without a matching crop is treated as not fixed.

## 3. Blind critic
Before posting, a fresh reviewer agent that did not build it gets only: Nick's words verbatim, his screenshot if any, the reference images, and the after crops. It judges each point "fixed / not fixed / worse", with the region it looked at. It never sees the builder's report or numbers. Any "not fixed" or "worse" goes back to the builder, not to Nick.

## 4. My own look
I open every image I post at full size, plus a crop of each point, and write one line per point in my own words: what Nick asked, what the picture shows. If my line and the critic disagree, I look again; I say what I see, not what the builder claimed.

## 5. After Nick rejects a fix as unchanged
Stop building. Run a no-build diagnosis of the cause (setup overlays, rest mesh, weights, reference comparison) and show Nick the diagnosis before the next build. Log the miss in LESSONS.md with the cause.

## 6. Motion is judged in motion
Anything that moves is posted as a playing clip from the views that matter, not only stills.
