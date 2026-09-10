import * as duelUtil from './boardUtil.ts';
import * as duelCalculator from './duelCalculator.ts';
import * as duelConstants from './duelGameConstants.ts';
import type { BoardState, DuelCtx, DuelPath, DuelPiece, ScoredAction } from './types.ts';

// SCORE :: ACHIEVEMENT
export const BOT_ACTION_SCORE_FOR_GRABBING_FLAG = 200;
export const BOT_ACTION_SCORE_FOR_GUARDING_FLAG = 150;
export const BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL = 999;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG = 500;
export const BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG = 400;

// SCORE :: PROGRESS
export const BOT_ACTION_BONUS_FOR_PROGRESSING_TOWARDS_GUARDING_FLAG = 20;
export const BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL = 200;
export const BOT_ACTION_BONUS_FOR_MOVING_CORRECT_DIRECTION = 25;
export const BOT_ACTION_BONUS_FOR_ALREADY_IN_CORRECT_DIRECTION = 30;
export const BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL = 40;

function buildAction(type: ScoredAction['type'], score: number, path: DuelPath): ScoredAction {
	return {
		type: type,
		score: score,
		path: path,
		description: '',
	};
}

/*
==================================================
                ATTACK ACTIONS
==================================================
*/
export function buildAttackActionsWithScore(currentIndex: number, attacker: DuelPiece, G: BoardState, ctx: DuelCtx): ScoredAction[] {
	let attackablePaths = duelCalculator.calculateAttackablePaths(currentIndex, attacker, G, ctx);
	let attackMoves: ScoredAction[] = [];
	attackablePaths.forEach((path) => {
		let attack = buildAttackAction(attacker, path, G, ctx);

		// add closeness factor of attack so it will be better than combos where the combo is moving away from the flag but attacking same target
		let flagIndex = duelUtil.getOpponentFlagIndex(G);
		let pathToTargetFlag = duelCalculator.calculatePathToTarget(path.startIndex, flagIndex as number, G, ctx);
		let flagClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlag.spacesMoved;
		attack.description += `:: RESULTING DISTANCE TO TARGET FLAG : +${flagClosenessFactor}`;
		attack.score += flagClosenessFactor;

		attackMoves.push(attack);
	});
	attackMoves.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));

	return attackMoves.slice(0, 10);
}

function buildAttackAction(attacker: DuelPiece, path: DuelPath, G: BoardState, ctx: DuelCtx): ScoredAction {
	let action = buildAction(duelConstants.actionTypes.ATTACK, 0, path);
	let score = 0;
	let defender = duelUtil.getXalianFromId(G.cells[path.endIndex], G) as DuelPiece;
	let pathToFlagFromDefender = duelCalculator.calculatePathToTarget(path.endIndex, duelUtil.getPlayerFlagIndex(G) as number, G, ctx);

	let flagIndexToRetrieve = duelUtil.getFlagIndex(duelUtil.getOpponentFlagState(G), G);
	let flagIndexToGuard = duelUtil.getFlagIndex(duelUtil.getPlayerFlagState(G), G);

	action.attackerId = attacker.xalianId;
	action.defenderId = defender.xalianId;

	// SCORE :: DEFENDER DISTANCE TO GRABBING TARGET FLAG
	let flagClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToFlagFromDefender.spacesMoved;
	score += flagClosenessFactor;
	action.description += `:: ENEMY FLAG DISTANCE : +${flagClosenessFactor}`;

	// SCORE :: ESTIMATED DAMAGE TO DEFENDER
	// evaluate every candidate move (plus the generic null-move attack) and pick the one that does the most damage
	let bestMoveIndex: number | null = null;
	let attackResult = duelCalculator.calculateAttackResult(attacker, defender, G, ctx, true, null);
	(attacker.moves || []).forEach((candidateMove, candidateIndex) => {
		let candidateResult = duelCalculator.calculateAttackResult(attacker, defender, G, ctx, true, candidateMove);
		if (candidateResult.damage > attackResult.damage) {
			attackResult = candidateResult;
			bestMoveIndex = candidateIndex;
		}
	});
	action.moveIndex = bestMoveIndex;
	let estimatedDamage = attackResult.damage;
	score += estimatedDamage;
	action.description += `:: ESTIMATED DAMAGE : +${estimatedDamage}`;

	// SCORE :: GO AFTER ENEMY IF THEY HAVE THE FLAG
	if (flagIndexToGuard === path.endIndex) {
		score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG;
		action.description += `:: ATTACKING ENEMY WITH FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_WITH_FLAG}`;
	}

	// SCORE :: GO AFTER ENEMY IF THEY ARE GUARDING TARGET FLAG
	if (flagIndexToRetrieve === path.endIndex) {
		score += BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG;
		action.description += `:: ATTACKING ENEMY THAT IS GUARDING FLAG : +${BOT_ACTION_SCORE_FOR_ATTACKING_ENEMY_GUARDING_FLAG}`;
	}

	// SCORE :: HOW CLOSE THE ENEMY IS TO 0 HEALTH
	let defenderHealthScore = duelConstants.MAX_HEALTH_POINTS - defender.state.health;
	score += defenderHealthScore;
	action.description += `:: DEFENDER HEALTH : +${defenderHealthScore}`;

	// SET SCORE TO 0 IF ATTACK IS IMMUNE
	if (attackResult.typeEffectiveness === 0) {
		score = 0;
	}

	action.score = score;
	return action;
}

