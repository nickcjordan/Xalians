import { describe, expect, it } from 'vitest';
import { sizeLine } from '../reclamationVocabulary.js';

describe('Reclamation creature scale', () => {
	it('names the dimensions present on a 5.1 record and its mass', () => {
		expect(sizeLine({ lengthCm: 215, widthCm: 65, massKg: 130 }))
			.toBe('length 215 cm, width 65 cm, mass 130 kg');
	});
	it('keeps the legacy weight display when inspecting an older record', () => {
		expect(sizeLine({ heightCm: 70, weightKg: 30 })).toBe('height 70 cm, 30 kg');
	});
});
