import * as duelConstants from './duelGameConstants.ts';
import species from '@xalians/content/species.json';
import type { DuelPiece, DuelTraits, SourceXalian } from './types.ts';

/*
	statRangeToInteger, ported from my-app/src/utils/valueTranslator.js: that module
	also carries UI color-map lookups keyed off designTokens.js, which would pull a
	my-app import into the package. Only this one pure rating-word lookup is used by
	the duel piece builder, so it is copied here rather than importing the rest of
	that file's UI concerns.
*/
const RATING_WORD_TO_INT: Record<string, number> = {
	'very low': 1,
	low: 2,
	medium: 3,
	high: 4,
	'very high': 5,
};

function statRangeToInteger(val: string): number {
	return RATING_WORD_TO_INT[val] ?? 0;
}

export function buildDuelPiece(xalian: SourceXalian): DuelPiece {
	let stAttackPts = statRangeToInteger(String(xalian.stats['standardAttackPoints'].range));
	let spAttackPts = statRangeToInteger(String(xalian.stats['specialAttackPoints'].range));
	let attackPts = Math.floor((stAttackPts + spAttackPts) * 10) / 10; // round to 1 decimal if necessary

	let stDefensePts = statRangeToInteger(String(xalian.stats['standardDefensePoints'].range));
	let spDefensePts = statRangeToInteger(String(xalian.stats['specialDefensePoints'].range));
	let defensePts = Math.floor((stDefensePts + spDefensePts) * 10) / 10; // round to 1 decimal if necessary

	let speedPts = statRangeToInteger(String(xalian.stats['speedPoints'].range));

	let distance = speedPts > 3 ? 3 : speedPts > 2 ? 2 : 1;

	let evasionPts = statRangeToInteger(String(xalian.stats['evasionPoints'].range)) * 2;

	let selectedSpecies = (species as { id: string; traits?: DuelTraits }[]).filter((s) => s.id === xalian.species.id)[0];

	let ranges: Record<string, number> = { high: 3, medium: 2, low: 1 };

	// real saved xalians may predate the current species list - default rather than crash
	let traits: DuelTraits = (selectedSpecies && selectedSpecies.traits) || { attackRange: 'medium', canFly: false };
	let attackRange = ranges[traits.attackRange] || 2;

	function buildReducedSpecies(fullSpecies: SourceXalian['species']) {
		return {
			id: fullSpecies.id,
			name: String(fullSpecies.name ?? ''),
			planet: String(fullSpecies.planet ?? ''),
		};
	}

	return {
		xalianId: xalian.xalianId,
		species: buildReducedSpecies(xalian.species),
		elementType: xalian.elements.primaryType,
		moves: xalian.moves || [],
		elements: {
			primaryType: xalian.elements.primaryType,
			secondaryType: xalian.elements.secondaryType || null,
		},
		stats: {
			attack: attackPts,
			defense: defensePts,
			speed: speedPts,
			range: attackRange,
			distance: distance,
			evasion: evasionPts,
		},
		state: {
			health: duelConstants.MAX_HEALTH_POINTS,
			stamina: duelConstants.MAX_STAMINA_POINTS,
		},
		traits: traits,
	};
}