/*
==================================================
                MOVE ACTIONS
==================================================
*/

export function buildMoveActionsWithScore(currentIndex: number, xalian: DuelPiece, paths: DuelPath[], G: BoardState, ctx: DuelCtx): ScoredAction[] {
	let flagToRetrieve = duelUtil.getOpponentFlagState(G);
	let flagIndexToRetrieve = duelUtil.getFlagIndex(flagToRetrieve, G);
	let flagToGuard = duelUtil.getPlayerFlagState(G);
	let flagIndexToGuard = duelUtil.getFlagIndex(flagToGuard, G);

	let playerState = ctx.currentPlayer === '0' ? G.playerStates[0] : G.playerStates[1];

	let xalianIdOnTargetFlagIfAny = flagIndexToRetrieve != null ? G.cells[flagIndexToRetrieve] : null;
	let targetFlagIsOpen = !xalianIdOnTargetFlagIfAny;
	let targetFlagIsHeldByTeam = !!flagToRetrieve?.holder;
	let isHoldingTargetFlag = flagToRetrieve?.holder === xalian.xalianId;

	let xalianIdOnTeamFlagIfAny = flagIndexToGuard != null ? G.cells[flagIndexToGuard] : null;
	let teamFlagIsOpen = !xalianIdOnTeamFlagIfAny;
	let teamFlagIsHeldByEnemy = !!flagToGuard?.holder;
	let isGuardingTeamFlag = currentIndex === flagIndexToGuard;

	let moveActions: ScoredAction[] = [];
	paths.forEach((path) => {
		let action = buildAction(duelConstants.actionTypes.MOVE, 0, path);
		action.moverId = xalian.xalianId;

		// APPLY BONUSES AND FILTERS BEFORE SCORING MOVE BASED ON COMPLEX FACTORS

		if (currentIndex === flagIndexToGuard) {
			// STAY PUT GUARDING FLAG
			action.score = 0;
			action.description += `:: CLEARING SCORE BECAUSE I AM GUARDING`;
		}

		if (path.endIndex === flagIndexToGuard) {
			// BONUS :: DEFEND YOUR FLAG
			action.score += BOT_ACTION_SCORE_FOR_GUARDING_FLAG;
			action.description += `:: FLAG GUARD : +${BOT_ACTION_SCORE_FOR_GUARDING_FLAG}`;
		}

		if (targetFlagIsOpen && path.endIndex === flagIndexToRetrieve) {
			// BONUS :: CAPTURE TARGET FLAG
			action.score += BOT_ACTION_SCORE_FOR_GRABBING_FLAG; // high points if capturing the flag
			action.description += `:: FLAG GRAB : +${BOT_ACTION_SCORE_FOR_GRABBING_FLAG}`;
		}

		moveActions.push(action);
	});

	if (isHoldingTargetFlag) {
		/*
		*       1) HOLDING TARGET FLAG
		*/
		scorePathsWhenHoldingTargetFlag(currentIndex, moveActions, G, ctx);
	} else if (isGuardingTeamFlag) {
		/*
		*       2) GUARDING TEAM FLAG
		*/
		// dont allow piece to move unless it is the last active
		if (playerState.activeXalianIds.length > 1) {
			moveActions = [];
		}
		// you could try to find moves where the guarder has enough stamina to move off space to attack then move back to guard
	} else if (teamFlagIsHeldByEnemy) {
		/*
		*       3) ATTACK ENEMY HOLDING TEAM FLAG
		*/
		scorePathsTowardsAttackingEnemyFlagHolder(xalian, flagToGuard?.holder ?? null, flagIndexToGuard, moveActions, G, ctx);
	} else if (targetFlagIsHeldByTeam) {
		/*
		*       4) MAKE PROGRESS TOWARDS MOST EFFECTIVE ATTACK && STAY OUT OF PATH OF TEAM'S FLAG HOLDER
		*           - FIND ENEMY WITH HIGHEST ATTACK EFFECTIVENESS
		*           - IF NOT IN THE WAY OF YOUR TEAM, MOVE TOWARDS ATTACKING THAT PIECE
		*/
		scorePathsGettingOutOfTheWayOfFlagHolder(xalian, flagIndexToRetrieve, currentIndex, moveActions, G, ctx);
	} else if (teamFlagIsOpen) {
		/*
		*       5) MAKE PROGRESS TOWARDS PROTECTING TEAM FLAG
		*            - SCORE MOVE BASED ON HOW CLOSE THE PIECE IS TO GUARD FLAG
		*            - REALLY ONLY WORRIED ABOUT GUARDING IF NOT LAST PLAYER
		*/
		if (playerState.activeXalianIds.length > 1) {
			scorePathsMovingTowardsTeamFlag(flagIndexToGuard, moveActions, G, ctx);
		}
	} else {
		/*
		*       6) MAKE PROGRESS TOWARDS GRABBING TARGET FLAG
		*            - SCORE MOVE BASED ON HOW CLOSE THE PIECE IS TO TARGET FLAG
		*            - IF TARGET IS GUARDED:
		*               -- ADD BONUS POINTS FOR HOW EFFECTIVE THE ATTACKER IS AGAINST DEFENDER
		*               -- MAKE SURE ATTACKER IS NOT IMMUNE TO DEFENDER
		*/
		scorePathsMovingTowardsTargetFlag(flagIndexToRetrieve, moveActions, G, ctx);
	}

	// only return top scores
	moveActions.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));
	return moveActions.slice(0, 5);
}

