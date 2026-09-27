M01 (i): Round 1 begins in "Service entrance." Four player creatures (Hippochamp, Avilily, Crystorn, Graviclaw) face two enemy Crawlers. No action has resolved yet; this is the round-start state. (confidence 4)
M01 (ii): Nothing happened yet, this is a setup/intro frame ("Round begins. Orders resolve from fastest to slowest.") before any order plays out. (confidence 4)

M02 (i): Avilily used "Binding Rake" on Crawler 2, giving it a "Restrained" status (visible bind ring and "Bound" label). (confidence 5)
M02 (ii): It worked; the effect text confirms "Crawler 2 cannot close in on a target at its next opportunity." (confidence 5)

M03 (i): Crawler 1 used "Tool strike" on Hippochamp, dealing 7 damage. (confidence 5)
M03 (ii): It worked as a normal hit; no block or miss shown, just a straightforward 7 damage. (confidence 5)
M03 (iii): can't tell from moment-03 alone — no status label appears on Hippochamp in these frames; the "Corroding 2" label actually appears starting in moment-04, meaning the attack applies a corrosion effect that will tick 1 damage per remaining opportunity (seen ticking in moment-06). (confidence 3)

M04 (i): Crawler 1's "Tool strike" applies a "Corroding" status to Hippochamp, shown as "Corroding 2" — the attack's damage-over-time effect resolving after the initial hit. (confidence 4)
M04 (ii): It worked; the label and text "Hippochamp is corroding for 2 opportunities" confirm the status was applied. (confidence 4)

M05 (i): First, Crawler 2's "Restrained" status wears off ("Wears Off... Crawler 2 is no longer restrained"). Then Crawler 2 attempts "Tool strike" but it is blocked. (confidence 4)
M05 (ii): The bind wore off just before Crawler 2 acted, but its attack was still "Stopped by binding: Binding prevented the action" — the restraint applied to that specific action opportunity even though the status display had already ended. (confidence 3)
M05 (iii): No, Crawler 2 did not successfully attack in this moment — its "Tool strike" was blocked, shown by the "Blocked" label and "Stopped by binding / Binding prevented the action" message, with no damage number appearing on any player creature. (confidence 5)

M06 (i): Hippochamp takes 1 damage from its ongoing "Corroding" status (an automatic tick, not a creature's action). (confidence 5)
M06 (ii): It worked as expected — a small periodic tick of 1 damage, consistent with the earlier "Corroding 2" application. (confidence 4)

M07 (i): Graviclaw used its signature move "Gravity Pincer" on Crawler 1, dealing 8 damage and knocking it out (Crawler 1's HP drops to 0, shown "Down"). (confidence 5)
M07 (ii): It worked fully — Crawler 1 is knocked out. (confidence 5)

M08 (i): Crystorn's attack retargets from the now-defeated Crawler 1 to Crawler 2 ("Target changed: Now targeting Crawler 2"), then uses "Heavy Ram" on Crawler 2 for 6 damage. (confidence 5)
M08 (ii): It worked; the retarget succeeded and the hit landed for 6 damage. (confidence 5)
M08 (iii): Crystorn's original target, Crawler 1, was already knocked out (from moment 07), so the game auto-redirected Crystorn's order to the only remaining enemy, Crawler 2. (confidence 5)

M09 (i): This is a later round (Round 6, "Control chamber") against a new enemy, "Guardian." Avilily uses "Piercing Peck" on Guardian for 1 damage, and the Guardian, which is "Charged," reacts automatically with "Core discharge" on Avilily for 1 damage. (confidence 4)
M09 (ii): Avilily's attack worked (1 damage dealt); the Guardian's response is described as automatic — "An automatic defense answers Avilily. Nothing was ordered" — meaning it's a triggered reaction, not a normal action a player chose. (confidence 4)
M09 (iii): The large machine (Guardian) acted because it was in a "Charged" state, which triggers an automatic defensive counter ("Core discharge") whenever it is attacked — not because anyone gave it an order. (confidence 4)

M10 (i): The Guardian, still Charged, unleashes "Core surge" on Hippochamp for a massive 30 damage, dropping it to 14 HP. Afterward, Guardian's Charged status is spent, replaced by "Slowed 1" and "Recovering." (confidence 5)
M10 (ii): It worked at full force — a big unblocked hit, consuming the stored Charge in the process. (confidence 5)

M11 (i): This is a replay of the same round 6 moment with different orders. Graviclaw uses "Gravity Draw" on Guardian, dealing 3 damage and breaking its Charge ("Guardian is pulled off its footing. Its charge is broken"). Then when Guardian tries "Core surge," it is blocked. (confidence 5)
M11 (ii): Graviclaw's attack worked and had the intended side effect of stripping the charge; the Guardian's subsequent "Core surge" then failed entirely. (confidence 5)
M11 (iii): The large machine's attack ("Core surge") was stopped because Graviclaw's earlier "Gravity Draw" broke its Charge, and the game states it "must recover first," shown by the "Blocked" label and "Stopped by binding... Its charge was broken." (confidence 5)

E1. Moment 05 was the hardest to follow: the "Wears Off / no longer restrained" label appeared right alongside the attack still being blocked ("Binding prevented the action"), which reads as contradictory at a glance — the bind visually ends just as it's credited with stopping the attack. Moment 08 was also slightly confusing because two actions (retarget, then attack) share one moment without a clear visual pause between them. (confidence 3)

E2. Yes — in M05 the "Wears Off" animation seemed to mean the restraint was already gone, but the follow-up frame showed the same restraint still being credited with blocking the attack, which is the opposite of what "Wears Off" first suggested. Also in M09, "Charged" on the Guardian looked like a buff icon but turned out to trigger an automatic retaliation rather than boosting its own next attack directly (it set up the huge M10 hit instead) — in M11 "Blocked / Stopped by binding" reused the same "binding" wording from M05's restrain effect, even though M11's cause was a broken Charge, not an actual restrain/bind status, which was momentarily confusing since it looked like the same mechanic. (confidence 3)
