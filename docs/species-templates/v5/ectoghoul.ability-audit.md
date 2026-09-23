# Ectoghoul: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../ectoghoul.json`, `../ectoghoul.md`, `../art/ectoghoul.png`, canonical teaser and Grimedes/Dreadscape context. The teaser remains verbatim.

Its spectral body has `physiology.traversal: ["phase"]` for source-explicit passage through surfaces. That traversal is separate from attack choice and does not grant universal invisibility, invulnerability or possession. The fixed audible cackle applies `frightened`; a second guaranteed action blasts gooey ectoplasm. Ordinary domains vary those two mechanisms and modest body contact. Gooey material is represented as impact, with no unsourced acid or toxin. The cackle explicitly requires auditory reception, while ectoplasm has projectile delivery. Old generic ghost powers and life drain are excluded. Output and temperament bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). No finished-move whitelist was authored.

Compilation and seeded cohort generation verify four distinct actions and guaranteed cackle/ectoplasm identity; this audit records source permission separately.

## Derived acts, 2026-09-22

Channels declared: `voice` and `secretion`. Voice: the predicate holds on vocal communication, and the source is explicit that the terrifying cackle is used on other creatures, so it is a weapon channel here and not merely communication. Secretion: the guaranteed ectoplasm action uses it, and the description has it zapping opponents with blasts of gooey ectoplasm. Conduits: none. The ghost element has no evidenced outlet; the ectoplasm is described as gooey material and is modeled as impact, not as a ghost emission.

Mechanisms removed as redundant: `cackle-fear` (voice terrorize, frightened, auditory reception) and `spectral-body-contact` (body strike, impact). Kept: `ectoplasm-blast`, because the secretion row has neither a harm mechanism nor a projectile delivery, so a thrown gooey blast is not derivable. The authored body band, far above the derived default for this weightless body, is preserved as `acts.output`.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only and Ectoghoul declares no conduit, so the jaws row no longer derives one. The reading stands: the audit above excludes generic ghost powers and life drain by name. The ghost medium row does list `drain`, so if a ghost conduit is ever declared on this species the exclusion must come back.
- `secretion/mend` - Ectoghoul takes nothing in and feeds on nothing; there is no restorative process anywhere in the source.

```
ectoghoul: valid permissions, four distinct actions constructible
  acts: 18 distinct on offer (jaws 4, tail 5, body 4, voice 2, secretion 3); exclusions: secretion/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
