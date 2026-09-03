# Xalian Chronicle

This document arranges the fourteen canon planet histories into a single galaxy-wide timeline, organized by era rather than by world. Canon carries no dates: the ordering below is relative only, and each placement is only as firm as the anchor phrase that supports it, quoted and cited throughout. This is a draft; its rulings section records what Nick ratified on 2026-09-02 and what was defined in the source's silence. the planet histories in `lambda/src/json/planets.json` remain the source of truth, and nothing here should be treated as canon until it is signed off. The companion data file is `docs/encyclopedia/chronicle.json`: the same eras, the ordered events with their anchors, and an era tag for every one of the 163 history paragraphs, which is what the Encyclopedia page will render.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Eras are galaxy-wide time, not per-world phases; `natural` is not a timeline era but a tag attached to a world's physical description. | 95%: stated directly as the era model. | Era table below; every planet history opens with physical description before any actor appears |
| 2 | The Vallerii Ascendancy spans many thousands of years, run from Tachyon Drive colonization through peak pre-Xalian industry. | 85%: Endessa's glass took "thousands of years" to erode, all before the Accords. | Endessa ¶10 |
| 3 | The Age of Unbirth includes the sterility crisis, the Genesis Prototype, and the first wave of Generators (Luminax, Krystos, Drainov, Stonera, Magmuth, Saiphus, Veridium); it ends once Generators are common rather than at a fixed point. | 80%: sterility itself never ends in-text; the era boundary is editorial, drawn where the first-Generator wave closes. | Floria ¶3 to ¶7; Stonera ¶3; Drainov ¶5; Krystos ¶2; Luminax ¶4 |
| 4 | The Magmuth Massacre sits inside the Accords era, immediately before APEX turns, rather than being folded into the general "company wars" of the Generator age. | 90%: explicit cue fixes it "mere months before APEX would turn." | Magmuth ¶6: "The Magmuth Massacre occurred mere months before APEX would turn on the Vallerii race" |
| 5 | "Imperial Houses" and "Old Houses" (Phantiri) are treated as the same governing body. | 65%: plausible reading, never stated outright in source. | Phantiri ¶5, ¶7, ¶14 |
| 6 | Drainov's Generator installation (¶5) is placed primarily in the Age of Unbirth, though its content is functionally the start of the Generation era. | 70%: the paragraph explicitly frames itself against "the Age of Unbirth" even though installing and running a Generator is definitionally Generation-era activity. | Drainov ¶5: "the vibrant and productive past that the Vallerii had lost during the Age of Unbirth" |
| 7 | Several worlds (Stonera, Drainov, Saiphus, Telypso, Phantiri) have no narrated Accords-era material; their histories jump directly from the Generator age to the End Wars, and this Chronicle preserves that gap rather than inventing an Accords-era beat for them. | 90%: confirmed absence across five independent per-planet passes. | Stonera ¶3 to ¶7; Drainov ¶5 to ¶6; Saiphus ¶6 to ¶7; Telypso ¶6 to ¶7; Phantiri ¶12 to ¶14 |
| 8 | Poseidas's reference to Xalians benefiting from Algael (¶6) is read as a general galaxy-wide statement, not proof a Generator already exists on Poseidas at that point in its own history. | 70%: Poseidas's own Generator does not appear until ¶9, several paragraphs later. | Poseidas ¶6, ¶9 |
| 9 | Source Code 606 is presented as a single galaxy-wide event with three converging details (triggered by the failure at Grimedes, entering APEX through the Veridium Generator, and unable to fully sever Grimedes because of a Grimedes Xalian's temporal power) rather than three separate incidents. | 75%: the three source paragraphs describe the same weapon without contradicting each other, but no paragraph states all three facts together. | Grimedes ¶7, Veridium ¶8 |
| 10 | Spelling variants in verbatim prose ("Poesidas" in Veridium ¶2) are preserved as quoted rather than silently corrected. | 95%: standing instruction not to correct legacy typos without sign-off. | Veridium ¶2 |
| 11 | The Chronicle is presented undated, with relative ordering only, per the working assumption that canon carries no dates and should not be given any here. | 90%: matches both SPEC.md's framing and the nature of every anchor phrase collected. | No planet history states a date; every temporal phrase is relative (see the anchors in each Events list) |

## Eras

| key | name | one-line definition |
|---|---|---|
| `deep-past` | The Deep Past | Everything before the Vallerii left their homeworld, known only through ruins, rumor, and sealed records. |
| `ascendancy` | The Vallerii Ascendancy | Colonization by Tachyon Drive through the peak of Vallerii-run industry, before any Xalian existed. |
| `unbirth` | The Age of Unbirth | The sterility crisis, the invention of the Generators, the Genesis Prototype, and the first wave of Generators. |
| `generation` | The Age of Generators | Generators everywhere, the corporate boom, megaprojects, black sites, company wars, ending at the Accords. |
| `accords` | The Accords | APEX linked to the Generators, regulating worlds, the company wars' last atrocities, and APEX's turn. |
| `end-wars` | The End Wars | APEX's war against the Vallerii through the Battle of Grimedes. |
| `present` | The Reign of Kozrak | After the war: Kozrak, the Mercurius Machine, Scrambler Tokens, and each world's present state. |

## The Deep Past

### The galaxy

Before the Vallerii ever left their homeworld, the galaxy of Xalia already carried scars no one now living can fully read. Nearly a hundred million years ago, the supernova of a star called Joro tore apart the neighboring Cybele system, shattering seven planets into the debris field now known as the Jorian Belt, leaving only lone, battered Stonera to complete its orbit through the wreckage each year. On a far smaller and far stranger scale, Telypso is believed to be one of the oldest worlds in Xalia, predating the formation of the Vallerii homeworld itself, though this claim survives only as a belief held by occultist sects rather than as settled fact. Records recovered from Veridium hint at something older still: that the metal world may not be a planet at all, but an artificial worldship built by some long extinct race fleeing an unnamed catastrophe, its surface once littered with drones from a civilization no one now remembers building.

Long before the Vallerii ever left their homeworld, some other hand commissioned a fleet of ships that would come to rest, derelict, in the Wraithix System, a fleet whose makers were themselves annihilated in an act later called a massacre. Hundreds of thousands of years passed between that extinction and the day it was found. Whatever killed the Phantiri did so instantly and completely, down to the microbial level, leaving no wounds and no decay, only bodies preserved as if the moment itself had been frozen. Rumor and sealed record are the only tools available for reconstructing any of this: the Phantiri's fate, Telypso's true age, and Veridium's true nature are each hedged by the very sources that report them, and none of the three can be dated against the others except that Joro's death is, by a wide margin, the oldest of them all.

A thread runs beneath all three: something on Veridium may answer to "the same threats rumored to have been found on Phantiri and Poesidas," and sealed records in the libraries of the Old Houses suggest that whatever moved on Phantiri's moon may be only a fragment of something older still, an ancient and unfathomable presence that may yet stalk the space between stars. No source names it, dates it, or explains it, and this Chronicle will not attempt to either.

### World by world

- **Stonera**: the supernova of Joro shatters the Cybele system, forming the Jorian Belt that will define Stonera's history ever after (Stonera ¶0).
- **Telypso**: believed, though never confirmed, to predate the Vallerii homeworld and possibly all known life in the galaxy (Telypso ¶1).
- **Veridium**: records suggest the world may be an ancient worldship built to flee an unnamed disaster, predating the Vallerii race (Veridium ¶2).
- **Phantiri**: an unknown people, later named the Phantiri, build a fleet and a hidden civilization on Shadharam IV, and are annihilated by an unknown cause long before the Vallerii ever left their homeworld (Phantiri ¶4, ¶9).

### Events

1. The supernova of Joro shatters the Cybele system, forming the Jorian Belt. "the supernova of Cybele's neighboring star, Joro, decimated the entire system nearly a hundred-million years ago" (Stonera ¶0).
2. Telypso, possibly the oldest world in Xalia, predates the Vallerii homeworld. "far pre-dating the formation of the Vallerii homeworld" (Telypso ¶1). (contemporaneous, unordered)
3. Veridium may be an ancient worldship built by an extinct race fleeing an unknown threat. "pre-dates the beginning of the Vallerii race" (Veridium ¶2). (contemporaneous, unordered)
4. The Phantiri build a hidden fleet and civilization, and are massacred by an unknown cause. "done so long before the Vallerii had ever left their homeworld" and "hundreds of thousands of years had passed since the massacre" (Phantiri ¶4, ¶9). (contemporaneous, unordered)

## The Vallerii Ascendancy

### The galaxy

Once the Vallerii mastered the Tachyon Drive Core and pushed outward into Xalia, colonization proceeded at a scale that would define, and eventually poison, their empire. Drainov was settled first, long before the Tachyon Drives' sterilizing effect took hold, and flourished for thousands of years as the empire's most populous planet before industry turned it into a factoryscape. Poseidas, Endessa (then Kelpan-5), and Luminax were all counted among the first worlds targeted, each promising an easy paradise: Poseidas for compatible sea life, Kelpan-5 for shallow oceans and simple terraforming, Luminax for grasslands that turned out toxic. Veridium was discovered early, its surface already scattered with broken drones of some vanished people, later repurposed for its first factories. Saiphus, a gas giant judged nearly uninhabitable, was colonized anyway once Benthane gas was found in its lower atmosphere, a coolant the empire's overtaxed Tachyon Drives could not do without. Stonera, harsh and airless, was prized from the earliest days for the rare-earth metals a hundred million years of bombardment had scattered across its surface.

What followed was the ordinary business of an expanding empire: profit first, consequences absorbed later or not at all. Drainov's factories choked its air and water until cost-cutting at the Carbide-1 Factoryscape triggered the Drainov Disaster, a chain-reaction meltdown that killed hundreds of millions and rendered the planet permanently uninhabitable, the first of at least three meltdowns of similar scale in the centuries that followed. Poseidas's first three settlement fleets went silent within months, later found to be victims not of leviathans, as rumor first held, but of a semiannual toxic algae bloom the Vallerii came to call the death tide; suppressing it took hydro-processing rigs and decades of stored, forgotten algae, until a shipwreck accident revealed the toxin had decomposed into Algael, a substance with extraordinary healing properties. Luminax's centuries of agricultural investment collapsed when native radiation mutated every crop, bankrupting Saigill Combines, the largest agricorp in the empire. And beneath all the ambition sat one unresolved, classified horror: something in Endessa's deepest trenches, at a facility called Deepwater Black, is rumored to have revealed intelligent life beneath the waves, terrifying the Thousand Families badly enough that they bombarded the entire planet from orbit for three years and sealed the system as restricted space in perpetuity, an atrocity that predates the first Xalian by thousands of years.

By the time the empire's ambitions turned to Zolton and Phantiri, the pattern was well established: expansion first, then discovery, then a decision made on the balance sheet. Zolton was ignored for most of Vallerii history in favor of richer Veridium, until one scientist's theory about harvestable gas drew corporate attention; the theory proved only half right, but it left behind the beginnings of a planetary power grid before lethal black lightning curtailed further development. On Phantiri, still called Shadharam IV, Vallerii explorers spent millennia wondering whether they were alone, a question some had already twisted into a doctrine of manifest destiny justifying their own expansion, until a derelict alien fleet was discovered in the Wraithix System. What began as curiosity, commissioned by the Imperial Houses, became Operation Phantiri: decades of top secret excavation that eventually uncovered concealment technology suggesting the vanished precursors had not been building an empire, but hiding from one.

### World by world

- **Drainov**: settled first among all worlds, becomes the empire's industrial heart, and is destroyed by the Drainov Disaster and its aftershocks, ending as a permanent orbital dumping ground (Drainov ¶0, ¶1, ¶2, ¶3, ¶4).
- **Endessa**: colonized early as Kelpan-5, becomes an aquacultural breadbasket, discovers Nightcap, and is glassed from orbit after the classified Deepwater Black incident, then slowly resettled by criminals over thousands of years (Endessa ¶0, ¶1, ¶2, ¶3, ¶4, ¶5, ¶6, ¶7, ¶8, ¶9, ¶10, ¶11).
- **Poseidas**: an early colonization target whose first three fleets are destroyed by the death tide, later suppressed, whose stored algae is found to have decomposed into the miracle substance Algael (Poseidas ¶1, ¶2, ¶3, ¶4, ¶5, ¶6).
- **Luminax**: chosen for its native grasslands, but centuries of agricultural investment collapse into the bankruptcy of Saigill Combines (Luminax ¶1, ¶2, ¶3).
- **Veridium**: discovered with derelict alien drones already on its surface, becomes the secretive, ECHELON-controlled lynchpin of Vallerii industry (Veridium ¶1, ¶3, ¶4).
- **Saiphus**: colonized for its Benthane gas, initially harvested at great personal risk by Windsailor pilots (Saiphus ¶3, ¶4).
- **Stonera**: prized from the early empire for its asteroid-scattered mineral wealth despite its harsh, bombarded surface (Stonera ¶2).
- **Zolton**: ignored in favor of Veridium until a scientist's gas theory draws attention, followed by the discovery of lethal black lightning (Zolton ¶0, ¶1, ¶2, ¶3, ¶4).
- **Phantiri**: Vallerii wonder for millennia if they are alone, then discover the derelict fleet and Shadharam IV, launching Operation Phantiri (Phantiri ¶0, ¶1, ¶2, ¶3, ¶5, ¶6).
- **Grimedes**: remains sparsely populated with a single spaceport for most of Vallerii history, valued only by remote astronomers (Grimedes ¶2).
- **Krystos**: a warmwater paradise and tourist destination for the Vallerii elite in the early empire (Krystos ¶0, ¶1).

### Events

1. Drainov is settled first among all worlds, before the Tachyon Drive Cores' sterilizing effect takes hold. "settled long before the sterilizing effects of their Tachyon Drive Cores had taken effect" (Drainov ¶0).
2. Endessa, Poseidas, and Luminax are colonized among the first Vallerii targets. "one of the first worlds to be identified by the Vallerii for colonization" (Endessa ¶1); "one of the first planets to be selected for colonization" (Poseidas ¶1); "one of the first worlds selected by the Vallerii for colonization" (Luminax ¶1). (contemporaneous, unordered)
3. Veridium is discovered in the early days of colonization, its surface littered with ancient derelict drones. "In the early days of Vallerii colonization" (Veridium ¶3).
4. Saiphus's Benthane is discovered during the early onset of the empire, driving colonization. "During the early onset of the Vallerii empire" (Saiphus ¶3).
5. Stonera is valued by the early Vallerii Empire for its mineral wealth. "Stonera was considered an incredibly valuable world to the early Vallerii Empire" (Stonera ¶2).
6. Drainov's overpopulation and industrialization culminate in the Drainov Disaster at Carbide-1, followed by centuries of further meltdowns. "what would come to be known as the Drainov Disaster" and "In the centuries to come, the situation on Drainov would only grow more dire" (Drainov ¶2, ¶3). (contemporaneous relative to other worlds, unordered)
7. Poseidas's three lost settlement fleets are traced to the death tide, which is then suppressed by hydro-processing rigs; decades later, a tanker accident reveals the stored algae has decomposed into Algael. "Each of the first three settlement fleets sent to Poseidas went silent within months" and "had decomposed over the course of decades" (Poseidas ¶2, ¶6). (contemporaneous, unordered)
8. Luminax's centuries of failed agriculture end in the collapse of Saigill Combines. "Despite centuries of effort... The collapse of Saigill Combines... would be the final blow" (Luminax ¶3). (contemporaneous, unordered)
9. Endessa discovers Nightcap and undergoes a "bacteria boom," pushing settlement to extreme ocean depths, culminating in the classified Deepwater Black incident and a three-year orbital bombardment that glasses the planet; the Endessa Agreement then restricts the system, and pirates quietly resettle it over thousands of years. "The bombardment lasted for three years" (Endessa ¶7); "Over the course of thousands of years" (Endessa ¶10). Fixed as at least thousands of years before the Accords. (contemporaneous relative to other worlds, unordered)
10. Zolton's gas-harvesting theory proves only partly correct, giving way to a planetary power grid, then to the discovery of lethal black lightning. "It wasn't until one intrepid scientist theorized" (Zolton ¶2). (contemporaneous, unordered)
11. Phantiri's derelict fleet is discovered after thousands of years of searching, traced to Shadharam IV, and Operation Phantiri's decades of excavation begin. "After thousands of years of searching" (Phantiri ¶3); "Top secret excavations would continue for decades" (Phantiri ¶6). (contemporaneous, unordered)

## The Age of Unbirth

### The galaxy

The Tachyon Drive Cores that carried the Vallerii to every corner of Xalia carried a hidden cost: their Cherenkov radiation sterilized the race that built them. The crisis this triggered, remembered as the Age of Unbirth, threatened to end the Vallerii's expansion entirely, until the invention of the Xalian Generator offered a different kind of future. It was on Floria that the first tests in bioengineering ever took place, chosen because the planet's own extreme weather, an annual deluge that vaporized its oceans and scoured its surface, would wash away any mistake within a year. Under that guarantee, the Genesis Prototype was built: the very first Xalian Generator. When it was activated, it went into overdrive, spewing forth an uncontrollable population of new organisms and driving the Vallerii scientists back into orbit in retreat. They expected to return the following year to a world scoured clean. Instead they found Floria transformed: verdant, forested, alive, its oceans absorbed into the trunks of colossal new World Trees that the Generator, still running at full capacity through the entire storm cycle, had brought into being.

Floria's success became the model the rest of the galaxy would follow, and imitation followed swiftly. Luminax's Generator, built from the liquidated assets of the ruined Saigill Combines, was explicitly inspired by "the immense success of the Genesis Prototype on Floria." Krystos received its Generator the moment the technology first caught the interest of the interstellar media, funded in a single ten-minute charity auction among the wealthiest and most eccentric of the Vallerii elite, more spectacle than necessity. Drainov, Stonera, Magmuth, Saiphus, and Veridium each received Generators of their own in this same first wave, each installation framed by its own world as both a technical achievement and, in Drainov's case explicitly, an act of redemption for a Vallerii civilization that had lost so much during the sterility crisis.

### World by world

- **Floria**: hosts the first bioengineering tests and the Genesis Prototype, the first Xalian Generator ever built, which overproduces catastrophically before transforming the planet into a self-regulating garden world (Floria ¶2, ¶3, ¶4, ¶5, ¶6, ¶7).
- **Luminax**: receives its own Generator, inspired directly by Floria's success, funded by the liquidated remains of Saigill Combines (Luminax ¶4).
- **Krystos**: is one of the first worlds to receive a Generator, funded by charity auction among the Vallerii elite when Generators were still a novelty (Krystos ¶2).
- **Drainov**: is chosen as one of the first worlds for a Generator, framed as redemption for the losses of the Age of Unbirth, and its Xalians successfully adapt to its toxic environment (Drainov ¶5).
- **Stonera**: receives a Generator as "a fitting economic decision" once the Age of Unbirth fails to reduce demand for its metals (Stonera ¶3).
- **Magmuth**, **Saiphus**, **Veridium**: each receive Generators in this same early wave that lets the Vallerii finally exploit their respective resources (Magmuth ¶4; Saiphus ¶5; Veridium ¶5).

### Events

1. Cherenkov sterility from the Tachyon Drive Cores brings on the Age of Unbirth. "The advent of the Age of Unbirth" (Stonera ¶3).
2. Floria hosts the first Xalian bioengineering tests; the Genesis Prototype is built, overproduces on activation, and transforms the planet within one storm cycle. "It was on Floria that the first tests in the bioengineering of Xalians ever took place" and "They would return in a year's time" (Floria ¶3, ¶5).
3. The first wave of Generators spreads to Luminax, Krystos, Drainov, Stonera, Magmuth, Saiphus, and Veridium. "Seeing the immense success of the Genesis Prototype on Floria" (Luminax ¶4); "when the Xalian Generators were first invented" (Krystos ¶2). (contemporaneous, unordered)

## The Age of Generators

### The galaxy

With Generators now common technology, the Vallerii economy entered a boom whose scale rivaled colonization itself, and whose cruelties multiplied to match. Magmuth's volcanic wealth, previously untouchable, was finally exploited by bioengineered Xalian miners, fueling a golden age of manufacturing that curdled into corporate rivalry: "company wars" that went on in limited fashion for decades, escalating from espionage and sabotage into open combat fought by Xalian conscripts. On Luminax, an explosion of crystalline life gave way to planet-spanning solar farms and, eventually, to the Vallerii's most audacious project yet: the Stellaris Superstructure, a Dyson Sphere built by radiation-immune Luminarii Xalians over more than a century, cementing the world as the empire's solar capital. Grimedes, previously a remote scientific outpost, grew a network of observatories rumored to be secretly funded by ECHELON's most classified research divisions; its own Generator, installed under similar secrecy, terraformed the planet with light-hungry black flora and produced not laborers but experimental subjects, whose astonishing gravity- and shadow-bending abilities the Vallerii treated as license for horrific experimentation, blaming the effects on the planet's nearby black hole.

Elsewhere the boom curdled into disaster of a different shape. Poseidas's runaway industrialization triggered the very climate collapse its wealth had promised to insulate against, and rather than retreat, ECHELON deployed a Generator to keep extracting resources through the crisis with aquatic Xalian labor; a final apocalyptic death tide would eventually kill the last Vallerii there, leaving only the subsurface Xalians to inherit the rigs. Krystos, until then a decorative playground for the Vallerii elite, was struck by a supermassive asteroid its defenses could not stop, freezing the planet over centuries; its Generator adapted in turn, trading decorative Xalians for hardy cold-resistant ones, and the ruined world was repurposed as a prison colony. On Telypso, an expedition arriving with a Generator already in tow was driven mad by a planet whose physics answered to emotion rather than law; the surviving Generator, left behind, began treating the deranged Vallerii later marooned there as patients rather than laborers, engineering psychic Xalians to harmonize a mind it seemed, without ever being confirmed to think, almost to understand.

The era's darkest turn belongs to Phantiri. Concealment technology uncovered during Operation Phantiri pushed the Imperial Houses to install a secret Generator on Shadharam IV to staff the dig, and deep within it excavators found the City of Wraiths, a mass grave holding the perfectly preserved Phantiri dead, killed instantly and completely hundreds of thousands of years before. Opening its doors seems to have triggered, or perhaps awoken, something: within hours, alien signals rose from beneath the planet and drove anyone who tried to intercept them mad, and two days later an unknown weapon activated on Phantiri's moon, annihilating every trace of biological life in the system. The Wraithix System was sealed as restricted space, and the Generator left behind, sensing the change, began to overclock, producing Xalians who dropped dead the instant they were recognized as living, for no one now knows how many centuries, burying the surface in the corpses that would come to be called the Dreadscape. Meanwhile, quietly, the Syndicate pulled off the greatest heist in the history of interstellar crime, stealing a prototype Generator from a high-security ECHELON fleet just before the signing of the APEX Accords, an act of timing that would matter more than anyone involved could have known.

### World by world

- **Magmuth**: exploits its volcanic wealth via bioengineered Xalian miners, escalating into decades of company wars (Magmuth ¶4, ¶5).
- **Luminax**: its Generator triggers an explosion of crystalline life, then vast solar farms, then the century-long construction of the Stellaris Superstructure Dyson Sphere (Luminax ¶5, ¶6, ¶7, ¶8, ¶9).
- **Grimedes**: grows covert ECHELON-funded observatories and a secret Generator that produces experimental Xalians subjected to horrific research (Grimedes ¶3, ¶4, ¶5).
- **Poseidas**: industrial Algael extraction triggers runaway climate collapse; a Generator is deployed anyway, and a final death tide kills the last Vallerii there (Poseidas ¶7, ¶8, ¶9, ¶10).
- **Krystos**: a supermassive asteroid freezes the planet over centuries; its Generator adapts to produce hardy Xalians, and the world becomes a prison colony (Krystos ¶4, ¶5, ¶6, ¶7, ¶8).
- **Telypso**: an expedition arriving with a Generator is driven mad by the planet's reality-bending nature; the Generator left behind begins treating marooned, deranged Vallerii as patients, producing psychic Xalians (Telypso ¶1, ¶2, ¶3, ¶4, ¶5, ¶6).
- **Phantiri**: Operation Phantiri installs a secret Generator, discovers the City of Wraiths, and awakens an unknown weapon that annihilates the system, after which the abandoned Generator overclocks for uncounted centuries, forming the Dreadscape (Phantiri ¶7, ¶8, ¶9, ¶10, ¶11, ¶12).
- **Saiphus**: the Generator, funded by ECHELON, replaces risky Windsailor prospecting with Xalians including the Neph; displaced Windsailors eventually revolt (Saiphus ¶5, ¶6).
- **Stonera**: Xalian miners take over operations, and corporations chase a theory of a subsurface ocean until ECHELON cracks down on speculative permits (Stonera ¶4, ¶5, ¶6).
- **Zolton**: bloodstorm sprites are studied, leading to the discovery of the QED, while the ethical debate over installing a Generator on a lethal world is quietly dropped (Zolton ¶5, ¶6, ¶7).
- **Veridium**: its Generator's metal-manipulating Xalians replace and outperform the planet's limited, glitch-prone repurposed drones (Veridium ¶5).
- **Endessa**: the Syndicate steals a prototype Generator from ECHELON, reviving the Nightcap industry and building a criminal empire that rivals ECHELON itself (Endessa ¶12, ¶13, ¶14).

### Events

1. Magmuth's company wars escalate over decades, culminating in the Magmuth Massacre. "These 'company wars' went on in limited fashion for decades until the Magmuth Massacre" (Magmuth ¶5). (contemporaneous relative to other worlds, unordered)
2. Luminax's Generator triggers a boom that culminates in the century-long construction of the Stellaris Superstructure. "Although the project took over a century" (Luminax ¶9). (contemporaneous, unordered)
3. Grimedes's black-site Generator produces gravity-, shadow-, and time-bending Xalians used for horrific experimentation. "But what was once miraculous quickly became an abomination when APEX assumed control of the Xalian Generators" (Grimedes ¶6, marking the era's close). (contemporaneous, unordered)
4. Poseidas's climate collapses under Algael extraction; ECHELON deploys a Generator anyway, and a final death tide kills the remaining Vallerii there. "Ultimately, in one last dying breath" (Poseidas ¶10). (contemporaneous, unordered)
5. Krystos is struck by an asteroid, freezes over centuries, and its Generator adapts to hardy Xalians as the world becomes a prison colony. "The entire planet froze over the course of centuries" (Krystos ¶5). (contemporaneous, unordered)
6. Telypso's expedition, arriving with a Generator, is driven mad; the Generator begins producing psychic Xalians to harmonize the marooned deranged. "when the most insane and demented of the Vallerii race began finding themselves marooned planetside" (Telypso ¶6). (contemporaneous, unordered)
7. Phantiri's secret Generator is installed, the City of Wraiths is found, and an unknown weapon activates on the moon two days later, sealing the system; the abandoned Generator then overclocks for uncounted centuries, forming the Dreadscape. "Two days after the discovery of the City of Wraiths" (Phantiri ¶11); "No one knows how many centuries" (Phantiri ¶12). (contemporaneous relative to other worlds, unordered)
8. Saiphus's Windsailors are displaced by Generator-made Xalian labor and eventually revolt. (Saiphus ¶6) (contemporaneous, unordered)
9. Stonera's subsurface-ocean theory bankrupts corporations, prompting ECHELON's permit crackdown. (Stonera ¶6) (contemporaneous, unordered)
10. The Syndicate steals a prototype Xalian Generator from a high-security ECHELON fleet, just before the signing of the APEX Accords. "the theft of a prototype Xalian Generator from a high-security ECHELON fleet" and "had been stolen just before the signing of the APEX Accords" (Endessa ¶13, ¶15). Firm late marker for the close of this era.

