import type { DuelPiece } from './types.ts';

export interface XalianState {
	xalianId: string;
	health: number;
}

export function buildXalianState(xalian: DuelPiece): XalianState {
	return {
		xalianId: xalian.xalianId,
		health: xalian.state.health,
	};
}

export function buildXalianStates(xalians: DuelPiece[]): XalianState[] {
	let states: XalianState[] = [];
	xalians.forEach((xalian) => {
		states.push(buildXalianState(xalian));
	});
	return states;
}
