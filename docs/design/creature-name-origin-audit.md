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

Each name was compared with its ratified description, appearance, behavior, and signature. The second pass also tested translated animal names, anatomical terms, and action words across languages, since the original naming process sometimes joined fragments selected for sound rather than preserving whole words. Clear compounds and standard lexical roots are marked `ready`. A reconstruction that fits the creature but cannot establish the creator's exact historical choice is identified as a retrofit rather than presented as recovered fact.

External lexical checks establish only that a proposed root has the stated meaning. They do not establish why the creature's creator selected the name.

## Roster sweep

| Species | Proposed origin | Confidence | Decision |
| --- | --- | --- | --- |
| Akinza | A compressed multilingual blend of Norwegian `kanin`, rabbit, and German `Katze`, cat, matching its feline frame and oversized rabbit-like ears. The fragments have been freely reshaped for sound. | Medium | Recommended retrofit; not claimed as recovered intent |
| Avilily | A blend of `avian` and `lily`, joining its small bird body to its flower-like plumage and blooming beak. | High | Ready |
| Bioflim | Apparently a transposition or stylization of `biofilm`, reflecting a regenerating slime layer that continually forms a protective surface. | Medium | Confirm whether the `flim` spelling was deliberate |
| Chromocat | A compound of `chroma`, color or light, and `cat`, reflecting a photonic feline even though its ordinary coat is albino. | High | Ready |
| Codazzo | Likely built from Italian `coda`, tail; the existing Italian word `codazzo` is itself derived from `coda`. The tail is the creature's exposed weapon and defining silhouette. | Medium | Confirm whether this Italian derivation was intended |
| Crystorn | A compression of `crystal` and `horn`, naming the paired head gems through which it releases stored light. | High | Ready |
| Drilltail | A transparent compound naming the drill at the end of its tail. | High | Ready |
| Dromeus | The Greek word `dromeus`, runner, matching the creature's defining ground speed and running launch. | High lexical fit | Confirm creator intent before stating it as fact |
| Ectoghoul | A compound of `ecto`, evoking ectoplasm, and `ghoul`, matching its spectral body and delight in terror. | High | Ready |
| Figzy | A playful tonal coinage selected for the small creature's whimsical spirit rather than a literal anatomical root. | Confirmed in the naming discussion | Ready |
| Foromeer | A blend of Italian `foro`, hole, and `meerkat`, matching a narrow-headed upright creature whose drill hands bore through material for excavation. | Medium-high | Recommended retrofit |
| Frackworm | A compound of `fracking`, the pressure-fracturing process it performs, and `worm`, its body form. | High | Ready |
| Graviclaw | A compression of `gravity` and `claw`, naming the force it controls and the massive pincer where that force terminates. | High | Ready |
| Hippochamp | A shortening of `hippocamp`, the horse-and-sea-creature form whose Greek roots mean horse and sea monster, matching its horse body and seahorse head. | High | Ready |
| Hypnopet | A compound of `hypnosis` and `pet`, reflecting both its trance-producing horn and its origin as a therapeutic service animal. | High | Ready |
| Imprit | A compression of `imp` and `sprite`, matching its small demonic appearance and supernatural, erratic fire behavior. | Medium-high | Ready as a retrofit |
| Kosanos | A joining of Polish `kosa`, scythe, and `nos`, nose, naming the broad cutting blade at the end of its long trunk. | High lexical and creature fit | Ready as a multilingual reconstruction |
| Luceras | A stylized blend of Latin `lepus`, hare, and Greek `keras`, horn, matching its long-eared bounding frame and paired ram-like horns. | Medium-high | Recommended retrofit |
| Neph | A clipping of Greek `nephos`, cloud, for the colossal creature that lives and feeds in Saiphus's atmosphere. | High lexical fit | Confirm creator intent before stating it as fact |
| Newtapede | A fusion of `newt` and `centipede`, matching its amphibious body and sixteen-legged segmented form. | High | Ready |
| Scalatto | A blend of `scale` and French `tatou`, armadillo, matching its scaly armor and ability to roll into a protective ball. | High lexical and creature fit | Ready as a multilingual reconstruction |
| Smokat | A fusion of `smoke` and `cat`, naming its feline silhouette and ability to atomize into smoke. | High | Ready |
| Terragoyle | A fusion of `terra` and `gargoyle`, matching a stone-moving, horned bat-like guardian that waits in a statue-like state. | High | Ready |
| Vespersyn | A blend of Latin `vesper`, evening, and Greek `syn`, together, reflecting a creature of perpetual night that moves its familiar swarm as one unit. | High | Ready; replaces Tetrahive |
| Thirstaserp | A fusion of `thirst` and `serpent`, naming the snake-like body and the venom that drains a victim's water. | High | Ready |
| Tizzie | Likely a respelling of `tizzy`, a state of agitation or confusion, matching the spiral display and psychic disorientation. | Medium | Confirm creator intent |
| Venemist | A fusion of `venom` and `mist`, naming the toxic cloud it sprays to dissolve prey. | High | Ready |
| Voltish | `Volt` supplies the electrical root; `-ish` turns it into a compact creature name rather than a literal device label. | High | Ready |
| Xylum | A stylization of `xylem`, the plant tissue that transports water and minerals, matching its body of roots and underground feeding. | High | Ready |
| Yetimoth | A fusion of `yeti` and `mammoth`, matching its hulking white-furred ape body and mammoth head; the shared ending compresses `mammoth` to `moth`. | High | Ready |

## Creator decision

The roster pass is resolved. Nick approved **Vespersyn** to replace **Tetrahive** on 2026-09-10, removing the unsupported implication of four while retaining the creature's night-world and unified-swarm identity.

Akinza, Foromeer, and Luceras can keep their names under the explicitly identified retrofit origins above. Kosanos and Scalatto are strong enough that their reconstructed roots may well be the original ones, but the eventual encyclopedia wording should describe what the names blend, not claim access to the creator's memory.

Bioflim, Codazzo, Dromeus, Imprit, Neph, and Tizzie also have sufficiently coherent origins for the field once retrofits are allowed. No rename is recommended solely because an old name is tonal. A rename becomes worth considering when a visible root creates an unsupported expectation, as `tetra` currently does.

### Tetrahive replacement pass

The approved replacement is **Vespersyn** (`VES-per-sin`), blending Latin `vesper`, evening, with Greek `syn`, together. It abstracts the creature's two defining facts: it belongs to a world of perpetual night, and it holds a cloud of familiars together as one unit. The exact name has no repository collision; its external exact-name scan found no established creature or entertainment property.

Alternatives were rejected as follows:

- **Swarmind** and **Hivemeld** explain the mechanism but read like ability labels rather than species names.
- **Essimens**, from French `essaim`, swarm, and Latin `mens`, mind, has stronger literal roots but uncertain pronunciation from sight.
- **Myriarch**, from myriad and ruler, has excellent conceptual fit but collides with an existing fantasy creature name.
- **Noxorus**, from night and chorus, is sonically clean but collides with a published fiction title.

## Implementation

Completed on 2026-09-10:

1. `nameOrigin` is required by `SpeciesTemplateSchema` and the template validator.
2. All 30 ratified templates carry the field, and the content bundle has been rebuilt.
3. The current Sonalloy proposal carries a complete origin record; every future full proposal must supply one.
4. The species lore adapter exposes the field and the encyclopedia species view displays it before the longer description.
5. Content, lore, Codex, and completeness tests cover the contract.
6. The generated Codex prints the origin in every Bestiary record.
7. Creature coverage generation stops with an error if any ratified species lacks the field.