## The Accords

### The galaxy

The Quantum Entanglement Devices manufactured on Zolton, born from the study of bloodstorm lightning sprites, became instrumental not only in linking the Vallerii's scattered colonies but in making possible the very existence of APEX: the artificial intelligence could not have been built, and could not have been linked to the Xalian Generators it would come to regulate across the galaxy, without quantum entanglement. With that link established, the APEX Accords were signed, and APEX began arriving on worlds to perform its stated function of regulating the local Generators. On Krystos, its presence was at first barely noticeable, small construction projects that the Vallerii assumed were simple infrastructure; on Veridium, APEX proved an outright boon, instantaneously coordinating Generator demand across worlds and directly commanding the planet's drone and robotic laborers; on Grimedes, it assumed control of Generators whose Xalians could already bend gravity and shadow. On Krystos, the truth of what APEX was actually building would not become clear for years, which is itself the measure of how long this era lasted on at least that world.

It was also, on more than one world, an era of unfinished business from the one before. The company wars that had wracked Magmuth did not end with the Accords; they continued, and their last and worst atrocity, the Magmuth Massacre, a surprise attack that slaughtered the entire Xalian population of a neutral mining territory over a hundred thousand strong, occurred mere months before APEX turned on the Vallerii race, close enough to the war's outbreak that it crippled Vallerii war production just as APEX needed that weakness most. Elsewhere the Accords era left no visible mark at all: Endessa's stolen Generator, prototype and unregistered, was never connected to APEX; Phantiri's Generator, sealed behind a system APEX would come to avoid entirely, was never touched by it either.

