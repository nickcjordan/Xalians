# The home story's small pieces

Nick, 2026-09-27: the helix pieces "are a decent first attempt, but I think that still needs a lot of work", and beats 2 and 3 (the vat) are next. This brief sets the look all four small pieces share, a storyboard for each, how they are built, and how each round is checked. It serves `docs/design/home-story-content-plan.md` (the beats, headlines and chain steps there still hold) and replaces the look of the first helix pieces (`pages/home/helixPiece.tsx`, 2026-09-24).

## 1. What was wrong with the first helix pieces

Rendered through a whole loop at 1366 wide (2026-09-27):

- **Diagram, not footage.** The helix is flat line art, two sine strokes and candy-colored bars, with no light, no depth and no material. Next to the painted plates on either side of it, it reads as a textbook figure.
- **Small in its frame.** It fills about two thirds of the screen's width and a quarter of its height; most of the recording is empty black.
- **The plague is not seen.** A small red smear at the decaying end, and the helix simply gets shorter. Nothing reaches it, nothing burns, nothing is destroyed on screen.
- **The token piece's parts read as noise and clip art.** The blanks arrive as a scatter of random sticks; the Scrambler Token is a generic integrated circuit with pins; the helix does not fold into it, it shrinks under it.

## 2. The shared look: genome record footage

Every small piece is a recording on the archive screen, like the full scenes, but of a specimen rather than a place: footage from a laboratory's imaging rig.

- **Ground.** Near black with a deep cold cast, a soft pool of light behind the subject, and a vignette. Slow motes drift at three depths in front of and behind the subject, the fluid or air of the imaging chamber.
- **Light.** The subject is lit, not outlined: every part has a lit side and a shadow side, bright parts bloom (additive glow), and depth shows as size, brightness and softness (near parts larger, brighter and sharper; far parts smaller, dimmer and hazed).
- **Scale.** The subject fills most of the frame: the helix spans about nine tenths of its width and about a third of its height; the vat's window is about nine tenths of the frame's height and the creature about three fifths of the window. Nothing the eye must read is thinner than about 1.5 CSS pixels on a 360 pixel wide phone.
- **Palette.** Lore art keeps its own palette (the art rule). Each piece picks its own; the helix pieces share one so they read as the same molecule: one cool, luminous family (sea green, pale gold, blue, lavender), the bases giving off light, the backbone tinted toward the chamber, never a saturated model-kit rainbow.
- **Motion.** Slow and physical. Nothing snaps without a cause; falling things fall under gravity and tumble; light flares and decays.
- **Film rate.** Drawn at 20 frames a second, like the plates, stepped from the piece's own clock.

## 3. The molecule

One genome helix model serves the plague and the token: a double helix with a major and a minor groove (the two backbones sit about 140 degrees apart, not 180, which is what makes it read as real rather than as a ladder twisted), ten base pairs a turn, turning slowly about its own axis, its axis tilted a few degrees across the frame.

- **Backbones:** a chain of beads (the sugar and phosphate units), each a small lit sphere, joined by a tube. Beads nearer the viewer are larger and brighter.
- **Base pairs:** two slabs meeting in the middle with a hairline gap (the bond), each slab its base's color, lit on its upper face.
- **Drawn back to front**, every bead, tube piece and slab sorted by depth each frame.

## 4. The pieces

### Beat 2 · "Designed to thrive in Xalia's most extreme environments"

A Generator's vat window, close up: a round porthole in a dark riveted housing, thick curved glass with a highlight, green gel behind it, lit from below, with bubbles rising at several depths. In the gel a creature condenses out of the glow as a cloud of bright motes that gathers into a silhouette. It holds as each form, then loosens back into glow and gathers into the next, three forms from three deadly worlds, each tinted by its world's light: Neph (Saiphus, air: pale blue), Imprit (Magmuth, fire: ember orange), Yetimoth (Krystos, ice: cold white). On the last form it settles, and two eyes open, points of light. Loop about 14 s: gather, three forms, settle, eyes, hold, fade.

