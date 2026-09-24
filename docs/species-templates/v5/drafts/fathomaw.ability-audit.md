# Fathomaw ability audit (draft)

Review date: 2026-09-23, with a visual-source review on 2026-09-24. Mode: initial authoring. Current source: [Poseidas deep-route proposal](../../../design/creature-proposals/poseidas-deep-route.md) and its recorded approvals, Poseidas planetary lore, the v5 catalog and derived-act tables. The proposal is not a ratified species. The [schema 5.1 draft template](fathomaw.json) compiles. The [land-crawl concept](../../../design/creature-proposals/art/fathomaw-land-crawl-concept.png) remains a movement reference, and the [square-jaw portrait study](../../../design/creature-proposals/art/fathomaw-portrait-study.png) is the selected visual direction for now, not published site art. The draft remains outside the frozen roster and release.

## Mechanism inventory

- `jaws`: one broad upper and lower mouth, blunt crusher teeth, and self-contained hydraulic closure. It can crack weakened obstruction, bite, grip a moving target briefly, and maintain a damaging squeeze. The guaranteed `Yield Point` signature compresses and releases.
- `fins`: four locomotor fins, with the reinforced anterior pair providing the ordinary contact source. They can bluntly strike or push and work on solid ground as well as in liquid. No digits, cutting edges, or emitter are established.
- `tail`: a powerful swimming and low-crawl propulsion tail. It can strike, sweep nearby recipients, or shove. It is not established as prehensile.
- `body`: a broad, heavy, belly-supported trunk. It can ram or push by contact, but the skin is not a shield and sustained crushing under the body would depend on a suitable surface.
- Echolocation: head-produced clicks and resonant ridges locate surfaces and voids. It is a special sense, not a damaging sound emitter or persistent applied status.
- Vocal calls: loose-group communication. No combat signal or independently evidenced `voice` act is established.
- Element: water species identity. No water-emitting organ or conduit is established. Internal hydraulic fluid is retained working anatomy, not expelled elemental water.

No `channels` or `conduits` are proposed. Pressure adaptation, dual-medium breathing, and echolocation belong to physiology rather than encounter passives.

The 2026-09-24 portrait review made the lower jaw almost square-ended and the tail paddle broad and deeply notched. The teeth remain broad and blunt, and the tail remains a nonprehensile propulsion surface. These changes do not add piercing, cutting, grasping, armor, elemental projection, or another source. All jaws, tail, fins, and body derived-act families and exclusions below were rechecked against the changed shapes; their dispositions remain the same. The removed cheek crescent was surface decoration, not a lost hydraulic chamber or ability source.

## Derived-act and extension ledger

| Source and family | Disposition | Evidence and boundary |
| --- | --- | --- |
| `jaws/crush` | Include | Held contact compression from the hydraulic mouth, including the current table's brief or prolonged preparation. It remains structurally distinct from the guaranteed clamp-and-release signature. |
| `jaws/snare` | Include | The shared table grants a brief lingering restraint without requiring injury. It does not represent a maintained, source-bound grip; that requires an authored extension. |
| `jaws/strike` | Exclude whole generic row, then extend | The row grants both piercing and compression. Broad blunt teeth do not pierce; a compression-only quick bite is supported and needs an authored mechanism because exclusions are per instrument/pattern. |
| `jaws/rake` | Exclude | No cutting edge or raking teeth. |
| Maintained jaw grip | Approved behavior requiring an extension | A noninjuring grip remains source-bound while Fathomaw keeps its jaws closed. It is distinct from the brief lingering shared snare. |
| Jaw compression plus maintained restraint | Approved behavior requiring an extension | Maintaining a firm hydraulic bite can injure and hold the same recipient. Harm and restraint are independent effects; blocking harm need not undo physical grip. Not a replacement for the separate noninjuring hold. |
| `fins/strike` | Include | Reinforced anterior fin roots deliver blunt impact. |
| `fins/shove` | Include | The same fins bear weight and push loose material or a contacted target. |
| Fin grasp, rake, ward, projection | Exclude | No grasping digits, cutting edge, defensive barrier, or emitter. |
| `tail/strike` | Include | Direct impact with a powerful propulsion tail. |
| `tail/lash` | Include | The accepted concept has a thick tail root and broad paddle that can sweep laterally. The sweep uses the animal's tail in either medium, not a water wave. Final art must preserve this capability. |
| `tail/shove` | Include | The tail propels the animal and redirects contacted material or targets. |
| `tail/crush`, `tail/snare` | Exclude | The tail is broad and propulsive, not established as wrapping, grasping, or sustaining pressure on a target. |
| `body/shove` | Include | Whole-body mass can push at contact without sprinting or external terrain. |
| `body/strike` | Exclude whole generic row, then extend | The row grants impact and compression. A short ram supports impact only; an authored impact-only body act preserves it without unsupported quick compression. |
| `body/crush` | Exclude | Pinning something beneath the trunk needs a suitable surface and does not meet the portable moveset baseline. |
| `body/ward` | Exclude | Resilient skin and pressure tolerance do not create an added shield. |
| `body/terrorize` | Not derived | The current communication proposal is vocal calls, not an established threat display. |
| Echolocation reveal, mark, deafening, disorientation | Exclude | A locating sense is not an applied tracking status or weaponized sound. |
| Water projection, elemental harm or status | Exclude | No conduit, water storage/ejection, or manipulation process is established. |
| Restoration, protection, removal, beneficial status | Exclude | No repair, shielding, cleansing, or stimulation process is established. |
| Event-triggered retaliation or automatic encounter passive | Exclude | No reactive mechanism beyond ordinary physiology is established. |