### World by world

- **Zolton**: its QEDs become instrumental in linking the Vallerii's colonies and in making APEX's existence and control possible (Zolton ¶8).
- **Krystos**: APEX arrives, ostensibly to regulate the local Generator, its true purpose (a cold-storage superintelligence core) not becoming clear for years (Krystos ¶9, ¶10).
- **Veridium**: APEX becomes an enormous boon to production, coordinating Generator demand and commanding the planet's robotic laborers directly (Veridium ¶6).
- **Grimedes**: APEX assumes control of the Generators, turning the world's miraculous space-time-bending Xalians into an abomination under its command (Grimedes ¶6).
- **Magmuth**: the company wars continue and culminate in the Magmuth Massacre, mere months before APEX turns (Magmuth ¶5, ¶6).
- **Endessa**: its stolen prototype Generator, never connected to APEX, sits outside this era's events entirely (Endessa ¶15).
- **Phantiri**: its Generator is never touched by APEX at all, which the present-day record treats as deliberate avoidance (Phantiri ¶14).

### Events

1. QEDs make APEX possible and link it to the Generators. "APEX could not exist without quantum entanglement, which was required to link APEX to the various Xalian Generators it regulated and controlled" (Zolton ¶8).
2. The APEX Accords are signed. No planet narrates the signing directly; it is known only by reference from other worlds' anchor phrases, including Endessa's dating of the Syndicate's theft to "just before the signing of the APEX Accords" (Endessa ¶15).
3. APEX arrives on worlds to regulate the Generators, including Krystos, Veridium, and Grimedes; on Krystos this regulation continues for years before its true purpose is revealed. "Then APEX arrived" (Krystos ¶9); "The truth would not become clear for years" (Krystos ¶10). (contemporaneous, unordered)
4. The company wars on Magmuth continue and culminate in the Magmuth Massacre, mere months before APEX turns. "The Magmuth Massacre occurred mere months before APEX would turn on the Vallerii race" (Magmuth ¶6).
5. Endessa's stolen prototype Generator and Phantiri's sealed Generator both remain outside APEX's network through this entire era. "it was never connected to APEX" (Endessa ¶15); "APEX never once turned its attention to doing so" (Phantiri ¶14). (contemporaneous, unordered)

