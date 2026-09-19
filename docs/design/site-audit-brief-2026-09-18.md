# Site audit remediation brief (2026-09-18)

Written for: the Opus orchestrator that will run this program, and the implementation agents it spawns. Nick is the owner; he reads results, not process.

## 1. Mission

Close GitHub issues #423 through #445 on `nickcjordan/Xalians`. Each issue is one proposal from the first-visitor site audit in `docs/design/site-audit-2026-09-18.md`. This brief is the design authority for that work: every copy decision, layout decision and vocabulary decision is made here so that implementation agents build rather than decide. Where this brief says "verify" or "confirm", the agent reads the named source and reports what it found in the PR body; it does not guess.

Scope is the non-game site: home, generator, the encyclopedia and its sub-pages, account, trade, not-found states, the navbar, and the arcade hub as a landing page only. Do not touch the games (Duel, Reclamation, Long Return, Powerworks, the five arcade games) except where an issue names a game route for exclusion.

## 2. Ground rules (read before any work)

Repository conventions, all of them enforced by hooks, tests or Nick:

1. Base every branch on `origin/main`. Name branches `audit/<issue>-<slug>`. One PR per issue, except #433 and #434, which share App.js and ship as one PR ("Fixes #433, Fixes #434").
2. Every PR opens ready (never draft) with a full description: what changed, why, before and after screenshots at 1440 and 390 for anything visual, tests added, and `Fixes #N`. Immediately after opening run `gh pr merge <n> --auto --merge`. Never hand a merge to Nick. Merging deploys the frontend automatically.
3. Commit messages carry no `Co-Authored-By` trailer. A pre-commit hook rejects it. Nick is the sole author of record.
4. No em dashes anywhere: not in UI strings, content JSON, docs, PR bodies, or commit messages. American English. No dramatic sign-off sentences in lore.
5. Design system: read `docs/DESIGN_SYSTEM.md` sections 1, 2 and 10 before touching a component. Chrome pages set `data-tier="chrome"`. No raw hex in chrome files; colors come from tokens, and the token layer exists twice on purpose (CSS and `designTokens`), guarded by a pairing test. Anything pressable has solid diagonal mass; anything read-only is flat. One primary key per screen. New components under `components/system` or `components/ui` must appear on `/styleguide` or `systemGuards.test.js` fails.
6. Content JSON lives in `packages/content/json`. Some files are generated from others (see `scripts/bundleLore.js`, `scripts/buildCodex.js`); edit the source and regenerate, never both copies by hand. Species records and planet records are the sources for the encyclopedia; check `packages/content/json/*.json` headers and the bundle scripts before editing prose that appears in two files.
7. Any lore text (era blurbs, chapter sentences, map legend, entry articles, any UI copy that states a fact about the galaxy) passes the `lore-factcheck` skill at `.claude/skills/lore-factcheck/SKILL.md` before commit. The PR body carries the fact-check summary: claims checked, unsupported claims found, what was rewritten. Nick does not fact-check lore; this gate replaces him. Keep the lore structural tests green (`apps/web/src/lore/__tests__`).
8. Tests: `npm ci` at the repo root (npm workspaces), then `npm test -- --run` in `apps/web` and the content package tests. CI runs "Build frontend" and "Content package" on every PR; both are required checks. Typecheck runs in CI too.
9. Never run `aws s3 sync` or `terraform apply`. CI deploys.
10. Findings outside the current issue become new GitHub issues immediately, labeled with one of P1, P2, P3 plus a type plus an area, per `docs/BACKLOG.md`. Do not park them in chat.
11. Every ratified creature-system rule is a tuned lever. If a fix forces something absurd, report the case and the smallest change in the PR body and stop on that item rather than working around it silently.

## 3. Verification by paint

No visual PR is done until it has been looked at. The Chrome DevTools MCP profile is often locked by another session; the reliable path is playwright-core with the installed Chrome. Install once in a scratch directory (never in the repo):

