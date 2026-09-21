# Staged v5 species definitions

The redesigned model and release adapter are implemented, but the deployed roster still uses v4. Stage individually audited definitions here until the complete canonical v5 roster passes source, creative-coverage, calibration, compilation, scale and frozen-release checks. Do not feed this directory to the v4 bundler or change game imports during authoring.

Current staged species: Avilily, Bioflim and Yetimoth. Each has a same-key `*.ability-audit.md` recording sources, included/excluded mechanism families, essential guaranteed capabilities, deferred mechanics and verification. The other 29 species remain to be authored and checked; the roster-wide representation audit is [here](../../design/creature-roster-audit.md).

The existing descriptions stay verbatim. The fluid-development v5 templates deliberately remove traits, archetypes, corporeality, conduit/instrument permission lists and complete-move pools. Their ordinary mechanisms are compact source-backed domains, not prewritten move whitelists. The generator compiles these once, then constructs four distinct actions without per-creature review or retry.

Check staged files with `npm run check:creature-model -- docs/species-templates/v5/<key>.json`. The package test `creatureCanonicalPilot.test.ts` additionally exercises seeded generation and guaranteed identity. Passing checks on this subset do not activate a release or establish full-roster calibration.
