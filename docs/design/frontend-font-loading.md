# Frontend font loading audit

Audit date: 2026-09-11  
Starting point: `ccd2af6` (`main` after PR #236)

## Loading boundary

The application shell owns font loading because the chrome is present on every route and immersive routes retain the same v4 core type roles. `index.html` now makes one Google Fonts CSS request with `display=swap` and preconnects both `fonts.googleapis.com` and `fonts.gstatic.com`. CSS stacks retain system fallbacks so content remains readable when remote fonts are unavailable.

## Retained request

| Family | Requested variants | Live role | Live routes |
| --- | --- | --- | --- |
| Abel | 400 | Final immersive `body` default for content that has not yet adopted a role token | Match, Physics, Duel board/reference, Reclamation, Long Return |
| Atkinson Hyperlegible | 400, 700 | `--font-body` and `--g-font-body`; regular prose plus inherited bold prose | All chrome routes and all immersive routes |
| Cinzel | 500 | Registry `--g-font-nameplate`, rendered by `.g-nameplate` | Duel board and Duel reference |
| Iceland | 400 | `--font-brand` and `--g-font-brand` wordmarks | Application shell and immersive brand lockups |
| Martian Mono | 400, 500 | `--font-data` and `--g-font-data`; readouts and values | All chrome routes and all immersive routes |
| Michroma | 400 | Field `--g-font-nameplate`, rendered by `.g-nameplate` | Reclamation |
| Saira | 500, 600, 700 | `--font-legend` and `--g-font-legend`; labels, headings, and emphasized immersive legends | All chrome routes and all immersive routes |

The retained request therefore contains 7 families and 11 explicit family/weight variants. Existing synthetic weights are intentionally unchanged: for example, Michroma 500 and Martian Mono 600/700 already resolve from their nearest requested face.

## Removed from the request

| Family | Previous variants | Reason |
| --- | --- | --- |
| Barlow Condensed | 500, 600 | Remote fallback behind live Saira; never selected when the primary face loads |
| Oswald | 400, 500, 600, 700 | Only referenced by two unused legacy aliases, which were deleted |
| Barlow | 400, 500, 600 | Remote fallback behind live Atkinson Hyperlegible; never selected when the primary face loads |
| IBM Plex Mono | 400, 500, 600 | Remote fallback behind live Martian Mono or inside dormant paper/panel roles |
| Share Tech Mono | 400 | No executable selector or token consumer |
| Space Mono | 400 | No executable selector or token consumer |
| IBM Plex Sans | 400, 500 | No executable selector or token consumer |
| Special Elite | 400 | Only the dormant `.g-paper` compatibility role; no executable markup emits it |
| Caveat | 500 | Only dormant `.g-pencil`; no executable markup emits it |
| Spectral | normal 400/600, italic 400 | Nameplate for dormant `data-terminal="archive"`; no executable route emits that terminal |
| Chakra Petch | 500, 600 | Nameplate for dormant `data-terminal="relay"`; no executable route emits that terminal |

The dormant compatibility selectors keep their authored font stacks. If one returns to executable markup, its primary face must be deliberately restored to the request or replaced as part of that route's migration.

## Guardrail

`fontLoading.test.js` locks the single-request boundary, both preconnects, `display=swap`, the exact retained family/variant list, and the retired remote families. Any new face therefore requires an explicit audit update rather than silently expanding the blocking application-shell request.
