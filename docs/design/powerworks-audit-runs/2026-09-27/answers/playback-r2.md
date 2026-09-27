M01 (i): The round begins; nothing acts yet, both frames show the same static starting positions (identical to before-the-round) with the "Round begins" banner. Turn order strip shows Avilily first. (confidence 4)
M01 (ii): Nothing happened yet, so nothing to be stopped or missed; this is the setup/announcement beat before action 1 resolves. (confidence 4)

M02 (i): Avilily used "Binding Rake" on Crawler 2, applying a "Restrained" status (shown by the dashed purple ring and "Bound" label), with text "Crawler 2 cannot close in on a target at its next opportunity." (confidence 5)
M02 (ii): It worked; Crawler 2 is now marked Restrained 1, a debuff meant to stop its next move-in action. (confidence 5)

M03 (i): Crawler 1 used "Tool strike" on Hippochamp, dealing 7 damage (63 to 56 HP). (confidence 5)
M03 (ii): It worked as a normal hit; no block or miss shown, just a "-7" damage number. (confidence 5)
M03 (iii): The horse-like creature (Hippochamp) will take ongoing damage from a "Corroding" effect (seen starting next moment, ticking for "2 opportunities" before wearing off). (confidence 4)

M04 (i): Following the Tool strike, Hippochamp is shown newly afflicted with "Corroding 2," with the banner "Crawler 1 Tool strike — Hippochamp is corroding for 2 opportunities." (confidence 5)
M04 (ii): It worked; the corrode stack applied successfully alongside the earlier damage. (confidence 5)

M05 (i): First, Crawler 2's restraint "Wears Off" ("Crawler 2 is no longer restrained"); then Crawler 2 attempts "Tool strike" but it is "Stopped by binding" — "Binding prevented the action," shown by a "Blocked" icon. (confidence 4)
M05 (ii): The restraint expired right at the top of Crawler 2's turn, but the game still treats the intervening binding as having prevented that action (the strike is blocked despite the status having just worn off) — a bit confusing sequencing. (confidence 3)
M05 (iii): No, Crawler 2 did not successfully attack in this moment — its "Tool strike" was blocked/stopped by the binding effect, shown by the "Blocked" icon and the text "Binding prevented the action." (confidence 4)

M06 (i): Hippochamp takes 1 damage from the ongoing Corroding effect (55 to... shown as -1, corroding counter ticks from 2 to 1). (confidence 5)
M06 (ii): It worked as a passive/periodic tick, not an action by a creature. (confidence 5)

M07 (i): Graviclaw used its signature move "Gravity Pincer" on Crawler 1, dealing 8 damage and knocking it out (Crawler 1's HP bar goes to 0, marked "Down"). (confidence 5)
M07 (ii): It worked fully; Crawler 1 is defeated (fades to a translucent silhouette). (confidence 5)

M08 (i): Crystorn's action originally targeted Crawler 1, but since Crawler 1 was already down, the target changed to Crawler 2; Crystorn then used "Heavy Ram" on Crawler 2, dealing 6 damage. (confidence 5)
M08 (ii): It worked, but with an automatic retarget first ("Target changed - Now targeting Crawler 2") since the original target was invalid. (confidence 5)
M08 (iii): Crystorn hit Crawler 2 (rather than its original target Crawler 1) because Crawler 1 had already been knocked out earlier in the round, so its order was automatically redirected to the remaining enemy, Crawler 2. (confidence 4)

M09 (i): Avilily used "Piercing Peck" on the Guardian, dealing 1 damage; in response, the Guardian automatically used "Core discharge," a reactive counter that hit Avilily back for 1 damage. (confidence 5)
M09 (ii): Both worked; the Peck landed for minimal damage, and the Guardian's automatic defense also connected, explicitly labeled "Nothing was ordered" for the Guardian's response. (confidence 5)
M09 (iii): The Guardian acted here not because it was given an order, but as an automatic reactive defense triggered by being attacked — the text reads "An automatic defense answers Avilily. Nothing was ordered." (confidence 5)

M10 (i): The Guardian, now having consumed its "Charged" status, used "Core surge" on Hippochamp, dealing a massive 30 damage (44 to 14 HP). (confidence 5)
M10 (ii): It worked at full force; afterward the Guardian's Charged buff is gone, replaced by "Slowed 1" (down from 2) and a new "Recovering" status. (confidence 5)

M11 (i): Graviclaw used "Gravity Draw" on the Guardian, dealing 3 damage and breaking its Charged status ("Guardian is pulled off its footing. Its charge is broken"); the Guardian then attempted "Core surge" but it was blocked. (confidence 5)
M11 (ii): The damage worked, but the follow-up mattered more: breaking the charge stopped the Guardian's big attack — "Stopped by binding... Its charge was broken; it must recover first." (confidence 5)
M11 (iii): The large machine's (Guardian's) attack was stopped because Graviclaw's "Gravity Draw" broke its Charged status just before it could act, and a charge-broken Guardian must recover before attacking, so its "Core surge" was blocked outright. (confidence 5)

E1. Moment 05 was the hardest to follow: the Restrained status wearing off and the attack being "Stopped by binding" in the same beat seem to conflict (if it's no longer restrained, why does binding still block the strike?) without any bridging explanation. Moment 08's retarget was also mildly confusing on first look since the initial frame still showed the old "On Crawler 1" framing before switching. (confidence 3)

E2. Yes — the "Restrained" ring/label initially looked like it might indicate the creature was stunned outright, but the tooltip clarified it specifically stops "closing in on a target," a narrower effect than a full stun. Also, the Guardian's "Charged" glow looked like a buff that would make its next hit stronger, but it turned out to be a wind-up state that could be interrupted/broken (as seen in M11), which was not obvious from the icon alone. (confidence 3)