function scorePathsWhenHoldingTargetFlag(currentIndex: number, moveActions: ScoredAction[], G: BoardState, ctx: DuelCtx): void {
	let grid = duelCalculator.buildGrid(G.cells.length);
	let startCoord = grid.map[currentIndex];
	moveActions.forEach((action) => {
		let endCoord = grid.map[action.path.endIndex];
		// SCORE :: DISTANCE TO WINNING WITH FLAG
		// the bot (player 1) scores at row 0, so moving to a LOWER row index is progress
		let yRowFactor = startCoord[1] - endCoord[1];
		action.description += `:: Y ROW DISTANCE FACTOR : +${yRowFactor}`;
		action.score += yRowFactor;

		action.description += `:: BONUS POINTS FOR MOVING TOWARDS GOAL WITH FLAG : +${BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL}`;
		action.score += BOT_ACTION_BONUS_FOR_HAVING_FLAG_AND_MOVING_TOWARDS_GOAL;

		duelUtil.getOpponentStartingIndices(G).forEach((i) => {
			let startingPathToScoreZone = duelCalculator.calculatePathToTarget(action.path.startIndex, i, G, ctx);
			let endingPathToScoreZone = duelCalculator.calculatePathToTarget(action.path.endIndex, i, G, ctx);
			if (endingPathToScoreZone.spacesMoved < startingPathToScoreZone.spacesMoved) {
				let bonus = (duelConstants.BOARD_COLUMN_SIZE * 2) - endingPathToScoreZone.spacesMoved;
				action.description += `:: BONUS POINTS FOR PATH RESULTING DISTANCE FROM SCORING WITH FLAG : +${bonus}`;
				action.score += bonus;
			}
		});

		// SCORE :: WIN THE GAME
		if (endCoord[1] === 0) {
			action.description += `:: BONUS POINTS FOR MOVING INTO GOAL WITH FLAG : +${BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL}`;
			action.score += BOT_ACTION_SCORE_FOR_HAVING_FLAG_AND_MOVING_INTO_GOAL;
		}
	});
}

