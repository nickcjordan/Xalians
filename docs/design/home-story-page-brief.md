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
| 6 | The creature carries a white glow, ruled by Nick on 2026-09-22 and recorded as the one exception in contract section 5. The demo's mint plate stripe stays out (accent never on decorative rules); the plate's chamfer and numeral take its place. | 90% | `docs/DESIGN_SYSTEM.md` sections 3.1 and 5 |
| 7 | No loops: the demo's endless zoom became a scroll-linked drift, and every entrance plays once. Nick asked for visible motion on 2026-09-22 after a 320 ms version read as none. | 90% | `docs/DESIGN_SYSTEM.md` section 7 |
| 8 | Two "Try the Generator" keys on one page: the hero's is the primary; the close's is `secondary`. One primary per screen. | 85% | `docs/DESIGN_SYSTEM.md` section 3.1 |
| 9 | Nick's 2022 text is quoted as written even where it compresses the histories. The fact-check gate reports the deltas; Nick rules on each rather than the agent rewriting his words. | 90%, Nick asked for his original words | `.claude/skills/lore-factcheck/SKILL.md`; PR body |

## 3. The page, top to bottom

All sections sit in a 1160 px column inside the Shell on desktop, twelve grid columns with 24 px gutters. Below 1000 px everything stacks to one column and plates overlap the panel above them by 28 px.

**Hero.** Left: the animated brand lockup (the existing splash morph), the sentence "Xalia is home to a wide range of powerful, bioengineered creatures originating from extreme worlds all across the galaxy.", the primary key "Try the Generator", and a text link "The Story" to `#story`. Right: a portrait panel (4:5) of the Krystos landscape with the Yetimoth silhouette standing in front of it, its feet breaking the bottom edge, and a small cream tag "A Yetimoth of Krystos" cutting across the panel's left edge. The whole art block links to `#specimen`. The existing starfield stays behind the hero band.

**The Story.** Heading, then four spreads, one paragraph each, in this order and these arrangements:

1. Unbirth plate (`lore/eras/unbirth.jpg`), wide 21:9 across all twelve columns; plate on columns 1 to 7 overlapping the panel's lower left corner by 88 px, inset 48 px.
2. Accords plate (`accords.jpg`), tall 4:5 on columns 6 to 12; plate on columns 1 to 7 cutting into it from the left, vertically centered.
3. End Wars plate (`end-wars.jpg`, living since 2026-09-22), 2:1 across all columns and breaking the column on both sides (the largest picture on the page, with extra space below it); plate on columns 6 to 12 tucked under the lower right corner.
4. Present plate (`present.jpg`), 4:3 on columns 1 to 7; plate on columns 8 to 12 cutting into it from the right, vertically centered.

**The Galaxy of Xalia.** Heading. Left, columns 1 to 5: the sentence "Today, Krystos remains a snowy wasteland, dotted with the splendorous ruins of ancient and extravagant Vallerii estates." on a dark plate, then the name YETIMOTH with "of Krystos · Ice" under it, the 2021 species entry with an ice-colored left rule, a "Signature ability" legend with the record's defining action name, and links "Its record" and "Its world". Right, columns 6 to 12: the silhouette large on its element wash.

**The Tournament & Tokens.** Heading, then one more spread: the Generation plate (`generation.jpg`) 16:9 on columns 1 to 8, with the tournament paragraph on a cream plate over its lower right corner. Then the Scrambler Tokens paragraph, "Start generating now…" at display size, the secondary key "Try the Generator" and the text link "Read the whole story" to `/encyclopedia/story`, the note "You can look around without an account. Keeping a Xalian needs one.", and the five games as small linked cards in one row.

## 4. Parts

- **Panel** (revised 2026-09-22 after Nick judged the plain rectangles unconsidered): a framed painting, `.frame` in `globals.css`. The system chamfer at frame scale (a 20px cut), a 6px mat in `s1` behind a hairline in `edge-strong`, and the picture cut to the same shape inside it. The picture is graded into the room: a 14 percent wash of the room color, the room's grain (`--grain`, shared with the chrome tier), and a vignette at the foot where the plate sits. Each story panel is a door to its era in The Story (`/encyclopedia/story/<era>`), so it stands on a 4px mass in the third ink cut to its own shape (`.mass-frame`, section 5.1) and lifts a pixel under the pointer; a tag in the top right corner, data face on the room color, carries the spread's numeral and the era title. The hero's panel is a picture only (the link is the whole block around it) and stands on the same mass. The image is `object-cover` with a `srcset` of the 768 and 1536 files, lazy below the hero, drawn 12 percent larger than the well so it can drift.
- **Cream plate:** the system chamfer (`.chamfer` with the fill set to ink and the edge to the third ink), `text-room`, a numeral kicker in the data face, `font-body text-lead`, and `shadow-float` because it floats over its painting. Revised 2026-09-22 after Nick judged the first flat version crude.
- **Dark plate** (the Krystos sentence only): `bg-s1 border-l-2 border-edge-strong px-5 py-4`.
- **Living plate** (2026-09-22, Nick's ask): the End Wars panel holds a living version of its painting, `components/plates/livePlate.tsx`. The plate is eight stacked SVG layers sharing one definitions block plus two raster surface sheets (a paper tile and a brush-stroke sheet, both generated procedurally), served as an HTML fragment from `public/assets/plates/end-wars/` and injected when the panel comes within 320px of the viewport; the raster plate is the poster beneath it. Static layers (sky and city, hull, near towers, finish) paint once, so their lighting and texture filters cost nothing per frame; only the water, smoke and fire layers repaint. It plays only while visible and the tab is shown, never under reduced motion, and the page shows one living plate at a time. The source of the plate is `art/plates/end-wars/source.html`; the fragment is exported from it with `scripts/plates/export-plate.py`, not edited by hand. The process and rules for the remaining plates are in `docs/design/living-plate-playbook.md`. Measured in Chrome with the GPU at 1440 wide it renders at about 150 frames a second uncapped.
- **Motion** (`pages/home/motion.ts`, GSAP ScrollTrigger, one context, none of it under reduced motion): each painting settles into its frame and each plate slides out from behind its panel as they scroll in, once (800 to 900 ms, power3 out); the paintings are drawn 12 percent larger than their frames and drift with the scroll; the hero creature arrives after the lockup; the specimen prints in from a blur. The markup renders the resting frame, so a browser that runs none of it sees the complete page.
- **Headings:** `type-title` on the three section h2s; `type-display` on "Start generating now…"; `type-legend` on the kicker lines.

## 5. Verification

`npm test -- --run` and `npx tsc --noEmit -p tsconfig.json` in `apps/web`; `node scripts/design/snap.js --out untracked/snaps / /overview` with the dev server up, PNGs opened at 1440 and 390; the lore fact-check on the eight paragraphs with the report in the PR body. Nick judges the deployed page.
