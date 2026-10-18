B-a87k pass3 tooling and selected result

Selected visual candidate: trial13.blend, followed by pass3_cleanup.py.
The cleanup removes weights on nondeforming bones and checks that all eight Blender surfaces remain unchanged within one micron. It is required before export. The root bone is present for hierarchy and must not carry skin weight.

The final proof entry point is pass3_final.py, always invoked through slot.py run blender with owner codex B-a87k rig. It audits preservation, tests control baking, exports, measures and renders both bodies. Run pass3_validate.py once after each fresh Blender export, then validate.mjs and browser_smoke3.mjs. The compensation script expects a fresh uncompensated GLB.

After final images and browser screenshots finish, run compose_final3.py and report_pass3.py. The report consumes explicit visual_review.json and symmetry_spatial_review.json. A passing technical check does not imply a clean visual result.

Selected13 reduces the game leap notch to a soft facet and preserves a rounded rump. A shallow inherited hip crease remains, especially in crouch. The high sculpt ear-root symmetry outliers were fixed on four vertices. Small exact upper-hip symmetry differences remain because broad sculpt mirroring was visually rejected. Six accepted sculpt corrective keys remain byte-exact.

The scripts numbered1 through14 are experiments, not independently approved build stages. Rejected candidates must not be promoted. The current rig.blend and report.json identify the delivered state. No script changes source geometry, vertex order, UVs, or groom files.