function scorePathsGettingOutOfTheWayOfFlagHolder(turnXalian: DuelPiece, flagIndexToRetrieve: number | null, currentIndex: number, moveActions: ScoredAction[], G: BoardState, ctx: DuelCtx): void {
	let grid = duelCalculator.buildGrid(G.cells.length);
	let currentFlagHolderCoord = grid.map[flagIndexToRetrieve as number];

	moveActions.forEach((action) => {
		let currentCoord = grid.map[currentIndex];
		if (currentFlagHolderCoord[1] === currentCoord[1]) {
			// SCORE :: GET OUT OF THE WAY OF FLAG HOLDER
			action.description += `:: BONUS TO HELP GET OUT OF THE WAY OF TEAM MEMBER : +${BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL}`;
			action.score += BOT_ACTION_BONUS_FOR_GETTING_OUT_OF_WAY_OF_TEAM_MEMBER_MOVING_TOWARDS_GOAL;
		}

		let endCoord = grid.map[action.path.endIndex];
		if (currentFlagHolderCoord[1] === endCoord[1]) {
			// SCORE :: DO NOT GET IN WAY OF FLAG HOLDER
			action.description += `:: CLEARING SCORE (would get in the way of team member with flag)`;
			action.score = 0;
		} else {
			// find enemy with best attack effectiveness
			let effectivenessTowardsEnemy: { enemyXalian: DuelPiece; attackEffectiveness: number }[] = [];
			G.playerStates[0].activeXalianIds.forEach((enemyXalianId) => {
				let enemyXalian = duelUtil.getXalianFromId(enemyXalianId, G) as DuelPiece;
				let attackEffectiveness = duelCalculator.calculateTypeEffectiveness(turnXalian.elementType, enemyXalian);
				effectivenessTowardsEnemy.push({ enemyXalian: enemyXalian, attackEffectiveness: attackEffectiveness });
			});
			effectivenessTowardsEnemy.sort((a, b) => (a.attackEffectiveness > b.attackEffectiveness ? -1 : a.attackEffectiveness < b.attackEffectiveness ? 1 : 0));
			let mostEffectiveEnemyTO = effectivenessTowardsEnemy[0];
			if (mostEffectiveEnemyTO) {
				let enemyXalian = mostEffectiveEnemyTO.enemyXalian;
				let enemyXalianIndex = duelUtil.getIndexOfXalian(enemyXalian.xalianId, G);
				// score piece based on how far away this is
				let pathToEnemy = duelCalculator.calculatePathToTarget(action.path.endIndex, enemyXalianIndex as number, G, ctx);
				let enemyClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToEnemy.spacesMoved;
				// SCORE :: DO NOT GET IN WAY OF FLAG HOLDER
				action.description += `:: CLOSENESS FACTOR OF MOVING TOWARDS ENEMY: +${enemyClosenessFactor}`;
				action.score += enemyClosenessFactor;
			}
		}
	});
}

function scorePathsTowardsAttackingEnemyFlagHolder(turnXalian: DuelPiece, enemyXalianId: string | null, flagIndexToGuard: number | null, moveActions: ScoredAction[], G: BoardState, ctx: DuelCtx): void {
	let enemyXalian = duelUtil.getXalianFromId(enemyXalianId, G) as DuelPiece;
	moveActions.forEach((action) => {
		let pathToEnemy = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndexToGuard as number, G, ctx);
		let enemyClosenessFactor = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToEnemy.spacesMoved;

		// SCORE :: MOVE TOWARDS ENEMY WITH FLAG
		action.description += `:: CLOSENESS FACTOR OF MOVING TOWARDS ENEMY WITH FLAG: +${enemyClosenessFactor}`;
		action.score += enemyClosenessFactor;

		let attackEffectiveness = duelCalculator.calculateTypeEffectiveness(turnXalian.elementType, enemyXalian);
		let attackEffectivenessBonus = attackEffectiveness * 2;
		// SCORE :: BONUS FOR EFFECTIVENESS OF ATTACK
		action.description += `:: BONUS FOR EFFECTIVENESS OF ATTACK ON ENEMY WITH FLAG: +${attackEffectivenessBonus}`;
		action.score += attackEffectivenessBonus;

		// SCORE :: CLEAR SCORE IF DEFENDER IS IMMUNE
		if (attackEffectiveness === 0) {
			action.description += `:: CLEAR SCORE BECAUSE DEFENDER IS IMMUNE! `;
			action.score = 0;
		}
	});
}

