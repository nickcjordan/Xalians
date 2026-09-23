# Owner checklist

Every item here is something Nick had to point out by hand on the End Wars plate. The reviewer answers each one with pass or fail every round, so he never has to point it out again. When Nick corrects anything on a later plate, add it here as a question in the same session, with the plate and date.

## Identity
1. Can every visible object be named on sight, and does it read as what the piece list says it is? (The warship read as a burning blob until rebuilt with a ram, bridge tower, turrets and engines. End Wars, 2026-09-22.)
2. Does every element have a purpose in the scene? Is there any glow, beam or shape nobody could explain? (A searchlight beam ahead of the ship had no source or reason.)
3. Is it clear what every moving thing is: a projectile, a beam, a spark, debris? (The streaks read as lasers, rays and flaming projectiles at once until they became anti-air bolts from named batteries.)

## Grounding
4. Is anything floating in the air that should stand on something? (A black mast floated mid-sky like a cross.) Does every built thing sit square on its support, its footprint inside the support's top and centered on it? (The Accords blockhouse overhung its summit on one side, and three reviewers passed it.)
5. Does every road, bridge, pipe and river reach an edge, a building or a vanishing point? (Both bridges led to roads going nowhere.)
6. Does everything receding fade into haze or darkness rather than stopping at a hard edge? (The river was cut off at its far end.)

## Depth and fill
7. Do the foreground, middle distance and far distance each hold visible content? (Nothing sat between the bridges and the skyline.)
8. Is the middle distance strong enough to notice at site size? (The first middle city was too faint to see.)
9. Does content run to both edges of the frame? (The city stopped at the riverbanks.)
10. Is every wide wash (fog, haze, light) behind the objects it should be behind? (A white fog layer painted over the mid towers.)

## Motion
11. Does anything pop in, pop out or jump at the start or end of its cycle? (Beam heads jumped from lead to trail; some beams were visible before they began.)
12. Does every moving thing keep a believable speed, with no fast-slow-fast changes? (Some streaks sped up and slowed down.)
13. Do things that should ease in and out do so, rather than snapping? (The whole plate felt jumpy until flames, lamps and flashes were eased.)
14. Do speed cues agree? Does anything that holds still shed fast sparks or trails? (The bow sparks implied a speed the ship did not have.)
15. Does each effect fade in and out like its real counterpart? (The bolts appeared and vanished abruptly.)

## Strength
16. Is any effect louder than its role? (The anti-air bolts were too large and intense until cut by about a third.)

## Concept (added on Accords, 2026-09-22)
18. Does the scene say its lore at a glance, in idle frames as well as at its big moment? (Accords read as a calm "radio mast above clouds" for nine seconds out of twelve until the sky was filled with staggered sprites and strikes.)
19. Does every lore claim the plate depicts match the source's literal wording? (The QED lore says chips go at *opposite ends* of a sprite; the first Accords plate had only one end.) A reviewer finding that argues against the literal wording is rejected, not implemented. (A reviewer asked to make the sprites less like jellyfish; Zolton's history says they dance "like electrical jellyfish.")
20. Does anything important sit under the desktop text card, which covers roughly the left third of a portrait panel around its middle? (The Accords twin lamp and two storm events played under it.)

## Page
17. Does the source page's own text (kicker, pass label, notes) match the current plate? (The review page said "Twenty-fourth pass" long after.)
21. On the live home page, does the reduced-motion still show the plate's composed t=0 frame rather than bare resting values? Check `home-reduced-<era>.png`. (Found on Accords: the page paused the plate before SMIL ever sampled it, so every animated element sat at opacity 0. `livePlate.tsx` now seeks to 0 after injection.)