```js
// verify.mjs  (node verify.mjs http://localhost:3000/encyclopedia)
import { chromium } from 'playwright-core';
const url = process.argv[2];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [name, ctx] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['laptop', { viewport: { width: 1100, height: 800 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const context = await browser.newContext(ctx);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const facts = await page.evaluate(() => ({
    title: document.title,
    scrollY: window.scrollY,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    h1: document.querySelector('h1')?.innerText,
    height: document.documentElement.scrollHeight,
  }));
  await page.screenshot({ path: `shots/${name}-${url.replace(/[^a-z0-9]+/gi, '_')}.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
  console.log(name, JSON.stringify({ ...facts, errors }));
  await context.close();
}
await browser.close();
```

A screenshot under about 20 KB means the React tree crashed, not that the page is empty. Run the dev server from `apps/web` with `npm run dev` (port 3000). After a PR merges, re-run the same script against `https://www.xalians.com<route>` once the deploy lands (the bundle hash in the served index.html changes); the deployed site is what Nick judges.

## 4. Orchestration plan

Model choice: implementation agents run on Sonnet. The orchestrator (Opus) reads this brief, owns the plan, reviews every diff, runs verification, and decides merges. A separate Sonnet critic that changes no files scores each PR against the issue's acceptance criteria and the copy in this brief, returning pass or fail per criterion with the evidence line; the orchestrator merges only on all-pass and otherwise sends the diff back with the failing criteria. The builder never grades itself.

Keep a run log at `untracked/site-audit-run.md` (the `untracked/` folder is gitignored): one row per issue with branch, PR, state, critic result, open problems. Resume from it after any context reset.

Give each agent its own git worktree (`git worktree add C:/dev/src/xalians-audit-<n> -b audit/<issue>-<slug> origin/main`). Stale Vite processes hold worktree directories open on Windows; clean up with `npm run wt` at the repo root, never with `rm -rf`.

Waves. Inside a wave the agents run in parallel and own disjoint files; the next wave starts after the previous wave's PRs have merged and main has been re-fetched.

Wave 0, orchestrator alone: read this brief, the audit, `CLAUDE.md`, `docs/DESIGN_SYSTEM.md`, `docs/BACKLOG.md`. Confirm `npm test -- --run` passes on main. Set up the verification script and the run log. Run the verification script against the deployed site for `/`, `/generator`, `/encyclopedia`, `/encyclopedia/worlds/magmuth`, `/encyclopedia/species/graviclaw` and keep those shots as the "before" set.

Wave 1 (three agents, disjoint files): #423 (EraScrubber.js, Bestiary.js), #424 (status.tsx, notFoundPage.tsx, userDetailsPage.tsx), #430 (new hook in components/system plus one call per page; index.html).

Wave 2 (six agents): #425 (RecordView.tsx Serial row only), #426 (arcadePage.tsx, arcade/progress.ts), #427 (lore/search.js), #428 (Story.js and the chapter-number helper), #429 (WorldView.js and SpeciesView.js foot only), #431 (content JSON, WorldView.js line 49, RecordView.tsx line 254, signUpModal.tsx helper; lore fact-check for the blurbs and the Phantiri sentence).

Wave 3 (six agents): #433 with #434 (navbar.tsx, App.js, new SiteFooter, deploy-frontend.yml, styleguide section), #432 (home.tsx), #435 (ReadingRoom.js, StoryContents.js, Story.js sidebar counter, EraScrubber.js caption, GalaxyMap.js legend), #436 (generatorPage.tsx, RecordView.tsx body), #437 (SpeciesView.js, WorldView.js folds, Bestiary.js), #439 (components/auth, utils/authUtil).

Wave 4 (five agents): #438 (Term component, RecordView.tsx and SpeciesView.js labels, TrailStrip.js), #440 (RecordView.tsx layout, SpeciesView.js rail, Powers.js), #441 with #442 with #445 (home.tsx, Worlds.js, navbar Shell skip link), #443 (WorldView.js footnote), #444 (encyclopedia.json articles, EntryView.js; lore-voice skill then lore-factcheck).

Wave 5, orchestrator alone: re-run the verification script on every audited route against the deployed site, compare with the Wave 0 shots, confirm each issue auto-closed, and write the final report (section 8).

