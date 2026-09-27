# Brief: species view packs, from one silhouette to a set of views

Written 2026-09-27 as a handoff to an agent that has not seen this project. Nick approves every species' result; nothing here is final until he says so in his own words.

## Why this exists

Xalians is a creature-collection game platform with 30 invented species. For each species the designer (Nick) drew one front-view silhouette: a black shape with white cut-outs for features. It is the shape he imagined, and it is the source of truth.

A separate pipeline builds animated 3D models from these silhouettes. It can match the front view exactly. Everything the front view doesn't show (the side, the back, depth, how parts overlap) it currently has to guess, and the guesses read badly from other cameras.

Your job is to build a layer that sits between the silhouette and the 3D pipeline. For each species it produces a **view pack**: shaded 2D images of the same creature, in the same pose, from around it, that Nick approves. The 3D pipeline will then trace every view, not just the front.

You are building the tooling and producing the packs. You are not building 3D models or animation.

## What exists

- **Nick's silhouettes:** `apps/web/src/svg/species/<key>.svg`, rendered as `docs/species-templates/art/<key>.png`. The white cut-outs inside the black shape are drawn features, not holes: eyes, nose and mouth, ear markings, finger lines, and separations between parts such as tail plumes.
- **Species records:** `docs/species-templates/<key>.json`.
  - `lore.appearance` is a short list of defining qualities.
  - `lore.description`, `habitat` and `behavior` give character.
  - The silhouette wins over the text wherever they differ.
- **An earlier local image pipeline:** on the branch `data/ability-catalog`, logged in `docs/art-pipeline/LOG.md`, with scripts under `scripts/art/`. It uses local SDXL and FLUX models on an 8 GB GPU. Read the log for what was tried and how runs were recorded. It is not required for this work.
- **Repo rules:**
  - Branch off fresh `origin/main` (`npm run wt -- new <slug>`).
  - Commits are authored by Nick with no `Co-Authored-By` trailer; a hook rejects it.
  - Prose uses American English and no em dashes.
  - Design docs go in `docs/design/`.
  - Every PR opens ready for review and is set to auto-merge (`gh pr merge N --auto --merge`).

## Billing rule (hard)

Generate images only through Nick's ChatGPT or Codex subscription. Do not use an API key, a paid image API or any per-image billing without Nick's explicit go-ahead in writing. If a step would bill, stop and tell him first.

## The deliverable: a view pack per species

Put approved packs in `docs/species-templates/views/<key>/`. Keep working candidates in a gitignored work folder.

- **Views:** one PNG per view, all on the same canvas size.
  - Required: `front` (0°), `left` (the creature's own left side, 90°), `back` (180°), `right` (the creature's own right side, 270°).
  - Recommended: `front-left` and `front-right` three-quarters (45° and 315°).
  - Always name sides from the creature's point of view, never the viewer's.
- **Rendering:** a shaded, neutral mid-grey form.
  - Soft even light, no cast shadows, no ground or background (a transparent or pure white canvas).
  - No text, labels or props.
  - Orthographic in feel: no perspective distortion.
- **Registration:** every view has the same scale and the same figure height. The feet sit on one ground row. The same landmarks sit at the same rows in every view: top of the head or ears, eye line, shoulders, hips, knees, soles.
- **Masks:** a clean black-on-white silhouette mask per view, the same size and registration as its image. Derive the masks from the images with your tools; don't generate them separately. Keep the drawn features (eyes, markings, separations) as white cut-outs in the front mask, in Nick's style.
- **`manifest.json`:** records the following for each view:
  - view name and angle, canvas size, ground row, figure height in pixels, and landmark rows;
  - the generation record: tool and model, date, the exact prompt, the input files and their hashes, and a seed if the tool exposes one;
  - check results;
  - Nick's approval with its date. It stays empty until he approves in his own words.
- **`reading.md`:** a short plain-language description, written before any image is generated, of what each view should show. For example: "the tail streams to the creature's left and back, so from the back it fans out to the viewer's right; from the right side it is mostly hidden behind the body."
  - This is where the 3D interpretation happens.
  - Nick can correct a sentence far more cheaply than a set of images, so get it approved for the pilot species before generating.

## Hard constraints and checks

Build these checks as tools and run them on every candidate. A candidate that fails a check never reaches Nick.

