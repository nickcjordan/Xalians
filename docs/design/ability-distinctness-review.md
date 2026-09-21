# Distinct abilities within one creature — agreed rule

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-20. User accepted multiple functionally distinct abilities from the same mechanism while excluding cosmetic/intensity-only duplicates, including duplicates of the signature. Current generator prevents repeating legacy pool option keys and display names. That does not define meaningful uniqueness for the new combinatorial system and must not become a one-mechanism-per-creature restriction by accident. Detailed canonicalization and constrained-sampling implementation remain pending.

## Agreed rule

A creature can receive multiple ordinary abilities using the same mechanism when their resolved functional structures differ. A change only to display name, local identifiers, description wording, or output intensity does not justify another ability slot. This also prevents an ordinary ability from duplicating the signature solely with a different name or magnitude.

Compare actual structure: delivery, instrument/element, activation/timing, target relations, spatial configuration, effect types/recipients/statuses/removal methods/protection scope, persistence, likelihood, and dependency relationships. Normalize local keys and effect ordering when they carry no execution meaning. Output intensity is intentionally excluded from this proposed distinctness rule; likelihood categories remain included because they describe status application behavior, not output amount.

Do not perform a game-specific dominance comparison: broader areas, longer ranges, and faster recovery are not universally better across all games or situations. Different structure is not a guarantee of balanced tradeoffs. Physical coherence and species permissions remain mandatory.

## Generation boundary

Authoring compilation must establish enough distinct structures for any declared ability count. Generation selects unused permitted structures directly, then resolves numerical output variation and naming; no generate/evaluate/retry loop. This describes the required behavior, not a completed algorithm. Efficient constrained selection without replacement and handling overlapping mechanism domains remain implementation-design work; do not claim a solution requires an authored whitelist or materializing the complete combinatorial space.
