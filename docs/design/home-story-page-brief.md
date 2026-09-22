# Home page brief: the story front door (2026-09-22)

Written for: the agent building or revising `/` on xalians.com, and Nick as the owner who judges it live.

## 1. Context

The home page before this brief was an overview: a headline, two agent-written paragraphs, a grid of the fourteen worlds, a species strip and the site directory. It explained everything and intrigued no one. Nick asked for a first-visit experience that draws a stranger in, tells them what the site is, and gives an easy path into the universe, with one fixed sample creature rather than a fresh generation per visit.

The direction was settled in a seventeen-round demo (2026-09-21 to 22) that Nick judged on his own monitor. Two decisions came out of it and this brief records them so they are not re-litigated.

**The words are Nick's.** Every agent-written headline and lede was rejected as "robotic". Glossary definitions pasted as headlines were rejected just as hard. The copy that works is the front page Nick wrote himself in 2022 (`git show 1285604e:my-app/src/pages/home.js`, lines 462 to 525): three sections headed "The Story", "The Galaxy of Xalia" and "The Tournament & Tokens", the splash button "Try the Generator" and the splash line "Start generating now...". The page quotes that text and his 2021 species entry for the sample creature. It adds nothing in the world's voice. Interface text (button labels, captions, the account note, game taglines) is plain and stays out of the lore register.

**The look is spreads, not backdrops.** Full-bleed paintings behind glass cards were judged loud and then, when dimmed, merely small. What Nick approved is a sequence of spreads in the manner of a graphic novel: each pairs one framed painting with one of his paragraphs on a cream plate, and only the arrangement changes from spread to spread. The parts are identical throughout: one panel frame, one plate style.

## 2. Assumptions and decisions

| # | Assumption / Decision | Confidence | Supporting evidence |
|---|---|---|---|
| 1 | The old overview page is kept, unlinked, at `/overview` as a reusable page rather than deleted. | 85%, Nick said it "could be saved as a reusable page later" | conversation 2026-09-21; `apps/web/src/pages/overviewPage.tsx` |
| 2 | Three dash asides in the 2022 paragraphs become commas and one colon; "capitol" becomes "capital". No other change to Nick's text. | 95%, standing no-dash and American-spelling rules | `~/.claude/projects/.../no-em-dashes-american-english.md` |
| 3 | The two 2022 paragraphs about battle fees and teams of six are omitted: they describe a game that no longer exists. | 90% | `git show 1285604e:my-app/src/pages/home.js` lines 515 to 522 |
| 4 | The sample creature is one fixed record: Yetimoth, seed `home-sample-2`, generator 0.5.0, stored as JSON with the page. It never regenerates. | 95%, Nick: "just pick one and tell the story" | `apps/web/src/pages/home/specimen.json` |
| 5 | Section headings use `type-title` (40 px) rather than `type-heading` (24 px). The contract reserves title size for the masthead; the demo Nick approved used large section heads and they carry the graphic-novel feel. Reported as a lever. | 70% | `docs/DESIGN_SYSTEM.md` section 4; demo v15 to v17 |
| 6 | The plates carry no mint edge and the creature has no element glow. Both were in the demo; both break contract rules (accent never on decorative rules; nothing glows). Reported as friction. | 80% | `docs/DESIGN_SYSTEM.md` sections 3.1 and 5 |
| 7 | The slow zoom on paintings is dropped: the contract forbids loops. Plates get a single 320 ms entrance as they scroll into view, added to the motion catalog. | 90% | `docs/DESIGN_SYSTEM.md` section 7 |
| 8 | Two "Try the Generator" keys on one page: the hero's is the primary; the close's is `secondary`. One primary per screen. | 85% | `docs/DESIGN_SYSTEM.md` section 3.1 |
| 9 | Nick's 2022 text is quoted as written even where it compresses the histories. The fact-check gate reports the deltas; Nick rules on each rather than the agent rewriting his words. | 90%, Nick asked for his original words | `.claude/skills/lore-factcheck/SKILL.md`; PR body |

