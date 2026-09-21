# Canonical v5 species definitions

The redesigned model and release adapter are implemented and the complete roster has passed source, creative-coverage, calibration, compilation, scale and frozen-release checks. The deployed games still use v4. Do not feed this directory to the v4 bundler or change game imports as part of ability authoring.

Current staged species: all 32 canonical species. Each has a same-key `*.ability-audit.md` recording sources, included/excluded mechanism families, essential guaranteed capabilities, deferred mechanics and verification. The roster-wide representation audit is [here](../../design/creature-roster-audit.md); the cross-roster rating pass is [here](../../design/creature-v5-calibration.md). The standalone `generation-0.6.0-1` archive captures this roster and replays every species. Games remain on v4 pending their separate adaptation.

The existing descriptions stay verbatim. The fluid-development v5 templates deliberately remove traits, archetypes, corporeality, conduit/instrument permission lists and complete-move pools. Their ordinary mechanisms are compact source-backed domains, not prewritten move whitelists. The generator compiles these once, then constructs four distinct actions without per-creature review or retry.

Check source files with `npm run check:creature-model -- docs/species-templates/v5/<key>.json`. The package test `creatureCanonicalPilot.test.ts` additionally exercises seeded generation and guaranteed identity for all 32 species. The standalone archive is frozen; activating v5 in individual games is separate work.
