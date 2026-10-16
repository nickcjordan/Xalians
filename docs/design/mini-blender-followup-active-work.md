# Mini Blender follow-up work record

## Intended outcome and authorized scope

Nick approved all three parts of `mini-followup.md` on 2026-10-16:

1. Raise mini compute to up to eight CPUs and about 6 GB per Blender job, retain low priority and CI precedence, rerun the same Akinza comparison and publish the new measurements.
2. Add safe command-only inference and automatic spillover to the slot tool on this branch. Infer Blender inputs, local imports, named configuration files and output folders. Log why inference is unsafe and wait locally in those cases. Do not edit the creature-pipeline worktree. Prove a real command-only Akinza job spills while the local slot is held; document exact adoption instructions.
3. Recheck Messages iCloud sync on the mini. If enabled, delete nothing and report. If disabled, close Messages and clear message databases, attachments and conversation archives, preserving preferences and account sign-in. Record disk space before and after. Report any concrete privacy blocker.

## Completion criteria

- Increased installed caps with CI priority and unchanged CI VM configuration.
- Same real fur job measured for pixel difference, time and peak RSS.
- Conservative, tested command inference and local fallback, adopted only in this branch's slot copy.
- Real busy-slot command-only remote proof.
- Authorized Messages deletion verified, or precise sync/privacy blocker established.
- Updated guide, independent scoped review, passing follow-up audit, explicit-path commits and auto-merge PR.

## Initial evidence

- Initial worktree was clean. PR #814 merged during the follow-up (2026-10-16T13:49:18Z). Fast-forwarded this branch to that merge; publish a follow-up PR.
- Existing compute VM is 3 CPUs/4 GiB; the separate CI VM remains 10 CPUs/8 GiB. No active compute container at start.
- Messages.app is not running. SSH can list `~/Library/Messages` and Attachments. The CloudKit key is absent from the two initially queried defaults domains, so no deletion is authorized until its actual stored value is located and verified.
- Initial filesystem available space: 52,349,536 KiB. History includes current and older chat.db databases, Archive, Drafts and attachment/cache folders. No message contents have been read.

## Completed implementation and evidence

- Found the authoritative `com.apple.madrid.plist` CloudKitSyncingEnabled flag, false. Closed/stopped only Messages persistence holders, removed history databases and per-conversation contents, and verified empty Attachments, Archive and Drafts. Preferences are byte-identical; sign-in configuration was not modified. Free space rose from 52,540,493,824 to 98,696,671,232 bytes. Aggregate evidence: `mini-blender-followup-evidence/messages-cleanup.json`. No message contents exported.
- Resized only Colima compute to 8 CPUs/6 GiB. Installed eight-thread image and 5632 MiB container cap, equal swap cap, nice 15 and unchanged CI yield behavior. The CI VM remains 10 CPUs/8 GiB. Live process/container evidence: `mini-blender-followup-evidence/installation.json`.
- Added command-only inference and private drive mirroring, recursive local Python/config discovery, explicit outputs, resource preflight and reasoned local fallback. Copied and modified only this branch's slot file. Other worktrees were not edited. `mini-blender-slot-adoption.patch` changes only cmd_run; the guide supplies exact helper/patch adoption commands.
- Independent review identified aliased process calls, cwd resources, package children, sequence assets, stateful output modes, empty directories and loader calls. Corrections and focused regressions now cover each, including the final stateful Path-method audit. Full WSL suite: 37 passing tests; Windows: 25 passing and 12 POSIX-only skips. A real unsafe command logged the inline-Python reason and followed local timeout (exit 3), with no mini job launched.

## Next unfinished action

The exact snapshot Akinza render is running through a command-only busy-slot invocation. Record its time, peak RSS and decoded pixel comparison, finish real container lifecycle/preflight checks, then complete independent review, follow-up audit and auto-merge publication.
