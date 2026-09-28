# Species construction pipeline

Status: implementation and Akinza exercise authorized by Nick on 2026-09-27. He said, "Sounds great. Can you put that system in place via Markdown files and whatever else you feel makes sense? Then dive in and see if you can exercise it with this creature". The operational entry point is [WORKFLOW.md](species-construction/WORKFLOW.md). This authorizes the system and exploratory rough-model work, not approval of new art or a claim that production stages are complete.

The current [view-pack plan](species-view-packs.md) and [work record](species-view-packs-active-work.md) remain in effect. Nick removed exact source-silhouette matching as an acceptance requirement. His drawings express intent; his corrections and approved interpretations govern the resulting art. Image generation stays within his ChatGPT or Codex subscription. No paid image API or API key is authorized.

## Intended result

One source silhouette enters a repeatable process that resolves identity, volume, attachments, hidden surfaces, and surface treatment. Each stage produces visual references plus structured decisions for the next stage. Nick gives art feedback in ordinary language; the agent carries accepted decisions forward without requiring him to rewrite a modeling brief.

More independently generated angles alone cannot establish a consistent object. The bridge is a rough 3D model that can be rendered against construction references and inspected from previously unseen angles before detailed modeling begins. Nick's implementation instruction expands the earlier image-only brief to include this checkpoint. Small provisional geometry probes may resolve an ambiguity before art approval; full approved-stage release and detailed modeling still require the appropriate upstream approvals.

## Layers and review evidence

| Layer | Outputs | Question resolved |
|---|---|---|
| 1. Interpretation | Source, species evidence, reading, stable part IDs, explicit unknowns and decisions | What does the abstract drawing mean? |
| 2. Identity | Gray six-view concept sheet and selected style reference | Does this look like the intended creature? |
| 3. Construction | Simplified clay views, targeted top or underside views, body volume beneath surface hair, and a proposed modeling pose | What solid shapes and depths produce this appearance? |
| 4. Connections and detail | Attachment close-ups from complementary angles, part overlays, connection graph, and focused face, hand, or foot studies where needed | Where does each part begin, how does it join, and what is hidden? |
| 5. Geometric reconciliation | Rough continuous 3D surface, matched-camera renders, overlays, and an unseen-angle turntable | Can one object actually satisfy these references? |
| 6. Surface and handoff | Surface treatment references, approved construction model and renders, derived masks, measured landmarks and cameras, versioned manifest, and backend-specific inputs | What must the final model preserve, and what data can its builder consume? |

Layers 3 and 4 can iterate together. Their outputs are studies until Nick approves the interpretation and the references agree. Do not generate a full new sheet for a local uncertainty that one focused study can resolve.

Operational refinement, 2026-09-28: a provisional whole-body layer-5 experiment may reconcile scoped accepted component directions before full layers 3/4 release. Requiring independently generated pictures to prove geometric consistency before geometry creates a circular gate. This does not waive any art approval or production release requirement. The agent must preserve a current reference map, compare the modeled forms against accepted evidence and identify unresolved choices. See [lessons and their current application](species-construction/LESSONS.md). After two targeted image attempts repeat the same spatial failure, change representation instead of continuing a prompt loop.

### Construction references

Keep the preferred gray furry appearance as the identity reference. Construction views simplify fine hair and lighting detail enough to expose head depth, muzzle projection, ear thickness, torso and pelvis depth, limb taper, and tail volume. Preserve silhouette-defining fur masses. A simplified body beneath the fur is a proposed interpretation, not an observed fact or a new species record.

For Akinza, hands on hips obscure the arm-to-torso boundaries. Propose a separate modeling pose with the hands clear of the torso and the feet sufficiently separated. Preserve the expressive reference pose in its own named set. Never mix poses within one registered set or treat changed limb positions as registration errors. Neutral poses depend on the body plan; a serpent or floating creature does not need a humanoid T-pose.

Add top, underside, or rear three-quarter studies only when they resolve a named uncertainty. An ear-thickness study is more useful than many redundant full-body angles. Use consistent design references for every study, and reconcile any conflict before promoting the result.

### Connections

For Akinza, the accepted tail interpretation is:

```text
pelvis at base of spine
  -> compact shared fusion at the body
    -> distinct full tail A, tapering to a point
    -> distinct full tail B, tapering to a point
    -> distinct full tail C, tapering to a point
```

Show the junction from the rear, side, and above, with enough visible surface to establish continuity. Preserve the reduced rear pelvic emphasis. Color-coded part overlays are technical annotations, not a new creature color scheme. Part labels do not imply separate disconnected mesh pieces.

Latest Akinza correction: Nick rejected a projecting common stalk with a delayed trident split. Three tails fuse with each other and the body at the spinal base, and separate immediately. Full rounded volume must coexist with pointed taper. Older probe specifications remain historical evidence, not current construction targets.

A connection record should identify the parent region, attachment location, branch relationships, visible continuity, and evidence images. Unmeasured coordinates remain unspecified. Record explicit distinctions such as hair versus ear tissue, markings versus gaps, and a shared tail base versus independently attached tails.

### Rough model feedback loop

Construct a coarse but continuous surface from the approved construction references. A limited, explicitly provisional attachment probe may precede approval to reveal an ambiguity. Do not use a disconnected primitive assembly as evidence that attachments are resolved. Avoid detailed fur, texture, production topology, or rigging until the main form survives this loop:

