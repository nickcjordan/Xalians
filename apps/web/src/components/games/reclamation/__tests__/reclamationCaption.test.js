import { describe, it, expect } from 'vitest';
import { captionEvent, narrateEvent } from '../reclamationNarration';

const rakh = { name: 'Rakh', seat: 'A' };
const vrix = { name: 'Vrix', seat: 'B' };
const text = (parts) => parts.map((p) => (typeof p === 'string' ? p : p.name)).join('');

describe('captionEvent', () => {
	it('keeps the two names as parts, so each can wear its side', () => {
		const parts = captionEvent({ type: 'attack', role: 'strike', outcome: 'hurt', power: 4, remaining: 3 }, { actor: rakh, target: vrix });
		expect(parts[0]).toBe(rakh);
		expect(parts[2]).toBe(vrix);
		expect(text(parts)).toBe('Rakh strikes Vrix: −4, 3 left');
	});
	it('says a down, a sweep, a block and a bolster in a phone column\'s words', () => {
		expect(text(captionEvent({ type: 'attack', outcome: 'downed', power: 9 }, { actor: rakh, target: vrix }))).toBe('Rakh downs Vrix');
		expect(text(captionEvent({ type: 'sweep', power: 2, hitCount: 3 }, { actor: rakh }))).toBe('Rakh sweeps: −2 to each of 3');
		expect(text(captionEvent({ type: 'sweep', power: 2, hitCount: 1 }, { actor: rakh }))).toBe('Rakh sweeps: −2');
		expect(text(captionEvent({ type: 'sweep', power: 2, hitCount: 0 }, { actor: rakh }))).toBe('Rakh sweeps and hits nothing');
		expect(text(captionEvent({ type: 'shield', cancelled: 'x', amount: 4 }, { actor: rakh, target: vrix }))).toBe("Rakh blocks Vrix's 4");
		expect(text(captionEvent({ type: 'recover', amount: 2 }, { actor: rakh, bolster: vrix }))).toBe('Vrix gives Rakh 2 back');
	});
	it('says when a sweep catches its own side', () => {
		const mine = { name: 'Hippochamp', seat: 'A' };
		expect(text(captionEvent({ type: 'attack', role: 'sweep', outcome: 'hurt', power: 6, remaining: 3 }, { actor: rakh, target: mine }))).toBe('Rakh hits its own Hippochamp: −6, 3 left');
		expect(text(captionEvent({ type: 'attack', role: 'sweep', outcome: 'downed', power: 6 }, { actor: rakh, target: mine }))).toBe('Rakh downs its own Hippochamp');
	});
	it('never says a standing creature has 0 left', () => {
		expect(text(captionEvent({ type: 'attack', role: 'sweep', outcome: 'hurt', power: 4, remaining: 0.4 }, { actor: rakh, target: vrix }))).toBe('Rakh hits Vrix: −4, barely standing');
		expect(narrateEvent({ type: 'attack', role: 'sweep', outcome: 'hurt', power: 4, remaining: 0.4 }, { actorName: 'Rakh', targetName: 'Vrix' }))
			.toBe('Rakh hits Vrix for 4; Vrix barely stands.');
	});
	it('shows nothing for what another event already says', () => {
		expect(captionEvent({ type: 'attack', outcome: 'cancelled' }, { actor: rakh })).toBe(null);
		expect(captionEvent({ type: 'judge' })).toBe(null);
		expect(captionEvent(null)).toBe(null);
	});
});
