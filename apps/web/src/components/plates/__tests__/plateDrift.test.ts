import { describe, it, expect } from 'vitest';
import { driftAt, prepareDrift } from '../plateDrift';

function plate() {
	const host = document.createElement('div');
	// a sheet sliding 10% across and 20% down its own size every half second, from a quarter of the way in;
	// a box fading 0 to 1 to 0 over two seconds
	host.innerHTML = '<div class="plate-drift"><div data-fade="2;0;0,1,0;0,0.5,1"><div data-drift="0.5;-0.125;10;20"></div></div></div>';
	return host;
}

describe('drifting sheets', () => {
	it('has nothing to do on a plate without them', () => {
		expect(prepareDrift(document.createElement('div'))).toBeNull();
	});

	it('slides a sheet along its loop on the plate clock, from its start', () => {
		const host = plate();
		const d = prepareDrift(host)!;
		const sheet = host.querySelector<HTMLElement>('[data-drift]')!;
		driftAt(d, 0);
		expect(sheet.style.transform).toBe('translate(2.5000%, 5.0000%)');
		driftAt(d, 0.25);
		expect(sheet.style.transform).toBe('translate(7.5000%, 15.0000%)');
		driftAt(d, 0.375); // a whole loop from its start: back where it began
		expect(sheet.style.transform).toBe('translate(0.0000%, 0.0000%)');
	});

	it('fades a box linearly between its key times', () => {
		const host = plate();
		const d = prepareDrift(host)!;
		const box = host.querySelector<HTMLElement>('[data-fade]')!;
		driftAt(d, 0);
		expect(box.style.opacity).toBe('0');
		driftAt(d, 0.5);
		expect(box.style.opacity).toBe('0.5');
		driftAt(d, 1);
		expect(box.style.opacity).toBe('1');
		driftAt(d, 3.5); // 1.5 into the next loop
		expect(box.style.opacity).toBe('0.5');
	});
});
