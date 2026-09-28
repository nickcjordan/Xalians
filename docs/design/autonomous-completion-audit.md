# Autonomous completion audit

Nick requested this system on 2026-09-28 after Akinza 0020 was presented prematurely and a subsequent audit produced a long repair list without doing those repairs. An audit is part of implementation. Its findings feed the next work cycle; they are not a reason to end it.

## Required loop

1. Recover the original intended outcome, authorized scope, constraints, quality references and completion criteria from the conversation and persistent work record. Do not replace the outcome with the latest subtask. A new question or audit request normally steers the ongoing task; it does not silently cancel authorized implementation.
2. Do the next useful authorized work. Preserve accepted decisions and unrelated user changes. Select a different method when repeated attempts fail the same requirement.
3. Inspect what was actually built or delivered. Open the rendered artifact, exercise the user flow, inspect the code behavior or read the generated document as appropriate. Compare it with the user's target, not merely the previous attempt. Test results establish only what the tests measured.
4. Audit the whole outcome after each meaningful iteration and before declaring a phase complete, requesting approval, opening a completion PR or sending a final response. Check unmet requirements, quality, regressions, integration, missing deliverables, documentation consistency and the clarity of the review links. For a small edit this is a short direct check; do not invent extra scope or tests.
5. Record every substantive gap as an open finding with a stable ID, evidence, correction action and acceptance criterion. Prioritize dependencies. A resolved finding needs changed-result evidence and a regression check. A changed result invalidates its earlier review.
6. If any authorized correction or verification remains executable, do it in the same ongoing task, then return to step 3. Use commentary for milestones. Do not substitute "I can do that next," a repair plan, a new PR, or another promise to audit for the correction itself.
7. After the final fixes, repeat the complete comparison. For substantial visual work or a complex multi-step change, use an independent reviewer when authorized and available. Give that reviewer the user's target and actual result, ask for differences first, and do not prime them with the builder's pass. The primary agent resolves the findings; agreement between agents is not user approval.

No fixed number of iterations proves quality. After two attempts repeat the same defect, inspect why the method cannot express the target and change the method or run a focused capability experiment. Do not endlessly polish an inadequate representation. Record the outcome of the experiment, then continue the viable path. If no available method can make meaningful progress, demonstrate the concrete capability limitation and preserve incomplete status. Time spent, a long response, a clean mesh or fatigue is not a blocker.

## Legitimate stopping conditions

| Condition | Required evidence |
|---|---|
| Complete | All in-scope criteria pass against current results, findings are resolved or justified outside scope, required checks are done, and the persistent record agrees. |
| User approval or consequential choice | A concrete sufficiently developed result, no known executable repair left, one actual subjective or authorization question, and exact current artifact links. An obvious defect is agent work, not an approval question. |
| External blocker | The specific unavailable input/capability/permission, attempted alternatives, evidence, what unblocks it, and confirmation that independent authorized work is exhausted. Do not call one blocked branch a blocker for the whole task. |
| Explicit user stop or incompatible redirection | The user's actual instruction. Honor interruptions immediately. Never let this process override user control, tool limits or higher-priority instructions. |

For an answer-only conversation, audit accuracy, relevance and completeness at an appropriate scale. Do not manufacture implementation work. A follow-up question during unfinished implementation must not be used to erase that implementation from the work record.

## Persistent findings and stop receipt

Use a task-specific JSON audit alongside the Markdown work record for substantial work. `docs/design/species-construction/akinza/completion-audit.json` is a populated failing example. `docs/design/completion-audit-template.json` is the starter shape. Keep separate records for separate objectives and name the related ongoing objective when a new task changes the workflow around it.

The audit includes the intended outcome and authorization, criteria with actual inspection evidence, stable findings, a whole-outcome/regression/scope assessment, and the reason for continuing or stopping. Evidence uses repository-relative paths and raw SHA-256 file hashes. Working models can remain in ignored directories; their hashes must still be listed. A state of `pass` is an agent assertion supported by inspectable evidence, not an automated judgment of artistic quality.

```text
python scripts/completion_audit.py begin --session <this-chat-session-id>
python scripts/completion_audit.py check --record <task-audit.json>
python scripts/completion_audit.py seal --session <this-chat-session-id> --record <task-audit.json>
```

`check` exits 1 when work must continue, 2 on malformed input, and 0 only for a supported stop condition. It rejects open findings, failing criteria, stale/missing evidence, unverified fixes, unsupported blockers and empty approval requests. `seal` applies those checks and writes a local per-chat receipt. Run it after the last edit/commit and actual audit; a change to HEAD, tracked modifications, nonignored new files, the audit JSON or bound ignored artifacts invalidates the receipt. Receipts live under ignored `.codex/audit-state/` and are consumed once. Never seal using another task's audit or omit findings to force a pass.