1. Render the rough model with consistent orthographic cameras and neutral lighting.
2. Compare its views with the approved construction references using silhouettes, proportions, visible landmarks, and connection review.
3. Inspect a turntable and elevated or low views that were not supplied as inputs.
4. Correct geometry where the interpretation is clear. If references contradict each other, resolve the design conflict and version the affected references rather than forcing incompatible views into a mesh.
5. Obtain Nick's explicit approval of the rough form before detailed modeling.

Quality correction after Akinza, 2026-09-28: a technically coherent primitive proxy is not an acceptable completion of layer 5. Nick requires the untextured geometry to carry the likeness of the preferred grayscale references across the main views. Head and muzzle shape, eye integration, ear construction, body mass, joint articulation and silhouette-defining coat masses belong to construction and geometric reconciliation. Do not defer those failures to a fur or texture pass. Fine hair strands and material microdetail can wait. Before another whole-model approval request, the agent must compare all major regions with the current likeness target and resolve known geometry regressions, preserving later scoped corrections.

Before this stage, image view angles are requested or nominal. An image labeled 90 degrees is not a calibrated camera observation. Once geometry exists, export actual camera transforms, orthographic scale, coordinate conventions, depth, normals, and part masks from that geometry. These are exact for the current model, not proof that the model is artistically correct. Do not paint independent depth or normal images and describe them as measured geometry.

Research supports treating multiview consistency as a separate reconstruction problem: [Wonder3D](https://arxiv.org/abs/2310.15008) jointly predicts normal and color views with cross-view information exchange, then reconstructs a surface. That does not establish that ordinary independently generated illustration views are geometrically consistent. No model or service is selected by this proposal.

### Surface and downstream build

Separate large geometric fur clumps and silhouette tufts from smaller surface detail. Keep lighting out of any eventual albedo specification. Gray form remains the current art scope; a color or material design pass needs its own agreed scope.

Detailed topology, UVs, deformation, and rigging still belong to the downstream model workflow. Reference images cannot certify those properties. An approved rough model should be reusable as construction input where supported, reducing repeated interpretation.

The checked-in `art/creature-motion-comparison/blender/build_species.py` builds a selected template from JSON proportions, anatomy switches, palette, and motion data. Its Akinza spec has numerical torso, limb, ear, and tail settings. This path does not automatically consume a six-image strip. A backend adapter must either translate approved geometry and measurements into supported inputs or provide the construction model to a different builder. Do not claim the existing template parameters can express every approved shape. Newer work outside this checkout was not verified.

## Persistent decisions and automation

Use a versioned species package with separate identity, construction, detail, and geometry assets. Retain exact prompts, input hashes, untouched outputs, processing recipes, rejection reasons, and verbatim approvals. Suggested additional records are `decisions.json`, `parts.json`, `connections.json`, and `cameras.json`; these are proposed interfaces, not implemented schemas.

Each record distinguishes observed source evidence, Nick's explicit direction, proposed interpretation, and geometry-derived measurement. Store uncertainty instead of invented precision. Stable part IDs connect feedback, images, masks, and geometry. One approved tail decision should feed every later prompt and build input.

Derive masks from their corresponding images or rendered geometry. Do not independently generate masks that can drift from the asset. Keep occupancy, surface markings, and part IDs distinct.

Track dependencies so a tail-junction edit invalidates affected tail studies, construction geometry, renders, and downstream assets, while retaining unrelated approved face studies. Do not apply local 2D fixes that silently create a contradictory whole creature. Every promoted package is an internally consistent snapshot.

Automate file integrity, counts supported by reviewed annotations, registration within a pose, camera export, mask derivation, report generation, and dependency invalidation. Keep semantic inspection and Nick's art approval explicit. A numerical pass is evidence of consistency, not proof of anatomical or artistic quality. No source IoU threshold governs any stage.

Nick reviews meaningful design decisions and complete stage results. Reproducible exports from unchanged approved inputs do not need repeated design discussions. Approval applies only to the identified artifacts; changed art is a new candidate.

## Proposed Akinza pilot sequence

1. Preserve the preferred first-round style and accepted run-0007 tail/rear direction. Treat run-0008's six-view sheet as a good starting concept, not final pack approval. Retire source-overlap optimization as a goal.
2. Reconcile side naming, tail sweep, occlusion, and pose across the concept views. A pleasing sheet does not certify those properties.
3. Produce a construction study that exposes head, ear, body, and tail depth, plus the proposed clear-limbed modeling pose. Show the tail junction separately from rear, side, and above.
4. Review these new interpretations with Nick. Carry his accepted corrections forward directly.
5. Make the rough model and run the render/compare loop before detailed modeling. This checkpoint now belongs to the authorized construction workflow; the separate downstream workflow receives its approved evidence.
6. Refine the handoff contract against that real consumer. Pilot a contrasting body plan only after Akinza reaches its agreed approval gate.

Implementation includes the six-stage tracker, documentation templates, authored surface construction and an exercised Akinza geometry-reference handoff adapter. Candidate 0020 includes a complete rough creature, actual six-view renders and closeups, a turntable, derived masks, calibrated depth/normals and a round-trip-checked GLB. Independent review passed readiness for Nick's clay review. Surface direction and a portable provisional bundle are assembled; Nick's approval and final production-pack release remain blocked. The adapter is explicitly Akinza-only until the contrasting-body pilot is authorized after approval. See [the current reconciliation](species-construction/akinza/reconciliation.md).
