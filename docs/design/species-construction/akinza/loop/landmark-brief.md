# Landmark brief (Akinza reference sheet)

You mark named landmarks on the reference sheet once. Builders and spec writers then read the positions from `sheet.json` instead of re-tracing the sheet by eye. You write no geometry and do not judge the model.

## Image and coordinates

- The image is `docs/design/species-construction/akinza/evidence/identity-run-0001.png`, 2132 x 738 pixels. Every coordinate you write is a pixel of that file: `[x, y]`, x from the left edge, y from the top edge, origin at the top left, in the file's own resolution. If you view a downscaled copy, convert back before writing (the file is 1.066 times a 2000-wide view).
- The sheet has six figures left to right: front, front-left, left, back, right, front-right. Mark only three of them, using the same crops the fit tool uses:
  - `front`: the first figure, columns 0 to 375 (0 to 418 below row 250, where the tail tips cross).
  - `left`: the third figure, columns 759 to 1024. It faces image-left.
  - `back`: the fourth figure, columns 1040 to 1520 (to 1420 below row 250).
- Mark on the surface the silhouette shows. Where a landmark is hidden by another part in that view (for example the far ear in the left view, or the heels behind the tails in the back view), write `null` rather than guessing.

## Landmarks

Left and right are the figure's own sides. In the front view the figure's left is on image-right. In the left view only the near (left) side is visible. In the back view the figure's left is on image-left.

| Name | Meaning | Views |
|---|---|---|
| `eye_centre_l`, `eye_centre_r` | centre of the dark pupil disc (front); the one visible eye in the left view is `eye_centre_l` | front, left |
| `nose_tip` | the front-most point of the nose pad | front (centre of the nose pad), left (the tip in profile) |
| `chin` | lowest point of the chin or jaw outline | front, left |
| `ear_fan_l_outer`, `ear_fan_r_outer` | the outermost point of each ear fan's fur outline, at the same height as the fan's widest row | front, back |
| `ear_fan_l_top`, `ear_fan_r_top` | the highest point of each ear fan | front, back |
| `ear_fan_top` | highest point of the fan or ear mass | left |
| `ear_fan_front`, `ear_fan_rear` | front-most and rear-most points of the fan or ear mass | left |
| `shoulder_l`, `shoulder_r` | the joint centre of the shoulder: where the upper arm leaves the torso, about the middle of the rounded shoulder mass | front, back |
| `shoulder_l` | same, near side | left |
| `elbow_l`, `elbow_r` | the outer point of the elbow bend | front, back |
| `elbow_l` | same | left |
| `wrist_l`, `wrist_r` | the narrowest point of the forearm above the hand | front, back |
| `wrist_l` | same | left |
| `hip_l`, `hip_r` | the hip joint centre, where the thigh meets the pelvis (about the widest point of the hip, seen in the silhouette) | front, back |
| `hip_l` | same | left |
| `knee_l`, `knee_r` | the centre of the knee, midway across the leg's width at its widest bend | front, back |
| `knee_l` | same | left |
| `ankle_l`, `ankle_r` | the narrowest point of the lower leg above the foot, centre of the leg | front, back |
| `ankle_l` | same | left |
| `heel_l`, `heel_r` | the rearmost point of the foot at the floor | left (heel_l), back where visible |
| `toe_tip_l`, `toe_tip_r` | the front end of the foot's toes (claw tips excluded) at the floor | front, left (toe_tip_l) |
| `tail_root_*` | where each of the three tails leaves the body or the neighbouring tail, named by tail from top to bottom as the sheet shows them: `tail_root_1` (uppermost) to `tail_root_3` (lowest); the centre of the join, on the visible tail surface | left, back |

If a tail's root cannot be told apart from the next, mark the point where its fur clearly becomes a separate mass and say so in `notes`.

## How to work

1. Crop each of the three figures from the file at 2x or more (a script is fine: `PIL` crop and resize) and place each landmark by looking at that crop. Do not place points from the full-sheet thumbnail.
2. Write `docs/design/species-construction/akinza/loop/sheet-landmarks.json` in the format below.
3. Draw the check yourself: run `python art/species-construction/loop/sheet_measure.py sheet akinza`, which rebuilds `sheet.json` with your landmarks carried into the figure frame and writes `sheet.png`, the overlay (red outline, blue station ticks every 0.1 of figure height, green circles with names for landmarks). Open `sheet.png` and, for each figure, check every landmark sits on the thing it names. Also make your own 3x zoomed crops of the head and the feet with the points drawn on, because the overview is too small to judge the eye, nose and toe tips.
4. Correct every landmark that lands wrong, rebuild the overlay, and repeat until all are right. State in `notes` which ones you moved after the first overlay and which you consider uncertain (give a plausible error in pixels).
5. Do not edit any other file. Commit only `sheet-landmarks.json`, `sheet.json` and `sheet.png`.

## Format

```json
{
  "schemaVersion": 1,
  "image": "identity-run-0001.png",
  "imageSize": [2132, 738],
  "views": {
    "front": {"eye_centre_l": [x, y], "eye_centre_r": [x, y], "nose_tip": [x, y], "...": [x, y], "heel_l": null},
    "left":  {"...": [x, y]},
    "back":  {"...": [x, y]}
  },
  "uncertainty": {"front.nose_tip": 3, "back.tail_root_3": 12},
  "notes": "free text: moved after overlay, hidden, ambiguous"
}
```

- Coordinates are pixels of the evidence image, as numbers (decimals allowed). A landmark that is hidden or absent is `null`, never omitted and never `[0, 0]`.
- `uncertainty` is optional: the likely error in pixels for any landmark you are unsure of.
- `sheet_measure.py` converts each point to `[(x-cx)/height, (y-top)/height]`, figure height 1, y=0 at the crown, y=1 at the floor, and stores it under `views.<view>.landmarks` in `sheet.json`.