Run `begin` before the fresh audit and put its returned values in `audit.sessionId` and `audit.requestId`; record the actual time in `audit.performedAt`. Each new prompt invalidates the previous receipt. The request binding prevents resealing an unchanged old review for a later turn or another chat. `check` and `seal` also retain a local history of criteria and findings: previously recorded obligations cannot disappear, narrowed expectations need actual user scope-change evidence, and resolving a previously open finding needs evidence different from that finding's failure baseline. Keep the JSON history in Git as well; local history does not follow a fresh checkout. A new hash proves new evidence exists, not that the repair is good.

Repository snapshots are deliberately conservative. Unrelated concurrent edits can invalidate a receipt; recheck and reseal without touching those edits. Even a short answer needs a small file-backed audit when the native hook is active. It may use one criterion and a saved answer note as evidence, but must account for any ongoing implementation rather than erase it. This administrative cost is a known limitation of a deterministic hook that cannot infer user intent.

## Runtime hooks and limits

The repository's `.codex/hooks.json` configures synchronous `UserPromptSubmit`, `Stop` and `Interrupt` hooks. When a valid current receipt is absent, Stop asks the active agent to audit, fix and continue. It does not call an API, generate art, spawn another conversation, or execute the repair commands itself. The next Stop evaluates the receipt again; `stop_hook_active` is not a blanket exemption. An interrupt invalidates a pending receipt and cannot be prevented by the hook.

Hooks are a backstop. The agent must run the loop before attempting to stop, even where hooks are unavailable. Malformed records block with repair instructions. An environmental runtime/script failure reports that automatic enforcement is unavailable and requires the instruction-based audit; it is never a quality pass. The script enforces record structure, evidence freshness and unresolved-work state. It cannot determine whether an agent honestly inspected an image or whether a visual assessment is correct. Direct inspection, evidence and independent challenge remain essential.

Current [official hook documentation](https://learn.chatgpt.com/docs/hooks) defines project hooks and Stop continuation behavior. It also requires the user to review and trust each non-managed hook definition before execution. Project trust alone is insufficient. Review this repository's hooks with `/hooks` in the Codex CLI; changed definitions require renewed trust. Do not alter trust records or use a trust-bypass flag to claim activation. This checkout's installed binary supports hooks, but live dispatch/trust must be verified separately from testing the script. No timed automation or guaranteed background execution is implied.

### Verified Windows setup and linked worktrees

On September 28, the installed `codex-cli 0.158.0-alpha.2.1` loaded hook definitions for linked worktrees from the primary checkout, `C:/dev/src/Xalians/.codex/hooks.json`. A hook file present only in a worktree was not discovered. The root checkout was older than the merged hook PR. Adding the merged hook definition and script there fixed discovery in both locations without changing existing tracked edits. `.codex/.gitignore` keeps local audit receipts out of Git even in an older checkout.

The read-only `hooks/list` results are saved in `completion-hook-discovery-evidence.json`: both locations report the same three root-sourced hooks, with identical keys and hashes, all awaiting trust. Interactive startup independently displayed "3 hooks are new or changed." This establishes discovery and the review screen, not actual hook dispatch. No trust setting was changed.

The desktop-bundled executable needs `--no-daemon` when used directly because it lacks a complete standalone daemon package. Its version-specific path can change after desktop updates. The tested command for this installation is:

```powershell
& "C:\Users\njord\AppData\Local\OpenAI\Codex\bin\faa963e871dd422c\codex.exe" --no-daemon -C "C:\dev\src\Xalians"
```

At startup, select **Review hooks**. The three events are UserPromptSubmit, Stop and Interrupt. The source should be the primary checkout's `.codex/hooks.json`; review the local Python command before trusting it. After trust, a fresh session still needs an observed prompt/Stop/Interrupt exercise before claiming automatic enforcement works. Do not make the user diagnose installation or discovery problems. Do not auto-pull, reset or stash a dirty primary checkout to install these files.

## Applied to Akinza

The [0020 audit](species-construction/akinza/quality-audit-0020.md) is an unfinished repair backlog, not a completed art milestone. Its findings are represented in the task audit with status `open`; checking or sealing that record must return CONTINUE. Geometry work must address the head/ear/face method first, then trunk and joints, then paws and retained tail architecture, with whole-creature regression checks throughout. Layers 3/4 remain open, layer 5 fails quality, and the export experiment cannot close layer 6.

The workflow-system implementation has its own audit. Completing that explicit new request must not mark Akinza complete or claim that the mechanism has fixed the creature. Resume the recorded creature work when that is the active task; the backlog and evidence survive across sessions.
