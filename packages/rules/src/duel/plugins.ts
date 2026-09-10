/*
	Duel: the boardgame.io action-log plugin. The original file imported Hub from
	'aws-amplify' but never called it (dead import, left over from an earlier version
	of the animation pipeline); dropped here rather than pulling aws-amplify into the
	package. boardgame.io's own plugin type isn't imported either (the package has no
	boardgame.io dependency - see duelBot.ts's header comment) so the plugin shape is
	typed structurally against what apps/web's boardgame.io Game definition expects.
*/

import { v4 as uuidv4 } from 'uuid';
import * as boardStateManager from './boardStateManager.ts';
import * as duelConstants from './duelGameConstants.ts';
import type { BoardState, DuelCtx } from './types.ts';

interface LogEntry {
	setMetadata: (meta: Record<string, unknown>) => void;
}

interface PluginCtx extends DuelCtx {
	log: LogEntry;
}

export const actionPlugin = {
	// Required.
	name: 'action-plugin',

	// Function that accepts a move / trigger function and returns another function
	// that wraps it. This wrapper can modify G before passing it down to the wrapped
	// function. It is a good practice to undo the change at the end of the call.
	fnWrap: (fn: (G: BoardState, ctx: PluginCtx, ...args: unknown[]) => BoardState) => (G: BoardState, ctx: PluginCtx, ...args: unknown[]) => {
		G = preprocess(G, ctx, args);
		G = fn(G, ctx, ...args);
		G = postprocess(G, ctx, args);

		return G;
	},
};

function preprocess(G: BoardState, ctx: DuelCtx, args: unknown[]): BoardState {
	let startState = boardStateManager.buildBoardState(G, ctx);

	let moveId = uuidv4();
	return {
		...G,
		moveId: moveId,
		startState: { ...startState, moveId: moveId },
	};
}

function postprocess(G: BoardState, ctx: PluginCtx, args: unknown[]): BoardState {
	// initialize action metadata
	let actionMeta: Record<string, unknown> = {
		moveId: G.moveId,
	};

	// grab attack result from currentTurnActions so it will be available in action meta
	let currentTurnActions = G.currentTurnActions || [];
	let lastAction = currentTurnActions[currentTurnActions.length - 1];
	if (lastAction && lastAction.type === duelConstants.actionTypes.ATTACK && 'attack' in lastAction && lastAction.attack.result) {
		actionMeta.attackActionResult = lastAction.attack.result;
	}

	// add current state index to meta
	actionMeta.boardStateIndex = 0;
	actionMeta.startState = G.startState;

	// set this moves log meta
	ctx.log.setMetadata(actionMeta);

	return {
		...G,
		startState: null,
	};
}
