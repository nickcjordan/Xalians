import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import ReclamationWorld from '../reclamationWorld';
import ReclamationBench from '../reclamationBench';
import ReclamationDraft from '../reclamationDraft';
import { narrateStake, narrateJudge, countWord } from '../reclamationNarration';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import {
	createMatch, getPublicState, stakeWorld, DEFAULT_RULES,
} from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { prepare } from '@xalians/rules/expedition/creatureOnTable';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';

/*
	PASS 3 on the table (docs/design/reclamation-base-redesign.md, assumptions 21 to 23):
	the stake's control and its mark, the price of hiding on the sends-left pips, and the
	draft's new shape in words.

	The public state under test is the ENGINE'S OWN, not a hand-written fixture: a real
	match is created from a real draft pool and read through getPublicState, so a test
	here fails the moment the engine stops carrying `stakes`, `stakeableSiteIds` or
	`hiddenSendCost` in the shape the table reads. Only the two fields a test needs to
	force (whose turn it is, how many sends are spent) are overridden on the copy, since
	neither is reachable from the outside without playing a whole round.

	Mounted with plain ReactDOM.render + react-dom/test-utils' act against a jsdom
	container, the same way reclamationReport.test.js mounts the notes panel.
*/

const SEED = 7;

function makeView(seat = 'A') {
	const { poolA, poolB } = buildDraftPools(SEED, draftOptionsFromRules(DEFAULT_RULES));
	const rosterA = poolA.slice(0, ROSTER_SIZE);
	const rosterB = poolB.slice(0, ROSTER_SIZE);
	const match = createMatch({
		rosterA, rosterB, worlds: getWorlds(), seed: SEED,
	});
	return { match, view: getPublicState(match, seat) };
}

// the table's own copy-with-an-override, so a test never mutates the engine's state
function withTurn(view, seat) {
	return { ...view, turn: seat };
}

function withSentCount(view, seat, sentCount) {
	return {
		...view,
		players: { ...view.players, [seat]: { ...view.players[seat], sentCount } },
	};
}

let container;

function mount(element) {
	container = document.createElement('div');
	document.body.appendChild(container);
	act(() => {
		ReactDOM.render(element, container);
	});
	return container;
}

afterEach(() => {
	if (container) {
		act(() => {
			ReactDOM.unmountComponentAtNode(container);
		});
		container.remove();
		container = null;
	}
});

function worldProps(view, extra) {
	const totals = {};
	view.frame.sites.forEach((site) => { totals[site.id] = { A: 0, B: 0 }; });
	return {
		frame: view.frame,
		board: view.board,
		you: 'A',
		holds: {},
		totals,
		hurt: {},
		ghosts: null,
		verdicts: null,
		armedRecordId: null,
		movingRecordId: null,
		clickable: true,
		recommendedSiteId: null,
		holdingIds: [],
		hiddenEnemyCount: 0,
		threats: {},
		highlights: {},
		arrival: null,
		hoverSiteId: null,
		advanced: true,
		onSiteClick: () => {},
		onSiteHover: () => {},
		onFigureClick: () => {},
		stakes: view.stakes,
		stakeableSiteIds: view.players.A.stakeableSiteIds || [],
		pendingStakeSiteId: null,
		onStake: () => {},
		...extra,
	};
}

