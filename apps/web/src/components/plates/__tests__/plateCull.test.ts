import { describe, it, expect } from 'vitest';
import { cullAt, prepareCull } from '../plateCull';

function plate(marks: string) {
	const host = document.createElement('div');
	host.innerHTML = `<svg class="defs" data-cull-fps="20"></svg><svg class="layer"><rect id="a"/>${marks}<rect id="z"/></svg>`;
	return host;
}
const order = (host: HTMLElement) => [...host.querySelectorAll('svg.layer > *')].map((e) => e.id).join(' ');

describe('plate culling', () => {
	it('has nothing to do on a plate the bake did not mark', () => {
		const host = document.createElement('div');
		host.innerHTML = '<svg class="defs"></svg><svg class="layer"><rect data-cull="10:0-2"/></svg>';
		expect(prepareCull(host)).toBeNull();
	});

	it('keeps a piece in the page only in the frames of its own loop where it shows, in its place', () => {
		// a 40-frame loop (2 s at 20 fps), showing in frames 5 to 9
		const host = plate('<circle id="b" data-cull="40:5-10"/>');
		const cull = prepareCull(host)!;
		cullAt(cull, 0);
		expect(order(host)).toBe('a z');
		cullAt(cull, 0.25); // frame 5
		expect(order(host)).toBe('a b z');
		cullAt(cull, 0.45); // frame 9
		expect(order(host)).toBe('a b z');
		cullAt(cull, 0.5); // frame 10
		expect(order(host)).toBe('a z');
		cullAt(cull, 2.3); // frame 46, which is 6 of the next loop
		expect(order(host)).toBe('a b z');
	});

	it('handles several spans, one running over the end of the loop', () => {
		const host = plate('<circle id="b" data-cull="20:0-2,18-20"/><circle id="c" data-cull="20:4-6"/>');
		const cull = prepareCull(host)!;
		cullAt(cull, 0);
		expect(order(host)).toBe('a b z');
		cullAt(cull, 0.2); // frame 4
		expect(order(host)).toBe('a c z');
		cullAt(cull, 0.95); // frame 19
		expect(order(host)).toBe('a b z');
	});
});
