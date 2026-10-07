/*
	@xalians/rules: re-exports the current creature generator and the Arcade engines so a
	consumer that wants "the rules package" has one import. `@xalians/rules/generator`
	(the canonical v5 creature generator, canonicalCreatureRelease.ts) and the per-game
	subpaths are the more precise imports most call sites use.
*/
export * from './generator/canonicalCreatureRelease.ts';
export * from './arcade/index.ts';
