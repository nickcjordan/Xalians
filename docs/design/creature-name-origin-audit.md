# Existing Creature Name-Origin Audit

## Proposed data contract

Add a required top-level string to every species template:

```json
{
  "key": "graviclaw",
  "name": "Graviclaw",
  "nameOrigin": "A fusion of gravity and claw, naming both the force it controls and the massive pincer through which that force terminates."
}
```

`nameOrigin` is species-level editorial context. It does not change the species key, generation, battle rules, or an individual creature record. The species template is its source of truth, and the encyclopedia species view should show it beside the existing pronunciation.

A string is preferable to a structured roots object because the useful content is the relationship between the words and the creature, not a list of tokens. It also accommodates a tonal name such as Figzy without a fake empty-root convention.

The field should become schema-required only after the uncertain legacy names below are resolved. Making it optional would allow the new authoring rule to decay immediately; filling uncertainty with confident-sounding guesses would be worse.

## Audit method

Each name was compared with its ratified description, appearance, behavior, and signature. Clear compounds and standard lexical roots are marked `ready`. A plausible reading that cannot establish the creator's intent is marked `confirm`. A name for which the current material supplies no defensible derivation is marked `creator needed`.

External lexical checks establish only that a proposed root has the stated meaning. They do not establish why the creature's creator selected the name.

## Roster sweep

| Species | Proposed origin | Confidence | Decision |
| --- | --- | --- | --- |
| Akinza | No defensible origin is recoverable from the current creature material. | Low | Creator needed |
| Avilily | A blend of `avian` and `lily`, joining its small bird body to its flower-like plumage and blooming beak. | High | Ready |
| Bioflim | Apparently a transposition or stylization of `biofilm`, reflecting a regenerating slime layer that continually forms a protective surface. | Medium | Confirm whether the `flim` spelling was deliberate |
| Chromocat | A compound of `chroma`, color or light, and `cat`, reflecting a photonic feline even though its ordinary coat is albino. | High | Ready |
| Codazzo | Likely built from Italian `coda`, tail; the existing Italian word `codazzo` is itself derived from `coda`. The tail is the creature's exposed weapon and defining silhouette. | Medium | Confirm whether this Italian derivation was intended |
| Crystorn | A compression of `crystal` and `horn`, naming the paired head gems through which it releases stored light. | High | Ready |
| Drilltail | A transparent compound naming the drill at the end of its tail. | High | Ready |
| Dromeus | The Greek word `dromeus`, runner, matching the creature's defining ground speed and running launch. | High lexical fit | Confirm creator intent before stating it as fact |
| Ectoghoul | A compound of `ecto`, evoking ectoplasm, and `ghoul`, matching its spectral body and delight in terror. | High | Ready |
| Figzy | A playful tonal coinage selected for the small creature's whimsical spirit rather than a literal anatomical root. | Confirmed in the naming discussion | Ready |
| Foromeer | `Ore` and a possible echo of `miner` fit its excavation role, but the full construction cannot be recovered without guessing. | Low | Creator needed |
| Frackworm | A compound of `fracking`, the pressure-fracturing process it performs, and `worm`, its body form. | High | Ready |
| Graviclaw | A compression of `gravity` and `claw`, naming the force it controls and the massive pincer where that force terminates. | High | Ready |
| Hippochamp | A shortening of `hippocamp`, the horse-and-sea-creature form whose Greek roots mean horse and sea monster, matching its horse body and seahorse head. | High | Ready |
| Hypnopet | A compound of `hypnosis` and `pet`, reflecting both its trance-producing horn and its origin as a therapeutic service animal. | High | Ready |
| Imprit | Likely a compression of `imp` and either `spirit` or `sprite`, matching its small demonic appearance and erratic fire behavior. | Medium | Confirm the second root |
| Kosanos | Possible grass-cutting associations can be found, but none can be tied to the spelling or creator intent without speculation. | Low | Creator needed |
| Luceras | `Luc` may suggest light and `ceras` can suggest horn, but light is not this air creature's identity and the current record does not explain the full name. | Low | Creator needed |
| Neph | A clipping of Greek `nephos`, cloud, for the colossal creature that lives and feeds in Saiphus's atmosphere. | High lexical fit | Confirm creator intent before stating it as fact |
| Newtapede | A fusion of `newt` and `centipede`, matching its amphibious body and sixteen-legged segmented form. | High | Ready |
| Scalatto | `Scale` clearly fits its covering, but the remaining sound has no recoverable connection to its rolling defensive behavior. | Medium-low | Creator needed |
| Smokat | A fusion of `smoke` and `cat`, naming its feline silhouette and ability to atomize into smoke. | High | Ready |
| Terragoyle | A fusion of `terra` and `gargoyle`, matching a stone-moving, horned bat-like guardian that waits in a statue-like state. | High | Ready |
| Tetrahive | `Tetra` and `hive` are readable roots, and hive fits the controlled familiar swarm, but the current creature record does not explain what the four in `tetra` denotes. | Medium | Confirm the meaning of `tetra` |
| Thirstaserp | A fusion of `thirst` and `serpent`, naming the snake-like body and the venom that drains a victim's water. | High | Ready |
| Tizzie | Likely a respelling of `tizzy`, a state of agitation or confusion, matching the spiral display and psychic disorientation. | Medium | Confirm creator intent |
| Venemist | A fusion of `venom` and `mist`, naming the toxic cloud it sprays to dissolve prey. | High | Ready |
| Voltish | `Volt` supplies the electrical root; `-ish` turns it into a compact creature name rather than a literal device label. | High | Ready |
| Xylum | A stylization of `xylem`, the plant tissue that transports water and minerals, matching its body of roots and underground feeding. | High | Ready |
| Yetimoth | A fusion of `yeti` and `mammoth`, matching its hulking white-furred ape body and mammoth head; the shared ending compresses `mammoth` to `moth`. | High | Ready |

## Creator decisions needed

The names that need direct answers before the field can be populated honestly are:

1. **Akinza:** Was this rooted in another word or chosen for sound?
2. **Foromeer:** Does it combine ore, miner, foreman, meerkat, or something else?
3. **Kosanos:** Is there a language or source word behind it, or was it tonal?
4. **Luceras:** Is the name related to light, horns, leaping, or another source entirely?
5. **Scalatto:** What supplies the `-latto` part beyond the clear scale opening?

The following proposed readings are strong enough to preserve the names but still deserve a quick confirmation before publication: Bioflim, Codazzo, Dromeus, Imprit, Neph, Tetrahive, and Tizzie.

No rename is recommended solely because an old name is tonal. A rename becomes worth considering only when the creator does not recognize the proposed origin and the name no longer carries the intended creature identity.

## Implementation after confirmation

1. Add required `nameOrigin` to `SpeciesTemplateSchema`.
2. Populate all ratified templates and rebuild `speciesRecords.json`.
3. Add `nameOrigin` to the Sinterel replacement-name pass and every future proposal.
4. Expose it from the species lore adapter and display it immediately below pronunciation or before the longer creature description.
5. Add schema, rendering, and completeness tests.
6. Update the Codex bestiary build to print it.
7. Add coverage generation that fails when a ratified species lacks the field.
