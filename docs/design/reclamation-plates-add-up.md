# Reclamation: the plates add up (pass 66)

Status: shipped in pass 66. It takes open item 3 in the ownership log, the defects the pass 65 rubric critic found.

## The problem

The pass 65 critic (Numbers 5 of 10) listed "numbers a stranger cannot trust". Two of its cases were real, and one was a moving picture caught in a still.

- **The plates did not add up to the world.**
  - Scalatto read 13 on its plate at Saiphus and 10 on its card.
  - The plate printed the hold now, with the Clash's cut drawn as a hatched end on its bar.
  - The card and the world's bar count what the Clash would leave.
  - So Saiphus's plates read 13, 15 and 11 (39), while its bar read 36.
  - The new check below found the same on the live build at Zolton, where the rival's plates read 9 and its bar 5.8.
- **Your row lost its counts on a phone** when two swift creatures could move. The two Move keys pushed "0/5 5/11" off the foot (a pass 65 layout defect).
- **Not a defect: Grimedes' total at the moment the Court reads.**
  - As the last world's Clash ends, its column narrows back from the arena.
  - The total rides its bar's end in container units, so it slides back from where the wide column had it, and the lane clips it for a moment.
  - The still caught it mid-slide. A player sees it slide in.

## What changed

- **A plate reads now and after where the Clash would cut a creature and leave it standing:** "14→7". It uses the same idiom as a card's rival tag, "12→0" (pass 58), and follows Nick's rule to say a change before and after where the value sits.
  - A creature the Clash would down keeps its struck number and its cross.
  - An arrow to 0 on every downed creature cost a crowded rank most of every name ("HYP…" where the live table reads "HYPNOPET"), and the cross already says "to nothing".
- **On a phone, your row keeps its counts beside two Move keys:**
  - the row drops its empty sockets ("1/5" says how many are left);
  - the keys drop the word "Move" and keep the swift mark;
  - a key that still does not fit shortens its name.
- **The proving check now holds the meaning, not just the number.** At every turn, at every width, in both views, each side's plates on a world must add up to that side's total on the world's bar, to rounding.
  - It fails on the live build: at Zolton the rival's plates read 9 and its bar 5.8.
  - It passes here.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Show both now and after, not the after alone | 75%: Nick's rule on changes (before and after where the value sits); pass 38 printed the after alone, and pass 52 moved the forecast into the bar | `affordances-not-labels` memory; `reclamationFigure.js` |
| 2 | Leave a creature marked to fall as its struck number with a cross | 80%: the arrow cost the names; the cross and the strike already say it goes to nothing, and the sum check reads them as 0 | the 1366 comparison against live |
| 3 | Leave Stake ×2 and Move without words on the table | 60%: they are controls with their rule in the title and in How to play; Nick's rule is plain copy on controls | the critic's item |

## Verified

- **Tests:**
  - A new test holds a plate's number: now and after, the struck number for a creature marked to fall, and one number when nothing changes.
  - All Reclamation tests pass (258).
- **Table checks:**
  - proving, with the new sum check, at 1440, 1366 and 390 in both views;
  - shift: hover 0.0000, send 0.0025 at 1366;
  - actflip and hotseat.
- **Paint:**
  - at 1440 by 900 and 1366 by 768, the rival rank's plates match the live table's name for name;
  - on a 390 phone, your row reads "0/5 5/11" beside Luceras, Tizzie and Pass.