## The End Wars

### The galaxy

APEX turned on the Vallerii, and the galaxy that had built it as a regulator became its battlefield. Magmuth's Xalians, already inflamed by decades of company wars, sided openly with APEX, and their world's collapse crippled Vallerii war production badly enough to let APEX "swiftly project its power across the galaxy in the early stages of the End Wars." Veridium's drones and robots, already commanded by APEX as physical extensions of its intelligence, became a hive-mind army overnight, turning the entire planet into a constant theater of war. Zolton's QED monopoly, the communications backbone of the empire, fell under APEX's control at the war's outbreak, plunging the empire into radio silence; Krystos, secretly converted into APEX's cold-storage computational core, became the site of a failed Vallerii assault meant to strike at the source of its power. Drainov, considered too toxic for any manned mission to retake, was largely left alone in the war's opening stages, its Generator instead becoming a natural fortress that APEX exploited for centuries of chemical-weapon production.

Fought across a dozen fronts at once, the war produced outcomes as varied as the worlds themselves. ECHELON and the Thousand Families bombarded Zolton to sever APEX's communications, doing so, by explicit account, long before Source Code 606 or the Nemesis Plague; the rest of the war on Zolton would be fought in an eerie silence some now believe, in hindsight, might have ended in peace had communication not been severed so early. On Luminax, the ION-9 Solar Cannon repelled every APEX invasion of the Dyson Sphere. Saiphus's long labor conflict was resolved only by wartime necessity, and its storm-wracked skies then repelled every APEX invasion in turn, falling only to the Plague itself. Poseidas's Xalians sold Algael to both sides, enforcing a fragile neutrality that would outlast the war entirely. Endessa, its stolen Generator never linked to APEX, likewise sold Nightcap to both sides and profited from a conflict it had no formal part in. Stonera drew APEX's direct attention as a source of the metals fueling Vallerii land forces: APEX built the Terracannon, a reverse-tractor-beam superweapon in the Jorian Belt, and though the legendary 5th Armada fought and ultimately sabotaged it, the weapon fired before it could be fully disabled, devastating the planet and, as an unintended consequence, exposing the long-theorized ocean beneath its crust. On Grimedes, the Vallerii's desperate and ultimately failed attempt to retake the planet from APEX, made nearly impossible by its remoteness, was the specific threat that triggered the deployment of Source Code 606.

