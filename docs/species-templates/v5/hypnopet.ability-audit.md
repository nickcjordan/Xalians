# Hypnopet: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../hypnopet.json`, `../hypnopet.md`, `../art/hypnopet.png`, canonical teaser and Telypso record. The teaser remains verbatim.

This species is intentionally support-only. The fixed signature **Empathic Steadying** uses a mental signal to remove conditions responsive to `stabilizing`; the separate guaranteed **Chromatic Horn Trance** requires visual reception and applies `entranced`. Both survive every ordinary roll, preserving therapy and crowd control. No harm slot is required by the creature model. Ordinary domains allow stabilizing, focused attention and visual trance variations. The visual reception is a single catalog value, while the mental therapy signal has no mandated sight or hearing channel.

Candidate exclusions: body regeneration or healing vitality from the metaphor of empathic healing, possession, an indiscriminate spell library, and a damaging horn beam. A recipient's immunity or a game's lack of support can make an encounter effect unavailable, but generation never omits either essential capacity. Temperament reflects patient-oriented company and low aggression. Numeric output and likelihood were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The mechanisms are factored domains, not a finite move whitelist.

Compilation and seeded cohort generation verify four distinct actions and both guaranteed functions; this audit records source permission separately.

## Derived acts, 2026-09-22

Channels declared: `mind`. The predicate holds three ways, and both guaranteed abilities use it or the horn beside it. Conduit `crest: psychic`, carried from the v4 pair and confirmed by the guaranteed Chromatic Horn Trance: the color-changing horn is the outlet. `mind: psychic` was considered and declined, because the psychic medium row would add a burst of elemental harm to the mind, and the audit above is explicit that this species is support-only.

Mechanisms removed as redundant: none. All three are kept. `empathic-stabilizing` uses a `remove` effect, which the tables never produce; `empathic-focus` applies `focused`, which is only available as a psychic ward and would require the declined mind conduit; `horn-trance` applies `entranced` by visual signal, while the derived crest psychic snare reaches by contact.

Exclusions:

- `*/mend` - the audit above excludes body regeneration and healing vitality from the metaphor of empathic healing. Its therapy is condition removal, not restoration.
- `*/drain` - the psychic medium offers a drain; taking vitality contradicts a service animal and therapist outright.
- `crest/burst` - the audit above excludes a damaging horn beam; a psychic burst from the horn is that, with an area.
- `mind/crush` - compression harm delivered by the mind is a psychic attack, and the audit above states no harm slot is required by this creature and none is wanted from the mental channel.

Its remaining harm acts are the plain physical ones a rabbit's body grants: a hide or body strike and a shove. Those are not excluded, because the audit says no harm is required, not that the animal cannot kick.

```
hypnopet: valid permissions, four distinct actions constructible
  acts: 21 distinct on offer (crest 7, hide 3, body 5, mind 6); exclusions: */drain, */mend, crest/burst, mind/crush
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
