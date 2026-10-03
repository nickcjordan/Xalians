# Creature expansion active work

## Intended outcome

Preserve Fathomaw's accepted portrait direction and start the next creature-design pass from the current v5 roster and world lore, without prematurely defining or ratifying that creature.

## Authorized scope and completion criteria

- Preserve Fathomaw's ratified anatomy and accepted square-jaw character. Do not replace it with a weaker site asset merely to fill an art slot, or change species facts to excuse a visual artifact.
- Check whether the accepted portrait can already serve the site's separate portrait and compact roles. Record any remaining production-art work explicitly.
- Replace the stale v4 expansion snapshot with a clearly labeled current v5 coverage review and an evidence-based next target brief.
- Keep the next creature's defining facts open for Nick's approval.

## Completed evidence

- Fetched `origin/main` and made a clean worktree from it for this task.
- Re-read the current platform handoff, design of record, species art contract, and Fathomaw v5 template.
- Confirmed the accepted PNG is a concept reference, while the current site uses separate SVG portrait and 64-unit token roles.
- Tried a hand-authored SVG translation and rendered it at portrait and token sizes. It lost the accepted square jaw and clear fin anatomy, so the draft was discarded rather than presented as completed art.
- Added a reproducible v5 coverage inventory from the 33 current templates. It records world, body, material, diet, senses, anatomy, channels, conduits, mobility presence, and signature forms/effects without treating scarcity as a quota.
- Updated the historical target-brief status and the framework's v5 pointers. Wrote a post-Fathomaw target ranking and an explicitly provisional Krystos concept hypothesis.
- `node --check scripts/creatureCoverageV5.js`, `npm run check:creature-coverage:v5`, and `git diff --check` passed.

## Current continuation

Nick accepted Krystos as the next target on 2026-09-26. The `migrate-species` skill and current creature contract were checked before concept authoring. They explicitly defer mechanical dormancy, so the target brief was corrected to keep full vital arrest as possible ecological lore only. Krystos's published history confirms under-ice oxygen-producing algae, which provides a better feeding anchor than an exclusively carrion-fed scavenger. A first vent-grazer body and active-action hypothesis is recorded in `docs/design/creature-proposals/krystos-vent-grazer.md` with all species facts still provisional. The act was corrected from ground-braced levering to a counterstroked rotation that can work on land or in open water. The current v5 roster has no displacement signature, but this is a secondary contrast, not permission to force one.

Nick identified that Sonalloy, Shuntara, Fathomaw, and this fourth concept all repeated a low-body opening. The low Krystos posture was withdrawn. A raised-shoulder, arched-trunk, broad-footed stance is now a candidate because it could clear snow and reduce constant ice contact while still lowering to dig. It has not been approved and must pass tunnel and swimming checks. The rotational levering action is also only a candidate. The next creative decision is the creature's resting shape and ecological core, before a name, measurements, template, or art. A faithful production portrait and compact token for Fathomaw remain separate art-delivery work; the accepted PNG continues to be the concept baseline, and no inferior SVG pair was published.

Nick's critique exposed a repeated design heuristic, not a lore requirement. The first three recent creature descriptions explicitly use low silhouettes, and the Krystos sketch repeated it. A posture comparison now records the snow, tunnel, swimming, and roster-contrast trade-offs of belly-gliding, raised-shoulder, and upright forms. Do not replace one automatic posture with another; carry the raised-shoulder candidate only if anatomy drawings and functional checks support it.

## Concrete construction pass, 2026-09-30

- Fetched latest main, `e503ee4e`. The current creature contract, derived-act document, migrate-species skill, and v5 templates have no changes relative to this worktree. Main's newer completion-audit guidance was inspected. No merge or mutation of the concurrent primary checkout was performed.
- Developed a three-pose joint-reach diagram with four separately traced limbs and constant segment lengths. Rendered and inspected the result. Corrected a below-surface head in the digging pose and extended feet in the intended tucked swim pose. It is a construction study, not portrait art or a strength/buoyancy/joint-limit proof. Diagram: `C:/Users/njord/.codex/visualizations/2026/09/10/01a08c31-ecbd-7ac3-a70f-5404b4a26d84/krystos-body-study.html`.
- Specified a raised-shoulder, scoop-faced grazer with padded clawed forehands and webbed weight-bearing hind feet. Added integrated muzzle/cheek character rather than decorative appendages. No proposed anatomy is called approved.
- Corrected ecology to accessible vent cavities and existing fissures, with excavation of drift and fractured/thin ice rather than continuous glacier boring. Proposed lungs and breath-hold diving with reliable air access, not invented indefinite underwater respiration.
- Corrected the signature hypothesis: counterstrokes permit an open-water maneuver but do not supply a ground anchor or equal throwing power. A distinctive fixed signature can use existing physical effect families without a newly invented status.
- Added a provisional source-by-source ability review. Found the current shared vocabulary has no ordinary padded-foot instrument; recorded it explicitly rather than pretending a `feet` enum exists, mislabeling feet as hooves, or omitting their capabilities. This is a template-authoring gap to resolve after anatomy acceptance, not a reason to change the creature's shape.
- `node --check scripts/creatureCoverageV5.js`, `npm run check:creature-coverage:v5`, and `git diff --check` passed. No executable creature template or compiler completeness claim was made.

Next unfinished action: obtain Nick's actual subjective decision on the raised scoop-faced amphibious grazer identity. That decision determines anatomy, grip, and dentition before canonical measurements, naming, a staged executable template, and the full compiler-backed audit. The present result is a reviewable design proposal, not a ratified creature or a finished official portrait. Production Fathomaw art remains separately recorded and is not superseded by this study.
