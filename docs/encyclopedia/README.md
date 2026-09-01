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
- The app still reads `lambda/src/json/glossary.json`; nothing here changes the site until the Encyclopedia page lands and the bundle flips. See the internal companion for the flip plan.