The available deliveries are contact for jaws, fins and body; contact and a self-anchored close sweep for the tail. Self, projectile, stream, pulse, field, signal, free-aim area and long range lack a source mechanism. Displacement is away only. The proposed status is jaw-applied restraint, either brief and lingering from the shared snare or sustained and source-bound from an authored hold, removable by freeing. No compound effect is inferred from incidental impact or fluid movement. Similar effects from different parts remain separately available because the parts can act independently.

## Proposed authoring form

- Guaranteed action: `Yield Point`, `jaws`, physical compression at stationary contact, fixed structure and release. Output band 62 to 78 remains the agreed proposal.
- `acts.exclude`: `jaws/strike`, `jaws/rake`, `tail/crush`, `tail/snare`, `body/strike`, `body/crush`, `body/ward`. Every exclusion is justified above. No exclusion is for compactness or because another part has the same effect category.
- Authored extensions: compression-only quick jaw strike; impact-only short body ram; maintained noninjuring jaw grip; and maintained jaw squeeze with compression harm and restrained status. The first two recover supported variants that the shared exclusion granularity cannot isolate. The last two encode distinct source-bound holds absent from the table.
- No `acts.output` override is selected. The drafted extension bands were compared against the shared derived output and the signature compression band. The shared table scales heavy physical harm at 0.8 of strength and light physical harm at 0.85; no ordinary compression exceeds the signature band.

The included table acts plus extensions are the proposed species permission space, not a whitelist of complete moves assigned to every individual. Four selected actions per generated creature remain a separate generator rule. The shared fin row is v5-only while the pinned v4 registry remains unchanged.

## Neutral-land portability check

The accepted concept and current portrait study show a continuous belly contact surface, two broad planted anterior fins with reinforced roots, two smaller planted posterior fins, and a tail capable of assisting a slow crawl. At 105 to 170 kg under Poseidas's 1.7-Earth gravity, broad contact surfaces distribute weight rather than requiring an upright gait. This supports ordinary encounter-length movement, not equal land and water speed or sustained dry-land travel. Gas respiration and tolerance are declared separately from the visible locomotion mechanism.

- Jaw crush, snare, both maintained holds, the quick bite, and `Yield Point` use self-contained jaw closure. None draws pressure or working fluid from the surrounding water.
- Fin strike and shove use the same load-bearing anterior roots that pull the body across a solid surface. They do not require free swimming or a water wave.
- Tail strike, lash, and shove use the thick tail and paddle directly. A lateral sweep is possible without swimming, though its reach and speed may differ by medium in a game's interpretation.
- Body shove and the authored short ram use the planted fins, broad belly, and trunk mass. The ram is a short grounded push, not a sprint; the species' `sprint` capability remains zero.
- Echolocation is a sense, not a required trigger for any action. Its range may be shorter in gas, but the jaw, fin, tail, and body acts remain available.

No proposed act requires a home-world storm, deep-water pressure, a city structure, liquid around the body, or external life support. The current portrait has visible fin roots and a credible land-supporting posture. At 35 px it is not a sufficiently clear game token, so a separate compact mark must preserve those features at the token's actual size.

## Completion status

The draft compiles under schema 5.1 with ten distinct ordinary acts (jaws 3, fins 2, tail 3, body 2) plus the guaranteed signature. It includes four authored extensions and seven justified generic-row exclusions. The checker confirms four distinct actions can be constructed, no ordinary act was clamped by the signature, and 24 seeded examples had no structural parenthetical names or duplicate ordinary base names. A separate 240-seed draft sample retained four actions and the signature in every case. The accepted portrait direction supports the tail sweep and neutral-land mechanism at the design level, but its 35 px reduction is not a game token. This is a structural, naming, lore, and visual-source check, not game balancing or final asset delivery. No release, game integration, or encyclopedia entry is claimed here.
