# Site audit harness

Tools for the remediation program in `docs/design/site-audit-brief-2026-09-18.md`. Everything here is run from the repo root.

## verify.mjs

Verification by paint. Loads routes in the installed headless Chrome at desktop (1440), laptop (1100) and phone (390, mobile emulation), records title, scroll position on load, horizontal overflow, crashes, console errors, failed requests, broken images, placeholder text, the word Earth, and em dashes, and saves full-page screenshots plus `report.md` and `data.json`. Exit code 1 on any crash, overflow or near-empty screenshot, so it works as a gate in a PR checklist.

```
node scripts/audit/verify.mjs                                    # the audited route set against www.xalians.com
node scripts/audit/verify.mjs --base http://localhost:3000        # against a local dev server (npm run dev in apps/web)
node scripts/audit/verify.mjs --routes /encyclopedia,/generator   # specific routes
node scripts/audit/verify.mjs --widths desktop,phone --out untracked/site-audit/after
```

Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`; override with `--chrome <path>` or `CHROME_PATH`. Output defaults to a timestamped folder under `untracked/site-audit/shots/`, which is gitignored. Screenshots are evidence for PR bodies; attach them there, never commit them.

## run-log.template.md

Copy to `untracked/site-audit-run.md` at the start of the program and keep it current: one row per issue with wave, branch, PR, state, critic verdict and open problems. The orchestrator resumes from this file after a context reset.