## 5. Specifications and copy, by issue

Every string below is final unless marked "verify". Do not paraphrase strings.

### #423 Reading Room auto-scroll

Root cause: `apps/web/src/components/encyclopedia/EraScrubber.js` lines 34 to 42 call `scrollIntoView({ block: 'nearest', inline: 'center' })` on mount. With the rail below the fold that scrolls the document. `Bestiary.js` lines 53 to 61 repeat the pattern on the element row.

Fix: a small helper `centerInRail(rail, el)` that sets `rail.scrollLeft = el.offsetLeft - (rail.clientWidth - el.offsetWidth) / 2` only when `rail.scrollWidth > rail.clientWidth`, called from both effects. No scrollIntoView on mount anywhere in the encyclopedia. Add a jsdom test that renders EraScrubber and asserts `Element.prototype.scrollIntoView` is not called. Verify by paint: `/encyclopedia` at all three widths reports `scrollY: 0`.

### #424 Not-found pages

`NotFoundPage` in `components/system/status.tsx`:

- eyebrow: `Not found`
- h1: `Nothing at this address`
- body: `There is no record at this address. Check the link, or start from one of these.`
- beneath the h1, the requested path in `type-data text-small text-ink-3` with `break-all`
- keys unchanged: `Go home` (primary), `Open the encyclopedia`

`/user/:id` not found: eyebrow `Account`, h1 `No account by that name`, the requested name beneath in the same style, one key `Go home`. The encyclopedia catch-all ("No record at this address.") and the Xalian record not-found state stay as they are.

### #425 Serial on previews

`RecordView.tsx` line 203: render the Serial row only when the record is owned. Use the same condition that selects the "Unowned preview" eyebrow. Test both states in `components/record/__tests__`.

### #426 Arcade meter

`arcadePage.tsx` line 50: show `cap - earnedToday` (both from `arcade/progress.ts`; never a literal 100) with the label `Credits to next token`. When the remaining figure is 0: `Token ready` for a signed-in player, and for a signed-out visitor keep the figure with the existing note that tokens are for signed-in players. Give the progressbar `aria-valuetext` of `<earned> of <cap> credits`.

### #427 Search snippets

`lore/search.js` line 74: `text: paragraph.summary`, and add `aliases: planetNames.get(paragraph.planet) || paragraph.planet` to the paragraph document so world-name queries still hit chapters. Extend `lore.search.test.js`: a chapter snippet for "kozrak" ends with a letter or punctuation, not a lowercase world key; searching "zolton" returns at least one paragraph document.

### #428 Story part fixes

