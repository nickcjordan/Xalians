# Naming generated abilities

Implemented through `packages/content/src/creature/naming.ts`, invoked by the compiler's resolved-ability generation path. Naming runs after structural selection and numeric output resolution. It changes only `name`.

## Default wording

The naming catalog derives a qualifier from an actual effect: for example, corroding supports Corrosive, restore supports Restorative, and cooling removal supports Cooling. Compound abilities may be named for one of their actual effects; naming does not establish effect execution priority or omit other outcomes.

The delivery and geometry supply the noun. Examples include Touch, Shot, Stream, Signal, Cone, Sweep and Splash. Lingering areas default to Field. Generic naming does not infer a substance from elemental identity: chemical is not automatically acid or venom. A pool, glob, spray or mist requires appropriate authored vocabulary instead of an assumption that all fields or projectiles are liquid.

| Resolved structure | Default name |
|---|---|
| Contact applying corroding | Corrosive Touch |
| Targeted projectile applying corroding | Corrosive Shot |
| Radial projectile area applying corroding | Corrosive Splash |
| Lingering corrosive area | Corrosive Field |

These are generated examples, not an allowed-move list.

## Optional source-supported vocabulary

This is a **fragment of one species mechanism**, not a complete ability:

```json
{
  "naming": {
    "qualifiers": ["Acid", "Caustic"],
    "delivery": {
      "projectile": ["Glob"]
    }
  }
}
```

That mechanism can produce Acid Glob or Caustic Glob for its projectile variants. These strings are authored presentation text, like names and descriptions, not new semantic registry keys or permissions. The delivery keys still come from the shared catalog.

Authors must support the wording in the source mechanism and ensure it fits **every** variant to which it applies. Do not use Mist for all projectiles merely because one imagined projectile happens to be mist. If no specific wording fits the whole branch, omit the override and use the structural defaults. Flavor vocabulary is optional; missing vocabulary never blocks a valid combination.

The existing mechanism `name` labels the authored process. It no longer becomes the identical display name of every generated variant. Guaranteed actions and passives retain their authored names, including the signature.

## Collisions and deterministic generation

- Use a separately labelled seeded draw for naming. Vocabulary changes must not change selected capabilities, effects, numeric output or the signature.
- Reserve guaranteed capability names. Ordinary names are compared case-insensitively.
- If ordinary names collide, prefer an actual distinguishing fact: Short Range versus Long Range, preparation/recovery, area geometry, or a particular effect's likelihood.
- If a short single distinction is insufficient, use a fuller structural description. Do not append a random identifier or reroll the ability to find a convenient name. Very long fallback names are an authoring polish issue, not a reason to reduce the permission space.
- Pin the naming catalog and species vocabulary with the generator's frozen release. `generation-0.6.0-1` now freezes the complete canonical v5 roster and naming inputs; games still use v4.

The structured ability remains authoritative. Games should never parse a name to discover damage, status, target or delivery rules.

## Collision audit, 2026-09-22

Nick saw two ordinary actions both titled "Impact Touch" on one Crystorn in Powerworks and asked for the guardrail, not a record patch. Measured over 640 records (20 seeds per species, `generation-0.6.0-1`):

| reading | value |
|---|---|
| ordinary actions carrying a structural parenthetical | 831 of 1,660 (50.1%) |
| creatures with two ordinary actions sharing a base name | 389 of 640 (60.8%) |
| most common bases | Impact Touch 368, Piercing Touch 358, Cutting Touch 233, Compression Touch 128 |
| what the colliders differ on | recovery only 76, preparation only 65, preparation and recovery 67, approach only 35, some mix of the three 90; instrument in about 15%; range, area or effects in under 10% |
| creatures carrying a pair that differs only on timing or approach | 300 of 640 (46.9%) |
| species with authored naming vocabulary | 0 of 32 |

Three causes, in order of weight:

1. **Selection counts timing and approach as structural distinctness.** The compiler's four-action proof and the draw treat `timing.preparation`, `timing.recovery` and `delivery.approach` as dimensions of a distinct action, so a claw swipe with brief recovery and the same swipe with repeatable recovery are two of a creature's four slots. Almost half the roster gets such a pair. Naming was then asked to tell them apart, and the only honest words it has for that are the structural facts in parentheses. The parenthetical fallback, designed as an escape hatch, is the main path.
2. **The default vocabulary spans two axes while distinctness spans six.** A base name is one effect word plus one delivery noun. Every contact delivery is "Touch", every impact harm is "Impact", and 60% of actions are contact harm.
3. **No guardrail measures the collision rate.** The naming tests cover collision *resolution* (the parenthetical) and assert four names are unique *with* their qualifiers. Nothing asserts the base names are, and nothing reports the rate to an author. No species has authored vocabulary, and the migrate-species skill never asks for it.

