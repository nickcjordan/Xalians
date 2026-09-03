# Encyclopedia Xalia

The single public canon reference for the world of Xalia. Ratified 2026-09-01: the legacy glossary merges into it, it ships as a structured file, and an internal companion stays outside the bundle.

## Files

- `encyclopedia.json` is the public structured file: masthead, version, categories, and one entry per canon concept. Glossary definitions are carried verbatim; the Encyclopedia adds `category`, `related` cross-references, and `element` tags on planet entries.
- `ENCYCLOPEDIA-INTERNAL.md` is the private companion: working canon constraints, editorial rules, source precedence, and the never-resolve rules for the ancient-presence thread. It never ships.
- `merge-notes.md` records the mechanical merge from `glossary.json`: borderline category calls and the gap list of mentioned-but-unentried concepts.

## Entry schema

```json
{
  "key": "scrambler-token",
  "title": "Scrambler Token",
  "category": "technology",
  "definition": "…verbatim canonical prose…",
  "related": ["mercurius-machine", "king-kozrak"],
  "element": "(planet entries only)"
}
```

Categories: `history`, `factions`, `people`, `places`, `technology`, `substances`, `phenomena`, `xalians`.

## Rules of the road

- Definitions are canonical prose. Structural edits (categories, links) are free; prose edits go through the lore-voice process and Nick's sign-off.
- Keys are append-only once shipped. Corrections edit definitions, never keys.
- `related` links are mechanical (title appears in definition text), never thematic.
- Species entries are absent by design; they arrive one at a time during species migration, written against each species' final ratified record.
- The bundle shipped on 2026-09-02: `node scripts/bundleLore.js` copies this file (with `chronicle.json`, `registries.json`, and the ratified species records) into `lambda/src/json/`, and the `/encyclopedia` page reads it through `my-app/src/lore/`. Run the bundler and `yarn copy-json` after every change here. `glossary.json` is now a legacy mirror kept only until the lambda side stops shipping it; nothing reads it any more, and this file wins on conflict.
- `tour.json` beside this file is the First Survey: eight beats of derived prose in the historian's voice, each with `sources` (planet and paragraph) so every sentence can be checked against the histories. It restates canon and never adds to it; the bundler copies it beside the chronicle.
- `chronicle.json` beside this file is the undated timeline (eras, events with verbatim anchors, era tags per history paragraph); its rulings live in `docs/design/xalian-chronicle.md`.
