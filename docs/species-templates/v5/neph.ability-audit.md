# Neph: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../neph.json`, `../neph.md`, `../art/neph.png`, canonical teaser and Saiphus record. The teaser remains verbatim.

Freezing Benthane, tentacle suction and high-pressure air are three separate guaranteed actions. Benthane explicitly justifies an `ice`-element chilled effect even though the species element is `air`; the vented coolant is the physical route. Suction uses toward displacement and pressure air uses away displacement, each relative to Neph. Ordinary domains vary the same supported channels and ranges without adding a new resource bar. Free-floating movement remains a physiological capability.

Unignited hydrogen spray remains lore-only under the user's explicit deferral. No `burning`, `flammable`, `combustible`, ignition or explosion effect stands in for it. The gas-collecting tentacles do not imply vitality transfer. Temperament/output bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). No finished-move whitelist is authored.

Compilation and seeded cohort generation verify four distinct actions and all three represented guaranteed functions; the documented hydrogen exclusion is intentionally outside the checks.

## Derived acts, 2026-09-22

**Channels:** none. Communication is chemical, the body plan is not a swarm, and nothing describes a mind, gaze or aura acting on another creature.

**Conduits:** `tendrils: ice` and `vents: air`. The tendrils carry freezing Benthane in the guaranteed `neph-defining` and the authored `benthane-jet`, which is the authored-ability evidence a foreign element requires. The vents carry air, the species element, matching the v4 `vents: air` pair and the lore's high-pressure jetting.

**Mechanisms removed as redundant:** none.

**Mechanisms kept:** `benthane-jet` (a stream-delivered chilled status with no harm; the ice medium row reaches only by projectile spray or contact snare, so no derived act matches), `tentacle-suction` (displacement toward the performer, and no derived pattern pulls), `pressure-air` (a stream-delivered away displacement, where the air medium row's shove is contact-delivered).

**Exclusions:** none. `tendrils/drain` was removed on 2026-09-22, when physical `drain` became medium-only: the ice conduit on `tendrils` carries no drain in the ice medium row, so nothing derived one. The ruling it recorded stands, that the gas-collecting tentacles do not imply vitality transfer. No exclusions remain, so the `acts` key was removed from the record.

**Check tool:**

```
  acts: 22 distinct on offer (tendrils 16, vents 6); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
