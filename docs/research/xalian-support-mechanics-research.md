# Healing, Protection, and Support in Xalian Creature Design

## Recommendation

Expand the creature system so restoration, enhancement, prevention, and disruption are first-class design possibilities. The setting already supports this direction: Algael heals, Hypnopet originated as a service animal and therapist, and Sonalloy repairs damaged bodies with living alloy. The opportunity is to make that range legible and generatable throughout the system.

The recommended change has two stages. First, expand the design brief and review vocabulary without changing existing records. Second, pilot a small, structured description of an ability's intended effect, recipient, and limits. Preserve the existing instrument/action/medium/intensity grammar while testing where it loses information. Add or split action keys only when concrete examples demonstrate that the existing definitions cannot express the act.

This report is a discussion proposal, not a canon amendment or an implementation specification. Examples identified as proposals describe possible future abilities; they do not confer new powers on existing species. The repository baseline is commit `21dfde8`, whose coverage ledger contains 31 ratified species, species bundle 1.2.0, and registry 1.0.0. Research was checked on September 14, 2026. Another creature-design stream may subsequently add records or rulings.

## 1. What the existing system permits and what it misses

### Existing support foundations

The registry defines `mend` as restoring the user or an ally, and `ward` as protection through shielding, deflection, or bracing. It separately defines `healing` as restoring others and `regenerative` as repairing one's own body, organic or mechanical. The distinction between restoring oneself and restoring another creature already exists and should survive any expansion. `protective` describes an instinct, which does not by itself establish a shielding emitter or treatment mechanism. [L1]

The coverage ledger reports one `mend` signature, Sonalloy's, and three `ward` signatures: Bioflim, Scalatto, and Yetimoth. That is evidence of narrow signature representation, not a claim that the rest of the roster has no support abilities. Hypnopet has required `healing`, and standard generated moves can reach `mend` and `ward` through instrument/action relationships. [L2]

Sonalloy is particularly useful because its existing description is concrete: it maps damage, braces the recipient, and works internally stored alloy into a wound or fracture. Its reserve is replenished through feeding. Its signature is `secretion × mend × metal`; it is already a counterexample to the idea that healing belongs exclusively to Plant, Water, Light, or overt magic. The record does not specify a complete recipient-compatibility model, so it should not be interpreted as proving that molten alloy heals every possible body. [L3]

### The central information gap

The grammar mixes **delivery** and **outcome** in the action list. `beam`, `spray`, `burst`, and `cloud` describe how something arrives or occupies space. `mend`, `ward`, `drain`, and `terrorize` largely describe what happens. This works for broad flavor but becomes ambiguous when support grows more varied. [L1, L4]

For example, three proposed Chemical clouds could respectively irritate tissue, stimulate alertness, and neutralize a contaminant. They could share instrument, action, medium, and intensity while requiring substantially different interpretations. Conversely, a healing secretion might be applied by touch, sprayed over a group, or carried in a lingering mist. Classifying all three as `mend` loses delivery information; classifying them by delivery loses their restorative intent.

The generator currently selects an instrument, an eligible medium, and an allowed action, then draws a compatible name and intensity. Ordinary generated abilities do not carry a separate authored effect identity. The signature has descriptive prose, but normal abilities rely on their tuple and name. A larger word catalog alone therefore cannot reliably solve the semantic gap. [L5]

The older grammar's coarse `aura` delivery hint for both `mend` and `ward` should also be revisited. A contact repair, projected dressing, and maintained protective field should not all imply an aura. This does not mean that the current generator stores a delivery field; it is a limitation in the documented classification. [L4]

### Preserve the useful architecture

The expansion framework distinguishes universe coverage, biological coherence, generated-population balance, and consumer-game balance. It also requires a portable moveset: a creature's baseline actions must work wherever it can participate, without requiring a particular storm, world resource, structure, or allied species. These are compatible with richer support and should remain. [L6]

Portable does not mean universally beneficial. A treatment may require an injured recipient, and a nerve-calming effect may require a receptive nervous system. Those are target conditions. They differ from requiring the healer to stand in a particular home-world algae bloom before it can act. Likewise, a finite internal reserve supports portability; a requirement to have an unrelated companion manufacture every dose does not.

## 2. Cross-game findings

### How to interpret the evidence

The survey covers tabletop RPGs, monster collectors, card games, tactical and action games, MMOs, real-time strategy, and auto-battlers. It is a representative survey of mechanic families, not an inventory of every move in every franchise. Versions are identified where they matter. Historical patch notes illustrate design decisions rather than establish today's numerical balance.

Evidence that a mechanic exists is much stronger than evidence that everyone enjoys it. Official rules and ability descriptions establish behavior; developer retrospectives provide reception and design evidence; competitive analysis demonstrates strategic relevance. Community-maintained references supplement gaps and are labeled in the source list. Claims about the likely appeal of Xalian adaptations are design judgments requiring playtests.