describe('the stake, on a world tray head', () => {
	it('the engine offers every world of the frame as stakeable before the first send', () => {
		const { view } = makeView('A');
		expect((view.players.A.stakeableSiteIds || []).length).toBe(view.frame.sites.length);
	});

	it('renders one Stake control per stakeable world, carrying the site id', () => {
		const { view } = makeView('A');
		mount(<ReclamationWorld {...worldProps(view)} />);
		const controls = [...container.querySelectorAll('[data-stake]')];
		expect(controls.length).toBe(view.frame.sites.length);
		expect(controls.map((n) => n.getAttribute('data-stake')).sort())
			.toEqual(view.frame.sites.map((s) => s.id).sort());
		expect(controls[0].textContent).toBe('Stake');
	});

	it('offers no Stake control where the handler may not stake', () => {
		const { view } = makeView('A');
		mount(<ReclamationWorld {...worldProps(view, { stakeableSiteIds: [] })} />);
		expect(container.querySelectorAll('[data-stake]').length).toBe(0);
	});

	it('pressing a Stake control asks for that world, and does not click through to the site', () => {
		const { view } = makeView('A');
		const asked = [];
		const sitesClicked = [];
		mount(<ReclamationWorld {...worldProps(view, {
			onStake: (id) => asked.push(id),
			onSiteClick: (id) => sitesClicked.push(id),
		})} />);
		const first = container.querySelector('[data-stake]');
		act(() => {
			first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});
		expect(asked).toEqual([first.getAttribute('data-stake')]);
		// the control lives inside the clickable tray: the stake must not also send
		expect(sitesClicked).toEqual([]);
	});

	it('marks a world staked by you with "counts two", in your side\'s colour', () => {
		const { match, view } = makeView('A');
		const siteId = view.frame.sites[0].id;
		const staked = stakeWorld(match, 'A', siteId);
		expect(staked).toBeTruthy();
		const next = getPublicState(staked, 'A');
		mount(<ReclamationWorld {...worldProps(next)} />);
		const mark = container.querySelector('[data-staked]');
		expect(mark).toBeTruthy();
		expect(mark.textContent).toBe('counts two');
		expect(mark.getAttribute('data-staked')).toBe('mine');
		expect(mark.getAttribute('data-staked-value')).toBe('2');
		expect(container.querySelector(`[data-site-id="${siteId}"]`).className)
			.toContain('rec-site--staked');
	});

	it('marks a world the rival staked in the rival\'s colour, still "counts two"', () => {
		const { match, view } = makeView('A');
		const siteId = view.frame.sites[1].id;
		const staked = stakeWorld(match, 'B', siteId);
		const next = getPublicState(staked, 'A');
		mount(<ReclamationWorld {...worldProps(next)} />);
		const mark = container.querySelector('[data-staked]');
		expect(mark.getAttribute('data-staked')).toBe('theirs');
		expect(mark.textContent).toBe('counts two');
	});

	it('a world both handlers staked reads "counts three" and wears both colours', () => {
		const { match, view } = makeView('A');
		const siteId = view.frame.sites[2].id;
		const both = stakeWorld(stakeWorld(match, 'A', siteId), 'B', siteId);
		const next = getPublicState(both, 'A');
		mount(<ReclamationWorld {...worldProps(next)} />);
		const mark = container.querySelector('[data-staked]');
		expect(mark.getAttribute('data-staked')).toBe('both');
		expect(mark.getAttribute('data-staked-value')).toBe('3');
		expect(mark.textContent).toBe('counts three');
	});

	it('a handler who has staked is offered no further Stake control', () => {
		const { match, view } = makeView('A');
		const staked = stakeWorld(match, 'A', view.frame.sites[0].id);
		const next = getPublicState(staked, 'A');
		expect(next.players.A.stakeUsed).toBe(true);
		expect(next.players.A.stakeableSiteIds).toEqual([]);
		mount(<ReclamationWorld {...worldProps(next)} />);
		expect(container.querySelectorAll('[data-stake]').length).toBe(0);
	});
});

describe('the stake, in words', () => {
	it('names the count in words, never as a multiplier', () => {
		expect(countWord(2)).toBe('two');
		expect(countWord(3)).toBe('three');
	});

	it('says who staked what, and what it counts', () => {
		expect(narrateStake({ you: true, worldName: 'Zolton', countedValue: 2 }))
			.toBe('You stake Zolton: it counts two.');
		expect(narrateStake({ you: false, worldName: 'Zolton', countedValue: 2 }))
			.toBe('The rival stakes Zolton: it counts two.');
		expect(narrateStake({ you: false, worldName: 'Zolton', countedValue: 3 }))
			.toBe('The rival stakes Zolton: it counts three.');
	});

	it('the Ruling names a staked world\'s count, and leaves an unstaked one alone', () => {
		const event = {
			type: 'judge',
			siteResults: {
				s1: {
					holdA: 12, holdB: 8, winner: 'A', staked: ['A'], countedValue: 2,
				},
				s2: {
					holdA: 4, holdB: 9, winner: 'B', staked: [], countedValue: 1,
				},
			},
		};
		const lines = narrateJudge(event, { siteNames: { s1: 'Zolton', s2: 'Krystos (Deep Vault)' }, you: 'A' });
		expect(lines[0]).toBe('Zolton (counting two) is yours, 12 against 8.');
		expect(lines[1]).toBe('Krystos (Deep Vault) goes to the rival, 9 against 4.');
	});
});

