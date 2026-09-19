# Site audit remediation run log

Brief: docs/design/site-audit-brief-2026-09-18.md. Kickoff: docs/design/site-audit-kickoff-2026-09-18.md. One row per issue. States: todo, building, review, fixing, merged, verified, deferred. Update this file before and after every wave step; it is the resume point after a context reset.

Started: (date)
Baseline tests on main: (result and date)
Before screenshots: untracked/site-audit/before/report.md

| Wave | Issue | Title | Files owned | Branch | PR | State | Critic | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | #423 | Reading Room auto-scroll | EraScrubber.js, Bestiary.js | | | todo | | |
| 1 | #424 | Not-found pages | status.tsx, notFoundPage.tsx, userDetailsPage.tsx | | | todo | | |
| 1 | #430 | Per-route titles, theme-color | components/system head hook, every page, index.html | | | todo | | |
| 2 | #425 | Serial on previews | RecordView.tsx (Serial row) | | | todo | | |
| 2 | #426 | Arcade meter | arcadePage.tsx, arcade/progress.ts | | | todo | | |
| 2 | #427 | Search snippets | lore/search.js | | | todo | | |
| 2 | #428 | Story part fixes | Story.js, chapter label helper | | | todo | | |
| 2 | #429 | Continue the story | WorldView.js, SpeciesView.js (foot) | | | todo | | |
| 2 | #431 | Copy pass | content JSON, WorldView.js:49, RecordView.tsx:254, signUpModal.tsx | | | todo | | lore fact-check required |
| 3 | #433 #434 | Footer and nav | navbar.tsx, App.js, site-footer.tsx, deploy-frontend.yml, styleguide | | | todo | | one PR |
| 3 | #432 | Home orientation | home.tsx | | | todo | | |
| 3 | #435 | Reading Room | ReadingRoom.js, StoryContents.js, Story.js sidebar, EraScrubber.js, GalaxyMap.js | | | todo | | legend is lore |
| 3 | #436 | Generator | generatorPage.tsx, RecordView.tsx (body) | | | todo | | |
| 3 | #437 | Records for readers | SpeciesView.js, WorldView.js folds, Bestiary.js | | | todo | | |
| 3 | #439 | Auth | components/auth, utils/authUtil | | | todo | | |
| 4 | #438 | Vocabulary | term.tsx, RecordView.tsx labels, SpeciesView.js labels, TrailStrip.js | | | todo | | |
| 4 | #440 | Layout balance | RecordView.tsx layout, SpeciesView.js rail, Powers.js | | | todo | | |
| 4 | #441 #442 #445 | Grids, silhouettes, skip link, mobile nits | home.tsx, Worlds.js, navbar Shell | | | todo | | one PR |
| 4 | #443 | No Earth anywhere | WorldView.js stats, planets.json, lore.integrity.test.js | | | todo | | |
| 4 | #444 | Core entry articles | encyclopedia.json, EntryView.js | | | todo | | lore-voice then fact-check |

## Open problems

(none yet)

## New issues filed during the run

(none yet)
