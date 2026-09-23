import { describe, it, expect } from 'vitest';
import { strainCause, strainNote } from '../reclamationPreview';
import { formatHoldShown } from '../reclamationNarration';

const site = (min, max, medium = 'gas') => ({ environment: { medium, temperatureC: { min, max } } });
const tol = (min, max, extra = {}) => ({ temperatureC: { min, max }, ambientMedia: ['gas'], breathes: ['gas'], ...extra });

describe('strainCause', () => {
	it('names the side of the band that reaches past the creature', () => {
		expect(strainCause(tol(0, 60), site(-40, 20))).toBe('cold');
		expect(strainCause(tol(-60, 0), site(10, 50))).toBe('hot');
	});
	it('is quiet when the creature covers enough of the world band', () => {
		expect(strainCause(tol(-10, 60), site(-20, 40))).toBe(null);
	});
	it('puts breath before temperature, and the medium after it', () => {
		expect(strainCause(tol(0, 60, { breathes: ['liquid'] }), site(-40, 20))).toBe('breath');
		expect(strainCause(tol(-50, 50, { ambientMedia: ['liquid'] }), site(-20, 20))).toBe('medium');
	});
});

describe('strainNote', () => {
	const ghost = (level, hold, unstrained, t = tol(0, 60)) => ({ strainLevel: level, hold, unstrained, tolerance: t });
	it('says why and what it costs', () => {
		const note = strainNote(ghost('strained', 7, 14), site(-40, 20), formatHoldShown);
		expect(note.text).toBe('Too cold: −7 hold');
		expect(note.title).toMatch(/^Strained here \(too cold\)/);
	});
	it('grades a severe strain in the title', () => {
		expect(strainNote(ghost('severe', 3, 14, tol(0, 60, { breathes: ['liquid'] })), site(-40, 20), formatHoldShown).title).toMatch(/^Severely strained/);
	});
	it('says nothing without strain, or when the cost rounds away', () => {
		expect(strainNote(ghost('none', 14, 14), site(-40, 20), formatHoldShown)).toBe(null);
		expect(strainNote(ghost('strained', 7, 7.2), site(-40, 20), formatHoldShown)).toBe(null);
		expect(strainNote(null, site(-40, 20), formatHoldShown)).toBe(null);
	});
});
