# Smokat: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../smokat.json`, its walkthrough/art, canonical teaser and home planet. Teaser preserved verbatim.

Fixed Smoke Dispersal applies temporary `dispersed` to self, which permits seep through existing openings. It does not grant solid-wall phasing, teleportation, poison smoke or automatic immunity. The form change is an action, not a selectable passive. The old weak flight band was removed: a drifting smoke shape does not establish controlled self-powered flight. Ordinary domains are solid-form claws, jaws and tail contact, with bounded timing/approach variation. No fire effect follows from the smoky silhouette. Temperament and outputs were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation and seeded cohort testing check four distinct actions and fixed dispersal; this audit records biological permissions.

## Derived acts, 2026-09-22

**Channels:** none. Vocal communication satisfies the voice predicate, but no source shows the voice used against another creature.

**Conduits:** none. The guaranteed `dispersed` status is a change of the performer's own form, not ghost leaving the body through a part. This audit excludes fire and poison smoke, and the v4 record declared no conduit.

**Mechanisms removed as redundant:** `smoke-feline-claws` (derived `claws/strike` cutting), `smoke-jaws` (derived `jaws/strike` piercing), `smoke-tail` (derived `tail/strike` impact). The authored bands are preserved in `acts.output` at 35 to 60, 30 to 52 and 20 to 42.

**Mechanisms kept:** none.

**Exclusions:** none. `jaws/drain` was removed on 2026-09-22, when physical `drain` became medium-only: Smokat declares no conduit, so the jaws row no longer derives a drain. The ruling it recorded stands, that the species' diet is `none` and the lore states that it takes nothing in and feeds on nothing. Smokat is a ghost and the ghost medium row does list `drain`, so a future ghost conduit on this species would need the exclusion back. No exclusions remain, so the `acts.exclude` key was removed; `acts.output` stays.

**Check tool:**

```
  acts: 17 distinct on offer (claws 4, jaws 4, tail 5, body 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
