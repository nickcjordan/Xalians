import { Client } from 'boardgame.io/client';
import xalianSamples from '@xalians/content/mock/xalianSamples.json';
import { buildDuelPiece } from '@xalians/rules/duel/duelPieceBuilder';

import { Duel } from './duel';

describe('Duel boardgame.io adapter', () => {
	it('creates a 0.50 client and reaches the setup phase', () => {
		const xalians = xalianSamples.slice(0, 8).map(buildDuelPiece);
		const game = Duel({
			xalians,
			teams: [
				xalians.slice(0, 4).map((xalian) => xalian.xalianId),
				xalians.slice(4).map((xalian) => xalian.xalianId),
			],
			bot: false,
			randomizeStartingPositions: true,
		});
		const client = Client({ game, numPlayers: 2 });

		client.start();
		const state = client.getState();

		expect(state.ctx.phase).toBe('setup');
		expect(state.G.cells).toHaveLength(64);
		expect(state.G.xalians).toHaveLength(8);
		client.stop();
	});
});