function scorePathsMovingTowardsTargetFlag(flagIndex: number | null, actions: ScoredAction[], G: BoardState, ctx: DuelCtx): void {
	actions.forEach((action) => {
		let pathToTargetFlagFromMoveStart = duelCalculator.calculatePathToTarget(action.path.startIndex, flagIndex as number, G, ctx);
		let pathToTargetFlagFromMoveResult = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndex as number, G, ctx);
		let flagClosenessFactorFromStart = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveStart.spacesMoved;
		let flagClosenessFactorFromEnd = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveResult.spacesMoved;
		let progressTowardsFlag = flagClosenessFactorFromEnd - flagClosenessFactorFromStart;
		if (flagIndex !== action.path.endIndex) {
			action.description += `:: PROGRESS TOWARDS TARGET FLAG : +${progressTowardsFlag}`;
			action.score += progressTowardsFlag;
		}
	});
}

function scorePathsMovingTowardsTeamFlag(flagIndex: number | null, actions: ScoredAction[], G: BoardState, ctx: DuelCtx): void {
	actions.forEach((action) => {
		let pathToTargetFlagFromMoveStart = duelCalculator.calculatePathToTarget(action.path.startIndex, flagIndex as number, G, ctx);
		let pathToTargetFlagFromMoveResult = duelCalculator.calculatePathToTarget(action.path.endIndex, flagIndex as number, G, ctx);
		let flagClosenessFactorFromEnd = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveResult.spacesMoved;
		if (flagIndex !== action.path.endIndex) {
			action.description += `:: PROGRESS TOWARDS TEAM FLAG : +${flagClosenessFactorFromEnd}`;
			action.score += flagClosenessFactorFromEnd;
		} else {
			let shortestMoveBonus = (duelConstants.BOARD_COLUMN_SIZE * 2) - pathToTargetFlagFromMoveStart.spacesMoved;
			action.description += `:: QUICKEST PATH TOWARDS TEAM FLAG : +${shortestMoveBonus}`;
			action.score += shortestMoveBonus;
		}
	});
}

/*
==================================================
                COMBO ACTIONS
==================================================
*/

export function buildComboActionsWithScore(currentIndex: number, attacker: DuelPiece, allPaths: DuelPath[], G: BoardState, ctx: DuelCtx): ScoredAction[] {
	let flagIndexToRetrieve = duelUtil.getFlagIndex(duelUtil.getOpponentFlagState(G), G);
	let flagIndexToGuard = duelUtil.getFlagIndex(duelUtil.getPlayerFlagState(G), G);

	let comboActions: ScoredAction[] = [];
	// move then attack

	let moveActions = buildMoveActionsWithScore(currentIndex, attacker, allPaths, G, ctx);

	moveActions.forEach((moveAction) => {
		let movePath = moveAction.path;
		if (flagIndexToGuard !== movePath.startIndex && flagIndexToRetrieve !== movePath.startIndex) {
			// MOVE then ATTACK
			//      build combo move with attack actions from ending index of move path
			buildAttackActionsWithScore(movePath.endIndex, attacker, G, ctx).forEach((attackAction) => {
				comboActions.push({
					moveAction: moveAction,
					attackAction: attackAction,
					type: duelConstants.actionTypes.COMBO,
					score: moveAction.score + attackAction.score,
					path: movePath,
					description: `COMBO ==> MOVE THEN ATTACK ==> MOVE: ${moveAction.description} :::: ATTACK: ${attackAction.description}`,
				});
			});
		}
	});

	comboActions.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));
	return comboActions.slice(0, 10);
}