The silhouettes are Nick's own (`src/svg/species/token/<key>.svg`, the single-path 64 unit versions), never redrawn. They are rendered, not stuck on: a solid creature is a dark body in the gel, lit from below in its world's color (a tint rising inside its lower edge, a rim bright below and fading upward) with a thin haze of gel over it; Neph, a hydrogen creature, is drawn as its own glowing filaments. Each world's light floods the gel while its form holds.

### Beat 3 · "The galaxy's first artificial intelligence"

The same vat, the same creature, its eyes already open (beat 2's last frame). A thin line of another light (a hard, cold violet-white, art not canon) threads along the housing's rim and into the glass; from the edges inward the gel's green is overtaken by that light, the bubbles stop and hang, and last the creature's eyes change to the same light. Loop about 12 s: the takeover, the eyes, hold, fade.

### Beat 5 · "Designed by APEX to target the genome" (the plague)

The helix turns, healthy, its bases glowing softly. A dark crimson haze enters from one end and curls around it. Where the haze reaches, the bases flare ember red and then go dark as charcoal; the bonds break and the base halves drift apart; fragments peel away and fall, tumbling and fading; the backbone beads crack dark and the strands fray and snap, sagging away in sections; ash sifts down. The front crosses most of the helix; a short broken length is left at the far end, turning slowly, flickering weakly, as the haze thins. Loop about 12 s.

### Beat 6 · "The only way to safely generate new Xalians" (the Scrambler Token)

The broken length from the plague piece dims away. In the dark, points of light appear and stream in along spiral paths, building a new helix unlit and blank: a pale grey scaffold, generated new rather than rebuilt from the fallen pieces (the fact-check ruling). Then the scramble: a wave of flicker runs through the rungs as they cycle through the bases, and each locks into its base in a random order with a small flash, the helix brightening as it fills. Then it winds tight, turning faster as it coils shorter and curls into a small ring of light with a white-hot center (the window shows a coil of light, not a legible helix), and the Scrambler Token forms around it: a hexagonal wafer of dark glass and worn metal seen in three-quarter view, with visible thickness, beveled edges lit on one side and shadowed on the other, contacts sunk in slots along its lower edge, and a round window in its face where the coiled genome glows. No Scrambler Token art existed on the site before this (checked 2026-09-27), so this chip is the first. A seal flash; the token turns a few degrees toward the light and a glint crosses its face; hold, fade. Loop about 13 s.

## 5. How they are built

- **Canvas 2D**, one canvas per piece, pseudo-3D by hand: points in 3D, a perspective projection, a depth sort. Glows are drawn from cached radial sprites with additive blending, never canvas filters or shadow blur (both too slow per frame).
- **Pure drawing:** each piece is a function that draws a given moment (`t` seconds into its loop) onto a context, with no state of its own. The component only owns the clock and the canvas, so any moment can be rendered and checked.
- **The harness:** `apps/web/dev/pieces.html` (served by the dev server, never built) renders any piece at any moments side by side; `scripts/design/snap-pieces.cjs` writes contact sheets from it.
- **Cost:** a piece draws at 20 frames a second and holds still off screen or when not shown, like a plate.

## 6. How each round is checked

1. Contact sheets of each piece at 12 moments across its loop (`scripts/design/snap-pieces.cjs`), full-size frames of the key moments, and the pieces on the page inside the archive screen at 1366 wide and on a phone. Stills cannot show flicker, drift or a loop's seam; those are checked live.
1. The cost of each piece on the page (`scripts/design/perf-pieces.cjs`): at most about what a living plate costs while it plays.
2. An independent reviewer (an Opus subagent that writes no code) reads the sheets against this brief and ranks what is wrong; the builder never grades its own round.
3. Rounds continue until the reviewer's top finding is taste rather than a fault, which Nick judges live.
4. The screen-reader descriptions of the pieces pass the lore fact-check before they ship.
