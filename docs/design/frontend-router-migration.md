# Frontend router migration contract

Audit date: 2026-09-11  
Starting point: `e2370bd` (`main` after PR #238)

## Version boundary

This slice upgrades `react-router-dom` from 5.3.4 to 7.18.3 while retaining React 18.3.1. It adopts the supported declarative v7 API without changing the application's rendering model: `Routes`, route `element` values, `Navigate`, `useNavigate`, relative nested routes, and `NavLink end` replace their v5 counterparts.

React Router 8 is intentionally part of the later React runtime decision. It requires React 19.2.7 or newer and removes the `react-router-dom` package in favor of imports from `react-router`; taking it here would combine the router, React runtime, and package-import migrations in one review.

## Route ownership

| Boundary | Canonical paths | Fallback |
| --- | --- | --- |
| Application shell | `/`, `/generator`, `/account`, `/user/:id`, `/duel`, `/duel/reference`, `/reclamation`, `/long-return`, `/train`, `/train/match`, `/train/physics` | Application not-found page |
| Encyclopedia shell | `/encyclopedia`, `/encyclopedia/story/:era?`, `/encyclopedia/worlds/:key?`, `/encyclopedia/species/:key?`, `/encyclopedia/powers`, `/encyclopedia/index/:key?` | Encyclopedia-local empty state |
| Developer-only | `/dev/error`; `/styleguide` only in development or an explicit styleguide build | Production `/styleguide` reaches the application fallback |

The application route component is exported separately from its providers so `MemoryRouter` tests can exercise routing without recreating Redux, browser history, or authentication infrastructure. The encyclopedia keeps its nested `Routes` beneath the application's `/encyclopedia/*` match, which supplies the relative route context used in production.

## Retired-address compatibility

| Retired address | Destination |
| --- | --- |
| `/species` | `/encyclopedia/species` |
| `/species/:id` | Canonical species-name record; an unknown id falls back to the Bestiary |
| `/planets` | `/encyclopedia/worlds` |
| `/glossary` | `/encyclopedia/index` |
| `/encyclopedia/chronicle/:era?` | `/encyclopedia/story/:era?` |
| `/encyclopedia/read/:era?` | `/encyclopedia/story/:era?` |
| `/encyclopedia/tour/:beat?` | The beat's canonical story-era anchor, or the story index if unknown |

All redirects replace rather than append browser history and preserve incoming query strings and hashes. A known tour beat supplies its canonical `#beat-*` anchor when the old URL has no explicit hash; an explicit incoming hash wins so existing bookmarks are not discarded.

## Regression matrix

`appRoutes.test.js` owns top-level canonical routes, the dynamic user id, retired application addresses, query/hash preservation, species-id normalization, and the application fallback. `encyclopediaRoutes.test.js` owns relative section/detail routes, retired story addresses, canonical tour-beat anchors, and the local fallback. Together they add 36 deterministic route-contract cases.

The production-build browser smoke covers a numeric species deep link, a retired tour-beat deep link, query/hash preservation, navbar navigation, browser back/forward, a hash-targeted story page, and the not-found page at 1,440×900 and 390×844. It also checks loading/error residue, console errors, and document overflow. The smoke found an unbreakable long path on the phone not-found surface; the path now wraps within the viewport.
