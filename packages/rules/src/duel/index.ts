/*
	Duel public API. Re-exports the whole module set apps/web's duel components, pages
	and devtools consume, the same convention packages/rules/src/index.ts uses for the
	generator and packages/rules/src/expedition/index.ts uses for expedition (issue
	#184's duel half, following PR #199).

	Unlike expedition and the generator, duel modules are also imported directly by
	callers that want just one piece (`@xalians/rules/duel/duelCalculator`, etc, per
	the package.json "./duel/*" export) - both forms are supported, so this file exists
	for callers that want the whole surface without naming every module.
*/

export * from './types.ts';
export * from './duelGameConstants.ts';
export * as duelCalculator from './duelCalculator.ts';
export * as boardUtil from './boardUtil.ts';
export * as boardStateManager from './boardStateManager.ts';
export * as playerStateManager from './playerStateManager.ts';
export * as duelActionBuilder from './duelActionBuilder.ts';
export * as duelBot from './duelBot.ts';
export * as duelPieceBuilder from './duelPieceBuilder.ts';
export * as duelValueTranslator from './duelValueTranslator.ts';
export * as xalianStateManager from './xalianStateManager.ts';
export { actionPlugin } from './plugins.ts';