### Comparative survey

| Game or system | Verified pattern | Design opportunity for Xalia | Limitation to retain |
| --- | --- | --- | --- |
| **Dungeons & Dragons, 2024 basic rules** | Temporary hit points buffer damage; concentration limits maintained effects and can break under damage. [1](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary) | Separate restoration from protection; require continued attention for selected field effects. | A damaged channeler can lose the benefit it maintains. No need to import spellcasting or spell slots. |
| **Pathfinder 2e, Player Core** | Battle Medicine provides combat healing through Medicine and a toolkit, with a recipient-specific reuse restriction. Treat Wounds provides slower recovery. [2](https://2e.aonprd.com/Feats.aspx?ID=5125&Redirected=1), [3](https://2e.aonprd.com/Skills.aspx?ID=42) | Separate emergency stabilization from thorough repair; model treatment saturation or recovery intervals. | Combat recovery and long-term treatment need not use the same timing or limits. |
| **Magic: The Gathering** | Ward taxes targeted interaction; shield counters absorb a damage event or replace destruction by an effect; proliferate grows existing counters. [4](https://magic.wizards.com/en/news/feature/strixhaven-school-mages-and-commander-2021-edition-release-notes-2021-04-16), [5](https://magic.wizards.com/en/news/feature/streets-new-capenna-release-notes-2022-04-20), [6](https://magic.wizards.com/en/news/making-magic/storm-scale-mirrodin-and-scars-mirrodin-blocks-2018-06-11) | Distinguish deterrence, expendable protection, and amplification of an existing state. | These are different defenses. Shield counters are not a universal immunity; proliferate requires a tightly controlled interaction set. |
| **Pokémon, main-series doubles** | Follow Me/Rage Powder redirect eligible attacks, and Tailwind provides team speed support. Amoonguss combines disruption, redirection, and ally healing through Pollen Puff in documented competitive sets. [8](https://www.pokemon.com/uk/strategy/rock-your-toughest-foes-with-lycanroc), [9](https://www.smogon.com/dex/sv/pokemon/amoonguss/vgc/) | Create useful creatures whose contribution is opening a safe turn or preserving a partner. | Team size, move restrictions, immunities, and switching make the value format-dependent. |
| **Digimon Story: Time Stranger** | Signature Special Skills coexist with interchangeable Attachment Skills; Cross Arts include defensive and supportive assistance. Buff/debuff strength receives explicit UI treatment. [10](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-the-game-mechanics-explained), [11](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-producer-interview), [12](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-launch-patch-notes) | Preserve signature identity while allowing broader supporting kits; show state changes clearly. | Digivolution, digital conversion, and trainer equipment are not automatically Xalian creature facts. |
| **Monster Sanctuary** | Individual skill trees support healing, protection, buffs, debuffs, and combinations, alongside a combo system. Publisher updates document restrictions on recursive buff sharing. [13](https://monster-sanctuary.com/), [14](https://www.team17.com/news/monster-sanctuary-relics-of-chaos-update-out-now-on-steam) | Especially relevant precedent for a monster collector where support builds are a central design space. | Interaction chains require termination rules and clear ordering. Its evolution/egg fiction is unrelated to Xalian origin. |
| **Final Fantasy XIV, Sage PvE** | Kardia heals a designated recipient after certain offensive spells land; Eukrasian Diagnosis adds a barrier. [15](https://na.finalfantasyxiv.com/jobguide/sage/) | An active supporter can sustain an ally while participating in offense; a repair mechanism can have a protective mode. | Preserve the distinction between an attack-triggered heal and a heal proportional to damage dealt. These are different mechanics. |
| **Guild Wars 2** | A shared boon vocabulary describes positive effects; barrier temporarily buffers health. [16](https://wiki.guildwars2.com/wiki/Boon), [17](https://wiki.guildwars2.com/wiki/Barrier) | Consistent effects help players compare otherwise very different creatures; strength and duration need separate treatment. | The cited wiki is community maintained on the official domain; exact stacking and skill behavior require consumer-specific checking. |
| **Overwatch, Ana base abilities** | Her rifle heals allies and damages enemies; her grenade heals/amplifies allied healing and blocks enemy healing; Nano Boost enhances damage and reduces damage taken. [18](https://overwatch.blizzard.com/en-gb/heroes/ana/?height=100%25&iframe=true&width=100%25) | A coherent biochemical mechanism can supply healing, stimulation, and inhibition. | A broad kit needs costs and opportunities to respond. Do not copy every benefit into one unrestricted Xalian move. |
| **Warframe, Trinity** | Energy Vampire replenishes allies' energy from a marked enemy; Blessing restores health/shields and reduces incoming damage. [19](https://www.warframe.com/en/game/warframes/trinity) | Resource transfer and combined repair/protection fit an engineered supernatural setting. | Her wider kit includes effects that exceed current Xalian boundaries; only the bounded mechanical ideas transfer. |
| **StarCraft II** | A 2018 balance change divided Queen Transfusion into immediate and delayed healing; the accompanying design discussion targeted an overly general-purpose unit and chained sustain. [20](https://news.blizzard.com/en-gb/article/22535491/balance-mod-update-september-25-2018), [21](https://news.blizzard.com/en-gb/article/22771167/starcraft-ii-4-7-1-patch-notes) | Biological healing can create triage decisions and pressure windows. | Historical evidence, not current tuning. Xalia should retain its own portable baseline rather than inherit terrain dependencies. |
| **Monster Hunter Now, Hunting Horn** | Attacks build notes; melodies enhance the wielder and can be shared through specified attacks. Shared benefits depend on the source's active effect. [22](https://niantic.helpshift.com/hc/en/39-monster-hunter-now/faq/5052-hunting-horn/?p=all) | Calls, percussion, vibration, and resonance can support allies during active combat. | Xalians need no spoken incantations or handheld musical equipment; use the creature's established anatomy. |
| **Darkest Dungeon II** | Developer notes describe token removal, stress recovery, opposed offensive/defensive modes, and recovery changes intended to increase decisions. [23](https://www.darkestdungeon.com/patch-notes/) | Treat morale, composure, preparation, and physical injury as distinct support problems. | Avoid effects that strip a creature of useful choices for too long. This is not evidence for one universally preferred token system. |
| **Slay the Spire 1** | Vulnerable increases attack damage received; added stacks extend its duration. [24](https://slaythespire.wiki.gg/wiki/Vulnerable) | A small readable vocabulary can produce substantial tactical depth; distinguish exposure from weakened outgoing attacks. | The example is from the first game and a community reference. Numerical values should not become universal Xalian facts. |
| **League of Legends and Teamfight Tactics** | Developer retrospectives discuss healing counterplay, oppressive sustain, and better results from softer counters than complete immunity or healing shutdown. [25](https://www.leagueoflegends.com/en-au/news/dev/quick-gameplay-thoughts-7-29/), [26](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-tft-set-1-learnings/) | Build counterplay into support abilities from the start. Preserve partial usefulness under pressure. | Historical design lessons are not current patch recommendations. |
| **Divinity: Original Sin, the board game** | The official FAQ distinguishes undead recipients: poison heals them and ordinary healing harms them. [27](https://boardgame.divinity.game/DOS_BoardGame_Errata_Faq.pdf) | An effect's benefit can depend on what receives it, not just whether the target is an ally. | This is the board-game rule, not an asserted rule for every Divinity title. Xalian ghosts are not automatically undead and should not inherit this interaction. |

### What seems most promising about these patterns

**A visible save.** Interception, a timely barrier, or stabilization lets the player connect an action to an ally surviving. The design opportunity is strongest when the threat was legible beforehand and the protection had a cost.

**A setup that someone else completes.** Exposing a target, speeding a partner, or maintaining a protective channel creates a reason to care about order and cooperation. Support contribution should remain visible even when the final damaging action belongs to another creature.

**A coherent specialist with several applications.** A repair secretion may close a fracture or form a temporary brace. A resonance organ may calm allies or disrupt an enemy's concentration. These applications feel connected because the mechanism is shared, while the tactical decision differs.

**Building around interactions.** Wizards' design retrospective describes proliferate as popular, citing its open-ended counter interactions, while also noting development and logistical difficulties. That supports exploring synergy, with bounded interactions rather than unrestricted amplification. [6](https://magic.wizards.com/en/news/making-magic/storm-scale-mirrodin-and-scars-mirrodin-blocks-2018-06-11)

There is also direct contrary evidence. Wizards reported frustration with repeated ward use, and Riot described healing that removes counterplay and complete counters that erase viable strategies. Support depth therefore requires evaluating both the user and the opponent's experience. [7](https://magic.wizards.com/en/news/making-magic/state-of-design-2024), [25](https://www.leagueoflegends.com/en-au/news/dev/quick-gameplay-thoughts-7-29/), [26](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-tft-set-1-learnings/)

## 3. Mechanic vocabulary worth exploring

The following are proposed analytical categories, not new registry keys. The game examples above establish the families; the translations below are design proposals. They should be used to discover coherent species, not as a requirement to populate every cell.

| Family | Distinction the system should preserve | Possible Xalian expression | Useful constraint |
| --- | --- | --- | --- |
| Immediate restoration | Repairs harm already suffered | Gel closes exposed tissue; alloy joins a fracture | Finite material reserve; recipient compatibility |
| Restoration over time | Repair continues after application | Adherent dressing gradually integrates | Time, interruption, or removal of dressing |
| Delayed restoration | Benefit arrives after preparation | A repair cocoon sets before releasing | Telegraph and exposure during preparation |
| Stabilization | Stops deterioration without fully repairing it | Clotting secretion or structural brace | Does not erase the underlying injury |
| Regeneration | The recipient repairs itself | Existing regenerative physiology accelerated | Resource draw, stress, or recovery period |
| Composure recovery | Restores attention or emotional stability | Bounded psychic calming or rhythmic signals | No memory rewriting or forced obedience |
| Reserve replenishment | Restores a usable resource rather than bodily integrity | Charge transfer, cooling, metabolic replenishment | Named resource and transfer loss |
| Absorption barrier | A finite layer takes damage first | Sacrificial shell or membrane | Capacity and supported damage channels |
| Mitigation | Reduces harm without a separate reservoir | Bracing, insulation, impact spreading | Directional or mechanism-specific limits |
| Interception | Changes who or what takes the hit | Bodyguard posture, deflecting tendril | Reach, exposure, and a legal path |
| Preventive resistance | Makes an incoming impairment harder to establish | Protective coating or grounding field | Specify the impairment; not universal immunity |
| Reactive safeguard | Activates when a stated event occurs | A prepared membrane stiffens on impact | Consumed trigger; visible preparation |
| Enhancement | Temporarily improves an existing function | Stimulation, focusing cues, reinforcement | Existing capability must actually exist |
| Coordination and tempo | Helps an ally act effectively at the right time | Calls, intent signals, stabilizing airflow | Acceleration is not time travel |
| Suppression | Reduces a function | Neural interference, charge leakage, fatigue | Affects a particular process, not every ability |
| Exposure | Makes a target more susceptible | Surface etching, sensory marking, broken bracing | Specific vulnerability and duration |
| Recovery inhibition | Makes repair less effective | Coagulant disruption or alloy destabilization | Prefer bounded reduction to permanent denial |
| Condition removal | Removes a harmful applied state | Solvent, purge, decompression, calming | Explain which state and why it is removable |
| Benefit removal | Disrupts a beneficial applied state | Dissolve coating or interrupt a maintained field | Cannot erase intrinsic anatomy or permanent traits |
| Siphon and transfer | Takes a resource and directs it somewhere | Drain charge and share part with an ally | Identify the substance; no free resource loop |
| Protective area | Creates local safety | Mist screen, rooted brace, pressure shelter | Position, upkeep, and exposure outside the area |
| Threat manipulation | Changes attention or access | Decoy display, intimidating posture, body blocking | Distraction differs from mind control |
| Information support | Improves the team's knowledge | Damage mapping or warning signals | Detection does not automatically compel action |

Some mechanics belong in a later, more experimental tier: converting one applied state into another, sharing damage through a maintained connection, storing excess restoration as protection, copying a compatible benefit, and triggering support from another support action. They are plausible design space, but require explicit transfer rules and protection against loops. Restoring a living but incapacitated creature is also worth discussing separately from returning a dead creature to life.

## 4. Canon boundaries and breadth

### The right explanatory standard

An ability needs a recognizable source, an observable act, an affected process, and limits. It does not need a modern scientific proof. The setting already includes spectral bodies, psychic perception, phasing, and unusual fields. Requiring every support effect to resemble present-day medicine would narrow support more harshly than existing offensive powers.

A useful proposed wording is:

> Xalians may restore, reinforce, stimulate, protect, suppress, and disrupt through their engineered bodies and bounded extraordinary channels. Every ability identifies what acts, what changes in its recipient, and what limits the effect. Restoration preserves or repairs an existing creature; it does not independently create life or overturn the setting's established consequences.

This is a proposed authoring rule, not ratified prose. Religious vocabulary such as Blessing and Benediction is already permitted in the naming rulings for `ward` and `mend`. A name's register should not be mistaken for permission to invoke a supernatural deity or cast an undefined spell. [L7]

### Firm limits under current canon

The internal companion prohibits spellcasting, teleportation, true invisibility, body puppeting, time reversal, creating life outside Generators, and permanent transformation as ordinary powers. It permits bounded look-alikes and reserves exceptional departures for hand-authored signatures. A new support catalog is not itself permission to create those exceptions. [L8]

The Nemesis Plague must not acquire a routine cure through a generic cleanse. Relief of an ordinary irritant and reversal of the setting's genome-targeting catastrophe are different claims. Likewise, temporary restoration should not silently establish unlimited service life, replenishment of a dead individual, or independent production of new Xalians. [L8, L9]

There is a wording tension to preserve rather than silently resolve: published Phantiri material describes an aspiration to resurrect through Scrambler Tokens, while working constraints reserve creation to Generators and prohibit reality-breaking ordinary powers. That is not evidence that an ordinary Ghost `mend` can resurrect the dead. Keep any future resurrection discussion tied to the relevant lore and explicit canon decision. [L8, L9]

### Body and recipient matter

The system already distinguishes flesh, plant, mineral, metal, slime, gas, energy, and spectral composition. Therefore “healing” should be an umbrella for **restoring functional integrity**, with mechanisms that can differ by recipient. A gel can treat tissue; a structural support may assist several corporeal bodies; a spectral coherence effect needs its own rationale. [L1]

Do not immediately build a mandatory eight-by-eight healing matrix. That would make team composition brittle before there is evidence it improves play. Start with explicit compatibility in the proposed ability's description, and introduce structured constraints only when two otherwise identical interpretations would behave differently. Element alone should never decide compatibility: a Fire-element flesh creature remains flesh.

### Opportunities across all fourteen elements

Every row below is a proposal, not newly established planetary lore or a quota. Some support mechanisms fit an element more naturally than others. Any concrete creature would still need a world-history review and its own anatomy, reserves, and portable baseline.

| Element / world | Support directions | Boundary or design caution |
| --- | --- | --- |
| Water / Poseidas | Hydrating or cooling layers, pressure support, wound-cleansing secretions; Algael provides an established healing precedent | Preserve Poseidas's status as the only known Algael source. Other healers need not manufacture Algael. |
| Plant / Floria | Fibrous dressings, nutrient secretion, temporary rooted braces, recovery-promoting compounds | Do not create independent offspring or require access to a World Tree for every use. |
| Chemical / Drainov | Antidotes to specified toxins, catalysts, stimulants, repair inhibitors, coating solvents | Selective treatment is not a universal cure. Mechanism and dosage matter fictionally. |
| Metal / Veridium | Structural repair, reinforcement, charge conduction, controlled body bracing | Sonalloy is the existing anchor; do not assume every metal treatment suits flesh or ghosts. |
| Rock / Stonera | Mineral splints, sacrificial shells, impact dispersion, stabilizing supports | Temporary support does not require permanent transmutation of the target. |
| Sand / Endessa | Particulate screening, adsorbent coatings, mobile packing around a damaged structure | Internally carried material must support the baseline; do not require a desert floor. |
| Air / Saiphus | Pressure cushions, particulate clearing, locomotion assistance, acoustic coordination | An air-dependent benefit should not imply every body breathes or hears. |
| Electric / Zolton | Charge replenishment, signal synchronization, grounding, temporary disruption | Restoring electrical function in a viable recipient is not resurrection. |
| Fire / Magmuth | Controlled heat, sealing compatible material, thermal buffering, brief performance stimulation | Cauterization is stabilization, not automatic full healing. Heat-sensitive recipients need another approach. |
| Ice / Krystos | Cooling, thermal moderation, protective shells, slowing an adverse process | No time stop; preservation does not automatically undo existing damage. |
| Light / Luminax | Sensory guidance, warning patterns, bounded luminous protection, explicitly engineered repair stimulation | “Light heals” is insufficient by itself; a recipient and process must be described. |
| Dark / Grimedes | Gravity bracing, impulse deflection, load redistribution, bounded field interference | No teleportation, true invisibility, or time reversal disguised as protection. |
| Psychic / Telypso | Calming, pain management, attention support, fear resistance, concentration disruption | Existing therapeutic lore is a strong anchor. No puppeting or permanent personality rewrite. |
| Ghost / Phantiri | Proposed coherence maintenance, shielding a spectral presence, disruption of spectral coupling | Requires new bounded explanation; no assumption that ghosts are dead souls or can restore the dead. |

## 5. Recommended changes to the design system

### A. Expand the target brief before expanding the registry

Add four prompts to the existing target brief:

1. **Support or disruption contribution:** what can this creature do for another creature, an encounter, or its environment beyond inflicting injury? “None” is a valid answer.
2. **Affected process:** is the act restoring integrity, protecting against harm, improving a function, changing attention, or interfering with an applied state?
3. **Recipient and delivery:** who or what can benefit, how does the effect reach them, and can the creature use it on itself?
4. **Limit and response:** what constrains its use, what ends it, and how can a recipient or opponent respond?

These prompts should be short. A support creature should still have one coherent identity rather than an inventory of unrelated talents. The existing contrast-set and do-not-force sections are valuable safeguards against sameness.

### B. Pilot a semantic layer alongside the current grammar

The following is an illustrative authoring sketch, not valid current-schema JSON and not a proposed final set of key names:

```text
Existing identity: instrument, action, medium, intensity
Intended outcome: restore structural integrity
Recipient: self or another compatible corporeal body
Delivery: direct application and sustained bracing
Mechanism: stored repair material worked into a fracture
Persistence: repair sets after application; bracing needs contact
Limits: available material, reachable damage, compatible surface
Response: interrupt application or separate the bracing contact
```

Keep the first pilot in a proposal or review sidecar. If it proves useful, promote the minimal stable facts into versioned data. Candidate facts include an effect identity, recipient scope, delivery, persistence requirements, and compatibility. Game-specific duration, range, damage reduction, accuracy bonuses, resource costs, and stacking belong in the consuming ruleset.

A meaningful distinction follows: **removing fatigue** restores a deficit, while **stimulating a rested creature** improves its current performance. Both can look like increased speed in a game, but they are different creature acts. A bare `mend` label cannot express that difference reliably.

### C. Use three concrete tests before deciding on action additions

| Test concept | What existing grammar struggles to say | Question the pilot resolves |
| --- | --- | --- |
| A secretion temporarily sharpens an already alert ally's reactions | `mend` implies restoration; `ward` implies protection; `cloud` only gives delivery | Is an enhancement outcome sufficient, or does the act need a distinct verb? |
| A pulse destabilizes an opponent's maintained protective field | `terrorize` targets courage/will, `drain` retains what it takes, `burst` only gives form | Can a suppression/removal outcome preserve intent without misusing an existing action? |
| A coating prevents one specified impairment from taking hold | `ward` is plausible, but does not identify what is prevented or how | Can typed prevention remain a `ward` with a more explicit effect identity? |

My preference is to retain `mend` and `ward`, add outcome semantics, and then determine whether a small number of verbs such as an enhancement or disruption act is still necessary. Adding synonyms for every buff would multiply instrument matrices and catalog work without necessarily clarifying behavior.

### D. Bind meaning before drawing a name

If two Chemical clouds do different things, their effect identity must be determined before naming. Do not infer a heal, toxin, or stimulant from whichever evocative word happens to be drawn. The logical sequence should become: choose a legal creature ability possibility, preserve its intended outcome and delivery, then select a name compatible with that meaning.

Do not freely cross-product every instrument, medium, and support effect. A creature's concrete mechanism must establish which combinations are legitimate, including secondary affinity variants. An extra affinity must not accidentally turn a bounded repair into a universal cure or create a new emitter the creature lacks.

Legacy moves need a migration policy. Some tuples are clear enough to receive an outcome; ambiguous ones should remain explicitly legacy until reviewed. Pin old records to their historical generator interpretation. A name-catalog change alone must not silently rewrite the mechanics of previously generated creatures.

### E. Keep traits, abilities, and game roles distinct

`regenerative` remains an enduring self-repair property; `healing` remains the capacity to restore others. A particular restorative act supplies the mechanism and limits. A `protective` disposition is not a guaranteed barrier. Temporary buffs belong to encounter state, not the permanent trait list.

Likewise, “healer,” “buffer,” “controller,” and “tank” are useful analysis labels, but should not replace the existing archetype roll. Those roles depend on how a game interprets the creature. A repair specialist may be valuable in an expedition without behaving like an MMO healer.

### F. Expand coverage without mistaking quantity for strength

Add coverage views for outcome families, self/other targeting, delivery patterns, and supported recipient processes. Separate:

- what a species signature guarantees;
- what its regular ability space can generate;
- how frequently those possibilities appear in deterministic populations;
- what a consumer actually implements and makes useful.

One species with ten theoretically reachable support names is not ten distinct support identities. A reachable heal that almost never appears is also different from a required signature. Existing catalog floors remain lexical checks; the new views assess semantic coverage.

### G. Extend review gates with specific failure cases

The coherence gate should ask whether the effect follows from the body and lore, whether its recipient requirements are stated, and whether the baseline survives a neutral encounter. The consumer gate should check actual usefulness, supported conditions, and responses available to an opponent.

When implemented, verify meaningful cases: two supporters cannot create an endless resource loop; repeated prevention cannot make a whole team untouchable; control cannot permanently remove every legal action; a cleanse distinguishes removable conditions from intrinsic traits and the Nemesis Plague; an enhancement does not create an impossible capability; and the consumer clearly reports an incompatible recipient before the player commits an action.

Evaluate healers at full team health as well as during emergencies. Useful non-healing work might be preparation, coordination, scouting, protection, or objective support. This avoids making a support specialist spend large portions of play without a meaningful choice.

## 6. Consumer balance principles

These are recommendations for game adapters, not biological restrictions to hard-code into every species.

**Separate amount, duration, and frequency.** Intensity alone cannot safely mean the same thing for damage, duration, number of targets, cleansing breadth, and invulnerability. Each consumer needs a declared interpretation and budget. Adding more support must not let one high-intensity roll maximize every axis simultaneously.

**Provide an ordinary response.** Moving away, breaking contact, interrupting a channel, attacking another target, or waiting out a short benefit should often work. A specialist counter can help without becoming the only answer. Riot's historical experience with softer counters is especially relevant here. [26](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-tft-set-1-learnings/)

**Define refresh and stacking.** Does reapplication replace strength, extend duration, add charges, or do nothing? These policies can differ by family, but they must be visible. Recursive effects need explicit exclusions or a bounded resolution process. Monster Sanctuary's publisher notes offer a concrete example of removing a buff-sharing recursion. [14](https://www.team17.com/news/monster-sanctuary-relics-of-chaos-update-out-now-on-steam)

**Price combinations and externalities.** A repair that also shields and replenishes the healer's reserve is three benefits. An area buff affects multiple allies. A creature that enables the strongest attacker may be powerful despite low personal damage. Evaluate team outcomes and opportunity cost rather than counting damage alone.

**Measure both sides' decisions.** Track whether support changes who is targeted, where creatures move, and when they commit resources. Also track stalled encounters, consecutive denied actions, support-only dead turns, and strategies that demand a single counter. The desired effect is additional meaningful decisions, not simply longer battles.

**Preserve portability across game types.** In a tactical game, a brace may reduce knockback. In an expedition, it may help an injured companion travel. In another RPG, it may create a temporary damage buffer. These can be valid interpretations of one creature fact. A consumer should not invent a new power merely because another game implemented one particular number.

## 7. A focused pilot for discussion

Use a small contrast set to test expressiveness before creating a large roster of new support species:

1. **Sonalloy as an existing repair anchor.** Annotate what the current text already establishes, and separately flag unanswered compatibility and timing questions. Do not rewrite its ratified identity to make the experiment convenient.
2. **A biochemical support concept.** Demonstrate a portable restorative or preventive secretion with explicit recipient limits. Do not automatically identify it as Algael.
3. **A stimulation concept.** Improve an ally's existing function without calling the effect healing. This is the strongest test of missing enhancement semantics.
4. **A disruption concept.** Interfere with a defined applied benefit or process without stretching `terrorize` into a generic debuff bucket.
5. **A bounded extraordinary concept.** Test a psychic or spectral support act under the same specificity standard as existing offensive powers, without requiring contemporary scientific explanation.

The recommended discussion order is: agree on the breadth of permissible effects; agree on the explanation standard; decide how much meaning must be shared across games; then review the smallest template and generator changes that preserve that meaning. This sequence supports the ongoing creature-design work while avoiding premature changes to every ratified species.

## Sources

### External sources

All accessed September 14, 2026. Undated live documentation is labeled as such. Historical articles support the stated historical examples; their numerical values are not recommendations for Xalia. Search-index excerpts were available for some pages whose full pages blocked retrieval, as noted.

1. Wizards of the Coast. [D&D 2024 Basic Rules: Rules Glossary](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary). 2024 rules, live text. Concentration, temporary hit points, and the distinction between living incapacitation and death.
2. Paizo, reproduced by Archives of Nethys. [Battle Medicine](https://2e.aonprd.com/Feats.aspx?ID=5125&Redirected=1). Player Core, p. 253, listed version 2.0. Combat treatment and recipient reuse restriction.
3. Paizo, reproduced by Archives of Nethys. [Medicine](https://2e.aonprd.com/Skills.aspx?ID=42). Player Core, pp. 241–242, listed version 2.0. Treat Wounds and out-of-combat treatment.
4. Wizards of the Coast. [Strixhaven and Commander 2021 Release Notes](https://magic.wizards.com/en/news/feature/strixhaven-school-mages-and-commander-2021-edition-release-notes-2021-04-16). April 16, 2021. Ward rules.
5. Wizards of the Coast. [Streets of New Capenna Release Notes](https://magic.wizards.com/en/news/feature/streets-new-capenna-release-notes-2022-04-20). April 20, 2022. Shield counters and exceptions.
6. Mark Rosewater, Wizards of the Coast. [Storm Scale: Mirrodin and Scars of Mirrodin Blocks](https://magic.wizards.com/en/news/making-magic/storm-scale-mirrodin-and-scars-mirrodin-blocks-2018-06-11). June 11, 2018. Proliferate's reported popularity, interaction appeal, and development costs.
7. Mark Rosewater, Wizards of the Coast. [State of Design 2024](https://magic.wizards.com/en/news/making-magic/state-of-design-2024). 2024. Mixed reception and frustration around ward/disguise.
8. The Pokémon Company. [Rock Your Toughest Foes with Lycanroc](https://www.pokemon.com/uk/strategy/rock-your-toughest-foes-with-lycanroc). Historical strategy article, date not established; indexed excerpt used because direct retrieval returned an iframe shell. Redirection and Tailwind.
9. Smogon contributors. [Amoonguss: Scarlet/Violet VGC](https://www.smogon.com/dex/sv/pokemon/amoonguss/vgc/). Community competitive analysis, undated live page. Spore, Rage Powder, and Pollen Puff support identity; not a population-wide enjoyment survey.
10. Bandai Namco. [Digimon Story Time Stranger: The Game Mechanics Explained](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-the-game-mechanics-explained). 2025. Attachment Skills and Cross Arts.
11. Bandai Namco. [Digimon Story Time Stranger: Producer Interview](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-producer-interview). 2025. Signature Special Skills, customization, and team structure.
12. Bandai Namco. [Digimon Story Time Stranger: Launch Patch Notes](https://en.bandainamcoent.eu/digimon/news/digimon-story-time-stranger-launch-patch-notes). 2025. Buff/debuff-strength icon presentation.
13. Moi Rai Games. [Monster Sanctuary](https://monster-sanctuary.com/). Undated official game description. Combo system and support specialization through skill trees.
14. Team17. [Monster Sanctuary: Relics of Chaos Update](https://www.team17.com/news/monster-sanctuary-relics-of-chaos-update-out-now-on-steam). 2023 historical update. Buff-sharing interaction restrictions and support balancing.
15. Square Enix. [Final Fantasy XIV Job Guide: Sage](https://na.finalfantasyxiv.com/jobguide/sage/). Undated live guide; PvE section used. Kardia and barrier-based support.
16. Guild Wars 2 Wiki contributors. [Boon](https://wiki.guildwars2.com/wiki/Boon). Community-maintained official-domain reference, undated. Indexed text used; direct fetch blocked. Shared positive-effect vocabulary.
17. Guild Wars 2 Wiki contributors. [Barrier](https://wiki.guildwars2.com/wiki/Barrier). Community-maintained official-domain reference, undated. Indexed text used; direct fetch blocked. Temporary health buffer.
18. Blizzard Entertainment. [Overwatch: Ana](https://overwatch.blizzard.com/en-gb/heroes/ana/?height=100%25&iframe=true&width=100%25). Undated live hero page. Base abilities used; separate perk/Stadium variants excluded.
19. Digital Extremes. [Warframe: Trinity](https://www.warframe.com/en/game/warframes/trinity). Undated live official page. Energy Vampire and Blessing.
20. Blizzard Entertainment. [Balance Mod Update, September 25, 2018](https://news.blizzard.com/en-gb/article/22535491/balance-mod-update-september-25-2018). Historical test proposal and stated design rationale for Transfusion changes.
21. Blizzard Entertainment. [StarCraft II 4.7.1 Patch Notes](https://news.blizzard.com/en-gb/article/22771167/starcraft-ii-4-7-1-patch-notes). Historical shipped follow-through for split immediate/delayed Transfusion.
22. Niantic/Capcom. [Monster Hunter Now: Hunting Horn](https://niantic.helpshift.com/hc/en/39-monster-hunter-now/faq/5052-hunting-horn/?p=all). Undated live help page. Note building, shared melodies, source dependence.
23. Red Hook Studios. [Darkest Dungeon II Patch Notes](https://www.darkestdungeon.com/patch-notes/). Live archive; Steadfast Steward material. Token interaction, stress support, stance tradeoffs, and developer rationale.
24. Slay the Spire Wiki contributors. [Vulnerable, Slay the Spire 1](https://slaythespire.wiki.gg/wiki/Vulnerable). Community reference, undated. Attack vulnerability and duration stacking, explicitly first-game rules.
25. Riot Phroxzon, Riot Games. [Quick Gameplay Thoughts: 7/29](https://www.leagueoflegends.com/en-au/news/dev/quick-gameplay-thoughts-7-29/). July 29, 2022. Healing philosophy and counterplay.
26. Riot Games. [/dev: TFT Set 1 Learnings](https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-tft-set-1-learnings/). 2019 retrospective. Disable frustration, predictability, and softer counters.
27. Larian Studios. [Divinity: Original Sin Board Game Errata and FAQ](https://boardgame.divinity.game/DOS_BoardGame_Errata_Faq.pdf). Undated official PDF. Undead recipient interaction with poison and healing; reference to rulebook p. 20.

### Repository sources

These references describe the inspected snapshot, not later changes in other worktrees. New design examples in this report are not additional canon sources.

- **L1:** `docs/species-templates/REGISTRY-DEFINITIONS.md`, actions and composition; `docs/species-templates/registries.json`, healing/regenerative/protective definitions.
- **L2:** `docs/design/CREATURE-EXPANSION-COVERAGE.md`, 31-species snapshot and signature-action counts.
- **L3:** `docs/species-templates/sonalloy.json`, lore, physiology, required traits, and signature.
- **L4:** `docs/design/xalian-ability-grammar-draft.md`, action table, delivery hints, status derivation, and catalog model. Later rulings take precedence where amended.
- **L5:** `packages/rules/src/generator/generate.ts`, `allowedActions`, `nameCandidates`, and `rollAbilities`; `packages/content/src/schema/speciesTemplate.ts`, signature schema.
- **L6:** `docs/design/xalian-creature-expansion-framework.md`, portable moveset, target brief, coverage layers, and verification gates.
- **L7:** `docs/species-templates/RULINGS.md`, September 10 religious-register ruling and subsequent authoring amendments.
- **L8:** `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md`, source precedence and working-canon constraints.
- **L9:** `.claude/skills/lore-voice/references/canon.md` and `docs/encyclopedia/encyclopedia.json`, Algael, Nemesis Plague, Hypnopet, Poseidas, and Phantiri material. Published histories outrank derivative summaries where they conflict.
