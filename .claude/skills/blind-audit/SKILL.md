---
name: blind-audit
description: Run the blind-record audit experiment (context-free analysts + Codex design audit) after schema changes. Use when validating that the creature record and system design hold up to fresh adversarial eyes.
---

# Blind Audit (record + design)

Two instruments, run after meaningful schema/system changes: (A) blind record analysis by context-free analysts; (B) a Codex full-design audit against an updated brief.

## A. Blind record trio

1. **Build a sample record** at the CURRENT ratified schema (design doc §2). Vary all numbers — never let a rolled value equal an attribute (the intensity-74-equals-strength-74 artifact got flagged twice). Save as a new versioned file in `~/.claude/plans/xalian-catalog/` (e.g., `blind-test-record-v3.json`); never overwrite prior versions.
2. **Launch three context-free analysts in parallel, background**: Sonnet agent, Fable agent (instructed to a solid single pass), and Codex CLI (`codex exec --skip-git-repo-check --sandbox workspace-write "..." < /dev/null` — workspace-write or the file write fails; run from the catalog directory). Each reads ONLY `BLIND-TEST-BRIEF.md` + the record file (tell them the record filename explicitly), is forbidden to search for context, and writes to its own versioned output file (`blind-test<N>-{claude,fable,codex}.md`).
3. **Triage findings into four buckets**: (1) genuine schema gaps → candidate rulings for Nick; (2) registry-by-design ("the registry entry would settle it" — validation, not a gap); (3) game-derivation-by-design (HP/costs/type-chart complaints); (4) test artifacts (hand-authored coincidences). Weight consensus findings (all three analysts) highest.
4. **Present inline**: verdict first (did prior fixes hold?), then the fix-now list for Nick's per-item rulings, then parked items. State/Next block.

## B. Codex design audit

1. **Write a delta brief** (`CODEX-AUDIT-BRIEF-<N>.md`): corrections to the prior brief (rulings since), new ratified pieces, and an explicit charge to hunt regressions and bad interactions among new pieces. Point it at the prior brief and prior findings for regression checking.
2. **Launch** via Codex CLI (same flags as above), output to `CODEX-AUDIT-FINDINGS-<N>.md`.
3. **Triage**: fix-now design bugs (present each for Nick's explicit approval), registry/implementation-spec requirements (park in the doc's spec bucket), rejects (with reasons — e.g., contradicts an explicit Nick ruling; moot because nothing issued).
4. **Record dispositions** in the design doc and memory; fold approved fixes into their sections immediately.

## Standing notes

- Nothing is ratified by an audit; only Nick's explicit sign-off changes the design.
- Blind analysts reading `lifespan`/`chirality`-style fields as "needs a registry definition" is the architecture working — report it as validation.
- Costs: Sonnet/Codex runs are approved grunt work; a Fable analyst is fine for the trio.
