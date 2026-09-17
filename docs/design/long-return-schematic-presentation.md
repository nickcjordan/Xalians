# Long Return: schematic presentation

Approved direction, September 17, 2026. This explicitly resumes presentation work on this game; it does not reopen the other parked game surfaces or change platform mechanics.

## Visual contract

The player reads an expedition, not a low-budget animated film. A schematic provides position and connection; prose and static site art provide atmosphere. Creature tokens never swim, jump, fight, or impersonate character animation.

- One room diagram follows scouting, reporting, route preparation, encounters, crossing, and the result. It replaces the old stage, hidden terrain preview, and decision progress rail.
- Numbered dots retain crew identity. The scout can separate from the waiting crew. A dashed report connection means communication, not a physical return.
- Selecting a route highlights a preview path without moving a creature. Only committed actions change locations.
- Crossing ends with all three crew dots across, including the reserve. A contact is a diamond, not an animated opponent. An ally remains distinct from the three controllable crew members.
- Sector nodes locate the current room and the Index. Circular deeper nodes are optional. This is topology, not a scaled building survey or a new tactical movement system.
- Known site changes persist. Undiscovered native creatures and hazard names do not appear merely because they exist in content data.
- Static art supports the account without competing with it. The story stays until the player continues. Pause, next, and skip control reading only; they never replay the gameplay action.
- Only brief marker state transitions are allowed. No ambient loops, gait animation, or cinematic camera movement. Reduced motion resolves directly to a still frame.

## Verification checklist

- [x] Replace all three creature-performance overlays with the shared field record and schematic.
- [x] Use the same map in ordinary decision and result views.
- [x] Test route preview, remote report, physical return, scout contact, crew contact, retreat, and all-crew arrival positions.
- [x] Keep the persistent story and one explicit continuation control.
- [x] Exercise a seven-room run through extraction on desktop and phone.
- [x] Complete responsive screenshot review after integration adjustments.
- [x] Re-run reading controls, return paths, build, and type checks.

Verification: all 1,257 web tests passed, including 185 Long Return tests. Seven-room reduced-motion replays reached extraction on desktop and phone with a companion, 14 salvage, and 2 stability. Normal-motion pause, stepping, persistence, map size, and explicit continuation passed at 390, 768, and 1280 pixels. Physical return, checkpoint continuity, and non-relay contact breakup passed. Type checking, production compilation, and bundle budgets passed. Screenshot review caught and corrected an inherited SVG icon-size rule, a header hit-testing layer, and a duplicated scene heading introduced by the layout change.

This milestone establishes the visual language. It does not claim human validation of how intuitive or enjoyable the new presentation feels.