describe('the price of hiding, on the bench', () => {
	// a stealthy creature in the handler's own roster: only that one shows the toggle
	function stealthyIdOf(view) {
		const site = view.frame.sites[0];
		const found = (view.players.A.roster || []).find(
			(r) => prepare(r, site, null, 0, { rules: view.rules }).stealthy
		);
		return found ? found.id : null;
	}

	function benchProps(view, extra) {
		return {
			view,
			you: 'A',
			squad: view.players.A.roster,
			mode: 'advanced',
			armedRecordId: null,
			recommendation: null,
			sendHidden: false,
			movingRecordId: null,
			movable: [],
			onArm: () => {},
			onInspect: () => {},
			onHoverRecord: () => {},
			onToggleHidden: () => {},
			onPass: () => {},
			onBeginMove: () => {},
			rivalBeat: null,
			...extra,
		};
	}

	it('the engine tells the table what a hidden send costs', () => {
		const { view } = makeView('A');
		expect(view.hiddenSendCost).toBe(1);
	});

	it('at the default cost of one, the toggle shows no price and the pips preview one spent either way', () => {
		const { view } = makeView('A');
		const mine = withTurn(view, 'A');
		const stealthy = stealthyIdOf(mine);
		expect(stealthy).toBeTruthy();

		// armed but open: one pip is previewed
		mount(<ReclamationBench {...benchProps(mine, { armedRecordId: stealthy })} />);
		expect(container.querySelectorAll('.rec-send-pip--pending').length).toBe(1);
		expect(container.querySelector('[data-hidden-price]')).toBeFalsy();

		act(() => {
			ReactDOM.render(
				<ReclamationBench {...benchProps(mine, { armedRecordId: stealthy, sendHidden: true })} />,
				container
			);
		});
		// armed and hidden: still one, since a hidden send costs the same as any other
		expect(container.querySelectorAll('.rec-send-pip--pending').length).toBe(1);
		expect(container.querySelector('[data-hidden-toggle]').disabled).toBe(false);
		expect(container.querySelector('[data-hidden-price]')).toBeFalsy();
	});

	it('the lead names the hidden send but no price when it costs one', () => {
		const { view } = makeView('A');
		const mine = withTurn(view, 'A');
		const stealthy = stealthyIdOf(mine);
		mount(<ReclamationBench {...benchProps(mine, { armedRecordId: stealthy, sendHidden: true })} />);
		const lead = container.querySelector('[data-bench-lead]').textContent;
		expect(lead).toContain('Hidden: the rival will not see it until the worlds clash.');
		expect(lead).not.toContain('lands first');
		expect(lead).not.toContain('three quarters power');
		expect(lead).not.toContain('costs');
	});

	it('when a rules variant raises the cost above one, the toggle prints the price', () => {
		const { view } = makeView('A');
		const mine = withTurn(view, 'A');
		const stealthy = stealthyIdOf(mine);
		const dearer = { ...mine, hiddenSendCost: 2 };
		mount(<ReclamationBench {...benchProps(dearer, { armedRecordId: stealthy })} />);
		const price = container.querySelector('[data-hidden-price]');
		expect(price).toBeTruthy();
		expect(price.textContent).toBe('costs 2 sends');
	});

	it('with no sends left the toggle is disabled', () => {
		const { view } = makeView('A');
		const mine = withSentCount(withTurn(view, 'A'), 'A', (view.players.A.sendableCap || 10));
		const stealthy = stealthyIdOf(mine);
		mount(<ReclamationBench {...benchProps(mine, { armedRecordId: stealthy, sendHidden: true })} />);
		const toggle = container.querySelector('[data-hidden-toggle]');
		expect(toggle.disabled).toBe(true);
		expect(toggle.checked).toBe(false);
	});

	it('a rules variant that raises the cost above what is left shows the unaffordable price', () => {
		const { view } = makeView('A');
		const mine = withSentCount(withTurn(view, 'A'), 'A', (view.players.A.sendableCap || 10) - 1);
		const stealthy = stealthyIdOf(mine);
		const dearer = { ...mine, hiddenSendCost: 2 };
		mount(<ReclamationBench {...benchProps(dearer, { armedRecordId: stealthy, sendHidden: true })} />);
		const toggle = container.querySelector('[data-hidden-toggle]');
		expect(toggle.disabled).toBe(true);
		expect(container.querySelector('[data-hidden-price]').textContent).toBe('not enough sends left');
	});
});

describe("the draft's shape", () => {
	it('deals fifteen under the rules the match will be created with', () => {
		const { poolA, poolB } = buildDraftPools(SEED, draftOptionsFromRules(DEFAULT_RULES));
		expect(DEFAULT_RULES.draftPoolSize).toBe(15);
		expect(poolA.length).toBe(15);
		expect(poolB.length).toBe(15);
	});

	it('the draft head says keep twelve of fifteen', () => {
		const { poolA } = buildDraftPools(SEED, draftOptionsFromRules(DEFAULT_RULES));
		const { frames } = buildDraftPools(SEED, draftOptionsFromRules(DEFAULT_RULES));
		mount(
			<ReclamationDraft
				pool={poolA}
				frames={frames}
				keepIds={[]}
				onToggle={() => {}}
				onKeepAll={() => {}}
				onConfirm={() => {}}
				rivalName="Proctor"
			/>
		);
		expect(container.querySelector('.rec-draft-heading').textContent).toBe('Keep twelve of fifteen');
		expect(container.querySelectorAll('[data-draft]').length).toBe(15);
	});
});
