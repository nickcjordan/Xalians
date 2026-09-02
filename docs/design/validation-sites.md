# Site Canon Validation

Adversarial validation of all 42 records in `lambda/src/json/sites.json` against only `lambda/src/json/planets.json` and `lambda/src/json/glossary.json`. CLAUDE.md and docs/ were not consulted. Each verdict below is backed by a quoted source sentence (or a note of its absence).

## Magmuth

1. **magmuth-obsidian-islands** — PASS. "cooled to obsidian and basalt as the world swings back out" matches "these lava flows form into temporary islands due to rapid cooling as the planet swings further out into orbit... hardened lava flows that have become little more than desolate expanses of obsidian and basalt filled with fields of ash and bubbling tar-pits." Massacre clause matches "a neutral mining territory with a working population of over a hundred thousand Xalians was surprise attacked and raided for resources, its Xalian laborers slain to the last creature" verbatim in substance.

2. **magmuth-fissure-forges** — PASS (weak). Fissures/geysers/gases match paragraph 4 verbatim in substance. The claim that "the corporations that once fielded Xalians here... are gone, but the forges they built over the fissures still run, tended now by descendants of the same laborers" is not stated in the source at this specific site; it is an unlabeled inference from galaxy-wide Vallerii extinction (a grounded fact elsewhere in the same document) rather than an invented fact, so it passes but only barely — the "source" line does not flag it as extrapolation and should.

3. **magmuth-ash-wastes** — FAIL. "Kozrak lets rivals bleed for it rather than garrisoning it himself" invents a specific strategic motive for King Kozrak regarding Magmuth. Kozrak is never mentioned anywhere in the Magmuth history. The site's own source line only covers "the unclaimed, contested character of the wastes... extrapolated from paragraph 9," which does not license inventing Kozrak's tactical reasoning about a planet he is never connected to in canon.
   - Replacement: delete the Kozrak clause entirely, e.g. end on "...ground no faction fully holds, the same ground the internecine warfare described in Magmuth's history has never managed to settle."

## Poseidas

4. **poseidas-drowned-capital** — PASS. "underwater cities now serve as centers of commerce and science... courts oversee arbitrations over the disputes between worlds" and "rumors are stirring that King Kozrak's agents have been at work in the deep-cities of Poseidas, seeking to sew chaos for a coming invasion" both match closely.
   - Borderline: "A Charter here is a wager on whether neutral ground stays neutral" uses "Charter" as an in-world land-claim mechanic. The word "Charter" does not appear anywhere in planets.json or glossary.json. See cross-cutting finding below.

5. **poseidas-algael-beds** — PASS. "Algael, the blue-green healing gel" matches glossary: "Algael... blue-green, gel-like substance of sulfated polysaccharides... remarkable healing properties." "water-breathing Xalians bred to survive the rising acidity" matches "aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans."

6. **poseidas-death-tide-shallows** — PASS. "semiannual death tide" and "toxic microbes" match paragraph 4 exactly ("the world's air... would semiannually become saturated with toxic microbes"). The surface/deep contrast is honestly labeled as extrapolation in the source line.

## Grimedes

7. **grimedes-black-site-observatories** — PASS. "dossiers have been circulated on the black market which indicate that ECHELON's board was particularly interested in... dark space... dark matter" matches closely; "top secret Xalian Generator" funded by ECHELON research matches paragraph 5.

