# Generated targets

Spec writers used to spend most of their 100 to 190 turns measuring the sheet and the model by hand. Most of that is mechanical, so a tool now generates it:

```
python art/species-construction/loop/spec_targets.py akinza <region> [--baseline assembled-0458]
```

It takes a fraction of a second (the baseline's station tables are cached in the packet as `stations.json`) and writes three files beside the specs, in `docs/design/species-construction/akinza/loop/specs/`:

- `<region>-targets.md`, under 150 lines: the zone and defining views, every measured rubric criterion with its current value, bound, result, the model and sheet readings and the change that puts the model on the bound, the sheet's station rows (left, right and central run: width and edges, every .02, thinned to at most 16 rows) against the baseline model's rows with the difference, the trunk mesh sections for R05 and R06, and the landmarks in or bordering the zone, sheet against model.
- `<region>-targets.json`: the same data in full, plus the sheet and model outlines clipped to the zone, for scripts.
- `<region>-targets.png`: sheet outline (red) over model outline (blue) in the zone, a tick at every station row, criterion rows in magenta, sheet landmarks (green circles) and model landmarks (blue crosses).

## How a spec writer uses it

1. Run it for your region against the baseline in your brief, then read `<region>-targets.md` and look at the png before anything else.
2. Take every measurement from it. Do not re-trace the sheet or re-measure the model for a quantity the file already holds: station widths and edges, landmark positions, criterion readings and bounds. Copy the numbers into your spec by reference ("`R06-targets.md`, left view, v .44") or paste the rows you target. Differences are model minus sheet in figure-height units, so "make the waist depth .082 at y .44, the model is .106" can be read straight off a row.
3. Spend your own effort on what the tool cannot produce: the structure table (masses, roots, tips, lengths, kind), cross sections, the failure looks, hidden-edge estimates where the akimbo arm or the tails cover the sheet trunk, and anything that needs a mesh section the tool does not make.
4. Know the limits before you quote a row. A silhouette row includes any arm or tail that touches the trunk; the run counts in the last column (sheet/model) show where that happens, and the model's hanging arm fills the lumbar hollow in the left view (the R06 spec found the back edge at .44 is +.014 in the silhouette and -.005 in the mesh section). Where the file says "posed rig joint" the model position is a skeleton point, not the surface point the sheet marks. Landmarks the model cannot show (eyes, chin, tail roots) are listed as not measurable.
5. If a number here looks wrong, say so in the spec's friction section with the row; do not silently replace it with a hand measurement.

The files are generated against one baseline and go stale when the baseline changes: rerun the tool, never edit them. Specs written before this tool (R01, R02 and R08 against 0226 or 0265) cite older values and will differ from the current baseline.