1. **The front is Nick's drawing.**
   - Register the front mask to the silhouette with scale and translation only (no rotation or warping). Overlap (intersection over union) must be 0.95 or better.
   - Every white cut-out in the silhouette appears as a visible feature in the same place, within 2% of figure height.
   - Output an overlay image: red for the silhouette only, blue for the view only, grey for both.
2. **One creature, one pose.**
   - Landmark rows agree across views within 1.5% of figure height, and figure heights within 1%.
   - Widths agree where they must: the back view's outline mirrors the front's, except for genuinely asymmetric parts.
   - Part counts are identical in every view where the part is visible (ears, eyes, digits, tail plumes, limbs).
3. **Nothing invented.** No wings, horns, clothing, accessories or extra tails that the silhouette and record don't imply. The creatures are invented: don't turn one into a known animal or character.
4. **Pose.** Keep the silhouette's pose in every view; this is recommended, and the default until Nick says otherwise. The pack shows one moment seen from around.

## How to generate (a starting point; improve it)

- **Generate the whole turnaround on one sheet.** Put all the views side by side on one canvas with guide lines. Image models keep one character far more consistent within a single image than across separate calls. Then split the sheet into views with your tools.
- **Anchor the front.** If the tool can edit an image, give it a template canvas with Nick's silhouette already placed in the front slot and empty slots with guide lines for the other views, and ask it to fill the empty slots. Otherwise attach the silhouette as a reference image and say it is the front view, which must not change.
- **Prompt skeleton** (per species, fill the brackets from the silhouette, the record and the approved `reading.md`):

  > Character turnaround sheet of [name], an invented creature: [appearance list]. Views side by side on one white canvas, left to right: front, front-left three-quarter, left side, back, right side, front-right three-quarter. The same pose in every view: [pose, in words, from the silhouette]. The same scale and height in every view, feet on one ground line, orthographic, no perspective. Neutral mid-grey material, soft even light, no cast shadows, no background, no text or labels. The front view is the attached silhouette exactly: the same outline, proportions and pose. Its white cut-outs are drawn features: [list them]. [The view-by-view notes from reading.md.]

- **Rounds:** generate several candidates per round and run the checks. Put the passing candidates on a contact sheet next to the silhouette for Nick. Log every run, including failures, with a run number, the settings and a verdict, the way `docs/art-pipeline/LOG.md` does.

## Tools to build

Put the tools in `art/species-views/`, with a README. Use Python with Pillow and numpy; add nothing heavy without a reason. Each tool gets a small test.

- `split_sheet`: turns a turnaround sheet into registered per-view images.
- `mask`: derives the clean mask for a view.
- `register`: aligns every view to a common ground row, height and landmark rows, and writes the manifest's geometry.
- `check`: the checks above, writing a report plus overlay images.
- `contact`: the review sheet for Nick, with the silhouette and every view side by side at the same height, and the overlays.

## Order of work

1. **Plan:** write `docs/design/species-view-packs.md` with the approach, folder layout, manifest schema and check thresholds, and open a PR.
2. **Pilot on Akinza** (`akinza`), the hardest case: an upright cat biped with hands on its hips, huge ears held sideways, and three tail plumes streaming to one side. Write `reading.md`, get Nick's approval of it, generate, check, and bring him the contact sheet.
3. **Pilot on a very different body plan** once Akinza is approved, for example `thirstaserp` (a serpent) or `neph` (a floating jellyfish), to show the method generalizes.
4. **Batch the remaining species** in small groups after both pilots are approved, each pack approved by Nick individually.

## Open decisions for Nick

Each has a default, so work can start without waiting on them.

- **Pose:** the drawing's pose (default) or a neutral standing pose. The drawing's pose keeps the front checkable against the silhouette.
- **Views:** four sides plus the two front three-quarters (default), or four sides only.
- **Color:** grey form only in this round (default), with a color pass later.
- **Where generation runs:** in the ChatGPT app, with you writing prompt packs and Nick running them and dropping the results in the work folder; or inside the agent, if its tools can generate images. Paid API use only with Nick's written go-ahead.

## What "done" means

A species is done when its pack passes every check and Nick has approved it in his own words, and that approval is recorded in its manifest. Discussion is not approval.