- Records consulted (Story.js line 40): dedupe by display name; when a world and an entry share a name keep the world link.
- Fixed points count (line 235): count points, not groups.
- Every fixed point title is an h4 (the first group's item currently renders as plain text).
- Chapter numbers: one helper `chapterLabel(index)` returning `Ch. 01` style with index plus one, used by the story margin notes, fixed point citations, entry excerpts, search result titles and the world page. Anchors keep their zero-based ids. Add a test that the helper and the world page agree.

### #429 Continue the story

`WorldView.js` lines 135 to 150 and `SpeciesView.js` lines 46 to 60. With reading progress: keep `Continue the story` and the furthest part. Without progress: term `This world in the story` (species: `This species in the story`, resolved through the home world) and the link text `Part N, <era name>` for the first era that names the world, from the same data as the In-the-story chips. Tests for both branches on Magmuth (expect The Age of Unbirth) and Telypso (expect The Deep Past).

### #430 Titles

New hook `usePageTitle(title, description?)` in `components/system/a11y.tsx` or a new `head.ts`: sets `document.title` to `<title> · Xalians` (home passes nothing and gets `Xalians`), sets `meta[name=description]` when given, restores both on unmount. Titles:

| Route | Title |
|---|---|
| `/` | Xalians |
| `/generator` | Generate a Xalian |
| `/encyclopedia` | Reading Room |
| `/encyclopedia/story` | The Story |
| `/encyclopedia/story/:era` | Part N: <era name> |
| `/encyclopedia/worlds` | Worlds |
| `/encyclopedia/worlds/:key` | <World name> |
| `/encyclopedia/species` | Bestiary |
| `/encyclopedia/species/:key` | <Species name> |
| `/encyclopedia/powers` | Powers |
| `/encyclopedia/index` | Index |
| `/encyclopedia/index/:key` | <Entry name> |
| `/account` | Your account |
| `/user/:id` | <Username> |
| `/xalian/:id` | <Xalian species name> record |
| `/trade/new`, `/trade/:id` | Propose a trade, Trade |
| `/arcade` | Arcade |
| not found | Not found |

`index.html`: description `Xalians are creatures grown for dying worlds. Generate one, read its world, and play it in the games.`; `theme-color` `#191816`, which is the value of the level 0 surface token (verify in `docs/DESIGN_SYSTEM.md` section 2 and keep the token pairing test green; if the test objects to a hex in index.html, add the pairing).

### #431 Copy pass

1. Typos: `flourescent` to `fluorescent` (Telypso terrain, find with grep across `packages/content/json`); `replate` to `replete` and `overtime` to `over time` in the Magmuth history; `Rogueish` to `Roguish` in encyclopedia.json and glossary.json. Edit the source file and regenerate any bundle.
2. `WorldView.js` line 49: `${low} to ${high} °C`.
3. Em dashes: `RecordView.tsx` line 254 becomes the caption in #436; the sign-up helper becomes `Must be unique. Letters, numbers, hyphens and underscores.`; the Generator survey readout replaces each ` — ` with `: `. Then planets.json: rewrite every sentence that uses an en dash (44) or a spaced hyphen (4) as a dash, using a comma, period or colon. Add to `lore.integrity.test.js`: no `—` anywhere in content JSON prose fields, and no ` – ` or ` - ` in planet histories.
4. Reading Room: delete the paragraph under the map that begins `Every record the Generator has on the galaxy it serves.` (#435 replaces it with the legend).
5. Era blurbs in `packages/content/json/chronicle.json`, field `definition`, exact text:
   - deep-past: `Everything before the Vallerii left their homeworld. Known only through ruins, rumor, and sealed records.` (unchanged)
   - ascendancy: `The Vallerii leave their homeworld on Tachyon Drives and colonize Xalia world by world, building the industry that runs on it. Thousands of years pass before the first Xalian exists.`
   - unbirth: `Radiation from the Tachyon Drives leaves the Vallerii sterile. To replace the labor they can no longer breed, they invent the Xalian Generator: first the Genesis Prototype on Floria, then a first wave of Generators across seven worlds. The sterility never lifts. The era ends when Generators are common.`
   - generation: `With Generators everywhere, the corporations boom: megaprojects, black sites, and a stolen prototype Generator on Endessa. The company wars begin on Magmuth, and a secret Generator goes to Phantiri. The era ends when the APEX Accords are signed.`
   - accords: `The Accords place every Generator under APEX, linked by QED. APEX arrives on each world to regulate. The company wars go on regardless, until the Magmuth Massacre. Months later, APEX turns.`
   - end-wars: `APEX turns on the Vallerii, and Xalian armies fight on both sides. Source Code 606 cuts APEX off from the Generators, the Battle of Grimedes drives it into the dark between the galaxies, and it leaves the Nemesis Plague behind.`
   - present: `The Plague has killed the Vallerii and now threatens the Xalians. One of the last Vallerii, King Kozrak, holds the Mercurius Machine, the only source of Scrambler Tokens, and pays them out to the winners of his arena tournaments. The era holds each world's present state.`
   These are lore. Run the fact-check; if the checker flags a sequence claim in end-wars, prefer the ordering in `docs/design/xalian-chronicle.md` and rewrite to what the sources support.
6. Phantiri chapter 02 (the paragraph that reads `But the discovery of Shadharam IV would forever change that narrative.`): replace the sentence with `The discovery of Shadharam IV would overturn the Vallerii belief that they were the first intelligent life in Xalia.` Supported by Phantiri chapter 04 ("They were not Xalia's first instance of intelligent life"). Edit the source file, regenerate bundles, fact-check.

### #432 Home orientation

`home.tsx` lines 63 to 140.

- Remove the `Xalia` eyebrow. Above the existing lore paragraph, a lede in `font-body text-lead text-ink` (use the largest body role the type system has): `Xalians is a world of generated creatures. Generate one, read the world it comes from, and play it in the games.`
- Keep the h1 `Creatures grown for dying worlds` and the existing lore paragraph as the second paragraph in `text-ink-2`.
- Worlds section: h2 `Fourteen worlds` (type-heading) and a caption `Every Xalian is grown for one of them. Open a world for its history and its native species.` Keep `aria-label` off the section once the heading exists (the heading labels it).
- Species strip: h2 `From the bestiary` and caption `Species silhouettes from the record plates. Open one to read its record.`
- Directory: keep the row layout. Rows in nav order with a group label row `Play` (type-legend) before the games. Link text per row: Generator `Generate`, Encyclopedia `Read`, each game `Play`. Descriptions: keep the existing five. Expedition and Powerworks: take the one-line description from the game's own start page or its design doc under `docs/design` (search for long-return and powerworks); if neither has one, write one sentence from the game's rules and quote the source in the PR body.
- Hero lockup link: `aria-label="Xalians"`; the split wordmark text spans `aria-hidden="true"`.

### #433 and #434 Footer and nav

Navbar (`navbar.tsx`):

- `NAV_LINKS`: Home `/`, Encyclopedia `/encyclopedia`, Generator `/generator`.
- `PLAY_LINKS`: Duel `/duel`, Reclamation `/reclamation`, Expedition `/long-return`, Powerworks `/powerworks`, Arcade `/arcade`. Each carries a `tagline` string, the same one-liner the home directory uses.
- Desktop: after Generator, a `Play` trigger styled exactly like a nav link plus a 14px chevron, opening a shadcn `DropdownMenu` with five items (name in the nav link style, tagline beneath in `text-small text-ink-2`). The trigger gets `aria-current="page"` when the pathname starts with any play href. Keyboard: Enter or Space opens, arrows move, Escape closes and returns focus.
- Breakpoint: replace every `min-[1180px]` with `min-[900px]`. Verify by paint at 900 and 960 that the bar, the four links and both auth keys fit without wrapping.
- Mobile sheet: the three links, then a `type-legend` row `Play`, then the five games.
- Update `navbar` tests for the new structure.

Footer (`components/system/site-footer.tsx`, tier chrome, surface `s0`, top border `edge`, added to `/styleguide` and to the `systemGuards` inventory):

- Left: the small brand lockup and the line `Xalians is a world of generated creatures, the archive of the worlds they come from, and the games that use them.`
- Three columns, each headed with a `type-legend` label:
  - `Explore`: Reading Room `/encyclopedia`, The Story `/encyclopedia/story`, Worlds, Bestiary, Powers, Index.
  - `Make`: Generator `/generator`, Your account `/account`, Propose a trade `/trade/new`.
  - `Play`: the five games from `PLAY_LINKS`.
- Bottom row: `Build <sha7>` in `type-data` (from `import.meta.env.VITE_BUILD_SHA`, fallback `dev`) and `© 2026 Xalians`. No contact details; do not invent an email or a repository link. If Nick wants a contact link he adds it.
- Rendered once from `App.js` below the routes, hidden on immersive routes: pathname starting with `/duel`, `/reclamation`, `/long-return`, `/powerworks`, or matching `/arcade/<game>` (the `/arcade` hub keeps the footer).
- `deploy-frontend.yml`: add `VITE_BUILD_SHA: ${{ github.sha }}` to the build step's env.
- Phone: columns stack; touch targets at least 44px tall.

### #435 Reading Room

- Section rows replace the four panels. Each row is one link: name (`type-legend`), copy (`text-small text-ink-2`), live count (`type-data`), chevron. About 56px tall, full width, border-b `edge`. Copy:
  - Worlds: `Every world, with its history, terrain and native species.`
  - Bestiary: `Every species, with appearance, habitat, behavior and signature ability.`
  - Powers: `The Vallerii, the factions, and the peoples of each world.`
  - Index: `Every named thing in the archive, alphabetized.`
  Counts stay computed from data as they are now.
- Remove the Contents section (`ReadingRoom.js` lines 109 to 110 and the import). In the Begin card, beside the primary key, a text link `Or open the contents` to `/encyclopedia/story`.
- `StoryContents.js` line 62 and the part sidebar in `Story.js` (line 312): render the read count only when it is greater than zero.
- Under the map, replacing the deleted paragraph, one line in `text-small text-ink-2`: `Fourteen worlds, colored by element. The dotted orbit is the Cybele system, the shattered family of worlds that left Stonera alone. Wraithix is the system that holds Phantiri and the derelict fleet found there.` This is lore: fact-check it against the Deep Past sources (Phantiri chapters 03 and 04, Stonera chapter 01, the GalaxyMap.js header comment).
- Under the era scrubber, one caption in the same style: `Pick an era to light the worlds that appear in it.` Verify that the scrubber does light worlds (the footprint code in EraScrubber.js) before shipping the sentence.

### #436 Generator

`generatorPage.tsx` and `RecordView.tsx`.

- Eyebrow `Generator`; h1 `Generate a Xalian`.
- Subline, signed out, Commoner range: `Preview everyday Xalians without saving them. Sign in to keep the next one.` Full spectrum: `Preview the full range of Xalians without saving them. Sign in to keep the next one.` Signed in: keep the current signed-in copy.
- Generation range panel, `PROFILE_COPY` summaries:
  - Commoner: `The everyday range: one element, a standard finish, common traits. What most Xalians are.`
  - Full spectrum: `The whole range: rare finishes, a second element, and rare traits can all turn up. Everything the Generator can print.`
  - trailing sentence: `Applies to the next Xalian you generate.`
- Header key: `Generate a Xalian` before the first record, `Generate another` after. The only button on the page whose text starts with Generate.
- Not saved callout: body `Previews are not kept. This one disappears when you generate the next. Sign in and every Xalian the Generator prints for you is written to the registry under your name.` One key: `Sign in to generate`. Remove `Generate another preview`.
- Error toast (line 97): `The Generator did not answer. Try again.` Empty state (line 258): `Press Generate and the Generator prints one.`
- Print state: on click set `printing`; the header key reads `Printing`, is disabled and `aria-busy`; keep the state for at least 600 ms even if the API answers sooner; when the new record mounts, its container plays a 240 ms ease-out fade with an 8px rise. Under `prefers-reduced-motion: reduce`, opacity only, 120 ms. The existing live region announcement stays.
- Registry distinction: read `packages/rules/src/generator/grade.ts` and its test to confirm what `percentile` means. If a higher percentile means more distinctive (the record's distinction score exceeds that share of calibrated records), render `More distinctive than <N>% of records` with N the rounded percentile. If the direction is the reverse, N is 100 minus the percentile. State the direction and the evidence line in the PR body. Caption: `Distinction is how far this record sits from a typical print. It is not combat power.` When uncalibrated keep `Uncalibrated` with the caption `Not yet measured against calibrated records.`
- Seed row: spans the full header grid (`col-span-2` or the grid's equivalent), `type-data`, `whitespace-nowrap`, `overflow-hidden text-ellipsis`, `title` attribute with the full seed. Verify by paint at 390 that it stays on one line.
- Finish line (line 377): render only when `finish !== 'standard'`, keeping the existing sentence for other finishes.
- Under the record, a `RecordRow` with term `Use it`. Signed out or unowned: `Sign in to keep this Xalian, then field it in Duel, Reclamation and Expedition. Every game reads the same record.` Owned: `Field it in Duel, Reclamation and Expedition. Every game reads the same record.` The three names are links to `/duel`, `/reclamation`, `/long-return`.
- Under the Actions heading, one line in `text-small text-ink-2`: `Each line reads: how it fires, how it reaches, what it does, with which part, through which element. The word and number at the right are its intensity on a scale of 100.` Verify the intensity words in the code (Faint, Slight, Measured, Strong, Overwhelming were observed) and, if the scale differs, adjust the sentence to name the lowest and highest.

### #437 Records for readers

`SpeciesView.js`:

- Lead: under an h3 `In brief`, the record's lore teaser (confirm the field name in `packages/content/json/speciesRecords.json` under `lore`). Remove the legacy `view.description` block (line 271) from the species page; the description stays in data for the index entry.
- Order after the lead: Name origin, Appearance, Origin, Habitat, Feeding, Behavior, Company.
- Signature ability panel: after the six fields, an expander `What these mean` in the same pattern as the traits expander on the record, with these glosses (verify each against `docs/design/xalian-ability-model.md` and `docs/design/ability-specification-decisions.md`; correct any that the model contradicts and say so in the PR body):
  - Instrument: `The body part or channel the ability works through.`
  - Activation: `How it fires: a single discrete act, or ongoing while held.`
  - Delivery: `How it reaches its target: by contact, as a projectile, over an area.`
  - Effects: `What it does to the target.`
  - Medium: `The element it works through.`
  - Intensity: `Strength on a scale of 100. A species shows its range; one creature shows its number.`
- Folds: rename `Generator template` to `Record data` and (in `WorldView.js`) `Generator survey` to `Survey data`; both sit under a fold headed `For builders` with the note `Machine-readable data the Generator and the games use.` `Cross references` stays a sibling fold.

`Bestiary.js`: remove the Ratified toggle, its state (`ratifiedOnly`) and the filter branch.

Test: for every species, no sentence (normalized to lowercase, punctuation stripped) appears both in the lead and in Feeding or Behavior.

### #438 Vocabulary

- `components/system/term.tsx`: a `Term` component wrapping a label in a focusable element with a shadcn `Tooltip`; dotted underline in `ink-3`; the definition in `text-small`. Add it to the styleguide.
- Definitions come from `docs/species-templates/REGISTRY-DEFINITIONS.md` for corporeality, composition, body plan, covering, communication, breathes and ambient media, lifespan, chirality. Copy the doc's one-line meaning; do not paraphrase into something the doc does not say.
- Non-registry terms, exact text:
  - Registry distinction: `How far this record sits from a typical print of its species, measured against calibrated generations. Not combat power.`
  - Affinity: `The element or elements the creature works through, and how much of each runs through this record.`
  - Finish: `The surface treatment this record was printed with. Most are standard.`
  - Intensity: `Strength of the ability on a scale of 100.`
- Apply on `RecordView.tsx`, `SpeciesView.js` and `WorldView.js` wherever those labels render.
- `TrailStrip.js`: line 54 label `Recently viewed`; line 33 kind label `SECTION` instead of `BEAT`.

### #439 Auth

- Sign in dialog: under the password field a text link `Forgot password?` that switches the dialog to a reset flow: step one asks for the username and calls Amplify `resetPassword`; step two asks for the emailed code and a new password and calls `confirmResetPassword`; success returns to sign in with a toast `Password updated. Sign in with the new one.` Errors surface in the dialog in the existing field-error style.
- Sign in footer: `New here? Create an account.` (link swaps to the create-account dialog). Create account footer: `Already have an account? Sign in.`
- Password helper, shown before submit on both password fields: `At least 8 characters.` (Cognito policy in `cognito.tf`: minimum length 8, nothing else required.)
- `autocomplete`: `username`, `current-password` (sign in), `new-password` (create, confirm, reset), `email`, `one-time-code` (reset code).
- Tests in `components/auth` cover the cross-links, the helper text and the reset flow with the Amplify calls mocked.

### #440 Layout balance

- Record body (generator and record pages), at `lg`: a two-column grid where Affinity and Traits stack in the left column and Appearance sits in the right; Temperament spans both columns with its bars in a two-column grid.
- Species page at `lg`: move the Physiology block into the right rail under the signature ability panel; the main column is prose only.
- Powers page at `lg`: entries flow in two columns (`columns-2` with `break-inside-avoid` on each entry).
- Before and after screenshots at 1440 in the PR.

### #441, #442, #445 Grids, silhouettes, skip link, mobile nits

- `Worlds.js` line 24: `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` (drop the 3, 5 and 6 column steps; at `sm` fourteen tiles make three full rows of four plus two, which is acceptable at that width; at `lg` two rows of seven). Add the element chip under each name as the home tiles have.
- `home.tsx` line 82: `grid-cols-4 xl:grid-cols-7`; tiles shrink to fit the hero's right column.
- Species strip: the same plate frame the Bestiary tiles use (`RecordTile`), heading and caption from #432, and on phones a right-edge fade using the same `mask-image` technique as the galaxy map's phone rail.
- `Read the story` link on phones: remove the extra left padding so it aligns with the key above it.
- Skip link: render `Skip to content` once in the navbar `Shell` as the first focusable element, targeting `#main`; ensure every chrome page's `main` carries `id="main"`; remove the per-page copy on the Arcade hub. #344 covers the legacy game entry routes separately; leave those alone.

### #443 vs Earth

`WorldView.js` stats block: one footnote line under the stats in `text-small text-ink-3`: `Earth-relative figures are a reader aid; the archive itself has no Earth.` Nothing else changes. This is the applied recommendation; Nick can override.

### #444 Core entry articles

Six entries in `packages/content/json/encyclopedia.json`: `vallerii`, `apex`, `king-kozrak`, `xalian-generator`, `scrambler-tokens` (confirm key), `nemesis-plague`. Add an `article` field: three paragraphs, 60 to 110 words each, written with the `lore-voice` skill from `planets.json` histories, `chronicle.json` and existing entries only. Constraints: no new facts, no dates, no resolution of the ancient-presence thread, no em dashes, American English, plain present-tense final sentence with no flourish. `EntryView.js`: render the article between the definition and In the story, as `Prose`. Run the structural lore tests and the `lore-factcheck` skill; attach the report. If an article cannot reach three supported paragraphs, ship two and say so.

## 6. Critic checklist (used by the reviewing agent on every PR)

1. Every acceptance criterion in the issue has a line of evidence (test name, screenshot path, a11y tree excerpt).
2. Every string in section 5 for this issue appears verbatim in the diff, or the PR body explains why the source contradicted it.
3. No em dash, no `lever`, no `pull` (as a noun), no `Ratified`, no `Trace`, no `BEAT` in visitor-facing text introduced or touched by the diff.
4. Screenshots at 1440 and 390 attached for visual changes; no horizontal overflow; no console errors; screenshot files above 20 KB.
5. Tests added or updated as the issue requires; `npm test -- --run` green; typecheck green.
6. No raw hex in chrome files; new components on the styleguide; `data-tier` present.
7. Lore text carries a fact-check summary in the PR body.
8. `Fixes #N` present; auto-merge enabled; no `Co-Authored-By`.

## 7. Known traps

- The primary checkout at `C:/dev/src/Xalians` is a stale branch. Work from worktrees cut from `origin/main`.
- `apps/web/src/json`, `constants` and `gameplay/attackCalculator.js` are build-time copies; edit sources in `packages/content` or `lambda` and let the copy script run.
- Vite's JSX-in-.js loader, the CommonJS shim and the jsx-in-js plugin are in `apps/web/vite.config.js`; do not add a second mechanism.
- The Chrome DevTools MCP browser is often locked by another session; use the playwright-core script.
- On Windows, a dead Vite or esbuild process locks its worktree; `npm run wt` at the repo root stops them and prunes.
- A screenshot under 20 KB is a crash.
- Nick's browser runs Dark Reader; if he reports a color that looks wrong, ask for an incognito check before treating it as a bug.

## 8. Final report to Nick

One message, in this order: the list of merged PRs with issue numbers; anything not shipped and why; the fact-check outcomes for every lore change (claims checked, rewritten, cut); the before and after screenshot pairs for home, generator, Reading Room, one world and one species, published where Nick can open them (an Artifact page with the images inline, never file attachments); new issues filed during the work; and the state and next-step lines. Keep it under a page.
