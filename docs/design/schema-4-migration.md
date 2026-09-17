# Schema 4 migration decisions

This migration preserves existing capability identity and pool permissions. Required categories absent from schema 3 use the following explicit authoring defaults. These values are design decisions, not claims that source lore specified exact range or timing. Future source-supported refinements require a new generation release; no individual generated-creature review is needed.

| Previous fact | Schema 4 decision |
| --- | --- |
| Signature process | One signature reference; definition in actions, except Bioflim's automatic renewal in passives |
| Maintained delivery | Ongoing operation and sustained effects |
| Hippochamp unbroken stream | Ongoing operation and sustained effects |
| Other operation | Discrete |
| Action use timing | Brief preparation and recovery |
| Contact delivery | Contact range |
| Projectile or focused stream | Medium range |
| Other external delivery | Short range |
| Field/pulse | Creature-centered radial area, medium extent, no remote range |
| Diffuse stream | Creature-anchored cone, medium extent, range retained |
| Sweep | Creature-anchored sweep, small extent, range retained |
| Self targeting | No remote range |
| Field/pulse/stream | Indiscriminate spatial selection; other deliveries selective |
| Effects | First primary, others secondary; instant onset; consistent likelihood |
| Residual delivery | Lingering effects with brief duration |
| Other effects | Resolved, except ongoing sustained effects |
| Existing pool options | Same instrument/media permissions in actionPool |

No new status powers are assigned to existing species solely from names or elements. The five executable hypothetical examples exercise new status/removal features without becoming species canon.

Migration utility: `scripts/migrateActionModel.js`. Historical schema 3 migration skips schema 4 templates. Archived releases are untouched.
