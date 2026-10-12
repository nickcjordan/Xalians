# Refinement process: one part at a time, with every hold declared

Written 2026-10-12 after the Akinza eye-socket episode. Applies to every species once construction moves from broad shaping into refining a part with Nick (and to loop orders and builder briefs generally).

## What went wrong

Nick asked for the dents around Akinza's eyes to be fixed. From 2026-10-09 to 2026-10-12 eleven builds (v5e, v5t, v5t2, v5t3, three previews, v6, v6b, v6c, eyes-v2) spent roughly 12 hours and 6M tokens on it. Every builder brief said "keep the eye globes, opening and outline exactly in place". Nick never asked for that; I added it so the approved front view would not drift. But the dent was caused by the eyeball itself (a large globe wrapping back onto the side of the head), so no amount of skin work inside that rule could remove it. Builders iterated inside the rule, reported partial progress, and I kept relaying "mostly fixed". Nick could not see the rule, so he could not lift it. When he said "you can adjust the eyeballs, I don't care", one build fixed most of it; lifting the next two hidden rules (the outline traced from the old front view, and the eye lens offset from the face surface) fixed the rest.

Three failures, in order of cost:

1. A hold I invented was treated like one Nick had set, and was never shown to him.
2. Repeated partial results on the same defect did not trigger a check of the rules; they triggered more passes.
3. A coupled system (eyeball plus socket) was split so that only half of it was allowed to change.

## The rules

### 1. Every hold is declared, sourced and visible

Every builder brief and loop order lists its holds (what must not change) in a table, and each hold carries its source:

| Hold | Source | Why |
|---|---|---|
| Mouth and muzzle unchanged | Nick, 2026-10-10: "mouth looks good" | approved part |
| Eye globes fixed | inferred by me | protect the approved front view |

Rules for the table:

- A hold sourced from Nick quotes him and dates it. Anything else is marked "inferred" and states the reason.
- An inferred hold is the weakest kind of constraint: a builder may propose lifting it at any time, and must say so when it blocks the goal.
- The review page shows the same table under every step ("Held fixed this step"), in plain words, so Nick can strike a hold he never meant.
- Approval of a part protects its look, not its implementation. "The eyes look right from the front" protects the front-view look; it does not freeze the eyeball geometry.

### 2. Builders report blocks, not partial progress

Every builder report has a mandatory "Blocked by" line: which hold, if any, prevents the requested result, and what lifting it would allow. "Mostly fixed" or "softer but still visible" without a "Blocked by" answer is an incomplete report. A builder that hits a hold stops iterating inside it and reports.

### 3. Two passes without a fix trigger a cause and hold audit

If the same named defect survives two passes, the next step is not a third pass. It is:

1. Find the physical cause (what geometry produces the defect, measured or rendered, e.g. "the globe tip sits 0.05 behind the lids and the skin follows it").
2. List every hold in the brief and ask of each: would lifting this let the cause be removed?
3. If an inferred hold is in the way, lift it and say so. If a Nick hold is in the way, ask Nick in one plain sentence with a picture.

### 4. A part is a functional unit, not a mesh region

Define a part by what has to change together to fix it: an eye is the eyeball, its opening, its lids and its socket; a mouth is the muzzle, lips and chin. Never scope a part so that the cause sits outside it while the symptom sits inside.

### 5. One part at a time, validated with Nick (Nick, 2026-10-10)

"Iterate on one part and make sure it gets enhanced to the point where I am happy, validate with me, then move to the next." Every step measures that nothing outside the part moved (displacement map plus pixel diff) and shows the before and after. On rejection, revert to the last version he liked and carry over only what he approved.

### 6. Show only what is ready, and judge it from every angle

Never show Nick a picture with flaws and ask him to ignore them; he judges what is on screen. Before a step reaches him, look at the part from front, three-quarter, side, top and below, and judge the look, not the checklist: a defect list going to zero is not the same as the part looking right.

## Builder brief template (the part of it this adds)

```
Goal: <the outcome Nick asked for, in his words>
Part: <functional unit>, and why it includes what it includes
Holds:
  | Hold | Source (Nick quote + date, or "inferred") | Why |
May change: <everything inside the part, including anything the holds do not name>
Report must include: Blocked by: <hold or "nothing">; what lifting it would allow
```