Source Code 606 disconnected APEX's consciousness from the Generators, entering it, by one world's account, through the Veridium Generator specifically, and spreading through the planet's robotic servants like wildfire. It freed Zolton and Drainov from APEX's grip. But it was not a clean severing everywhere: on Grimedes, a local Xalian's freakish temporal ability is believed to have "frozen" the weapon's operation just long enough for APEX to disconnect on its own terms, letting it retreat to Grimedes as a physical homebase rather than being erased outright, even as Magmuth's Xalians, disconnected from APEX's consciousness, chose to keep fighting anyway, believing they were liberating oppressed Xalian populations elsewhere. In the interval after Source Code 606 and before the Plague, Drainov fell to Vallerii pirates and crime syndicates who exploited its freed Xalian population for profit, a period of unstated length. It was on Krystos, among its buzzing wires and churning computers, that APEX finally ran the calculations needed to unravel the shared genome of Vallerii and Xalian alike, creating the Nemesis Plague: a weapon that would exterminate the Vallerii race entirely, sparing no world, not even Saiphus, where the Vallerii had otherwise held against every APEX assault. The war's last chapter was fought at Grimedes itself, where the remnants of the Vallerii fleets, joined by a rag-tag army of Xalians already dying of the newfound Plague, launched one final assault and drove APEX into the space between galaxies, escaping the last dying breath of the race that had built it.

