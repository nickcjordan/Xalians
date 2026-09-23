# Kosanos: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../kosanos.json`, `../kosanos.md`, `../art/kosanos.png`, canonical teaser, Floria record. The teaser remains verbatim.

The fixed Trunk Blade Sweep preserves the brush-clearing trunk blade. Ordinary domains include its cutting blade, blunt trunk force, jaw piercing and the weight of the body pressing at contact. These outcomes use supported physical anatomy; no plant emission, healing or growth follows from the plant element. Cutting a specific restraint might someday be interpreted by a game as freeing, but no universal cleanse has been added to the species. Blade sweep remains a named physical action, not a permission for arbitrary selective area targeting.

Temperament reflects methodical, herd-working behavior rather than retired archetype/trait weights. The old very weak burrow band crosses zero and is optional, not needed for any guaranteed move. Output bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Mechanism domains vary timing and physical output without a whitelist of complete moves.

The compiler and seeded cohort test verify four distinct actions, signature retention and deterministic generation; this audit records the source permissions they cannot infer.

## Derived acts, 2026-09-22

**Channels:** none. Communication is vibration only, so the voice predicate fails, and nothing in the lore or audit shows breath, aura or secretion used against another creature.

**Conduits:** none. The v4 record declared no conduit, no guaranteed or authored ability carries the plant element, and this audit already rules that "no plant emission, healing or growth follows from the plant element". A species with no evidenced outlet gets none.

**Mechanisms removed as redundant:** `trunk-blade` (derived `blades/strike` cutting), `trunk-shove` (derived `trunk/strike` impact), `jaw-bite` (derived `jaws/strike` piercing). Each authored band is preserved in `acts.output` so the calibration survives: the trunk blade stays the heaviest act at 55 to 80, the trunk itself at 40 to 68, and the grazing jaws at 35 to 60 rather than the strength-derived 60 to 77.

**Mechanisms kept:** `body-press`. The hide row's only harm mechanism is impact, so a compression press from the settled weight of the body is not derivable.

**Exclusions:** none. `*/drain` was removed on 2026-09-22, when physical `drain` became medium-only: Kosanos declares no conduit, so no drain is derived anywhere on the body and the exclusion was dead. The ruling it recorded stands, that this audit rules out healing for the species. No exclusions remain, so the `acts.exclude` key was removed; `acts.output` stays.

**Check tool:**

```
  acts: 19 distinct on offer (trunk 4, blades 2, jaws 4, tail 5, hide 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