## 3. The page, top to bottom

All sections sit in a 1160 px column inside the Shell on desktop, twelve grid columns with 24 px gutters. Below 1000 px everything stacks to one column and plates overlap the panel above them by 28 px.

**Hero.** Left: the animated brand lockup (the existing splash morph), the sentence "Xalia is home to a wide range of powerful, bioengineered creatures originating from extreme worlds all across the galaxy.", the primary key "Try the Generator", and a text link "The Story" to `#story`. Right: a portrait panel (4:5) of the Krystos landscape with the Yetimoth silhouette standing in front of it, its feet breaking the bottom edge, and a small cream tag "A Yetimoth of Krystos" cutting across the panel's left edge. The whole art block links to `#specimen`. The existing starfield stays behind the hero band.

**The Story.** Heading, then four spreads, one paragraph each, in this order and these arrangements:

1. Unbirth plate (`lore/eras/unbirth.jpg`), wide 21:9 across all twelve columns; plate on columns 1 to 7 overlapping the panel's lower left corner by 88 px, inset 48 px.
2. Accords plate (`accords.jpg`), tall 4:5 on columns 6 to 12; plate on columns 1 to 7 cutting into it from the left, vertically centered.
3. End Wars plate (`end-wars.jpg`), 2.4:1 across all columns and breaking the column on both sides (the largest picture on the page, with extra space below it); plate on columns 6 to 12 tucked under the lower right corner.
4. Present plate (`present.jpg`), 4:3 on columns 1 to 7; plate on columns 8 to 12 cutting into it from the right, vertically centered.

**The Galaxy of Xalia.** Heading. Left, columns 1 to 5: the sentence "Today, Krystos remains a snowy wasteland, dotted with the splendorous ruins of ancient and extravagant Vallerii estates." on a dark plate, then the name YETIMOTH with "of Krystos · Ice" under it, the 2021 species entry with an ice-colored left rule, a "Signature ability" legend with the record's defining action name, and links "Its record" and "Its world". Right, columns 6 to 12: the silhouette large on its element wash.

**The Tournament & Tokens.** Heading, then one more spread: the Generation plate (`generation.jpg`) 16:9 on columns 1 to 8, with the tournament paragraph on a cream plate over its lower right corner. Then the Scrambler Tokens paragraph, "Start generating now…" at display size, the secondary key "Try the Generator" and the text link "Read the whole story" to `/encyclopedia/story`, the note "You can look around without an account. Keeping a Xalian needs one.", and the five games as small linked cards in one row.

## 4. Parts

- **Panel:** `figure`, hairline `border-edge-strong`, `bg-s1`, `overflow-hidden`, the image `object-cover` with a `srcset` of the 768 and 1536 files, lazy below the hero. No filter, no zoom.
- **Cream plate:** `bg-ink text-room`, `px-8 py-7`, `font-body text-lead`. Nothing else: no stripe, no shadow.
- **Dark plate** (the Krystos sentence only): `bg-s1 border-l-2 border-edge-strong px-5 py-4`.
- **Entrance:** each plate and panel starts 24 px offset (left, right or down, by spread) and transparent, and settles in 320 ms `ease-out` when 20 percent of it enters the viewport, once. Reduced motion makes it instant through the global rule. A safety timer settles everything after 1.5 s so a missed intersection never leaves ghosted text.
- **Headings:** `type-title` on the three section h2s; `type-display` on "Start generating now…"; `type-legend` on the kicker lines.

## 5. Verification

`npm test -- --run` and `npx tsc --noEmit -p tsconfig.json` in `apps/web`; `node scripts/design/snap.js --out untracked/snaps / /overview` with the dev server up, PNGs opened at 1440 and 390; the lore fact-check on the eight paragraphs with the report in the PR body. Nick judges the deployed page.