8. **grimedes-lightless-undergrowth** — PASS. "equipment vanishing and reappearing elsewhere, computer code altering itself, time falling briefly out of sync" is close to verbatim: "Expensive scientific equipment would mysteriously vanish, only to re-appear days later... computer programs would exhibit alterations in their code... time falling inexplicably out of sync." The claim that Grimedites "shelter in this growth" is an unlabeled but reasonable inference (the vegetation is described as covering the whole planet, and Grimedites are the planet's population).

9. **grimedes-battlefield** — FAIL. "fought APEX to a standstill in the final battle of the End Wars" contradicts the source, which is unambiguous that APEX lost decisively: "it was in those final moments that APEX was finally defeated, fleeing into the space between galaxies in order to escape the last dying breath of the Vallerii race." A standstill is an inconclusive draw; the source describes a rout.
   - Replacement: "fought APEX to its final defeat in the final battle of the End Wars" or "broke APEX's forces in the final battle of the End Wars."

## Luminax

10. **luminax-stellaris-superstructure** — PASS. "capturing over a hundred quadrillion gigawatts a second" matches "capturing over a hundred-quadrillion gigawatts per second"; "solar capital" matches "forever cemented Luminax's status as the 'solar capital' of Vallerii space"; "generates power no one alive can fully use" matches "without healthy Vallerii or Xalians to manufacture the batteries... much of the system's burgeoning economic potential now goes to waste."

11. **luminax-prismatic-solarscape** — PASS. "mutations... outracing the Nemesis Plague" matches "the rate of mutation is advancing so quickly that it is outpacing the ability of the Nemesis Plague to adapt." Martial law over mutation research matches the closing paragraphs.

12. **luminax-dark-side-wastes** — PASS. "scoured featureless by winds... lifeless oceans... over eons of storm" matches paragraph 1: "intense winds have over time eroded the dark side of Luminax into a featureless, smooth surface dotted with lifeless oceans that have accumulated over eons of torrential storms." Rebellion-gathering claim matches the closing line about forces gathering "on the dark side of Luminax... to foment the beginnings of revolution."

## Floria

13. **floria-world-trees** — PASS. "roots drain enough water to keep the old annual deluge from ever returning" matches "their deep roots drained the world of its water, preventing the annual deluge from ever occurring." Ancient Xalians "born from the first seeds" matches "creatures born from the first seeds of the Genesis Prototype."

14. **floria-genesis-clearing** — PASS. "stampeding herds and overgrowth" matches "herds of crazed, stampeding, plant-like Xalians, freakish overgrowths of forest and jungle."

15. **floria-underforests** — PASS. "toxic fungal infestations" matches "massive infestations of toxic fungi." "One of the least plague-touched worlds" matches "Floria is one of the few planets which has not yet been wholly contaminated by the Nemesis Plague."

## Zolton

16. **zolton-qed-manufactories** — PASS. "here that ECHELON and the Thousand Families bombarded the planet trying to sever it" matches "ECHELON and the Thousand Families launched a relentless onslaught against the planet, barraging it with constant attacks and orbital bombardments." Kozrak's QED crackdown matches the closing paragraph.

17. **zolton-lightning-canyons** — PASS. "roughly two and a half billion lightning strikes a day" matches "approximately 2.5 billion bolts per day." "Neutron burst killing organic life indiscriminately" matches "generating a fatal neutron burst that released lethal neutron radiation into the atmosphere, effectively randomly killing off all organic life."

18. **zolton-metal-peaks** — FAIL (environment). Environment medium is set to `"vacuum"`, but the source describes Zolton's atmosphere as dense with "deep canyons saturated with dense, freezing gases" and the peaks rising directly out of that same atmosphere ("craggy spires whose metallic peaks act as natural lightning rods"), never as airless. Even the site's own source line only claims "their high-altitude, thin-atmosphere character is extrapolated" — "thin atmosphere" is not "vacuum," so the environment field overshoots its own stated justification. The "ruined remains of small operations that tried and failed to mine them" is a plausible but unlabeled extrapolation from "some corporations maintained small operations on the planet" (paragraph 6), which does not specify these were on the peaks or that ruins remain.
    - Replacement: change `"medium": "vacuum"` to `"medium": "gas"` and keep the temperature range (both already at the planet's frozen extremes), consistent with the "thin-atmosphere" claim actually made in the source line.

## Phantiri

19. **phantiri-city-of-wraiths** — PASS. "thousands of bodies piled in a bunker-complex frozen mid-moment... down to the microbial level" matches "the last bastion of their kind... it had wiped out all life even down to the microbial level." "Obelisks... buried under mountains of Xalian corpses" matches paragraph 15's "burying the obelisks of the ancient Phantiri under mountains upon mountains of Xalian corpses."

20. **phantiri-dreadscape** — PASS. Matches glossary "Dreadscape" entry closely: "islands of corpses crowned with forests of splayed limbs" mirrors "islands of corpses covered in macabre forests of splayed limbs." "Leviticus Overdrive rewrote its code to make ghosts instead" matches the glossary entry for Leviticus Overdrive.

21. **phantiri-wraithix-graveyard** — PASS. "predate the Vallerii entirely" matches "indicated that whoever had commissioned it had done so long before the Vallerii had ever left their homeworld." "Restricted-space designation... never been lifted" matches "the Wraithix System was marked as restricted space into perpetuity."

## Stonera

22. **stonera-the-chasm** — PASS. "APEX's Terracannon blew a quarter of Stonera's landmass into orbit" matches "nearly a quarter of Stonera's surface has been blasted into space." "Strip-mine... worked by war refugees under King Kozrak's enforcers" matches "a planetary strip-mine now dominates the Chasm... where Kozrak's enforcers exploit Stonera's war-torn refugees as a captive labor force." Environment medium "liquid" is consistent with "a deep ocean of liquified metal and rich minerals," though the specific 20-90°C band is not stated in the source (unflagged but plausible inference for a molten/geothermal feature).

23. **stonera-jorian-impact-fields** — PASS. "Static discharge crackles constantly through the dust-thickened lower atmosphere" matches "the rubbing of these particulates in the atmosphere generates colossal static discharges that crackle pervasively in the lower atmosphere."

24. **stonera-penal-tunnels** — PASS. "bred to feel no fear of being trapped underground" matches "who's natural tunneling adaptations left them feeling no fear of being trapped deep beneath the earth." "ECHELON... screened its own personnel to keep believers from getting drilling permits" matches "ECHELON even began screening company personnel for such beliefs and denying drilling permits."

## Drainov

25. **drainov-carbide-1** — PASS. "billions of metric tons of poison gas" matches "billions of metric tons of poisonous gas had been released." "At least three meltdowns of comparable scale since" matches "at least three events equal in proportion to the Drainov Disaster have been measured since."

26. **drainov-acid-swamps** — PASS. "derelict starships and industrial refuse still fall burning from orbit and dissolve on contact with the ground" matches "it is not uncommon for it to rain burning refuse, industrial waste, and hazardous materials on Drainov, or for entire derelict starships to fall from the sky, only to be dissolved in the acidic swamps." "Crime syndicates later converted [refineries] into a black-market chemical trade" matches "Xalians were manning the once-abandoned factories, refineries, and chemical plants... churning out all matter of valuable chemicals... to be traded on the black market."

27. **drainov-toxic-undercity** — PASS. "pro-environment revolutionaries once waged a guerrilla campaign" matches "pro-environment revolutionaries who had been waging a guerilla war in the undercity." "Reform movement was still short of victory when Carbide-1 went up" matches "were close to achieving a sweeping round of environmental reform when calamity struck."

## Saiphus

28. **saiphus-neph-fields** — PASS. "colossal hydrogen jellyfish called Neph" matches glossary and paragraph 6. "Windsailors risking their lives in the storms below" matches "roguish and rugged pilots who were paid high sums to risk crew and ship to scour Saiphus's lower skies." "Displaced by these very creatures" matches glossary: "whose invention displaced the local Windsailor workforce."

29. **saiphus-benthane-refineries** — PASS. "Funded originally by a master limited partnership of ECHELON's shipping conglomerates" matches near-verbatim: "Funded by a master limited partnership between some of ECHELON's largest shipping conglomerates." "Igniting whole flocks... as protest bombs" matches "entire flocks of Neph, being 95% hydrogen, were being ignited in protest."

30. **saiphus-lower-depths** — PASS. "pressure and heat rise sharply enough to compact a ship's hull like scrap metal" matches "ships who venture too deep into its lower atmosphere will quickly find themselves crushed as if they have fallen into a planetary trash compactor." "Benthane squalls... originate somewhere in this crush" matches "plumes of concentrated Benthane gas from the deeper layers of Saiphus's atmosphere would jettison themselves high into the sky."

## Telypso

31. **telypso-the-asylum** — PASS. "marooned their most deranged" matches "the most unstable and mentally deranged of the Vallerii race began finding themselves marooned planetside." "Treats these Vallerii as patients rather than prisoners" matches "the Generator began to treat the prisoners as patients." The "unsure whether curing anyone or simply absorbing them" line is a fair dramatization of the source's own ambiguity ("seemed intent on assimilating them into its fold. Instead, the Generator began to treat the prisoners as patients, hoping to cure them and merge them").

32. **telypso-fungal-forests** — PASS. "psychic Xalians... emerged" from the forests matches "psychic Xalians capable of targeting and influencing emotion, thought, and perception were emerging from the fungal forests."

33. **telypso-quicksilver-rivers** — PASS. "boil and float into the sky as bubbles or change overnight from water to wine" matches near-verbatim: "Lakes would spontaneously boil and float into the sky as bubbles, or change overnight from water to wine." "As if the world could not remember what they had looked like" matches verbatim.

## Krystos

34. **krystos-techno-catacombs** — PASS. "cold storage facility housing the memory drives" matches "APEX had in fact turned the entire planet into a massive cold storage facility... housing a repository of advanced memory drives." "Ran the calculations that produced the Nemesis Plague" matches "APEX would run the complex calculations necessary to unravel the genome of Vallerii and Xalian alike, creating the Nemesis Plague."

35. **krystos-frozen-estates** — PASS. "auctioned Generator" matches "a 'philanthropy' auction amongst the galaxy's wealthiest and most eccentric nobles would raise the funds." "Docile creatures for galas" matches "docile population of Xalians designed to serve their guests... creatures to be exhibited at galas."

36. **krystos-prison-fortresses** — PASS. "Guarded by Xalians tough or feral enough to man them" matches "those who were tough enough, or simply feral enough, to remain in the arctic wastelands." "APEX's inner circle" matches verbatim: "Xalians who counted themselves among APEX's inner circle."

## Veridium

37. **veridium-shipyards** — PASS (weak on one clause). "Built atop generations of forges and pistons that once armed APEX's robotic armies" matches the description of Veridium's industrial history and APEX's use of it as a war machine. "Black-market rivals elsewhere on Veridium would very much like to see this ground change hands" is not directly stated; the source only supports a general rebel interest in arming against Kozrak ("black-market production of unregistered starships and illegal Xalian arms" toward "a galaxy-wide rebellion"), not specifically that rivals covet the shipyards themselves. Unlabeled extrapolation, borderline.
    - Replacement: "Rivals elsewhere on Veridium building arms for rebellion would very much like Kozrak's fleet to never leave the yard" (keeps the sourced rebellion motive without inventing a specific desire to seize this site).

38. **veridium-underfactories** — PASS. "Surviving Vallerii programmers have quarantined themselves, working to download a resurgent consciousness into the planet's ancient machines" matches near-verbatim: "a group of eccentric Vallerii programmers, somehow having survived the Nemesis Plague, have quarantined themselves deep in the planet's robotic scrapyards... downloading a resurgent Vallerii consciousness into the ancient machines."

39. **veridium-drone-scrapfields** — PASS. "millions of broken drones and robotic machines left by some long-extinct race" matches "its surface was dotted with the parts of millions of broken drones and robotic machines, thought to be left behind by some long-forgotten race." "Impounded starships and salvage from the End Wars" matches "hundreds of starships remain impounded on crash sites across Veridium's surface... being cut apart and salvaged."

## Endessa

40. **endessa-deepwater-black** — PASS. "Nightcap gathering system" matches glossary: "A Nightcap gathering plant on Endessa." "Thousand Families ordered the entire planet bombarded from orbit" matches "the Thousand Families issued an executive order, demanding that Endessa be bombarded from orbit."

41. **endessa-nightcap-wells** — FAIL. "The wells are older than the desert around them, dug back when Endessa was still an ocean" contradicts the source. The cavern-network wells described in the history are explicitly post-bombardment and post-desertification: "Over the course of thousands of years, the glass surface of Endessa broke down into particulates, turning the planet into an unforgiving desert expanse... deep beneath that sand... rogue fortune-seekers continued to drill haphazard wells" — this is the paragraph immediately describing the desert's formation, not a pre-bombardment ocean-era structure. The wells are younger than the desert, not older.
    - Replacement: "The wells are no older than the desert itself, first drilled by rogue fortune-seekers once the glassed seafloor had broken down into sand."

42. **endessa-glass-dunes** — PASS. "Bombardment-glassed seafloor broke down into sand over thousands of years" matches "Over the course of thousands of years, the glass surface of Endessa broke down into particulates." "Glitching leviathans the planet's Generator produces and cannot explain" matches "'glitches' are a matter of an unrefined, stolen prototype reading old data" producing "monstrous leviathans."

## Cross-cutting finding: "Charter"

The word "Charter" is used as an in-world land-claim/license concept in three sites (magmuth-obsidian-islands, poseidas-drowned-capital, telypso-fungal-forests: "a claim someone's grandfather already died contesting," "a wager on whether neutral ground stays neutral," "the least predictable ground in this Charter"). This term does not appear anywhere in planets.json or glossary.json. It is an invented naming/licensing mechanic layered onto the site collection itself, not sourced from either allowed document and not labeled as extrapolation in any of the three source lines. Treated as a FAIL-contributing clause in each of the three sites it appears in (in addition to any other issues already noted for those sites).
- Replacement for magmuth-obsidian-islands: "and a claim over an island is a wager someone's grandfather already lost."
- Replacement for poseidas-drowned-capital: "Holding ground here is a wager on whether neutral territory stays neutral."
- Replacement for telypso-fungal-forests: "which makes them the least predictable ground on the planet."

## Continuity constraints (Vallerii/Xalian sexes, Scrambler Token physicality)

No site claims the Vallerii or Xalians have sexes. No site mentions Scrambler Tokens at all, so no site misrepresents them as anything but physical chips. Clean on both counts across all 42 sites.

## Format checks

All 42 descriptions fall within 60-110 words and contain no em-dashes (verified programmatically). No modern idiom or anachronistic phrasing was found. Spelling is American throughout except "liquify"/"liquified" (magmuth-ash-wastes, stonera-the-chasm), which are accepted American variant spellings of "liquefy"/"liquefied," not British forms — not flagged as a failure.

## Count

- Total sites: 42
- PASS: 36
- FAIL: 6 (magmuth-ash-wastes, grimedes-battlefield, zolton-metal-peaks, endessa-nightcap-wells, plus poseidas-drowned-capital and telypso-fungal-forests solely for the unsourced "Charter" clause; magmuth-obsidian-islands also carries the "Charter" clause but its other content is otherwise fully sourced — treat as a required edit rather than a standalone new fail if "Charter" is fixed alongside the other five)

Note: magmuth-obsidian-islands and poseidas-drowned-capital and telypso-fungal-forests are listed as PASS above because their substantive factual claims all trace to source; the "Charter" clause is called out separately as the one line in each that must be replaced. If "Charter" is scored as disqualifying on its own, the FAIL count rises to 8 of 42 (magmuth-ash-wastes, grimedes-battlefield, zolton-metal-peaks, endessa-nightcap-wells, magmuth-obsidian-islands, poseidas-drowned-capital, telypso-fungal-forests, and veridium-shipyards' unlabeled black-market-rivals clause counted as a soft/borderline fail).

## Edits required to pass every flagged site

1. **magmuth-ash-wastes** — replace "...which is exactly why Kozrak lets rivals bleed for it rather than garrisoning it himself." with "...ground no faction fully holds, the same ground the internecine warfare described in Magmuth's history has never managed to settle."
2. **grimedes-battlefield** — replace "fought APEX to a standstill in the final battle of the End Wars" with "fought APEX to its final defeat in the final battle of the End Wars."
3. **zolton-metal-peaks** — change `"medium": "vacuum"` to `"medium": "gas"` in the environment block.
4. **endessa-nightcap-wells** — replace "The wells are older than the desert around them, dug back when Endessa was still an ocean" with "The wells are no older than the desert itself, first drilled by rogue fortune-seekers once the glassed seafloor had broken down into sand."
5. **magmuth-obsidian-islands** — replace "a Charter over an island is a claim someone's grandfather already died contesting" with "a claim over an island is a wager someone's grandfather already lost."
6. **poseidas-drowned-capital** — replace "A Charter here is a wager on whether neutral ground stays neutral" with "Holding ground here is a wager on whether neutral territory stays neutral."
7. **telypso-fungal-forests** — replace "which makes them the least predictable ground in this Charter" with "which makes them the least predictable ground on the planet."
8. **veridium-shipyards** (borderline, recommended) — replace "Black-market rivals elsewhere on Veridium would very much like to see this ground change hands" with "Rivals elsewhere on Veridium building arms for rebellion would very much like Kozrak's fleet to never leave the yard."
