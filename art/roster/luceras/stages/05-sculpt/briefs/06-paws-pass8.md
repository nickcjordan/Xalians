# Pass 8 (build B-rnxn): small claws that belong to the toes, claw objects only

Base: your pass 7 result C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass7\paws.blend. Output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass8\, build id B-rnxn. Conventions as BRIEF.md.

Nick, looking at pass 7 (2026-10-15): "The claws seem to be a little disconnected from the feet themselves. They also look to be a little too present... claws are not one of [this creature's defining features]. So he should have claws because it makes sense, but they shouldn't be these long, noticeable things."

So, for every claw and dewclaw:

1. Small: each claw sticks out past the toe tip by about a third of what it does now (roughly 8 to 10 mm visible on the hind paws, less on the fore paws), and its root is no wider than about two thirds of the toe tip it sits on. The dewclaws shrink the same way.
2. Connected: the claw grows out of the toe. Sink the root well into the toe tip (at least a third of the claw's length buried), angle it along the toe's own direction so it continues the toe's line, and let it curve gently down. No visible gap, step or floating look from any camera.
3. Quieter: render the claws a mid-dark gray (value about 0.22 linear) instead of near black, so they read as part of the foot. The final claw color is decided in the surface stage.

The body mesh does not change at all: prove its vertices are identical to pass 7 (max distance 0), as your pass 7 saved-file audit did.

Render compare_render.py (tag "pass8") and compose triples as before, column 2 being yours. Look at the hind paw side, hind paw three-quarter, fore paws front and full body side triples yourself: the claws should be noticeable only up close and should never look separate from the toes.

Slot lock owner "codex B-rnxn claws". Cap 12 minutes. When done, print the path of report.json and stop.
