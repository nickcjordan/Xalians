# Number of abilities per individual — agreed action allocation

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-21. User ratified four total actions per generated creature. Guaranteed actions consume slots first; construct distinct ordinary actions to fill the remainder. Passives do not consume action slots. A creature with a passive signature still receives four actions. Production migration remains pending.

Keep the separate question of how many abilities an individual receives distinct from (a) the number of combinatorially possible abilities and (b) effect count, whose arbitrary quota was rejected. A generated creature is a finite resolved record, not the entire species permission system.

This supersedes the earlier proposal for species-authored additional action count ranges and guaranteed actions outside that count. Retire the old actionPool.count setting; the number of generated ordinary actions is derived as four minus the guaranteed action count. No per-species action-count override is approved. Zero ordinary actions is valid if all four are guaranteed. Pure support creatures remain valid; their four actions need not include harm.

Counts govern the permanent generated creature's capabilities, not a game's equipped-move limit. Games own encounter availability/equipment rules. Authoring compilation must prove that the requested count can always be filled with distinct valid configurations, excluding duplicates of guaranteed capabilities. An impossible template is diagnosed before release; do not silently truncate, duplicate, or retry generated creatures.

More than four guaranteed actions or insufficient distinct ordinary configurations is an authoring error, not permission to drop essential powers, fill with duplicates, or return fewer actions. Do not restore a pool of prewritten moves or a replacement variable action-count field.

Passive policy ratified 2026-09-21: no passive-slot quota. Automatic processes inherent to the species are guaranteed. Presence varies only with explicitly authored physiological/mechanism variation that warrants it; do not independently roll extra powers to fill slots. A supported automatic process is not contingent on a related ordinary action being selected. The template compiler must keep passive presence aligned with its source properties over all allowed variants. This does not authorize a generic biology-variant engine or private conditional language; concrete dependency encoding requires evidenced cases. Passives remain outside the four-action allocation.
