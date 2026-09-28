# Silhouette to construction package

Status: workflow implementation authorized by Nick on 2026-09-27: "Sounds great. Can you put that system in place via Markdown files and whatever else you feel makes sense? Then dive in and see if you can exercise it with this creature". This authorizes implementing and exercising the proposed system, including an exploratory rough-model checkpoint. It does not approve new art.

Read `../species-construction-pipeline.md`, this workflow, the species folder's `brief.md`, `package.json`, and `review.md` before continuing. The source silhouette is an abstraction. Accepted interpretations and Nick's corrections guide the design. No source-overlap gate. Subscription image generation only. No creature-record or lore changes in this workflow.

## Operator sequence

1. Create a species folder from `TEMPLATE.md`. Read the source SVG and species record, inspect available art, and write observed features, proposed interpretations, uncertainties, and stable part IDs. Put accepted user directions in the decision register with exact words and source.
2. Develop an identity sheet. Record which aspects Nick actually accepted; a style preference is not complete pack approval. Keep the original source, preferred look, and accepted corrections as distinct input roles.
3. Develop construction views that resolve volumes. The agent chooses a neutral modeling arrangement that exposes anatomy and avoids overlap, keeping it distinct from expressive posing. Do not block construction on Nick choosing among aesthetic pose options. Keep each pose set internally consistent. Identify each image's nominal camera angle; do not label generated views calibrated.
4. Develop attachment and hidden-surface studies where needed. Name the parent, shared root, branches and expected occlusion. Drawings of smooth clay are still drawings. Check that apparent angle changes actually depict the same form.
5. Use a small geometry probe when illustrations cannot resolve a connection. This is permitted exploratory work before stage approval, clearly labeled provisional. Render complementary views from one continuous mesh. Export actual cameras and a connectivity report. Do not infer art approval, measured creature dimensions, or full-body readiness from a successful technical probe.
6. Assemble a current reference packet with explicit precedence and scoped approvals. Once accepted component directions cover the creature, use a provisional complete rough model to reconcile their proportions, attachments and projections. Do not require independently generated images to prove geometric consistency before this experiment. Render matching views and an unseen-angle turntable. Unresolved dimensions and limb posture remain proposals. This exploratory entry does not release layers 3 or 4 or approve the geometry. Full stage release still requires coherent evidence and Nick's approval. Detailed modeling waits for rough-form approval.
7. Produce the final handoff using `HANDOFF.md`. Bind approved images, derived masks, geometry, decisions and camera conventions. Implement the adapter for the actual consumer; do not assume a generic PNG folder is sufficient for the existing Blender template builder.

Process correction after the Akinza tail exercise: expressive posing is deferred until the complete creature can be judged in context. A local tail shape approval is a completed design decision, not a reason to open a pose-selection subtask. Return to unresolved whole-body construction. Request feedback on meaningful construction results and substantive anatomy choices; handle technical viewing arrangements without requiring coaching. Rigging, deformation checks and animation belong downstream of the approved construction handoff and are not yet implemented by this workflow.

## Every study

Apply the repository [autonomous completion loop](../autonomous-completion-audit.md) after each study. Maintain `completion-audit.json` beside the current species brief. The visual audit's open findings are implementation obligations: fix, render, compare and audit again. Do not end with the audit itself while known authorized corrections are executable. Candidate 0020's current audit is a deliberately failing backlog and must not be sealed as ready.

- Save the exact prompt before generation and label input roles. Copy immutable input snapshots into the run folder. Record SHA-256 hashes, tool, timestamp, billing route, exposed model/seed or honest nulls, and returned output.
- Keep working originals outside the approved-pack directory. Record visual failures even when the result looks appealing. Retain failures to prevent repeated mistakes.
- Record the intended pose, nominal views, decisions consumed and unknowns addressed. Describe technical measurements separately from proposed anatomical choices.
- Update `package.json`, run the tracker, and inspect its report. Missing evidence or a stale input cannot silently pass. Semantic reviews cite an exact stage digest. Only actual Nick messages may fill approval records.
- Present design studies for directional feedback even if they fail production checks, labeled with their limitations. Only fully eligible packs are presented as final approval candidates. This clarifies the earlier blanket rule against presenting failed candidates.
- Update the main work record before stopping. Continue reversible corrections and verification. Stop for Nick's subjective approval at a concrete review artifact, not an abstract permission request.

## Adaptation during work

Likeness is an exit requirement for construction and reconciliation. A model that passes topology, camera and mask checks can still fail the stage completely. Compare the whole creature to the preferred image references before asking Nick to review another local correction. If broad form fails, label the result a diagnostic proxy and revisit geometry authoring; do not describe surface work as the only remaining step. Keep head, muzzle, ear tissue, major coat masses, body proportions and ankle/wrist connections in the construction scope. Fine strands and texture cannot substitute for those shapes.

Read [LESSONS.md](LESSONS.md) before choosing the next representation. Maintain one current reference map per species, with a role and explicit exclusions for each image. Keep chronological history in review records. Never feed an entire historical sheet into a correction without excluding its superseded parts.

Before a study, state the uncertainty, accepted parts to preserve, expected evidence and exit condition. After it, record the actual failure or improvement and the next method. If the same geometric error survives two targeted image attempts, stop rewording the same request. Inspect anatomy if needed, then use geometry, calibrated projections or an explicit connection diagram. This is an operator retry limit introduced after Akinza, not a claim that Nick ratified a numeric quality threshold.

Choose the smallest affected scope. Preserve accepted source pixels and their hashes. A newly modeled equivalent is a candidate and requires comparison; approval of the source does not transfer to it. Check tail count, body-level fusion, midline, rear contour, pupil direction, animal extremities and part count before showing Akinza. Do not ask Nick to rediscover a known regression.

Separate progress from release: a provisional layer-5 experiment may expose missing layer-3 decisions while every production gate remains blocked. Report both the active work layer and what is actually approved. Record a lesson with the concrete action taken now, not only a future intention. Review whole-creature milestones where possible; do not turn technical camera or pose choices into repeated user decisions.

## Invalidation and feedback

Quality-control correction after candidate 0020: review actual geometry against the preferred references at comparable regional scale. Require front, profile and rear evidence for head/ears, facial volume and eye integration, trunk/limb transitions, paws/joints, and tail/pelvis continuity. List substantive differences first; a local improvement or absence of mesh errors cannot support a whole-creature pass. Keep any known major construction failure in internal work. Label generated design references separately from model renders in the delivery itself. A second agent must challenge the comparison, not merely confirm the last local fix. See [Akinza's failed quality review](akinza/quality-audit-0020.md).

A decision has one stable ID. Reference that ID from every affected stage. Store exact feedback alongside the interpreted instruction. Changing a tail decision invalidates the tail study, rough geometry and final handoff; unrelated face studies can keep their evidence. Never rewrite a previous approval onto changed images.

Geometry stages depend on both construction and connections. Full release requires approved upstream stages, recorded visual review bound to current evidence, and Nick's explicit artifact-bound approval. Technical integrity alone only establishes that records still describe the files on disk.

Acceptance may cover a specific aspect. When Nick accepts shape but reserves pose, save his exact words with the accepted and excluded aspects and exact source artifact hashes. Carry the accepted form forward without asking him to approve it again. Keep pose candidates separate. Store the scoped acceptance as stage evidence; do not turn it into whole-stage approval or refresh unchanged rejected references. The Akinza `tail-shape-acceptance.json` record demonstrates this distinction.