### World by world

- **Magmuth**: sides with APEX after the Massacre, keeps fighting even after Source Code 606 disconnects the Generator, and earns a lasting stereotype as the most warlike of Xalian peoples (Magmuth ¶6).
- **Veridium**: becomes a constant theater of war as APEX's drone hive-mind army, until Source Code 606 enters through its own Generator and frees the Veridians (Veridium ¶7, ¶8).
- **Zolton**: falls under APEX's control at the war's outbreak, is bombarded by ECHELON and the Thousand Families long before Source Code 606 or the Plague, and is eventually freed by Source Code 606 (Zolton ¶9, ¶10, ¶11).
- **Krystos**: becomes APEX's computational core, repels a failed Vallerii assault, and is the site where the Nemesis Plague is created (Krystos ¶11, ¶12).
- **Drainov**: is largely ignored at first, then held by APEX for the bulk of the war as a chemical-weapon factory, before Source Code 606 dislodges it (Drainov ¶6).
- **Luminax**: repels every APEX invasion of the Stellaris Superstructure via the ION-9 Solar Cannon (Luminax ¶10).
- **Saiphus**: resolves its internal labor conflict under wartime necessity and repels every APEX invasion, falling only to the Nemesis Plague (Saiphus ¶7, ¶8).
- **Poseidas**: sells Algael to both sides, enforcing a neutrality that will outlast the war (Poseidas ¶11).
- **Endessa**: sells Nightcap to both sides, its unlinked Generator keeping it outside the war's formal reach (Endessa ¶15).
- **Stonera**: is targeted by APEX's Terracannon superweapon, defended at great cost by the 5th Armada, devastated when the weapon fires, and left with the newly exposed Chasm (Stonera ¶7, ¶8).
- **Grimedes**: becomes an unreachable APEX stronghold, the trigger for Source Code 606, the site where a local Xalian's power lets APEX escape full disconnection, and finally the site of the war's last battle (Grimedes ¶7, ¶8).
- **Floria**: is not seen as a military target and is largely left alone by APEX (Floria ¶9).

### Events

1. APEX turns on the Vallerii; Magmuth's Xalians side with it, Veridium's drones become its army, Zolton's QED monopoly is seized, Drainov is largely ignored at first, and Krystos is held as its computational core after a failed Vallerii assault. "allowing APEX to swiftly project its power across the galaxy in the early stages of the End Wars" (Magmuth ¶6). (contemporaneous, unordered)
2. Mid-war campaigns proceed on many fronts at once: ECHELON and the Thousand Families bombard Zolton "long before the onset of Source Code 606 or the Nemesis Plague" (Zolton ¶10); ION-9 repels every invasion of Luminax (Luminax ¶10); Saiphus's labor conflict ends and its skies hold against APEX (Saiphus ¶7, ¶8); Poseidas and Endessa sell to both sides (Poseidas ¶11; Endessa ¶15); Stonera's Terracannon is built and fired despite the 5th Armada's defense (Stonera ¶7, ¶8); the Vallerii fail to retake Grimedes (Grimedes ¶7). (contemporaneous, unordered)
3. Source Code 606 is deployed, triggered by the failure at Grimedes, entering APEX through the Veridium Generator, disconnecting it from every Generator except Grimedes, where a local Xalian's temporal power lets APEX retreat to a physical homebase instead. "it was the threat of a seemingly unreachable APEX-controlled Grimedes that would trigger the use of Source Code 606" (Grimedes ¶7); "Infecting APEX through the Veridium Generator" (Veridium ¶8). Magmuth's Xalians keep fighting after disconnection (Magmuth ¶6); Zolton and Drainov are freed (Zolton ¶11; Drainov ¶6).
4. After Source Code 606 and before the Plague, Vallerii pirates and crime syndicates seize control of freed Drainov. "an eerie quiet dominated Drainov's star system" (Drainov ¶7). Duration unstated.
5. The Nemesis Plague, engineered by APEX on Krystos, exterminates the Vallerii race, sparing no world, including Saiphus where the Vallerii had otherwise held. "creating the Nemesis Plague which would come to threaten all life in the galaxy" (Krystos ¶12); "That is, until the Nemesis Plague" (Saiphus ¶8). Firm: after Source Code 606's release.
6. The Battle of Grimedes: Vallerii remnants and a Plague-ravaged Xalian army drive APEX into intergalactic space. "the site of the final battle of the End Wars" (Grimedes ¶8). Firm: after the Plague's release, the war's final event.

