# Autonomous completion system: work record

## Intended outcome and authorization

Nick requested a system that makes the agent audit its own result after finishing work, identify remaining gaps, and keep doing authorized repairs without repeated user prompting. The immediate request is to install that behavior across this repository. The ongoing Akinza construction outcome remains open in `species-view-packs-active-work.md`; completing this workflow change cannot mark the creature complete.

Scope includes repository agent instructions, persistent audit/finding records, a tested local completion gate, supported runtime hook configuration, and applying the gate to Akinza's actual open backlog. It does not authorize paid services, new creature facts, arbitrary background schedules, expanded art scope or bypassing the runtime's hook trust requirement.

## Completion criteria

- Future repository sessions inherit the audit, fix and re-audit loop through AGENTS.md and CLAUDE.md.
- Findings produce concrete next actions, survive session changes, and cannot be closed merely by passing unrelated technical checks or writing a plan.
- The deterministic gate detects unresolved work, stale evidence, old/cross-chat receipts, omitted findings, weakened criteria, unverified resolutions and unsupported stopping reasons.
- User stops, interrupts, real external blockers and concrete required approvals remain possible. No hook may silently claim quality or restart an interrupted task.
- Akinza's rejected model fails the gate with every audited region still open.
- Native hook dispatch is activated only after the exact definition receives user trust. Script tests and configuration presence alone are not activation evidence.

## Implemented evidence

- Added the mandatory loop to AGENTS.md and CLAUDE.md, with the operating contract in `autonomous-completion-audit.md`. Connected the species workflow to it.
- Added `scripts/completion_audit.py`: structural/evidence checks, persistent finding history, fresh per-chat audit binding, one-use receipts, changed-work invalidation and Stop/Interrupt/UserPromptSubmit handling. No API or paid model calls.
- Added repository `.codex/hooks.json` with POSIX and Windows commands, resolving from the Git root. Only local receipt state is written by the hooks.
- Converted the full Akinza audit into 20 failing criteria and 20 open findings in `species-construction/akinza/completion-audit.json`. Its real check returns CONTINUE and lists executable corrections. It does not ask Nick to diagnose them again.
- Added unit/integration tests and Linux/Windows PR CI. All 25 tests pass locally, including launching the actual Windows hook command from a subdirectory with JSON input.

## Audit of this implementation and applied repairs

Independent reviewer `/root/quality_audit` challenged the first implementation. It could reuse old reviews, ignore interrupt state, accept an invented approval checkpoint, lose findings and treat unchanged evidence as repair. Those were implementation findings, so work continued rather than ending with the audit. Added request/session binding and consumption, prompt invalidation, interrupt precedence, required approval authority, coherent blocker mapping, retained finding/criterion history and new-evidence checks. Added regression coverage for each. The second audit found a user-stop/history interaction, an intermediate-check repair-baseline error, lost newly discovered findings on a failed check, and equivalent-path ledger duplication. Those were fixed and four more regression cases now pass. Failure baselines are per finding and refresh on reopening; an intermediate inspection does not erase the before-state. A final review caught invalid hash claims advancing resolution history; history now verifies actual bytes before accepting a closure, with another regression test.

Repository-wide receipt invalidation remains conservative: unrelated concurrent edits require resealing but never authorize changing those files. A short answer also needs a minimal recorded audit when hooks are active. Malformed data blocks with repair instructions; environmental execution failure reports degraded enforcement and leaves the AGENTS.md loop in force. These limitations are explicit. The gate checks recorded evidence and work state; it cannot independently judge aesthetics or prove the agent's honesty.

## Remaining activation boundary

Read the current official hook documentation at https://learn.chatgpt.com/docs/hooks. Codex requires user review/trust of the exact non-managed hook definition before it runs. The installed binary is `codex-cli 0.158.0-alpha.2.1` and its help exposes hook trust handling. The configured command works in direct invocation, but live dispatch/trust is not verified. No trust database, bypass flag, global setting or managed-policy file was changed.

After code review and verification, the remaining external action is reviewing/trusting these repository hooks in `/hooks` on a supported Codex surface. The instruction-based loop is usable immediately in this task and future sessions that read the repository instructions. Native automatic stop enforcement must remain described as pending until observed.

Opened ready PR #733, https://github.com/nickcjordan/Xalians/pull/733, with auto-merge enabled. All 25 local tests pass and the Akinza negative check returns CONTINUE. Linux/Windows CI is pending. The system's own audit permits only a blocked activation handoff, not a claim that live hook enforcement is active.
