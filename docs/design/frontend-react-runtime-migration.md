# Frontend React runtime migration contract

Audit date: 2026-09-11  
Starting point: `440a3dd` (`main` after PR #239)

## Decision

Upgrade React and React DOM from 18.3.1 to 19.3.0, then complete the already-isolated router transition from `react-router-dom` 7.18.3 to `react-router` 8.3.1. Remove the application Redux store instead of upgrading it.

The store had one configured `duelAnimationQueue` reducer. Its only consumer was an `AnimationHub` imported by `DuelBoard` but never rendered or invoked; a counter slice and component were untouched scaffold code. Live Duel animation is already owned by `DuelBoard.state.animationQueue`, its GSAP timeline, and `moveAnimationManager`. Removing the unused Provider, store, slices, counter, and hub leaves that active path unchanged. Recharts may retain Redux packages internally as transitive implementation details, but Xalians has no direct Redux dependency, store, selector, middleware, or dispatch path.

## Compatibility matrix

| Boundary | Decision and evidence |
| --- | --- |
| React / React DOM | 19.3.0 is pinned in both the root and web workspace; production already used `createRoot` and `StrictMode` |
| React Router | 8.3.1 is pinned and all imports use `react-router`; the 36-case route contract remains unchanged |
| boardgame.io | 0.50.2 has no React peer constraint; Duel rules/tests and the browser setup/board flow are the compatibility gate |
| GSAP | The licensed bonus bundle remains at 3.9.1; Duel and immersive-route browser checks are its React 19 compatibility gate |
| Radix UI, Sonner, Vaul, React Hook Form, Recharts | Installed versions declare React 19 support; component/auth/route tests exercise dialogs, controls, toast boundaries, and charts |
| Testing Library | 16.3.3 declares React 18/19 support; all component and route suites run on React 19 |
| Legacy mounts | `ReactDOM.render`, `unmountComponentAtNode`, and `react-dom/test-utils` are removed; direct harnesses use `createRoot` and React's `act` |
| Type declarations | `@types/react` and `@types/react-dom` move to 19; callback values previously inferred as `any` now carry explicit boolean/string contracts |

## Enforced runtime boundary

`runtimeBoundaries.test.js` pins React, React DOM, and React Router versions; proves the application entry uses `createRoot` and `StrictMode`; rejects deprecated mount APIs, `react-router-dom`, and application Redux imports; and renders the real error boundary around a throwing child.

The route, auth, Reclamation, Long Return, and full workspace suites provide behavioral coverage. Browser verification must include primary chrome routes plus Duel setup and a local board at desktop and narrow widths, with console errors, loading residue, and overflow recorded.

The production-build browser pass covers Account and its sign-in dialog, Reclamation, Long Return, Encyclopedia, canonical and retired deep links, and Duel from setup into a live board. At 1,440×900 and 390×844, every checked surface completed loading without document overflow or console errors.

## Bundle decision

The React 19 production runtime raises the initial JavaScript graph from 549.1 kB raw / 175.0 kB gzip to 592.2 / 185.3 kB. An isolation build showed Router 8 is 1.9 kB raw / 0.6 kB gzip smaller than Router 7 on the same React 19 runtime, so reverting the router would not recover the increase. The initial budget moves to 622/195 kB, approximately five percent above the measured runtime baseline; route-specific limits do not change.
