import { buildDraftPools, botDraft, validateKeep } from '@xalians/rules/expedition/draft';
import { RIVALS } from '@xalians/rules/expedition/expeditionBot';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';

/*
	ReclamationDraft coverage.

	@testing-library/react is not in apps/web's devDependencies (checked package.json;
	only @testing-library/jest-dom is present, and nothing else in this repo renders a
	component under Vitest), so this file does not mount the component. It instead
	exercises the pure helpers the component is built on (draft.js), the same helpers a
	render-based test would assert against once that dependency exists, plus the
	"pick for me" wiring: ReclamationDraft's onKeepAll button calls botDraft(pool,
	frames, { id: 'proctor' }) per the task brief, so this confirms that call always
	yields a valid keep.
*/

describe('ReclamationDraft data contract (component not mounted, see file header)', () => {
	it('"Pick for me" (botDraft with the proctor) always yields a valid keep of twelve', () => {
		const { poolA, frames } = buildDraftPools(17);
		const proctor = RIVALS.find((r) => r.id === 'proctor');
		const kept = botDraft(poolA, frames, proctor);
		expect(validateKeep(poolA, kept)).toBe(true);
		expect(kept.length).toBe(ROSTER_SIZE);
	});

	it('the first frame (round 1) always carries three worlds for the head chips', () => {
		const { frames } = buildDraftPools(4);
		expect(frames[0].sites.length).toBe(3);
	});

	it('every pool record carries the fields the card reads (species, element, id)', () => {
		const { poolA } = buildDraftPools(6);
		poolA.forEach((record) => {
			expect(typeof record.id).toBe('string');
			expect(typeof record.species).toBe('string');
			expect(record.element && typeof record.element.primary).toBe('string');
		});
	});
});