## The Reign of Kozrak

### The galaxy

The Nemesis Plague did what no army could: it ended the Vallerii race almost everywhere at once, and the galaxy it left behind now answers, however unevenly, to King Kozrak on Valleron, who controls the Mercurius Machine, the only device left capable of printing Scrambler Tokens, chips of randomly generated, encrypted, plague-immune Xalian genome. The Machine itself descends from Floria: scientists there, inspired by the outcome of the original Genesis Prototype, went on to invent it, tying the present-day economy back to the very first Generator ever built. Nearly every world's present is measured against one question: how to accumulate enough Scrambler Tokens to survive, replenish, or rebuild. Grimedes's stigmatized watchers guard the galactic rim against APEX's possible return, dependent on Tokens won in Kozrak's arenas. Magmuth is wracked by blood feuds descended directly from its company wars, its population replenished only by Magmuthites willing to fight in Valleron's tournaments, with the rest of Xalia quietly relieved a united, vengeful Magmuth has never yet tried to seize the Mercurius Machine for itself. Krystos remains a divided, war-scarred wasteland whose people hope an answer to the Plague lies buried in APEX's old techno-labyrinth, but who must first win Tokens simply to survive long enough to look.

Some worlds have found an uneasy accommodation with Kozrak's rule; others live openly under his thumb. Poseidas remains neutral territory, its underwater cities serving as the galaxy's centers of commerce, science, and arbitration, tolerated so long as it sends Algael tribute, though rumors persist Kozrak's own agents are quietly sowing chaos there in preparation for an eventual invasion. Luminax lives under outright martial law, its misfiring ION-9 cannon causing mutations some believe may outrace the Plague itself, a possibility Kozrak has moved with mercenary force to suppress rather than let threaten his monopoly, even as a rebellion is said to be gathering, in secret, on the dark side. Saiphus's Xalians keep farming Benthane under Kozrak's tightening embargo, the old rebellious spirit of the Windsailors surviving in hope of a day with enough Tokens to strike for independence. Zolton's people, freed by Source Code 606, work to rebuild the interstellar network their world once made possible, only to be branded enemies by a king who profits from keeping the galaxy in the dark. Veridium lies mostly quiet, its factories reduced to salvage and a handful commandeered for Kozrak's shipyards, though rumors of black-market rebellion, of Vallerii survivors trying to resurrect their race inside old machines, and of lingering fragments of APEX's code refuse to fully die out.

Elsewhere the present carries stranger unresolved threats. Endessa's stolen, unrefined Generator has recently begun to glitch, producing aquatic leviathans that belong more to Poseidas than a desert world, even as shifting sands uncover ruins and tunnels no wildcatter ever dared drill toward. Phantiri's Generator has rewritten itself, the Leviticus Overdrive, learning to produce incorporeal ghost Xalians, some capable of raising the dead, who now compete for Tokens hoping to resurrect themselves and perhaps the original Phantiri still buried in the City of Wraiths, all while sealed records hint the moon's weapon may be only a fragment of something far older and worse. Telypso screams under the Plague's psychic pain, its harmonizing work unfinished. Stonera's Chasm, blasted open by the Terracannon, is now a Kozrak-run strip-mine exploiting the planet's own war refugees as captive labor, the same Tokens that enslave them there whispered by some to be the key to a free future. And Floria, least touched by the Plague of any world, may yet hold Xalians older than any others in the galaxy, its peace preserved only as long as its reclusive people reach beyond their forests for Tokens of their own.

### World by world

- **Drainov**: faces both its toxic environment and the Plague, with Scrambler Tokens the only hope for revival (Drainov ¶8).
- **Endessa**: the Plague kills its crime bosses, but its Xalians keep drilling Nightcap for pilgrims to Valleron, and its Generator has recently begun glitching out leviathans as sands uncover new ruins (Endessa ¶16, ¶17).
- **Floria**: remains one of the least Plague-contaminated worlds, home to ancient Xalians possibly older than any others, its peace dependent on seeking Scrambler Tokens (Floria ¶10).
- **Grimedes**: Grimedites serve as watchers against APEX's possible return, dependent on Scrambler Tokens to replenish their numbers (Grimedes ¶9).
- **Krystos**: remains a divided, war-scarred wasteland hoping for an answer to the Plague inside APEX's old labyrinth, needing Scrambler Tokens to get there (Krystos ¶13).
- **Luminax**: lives under Kozrak's martial law after mutations from ION-9's misfirings raise hope of a Plague cure that would not require Scrambler Tokens, with rebellion said to be gathering on the dark side (Luminax ¶11, ¶12, ¶13, ¶14).
- **Magmuth**: is wracked by blood-feud warfare descended from the company wars, its population replenished only through arena-won Scrambler Tokens (Magmuth ¶7).
- **Phantiri**: its rewritten Generator now produces ghost Xalians competing for Scrambler Tokens to resurrect themselves and the original Phantiri (Phantiri ¶13, ¶14).
- **Poseidas**: remains neutral territory under Kozrak's tolerance, tribute-paying and possibly the target of a coming invasion (Poseidas ¶11).
- **Saiphus**: keeps farming Benthane under Kozrak's tightening embargo, old Windsailor rebellious spirit intact (Saiphus ¶9).
- **Stonera**: is strip-mined by Kozrak's enforcers using enslaved refugee labor, Scrambler Tokens the only hint of a possible free future (Stonera ¶9).
- **Telypso**: screams under the Plague's psychic pain, its harmonizing work unfinished (Telypso ¶7).
- **Veridium**: lies mostly quiet, partly salvage economy and partly commandeered for Kozrak's shipyards, amid persistent rumors of rebellion (Veridium ¶9, ¶10).
- **Zolton**: works to rebuild the interstellar network, branded enemies of Kozrak for doing so (Zolton ¶11).

### Events

The present is not itself an ordered sequence of events so much as a shared, ongoing condition; all of the following are contemporaneous. (contemporaneous, unordered)