Prototyped on the same 640 records: instrument-derived nouns for contact (fists → Punch, hooves → Kick, claws → Swipe, jaws → Bite) plus mechanism words (impact → Heavy, cutting → Slashing, compression → Crushing) cut collisions only from 60.8% to 57.0%, and timing words on top (Quick, Rapid, Lunging, Charged) reach 41.9%. Vocabulary alone cannot fix a selection that keeps drawing the same act twice.

Measured for the selection change: over 40 seeds per species, every one of the 32 species exposes at least as many distinct acts (ignoring timing and approach) as it has ordinary slots to fill: 32 of 32 can fill four slots. Eight species (akinza, luceras, newtapede, scalatto, smokat, sonalloy, voltish, xylum) expose exactly three, so under an act-first draw every individual of those species carries the same three ordinary acts and varies only in timing, approach and output. Today those species draw from 11 to 24 timing variants of the same three acts, which is variety in name only.

### Proposed change (built on `creature/act-first-selection`, awaiting Nick's ruling)

- **Act-first selection.** The draw picks an act without replacement while unselected acts remain, then picks the act's variable facts. An act is what is done and with what: instrument, element, delivery mode and reception, targeting, area shape and anchor, and each effect's type, status, mechanism, direction, methods and recipient. Everything else is how hard, how far, how likely and how long (timing, approach, range, area extent and lifetime, effect likelihood, onset, persistence and duration) and still varies per individual without making two slots different. A first build with a finer identity (timing and approach only) left 24.8% of creatures colliding because likelihood-only and range-only pairs were still drawn twice; the coarser identity is the correction. A species with fewer acts than slots falls back to today's behaviour for the remaining slots, so no species loses the four-action guarantee.
- **Instrument nouns and mechanism words** as the shared default vocabulary, registry-backed (fists Punch, hooves Kick, claws Swipe, jaws Bite; impact Heavy, cutting Slashing, compression Crushing), with the authored `naming` override unchanged.
- **Fact words as the second tier.** When two ordinary names still collide, the plainest keeps the bare name and the others take a registry-backed word for a fact that varies inside the act: Quick or Charged preparation, Rapid or Mighty recovery, Lunging approach, Far or Distant range, Glancing likelihood, Lasting duration, Wide extent. "Punch, Quick Punch, Rapid Punch" instead of "Impact Touch (Brief Recovery)". The parenthetical stays as the last resort and the guardrail counts it as a failure.
- **A guardrail test** over the canonical roster that fails when any species' base-name collision rate exceeds 2% over 24 seeds, and a line in `check:creature-model` output reporting it, so an author sees it before ratification.
- **The migrate-species skill** asks for a naming vocabulary review and reads the collision line.
### Measured on the branch

| reading | today | act-first, fine identity | plus coarse identity and fact words | **plus Self and Sure** |
|---|---|---|---|---|
| ordinary actions with a parenthetical | 50.1% | 19.2% | 0.2% | **0.00%** |
| creatures with two identical ordinary names | 60.8% | 24.8% | 0.5% | **0.00%** |

The last column holds over 640 records, over the 120-seed guardrail (3,840 creatures, every species 0.0 / 0.0, 1.9 s) and over a 400-seed check (12,800 creatures). Guaranteed actions, signatures and passives are byte-identical for every seed; 622 of 640 records draw a different ordinary set. Sample: Crystorn "Heavy Ram, Quick Heavy Punch, Heavy Punch"; Hippochamp "Quick Heavy Kick, Heavy Lash, Heavy Kick"; Akinza "Slashing Swipe, Piercing Bite, Heavy Lash".

Under the coarse identity 18 of 32 species expose fewer distinct acts than ordinary slots (two acts for three slots is the common case), so act-first fills the rest by repeating an act with different facts, and the fact words carry the difference. That is the honest shape of the roster: most species have two or three things they do, and individuals differ in how. Widening a species' permissions is the creature-side answer if a species should have more.

- This is a generation change, so it needs a new release ID; `generation-0.6.0-1` stays frozen. Every game reading the canonical release gets different ordinary actions for the same seed: Powerworks' four companions and Reclamation's pools must be re-measured after the switch.

## Validation and next boundary

Regression tests cover derived contact/projectile/splash names, explicit Acid Glob vocabulary, collisions from range and status likelihood, signature preservation, replay, and unchanged structural/numeric generation when vocabulary changes.

Canonical vocabulary, representative relationships, and release replay have been reviewed for all 32 v5 species. Game adaptation remains separate work.
