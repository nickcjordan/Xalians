# Akinza construction exercise review

Reviewer: Codex, 2026-09-27. These are agent observations, not Nick's approval. Run paths are relative to the repository root and working files remain local under `untracked/species-construction/akinza/`.

Exact prompts, subscription tool metadata and input/output hashes: [modeling-pose study](records/study-0001.json) and [attachment study](records/study-0002.json). The geometry probe uses [the versioned volume spec](probe-spec.json) and [recorded cameras and checks](records/probe-0001-geometry.json).

## study-0001: modeling pose

`study-0001/construction.png` proposes arms lowered away from the torso while preserving the large ears, eyes and three plumes. It is useful for evaluating whether the new pose is desirable. It is not a valid multiview construction master: the left profile retains too much lateral tail spread; the back hand is obscured; substantial fur detail remains; nominal cameras and projections are not measured. Reject it as a geometry constraint set while retaining it as a pose proposal.

## study-0002: generated attachment sheet

`study-0002/tail.png` simplifies the tail into smooth volumes. The labeled left and above panels do not provide trustworthy orthographic left/top views of one object. The above panel is tilted, and the pelvic form regresses toward prominent rounded cheeks. The prompt also contained an incorrect page-side instruction for the above camera. Reject this sheet as geometric evidence. Do not carry its body shaping or camera labels into modeling.

## probe-0001: actual geometry

`probe-0001/probe.blend` contains one fused tail and pelvis mesh, built from the versioned `probe-spec.json`. `geometry.json` records one connected component, zero nonmanifold edges, 16,778 vertices, actual camera matrices and output hashes. These are connectivity checks, not artistic approval or animation-topology certification.

`probe-0001/contact.png` shows rear, left and true above views. `probe-0001/turntable.gif` shows eight elevated angles. The same shared trunk joins all three plumes. Side and top views correctly compress the lateral fan rather than duplicating the broad rear silhouette. The model's shallow fan depth is now visible and can be corrected explicitly. The pelvis and torso are schematic volumes. The finished furry shape, depth, taper and relationship to the whole creature still need review.

Portable technical previews, explicitly unapproved:

![Provisional tail attachment from actual rear, side and top cameras](evidence/tail-probe-contact.png)

![Eight-angle provisional geometry turntable](evidence/tail-probe-turntable.gif)

Eleven occupancy masks are derived from render alpha at threshold 128, with provenance in `review-assets.json`. No painted normal/depth maps or independently generated masks are presented as measurements. The Blender builder is a tested local geometry-probe adapter, not an adapter to the existing full-creature rig templates.

## Approval state and next action

Nick's earlier direction on root, fork, restrained pelvis, eye interpretation, hair and style is retained. He has not approved the new modeling pose, these construction images, this probe, or a final pack. All stage approval fields remain null.

The concrete next design review is the modeling pose plus the three-dimensional tail connection and depth. Use the accepted result to correct the construction master, then make the complete rough creature. Do not promote either failed generated sheet to skip that review.