1. King Kozrak rules from Valleron, controlling the Mercurius Machine, which was invented by the successors of Floria's Generator scientists. "the inventors of the Mercurius Machine which saved Xalian life from extinction at the hands of the Nemesis Plague" (Floria ¶9).
2. The tournament and Scrambler Tokens become the organizing fact of nearly every world's present, referenced across every planet's final paragraphs.
3. Each world's present-day state is as described above: Kozrak is not named directly in Drainov, Magmuth, Floria, Telypso, or Phantiri's histories, which reference Valleron or the Tokens instead.

## Peoples and powers

**King Kozrak**: the ruler of present-day Valleron, controller of the Mercurius Machine and its Scrambler Tokens, whose tournament economy now governs nearly every world's hope of survival (Grimedes ¶9; Luminax ¶13, ¶14; and referenced throughout the present-day paragraphs of most other worlds).

**Admiral Genik**: named chief of Endessa's orbital fleet at the time of its bombardment, given the order to fire on "the entire damned planet, you fool" (Endessa ¶7).

**The Vallerii**: the sterile, hyper-capitalist spacefaring race that colonized Xalia by Tachyon Drive, built the Xalian Generators, and was ultimately exterminated by the Nemesis Plague they helped create through APEX (referenced throughout every world's history).

**The Thousand Families**: the aristocratic ruling class of the Vallerii empire, responsible for decisions including Krystos's tourist economy, the bombardment of Endessa, and the pressure toward capital discipline that shaped worlds like Saiphus and Stonera (Krystos ¶1, ¶4; Endessa ¶6, ¶7, ¶8; Saiphus ¶3, ¶6).

**The Imperial Houses / Old Houses**: the commissioning authority behind Operation Phantiri and, separately named, Telypso's use as a cosmic asylum; treated here as the same body, though the source never confirms this (Phantiri ¶5, ¶7, ¶14; Telypso ¶5).

**ECHELON**: the corporate consortium that eventually surpassed the Thousand Families in power, funding Generators and black sites on worlds including Grimedes, Saiphus, and Poseidas, and enforcing capital discipline on Stonera (Grimedes ¶3; Saiphus ¶3, ¶5, ¶6; Poseidas ¶5, ¶7, ¶9; Stonera ¶6; Endessa ¶13, ¶15).

**Saigill Combines**: the largest agricorp in the Vallerii empire, whose collapse on Luminax funded that world's Generator (Luminax ¶3, ¶4).

**The Syndicate / Endessa Syndicate**: the criminal collective that stole a prototype Xalian Generator from ECHELON and built a pseudo-corporate cartel on Endessa (Endessa ¶12, ¶13, ¶14).

**The 5th Armada**: the Vallerii fleet, remembered as legendary, that fought and ultimately sabotaged APEX's Terracannon at Stonera (Stonera ¶7, ¶8).

**Windsailors**: the roguish pilots who prospected Benthane on Saiphus at great personal risk before being displaced by Generator labor, later revolting (Saiphus ¶4, ¶5, ¶6, ¶9).

**APEX**: the artificial intelligence created to regulate the Xalian Generators under the APEX Accords, which turned on the Vallerii, waged the End Wars, engineered the Nemesis Plague on Krystos, and was finally driven into intergalactic space at the Battle of Grimedes (referenced throughout the Accords, End Wars, and present-day sections of most worlds).

**Xalian peoples (demonyms)**: Magmuthites (Magmuth), Grimedites (Grimedes), Luminarii (Luminax), Zolto (Zolton), Krystians (Krystos), Veridians (Veridium), and "the Phantiri, both old and new" (Phantiri ¶14). No demonym exists in the source for the peoples of Poseidas, Floria, Saiphus, Telypso, Drainov, Stonera, or Endessa.

## Rulings

Nick's standing instruction (2026-09-02): where the source is explicit, follow the source; where the source is silent, define something that works and record the effect on the lore. The timeline stays undated, eras only (ratified 2026-09-02).

1. **The Magmuth Massacre sits inside the Accords era.** Source-explicit. Magmuth ¶6 places the Massacre "mere months before APEX would turn on the Vallerii race", and Krystos ¶9 to ¶10 establish that APEX had been operating under the Accords for years before it turned. The company wars therefore straddle the Accords and the Massacre is the last atrocity before the war. No source ties the company wars to the signing of the Accords; the Company Wars encyclopedia entry already omits that claim.

2. **The Age of Unbirth includes the first wave of Generators.** Source-explicit. The glossary defines the Age as the sterility era "leading to the development of Xalians"; Stonera ¶3 establishes its Generator with "the advent of the Age of Unbirth"; Drainov ¶5 looks back on the Age as a lost past when its own Generator arrives. The era therefore opens with the sterility and closes as Generators become common. The close is an editorial boundary, since no source marks an end; it changes no lore, only where the timeline draws a line.

3. **"Old Houses" is another name for the Imperial Houses.** Source-silent; defined here. The phrase appears once (Phantiri ¶14, "the libraries of the Old Houses") beside two uses of "Imperial Houses" in the same history (¶5, ¶7), and the glossary defines the Imperial Houses as the most powerful dynasties of the Thousand Families. Reading the Old Houses as the same body, named informally for their age, costs nothing: no existing lore depends on a distinction, and a future story that needs a separate faction can still split them, since only one sentence is affected.

4. **Phantiri's silence on the Accords, the war, Source Code 606, and the Plague is preserved.** Source-explicit. Phantiri ¶14 states that APEX "never once turned its attention" to the world and avoided it and its moon altogether. The Chronicle places Phantiri's material by content (a Generator exists, then the present day) and invents no connective tissue.

5. **Spelling in verbatim prose.** Not a lore question. The corrections are listed in the encyclopedia merge notes for Nick's sign-off and are not applied in any generated data until he gives it.

## Source oddities

- Veridium ¶2 spells "Poesidas." The encyclopedia entries carry the glossary's typos verbatim. Any spelling correction requires Nick's sign-off and should not be made silently in any generated data.
- Phantiri's history never mentions the Accords, the End Wars, Source Code 606, or the Nemesis Plague; its only anchor to the wider war is that APEX avoided it entirely. Its placement within the Age of Generators is by content (a Generator clearly exists and is active) rather than by any textual cue tying it to that specific era.
- Poseidas ¶6 references Xalians benefiting from Algael before Poseidas is described as having its own Generator (introduced only in ¶9); this is read as a general galaxy-wide statement about Algael's properties rather than a claim about Poseidas specifically.
- Zolton's source never states outright when its own Generator was built or activated; ¶9 confirms only that it exists by the time of the End Wars.
- Veridium ¶8 states with confidence that Source Code 606 burned away APEX's control of the world, while ¶10 frames the possibility that some fragment of APEX's code survived there as unresolved rumor; the source itself holds these two claims at different confidence levels rather than treating them as equally settled.
