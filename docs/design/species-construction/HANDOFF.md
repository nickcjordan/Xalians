# Construction handoff contract

This is the required final package checklist, not a statement that Akinza already meets it.

| Asset | Required meaning |
|---|---|
| Reading and decisions | Current interpreted design, stable part IDs, accepted directions, exact approval scope and unresolved questions |
| Identity views | Preferred appearance with named pose, angle and provenance |
| Construction views | Approved solid volumes, a consistent modeling pose, six primary views and targeted detail views |
| Connections | Parent/child attachment graph, shared roots, branch structure, continuity and occlusion evidence |
| Rough geometry | Approved coherent surface and evidence that one object matches the intended form from unseen angles |
| Cameras | Actual transforms, projection, scale, resolution, coordinate system and look/up conventions for geometry renders; generated views remain nominal |
| Masks | Image-derived occupancy and separate markings; geometry-derived occupancy and part IDs where supported, each bound to its source |
| Optional depth/normals | Exported from the current geometry with units and space conventions; never independently painted pseudo-measurements |
| Validation | Artifact hashes, missing/stale input checks, geometric diagnostics and separately identified human visual review |
| Approval | Nick's exact words, date, source and digest of the approved evidence |
| Consumer adapter | Explicit files/fields consumed by the chosen modeling workflow, unsupported data and tested import/render command |

The existing spec-driven Blender builder is a potential consumer, not a certified adapter. Its hand-authored template settings are not measured construction geometry. Topology, UVs, deformation and rigging require later validation in the final model workflow. No claim of production-ready geometry follows from a smooth render alone.
