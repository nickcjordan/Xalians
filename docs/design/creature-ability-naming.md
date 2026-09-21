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

## Validation and next boundary

Regression tests cover derived contact/projectile/splash names, explicit Acid Glob vocabulary, collisions from range and status likelihood, signature preservation, replay, and unchanged structural/numeric generation when vocabulary changes.

Canonical vocabulary, representative relationships, and release replay have been reviewed for all 32 v5 species. Game adaptation remains separate work.
