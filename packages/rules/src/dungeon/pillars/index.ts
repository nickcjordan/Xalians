// Powerworks on the pillars (docs/design/powerworks-pillars.md). The live page still runs the
// v5 engine in ../index.ts; the screen pass moves it here.
export * from "./engine.ts";
export * from "./levers.ts";
export { readMove, readMoves } from "./read.ts";
export type { Aim, SupportKind } from "./read.ts";
// Turn by turn (turns.ts): legalMoves/legalTargets are the same functions engine.ts already
// exports via `export *` above, so turns.ts's re-export of them is left out here to avoid a
// duplicate-export error; every name below is unique to turns.ts.
export {
  activeOf,
  createTurnRun,
  createTurnRunFrom,
  interval,
  legalOrder,
  roundOf,
  roundStrip,
  turnCommand,
  upcoming,
  type TCommand,
  type TPhase,
  type TRun,
} from "./turns.ts";
export { turnHardestHit, type TurnPolicy } from "./turnPolicy.ts";
