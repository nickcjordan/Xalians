# Thirstaserp: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../thirstaserp.json`, its walkthrough/art, canonical teaser and Endessa record. Teaser preserved verbatim.

The fixed signature subsonic rattle applies `entranced` with auditory reception. A separate guaranteed fang delivery applies `poisoned` through its water-depleting venom. The status represents biological dysfunction; this version has no hydration meter or explicit water-transfer bar. Ordinary rattle, venom and fang-piercing domains vary range/timing/likelihood without omitting either defining capability. No self healing from stolen water, visual-only hypnosis or unsourced coil restraint is added. Temperament/output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation and seeded generation check four distinct actions and both fixed functions; this audit records source permission.

## Derived acts, 2026-09-22

**Channels:** none. Communication is vibration only. The venom is a secretion in the ordinary sense, but the `secretion` row grants snare, ward and mend, none of which any source supports for this animal, and this audit excludes self healing from stolen water and unsourced coil restraint. Declaring the channel only to exclude all three of its acts would be a label rather than a claim about the body, so it is left undeclared and the reasoning recorded here.

**Conduits:** none. The v4 record declared none, no authored ability carries sand, and nothing shows sand leaving the body.

**Mechanisms removed as redundant:** `fang-pierce` (derived `fangs/strike` piercing), with the band preserved in `acts.output` at 32 to 55.

**Mechanisms kept:** `rattle-mesmerism`, because the rattle row's terrorize applies `frightened` while the source is explicit that the subsonic vibration lures and mesmerizes; `entranced` is a different status and the tables cannot produce it from a rattle. `dehydrating-venom`, because no derived pattern applies `poisoned`.

**Friction, 2026-09-22 (reported, not worked around).** The communication gate added that day requires `vocal` for an auditory terrorize, and Thirstaserp communicates by `vibration` only, so `rattle/terrorize` no longer derives. Derivation now leaves the rattle with exactly one act, `rattle/ward`, and the instrument survives the per-instrument rule only because the authored `rattle-mesmerism` fills the second slot. Nothing is broken and no exclusion was added, but the reading is uncomfortable: a rattle whose entire described function is a subsonic signal is gated off from signalling because the species is not recorded as vocal. The likely wrong side is the row, not the record. A rattle is not a voice, and its predicate is arguably `vibration` rather than `vocal`, or `vocal | vibration`. Thirstaserp is the single roster case, so the evidence is thin, and the setting is left as ratified. Nick decides whether the `rattle` row's reception should read `vibration`.

**Exclusions:** none. `jaws/drain` and `fangs/drain` were removed on 2026-09-22, when physical `drain` became medium-only: Thirstaserp declares no conduit, so neither row derives a drain. The ruling they recorded stands, that this version has no self healing from stolen water. Thirstaserp is a sand species and the sand medium row does list `drain`, so a future sand conduit would need the exclusion back. No exclusions remain, so the `acts.exclude` key was removed; `acts.output` stays.

**Check tool:**

```
  acts: 14 distinct on offer (jaws 4, fangs 2, tail 5, rattle 3); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

Lever moved 2026-09-22 on this case: an auditory part's threat now derives from vibration communication as well as vocal, so the rattle's subsonic warning derives `rattle/terrorize` again.
