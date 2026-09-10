/*
	Expedition (Reclamation) public API, per docs/design/frontend-backend-data-sharing.md
	decision 7: the rules move to packages/rules so the server can referee when
	multiplayer lands and the client keeps the same functions for previews. Re-exports the
	whole module set the site (apps/web's reclamation components and pages) and the devtools
	already consume; games import from here (`@xalians/rules/expedition`) rather than
	reaching into individual files, the same convention packages/rules/src/index.ts uses
	for the generator.

	DRAFT_POOL_SIZE is defined once, in expeditionInterpretation.ts (every other lever's
	home per docs/design/reclamation-base-redesign.md assumption 15); draft.ts re-exports
	the identical binding under its own name for callers that only import from draft.ts
	directly, so it is left off this file's draft.ts re-export list to avoid a duplicate
	export of the same value.
*/

export * from './types.ts';
export * from './elementMatchup.ts';
export * from './expeditionInterpretation.ts';
export * from './creatureOnTable.ts';
export * from './roster.ts';
export * from './sites.ts';
export * from './expeditionRules.ts';
export * from './expeditionBot.ts';
export {
	buildDraftPools, rateForDraft, poolMeanBlowOf, botDraft, draftOptionsFromRules, validateKeep,
	MAX_PER_SPECIES, SWEEP_EXPECTED_CREATURES, BOLSTER_EXPECTED_ALLIES,
} from './draft.ts';
