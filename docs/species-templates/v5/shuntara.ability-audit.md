# Shuntara: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../shuntara.json`, `../shuntara.md`, `../art/shuntara.png`, canonical teaser and Zolton record. The teaser remains verbatim.

The guaranteed Conductive Lattice uses internally made spinneret filament to protect another creature. It does not depend on a storm, conductive ground or another unit. Ordinary domains allow bracing self or another recipient where the contact delivery reaches, short-range filament bracing of another recipient, contact filament binding, and a minor jaw bite. The delivery-mode recipient mapping prevents the short stream from arbitrarily targeting self. Binding is a physical source-bound `restrained` status, not a magical force field. The fixed signature preserves protective identity regardless of ordinary selection.

Candidate exclusions: free lightning artillery, selective area aura, automatic electricity immunity, and a universal structure-repair effect from industrial bypass work. Thick insulating hide is in lore/physiology but does not become a blanket harm immunity without a specific approved protection scope. Temperament reflects independent work with occasional tolerance of neighbors. Outputs were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md); permissions remain factored, not a finished-move whitelist.

Compilation and seeded cohort generation verify four distinct actions and guaranteed protection; this audit records biological permissions separately.

## Derived acts, 2026-09-22

**Channels:** none. Communication is vibration and display, the body plan is not a swarm, and the filament is anatomy (`spinnerets`) rather than a secretion channel.

**Conduits:** none. The filament brightens under current, but no guaranteed or authored ability sends electricity into another creature, and this audit excludes free lightning artillery and a selective area aura. Declaring `spinnerets: electric` would invent an outlet the sources do not show; that is a legitimate result and it is recorded here.

**Mechanisms removed as redundant:** `jaw-contact` (derived `jaws/strike` piercing). The authored band is preserved in `acts.output` at 20 to 38, well under the strength-derived 36 to 53, because the jaws are a minor bite on a bracing animal.

**Mechanisms kept:** `filament-brace` (a protect effect with per-delivery recipient permissions across contact and a short stream, where no derived pattern produces `protect` at all) and `filament-bind` (a sustained source-bound hold, where the derived `spinnerets/snare` is a lingering brief status).

**Exclusions:** none.

**Check tool:**

```
  acts: 15 distinct on offer (jaws 4, spinnerets 6, hide 3, crest 2); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
