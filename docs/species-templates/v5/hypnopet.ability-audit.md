# Hypnopet: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../hypnopet.json`, `../hypnopet.md`, `../art/hypnopet.png`, canonical teaser and Telypso record. The teaser remains verbatim.

Its identity is support: The fixed signature **Empathic Steadying** uses a mental signal to remove conditions responsive to `stabilizing`; the separate guaranteed **Chromatic Horn Trance** requires visual reception and applies `entranced`. Both survive every ordinary roll, preserving therapy and crowd control. Harm is not its identity, but Nick ruled on 2026-09-23 that nothing forbids it: "I see no reason why a hypnopet couldnt cause harm. It may not be the most effective but why not?" Ordinary domains allow stabilizing, focused attention and visual trance variations. The visual reception is a single catalog value, while the mental therapy signal has no mandated sight or hearing channel.

Candidate exclusions: body regeneration or healing vitality from the metaphor of empathic healing (open question for Nick, since the teaser calls them healers), possession, and an indiscriminate spell library. The damaging horn beam exclusion was lifted with the harm ruling of 2026-09-23. A recipient's immunity or a game's lack of support can make an encounter effect unavailable, but generation never omits either essential capacity. Temperament reflects patient-oriented company and low aggression. Numeric output and likelihood were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The mechanisms are factored domains, not a finite move whitelist.

Compilation and seeded cohort generation verify four distinct actions and both guaranteed functions; this audit records source permission separately.

## Derived acts, 2026-09-22

Channels declared: `mind`. The predicate holds three ways, and both guaranteed abilities use it or the horn beside it. Conduit `crest: psychic`, carried from the v4 pair and confirmed by the guaranteed Chromatic Horn Trance: the color-changing horn is the outlet. `mind: psychic` was considered and declined, because the psychic medium row would add a burst of elemental harm to the mind, and the audit above is explicit that this species is support-only.

Mechanisms removed as redundant: none. All three are kept. `empathic-stabilizing` uses a `remove` effect, which the tables never produce; `empathic-focus` applies `focused`, which is only available as a psychic ward and would require the declined mind conduit; `horn-trance` applies `entranced` by visual signal, while the derived crest psychic snare reaches by contact.

Exclusions:

- `*/mend` - the audit above excludes body regeneration and healing vitality from the metaphor of empathic healing. Its therapy is condition removal, not restoration.
- `*/drain` - the psychic medium offers a drain; taking vitality contradicts a service animal and therapist outright.
- `crest/burst` and `mind/crush` were excluded here as harm until 2026-09-23. Nick ruled that a Hypnopet may cause harm, so both are back: a psychic burst from the horn and a mental squeeze.

Its harm acts are the physical ones a rabbit's body grants (hide and body strikes, a crush) plus the psychic burst from the horn and the mental squeeze. Physical harm scales with its small strength; the psychic acts and the mind's push scale with its willpower.

```
hypnopet: valid permissions, four distinct actions constructible
  acts: 23 distinct on offer (crest 8, hide 3, body 5, mind 7); exclusions: */drain, */mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
