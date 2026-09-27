import { describe, expect, it, vi } from 'vitest';
import { hasSmil, prepareTimeline, timelineAt } from '../plateTimeline';

// A plate's SMIL played by script: what it takes over, what it leaves to SMIL, and the values it sets.
function plate(inner: string) {
	const host = document.createElement('div');
	host.innerHTML = `<svg class="layer" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
	document.body.appendChild(host);
	return host;
}
const at = (host: HTMLElement, s: number) => {
	const tl = prepareTimeline(host)!;
	timelineAt(tl, s);
	return tl;
};

describe('prepareTimeline and timelineAt', () => {
	it('plays a looping opacity with key times from a negative begin, as inline style', () => {
		const host = plate('<ellipse id="e" opacity="0"><animate attributeName="opacity" values="0;.8;0" keyTimes="0;.25;1" dur="2s" begin="-0.5s" repeatCount="indefinite"/></ellipse>');
		const tl = prepareTimeline(host)!;
		const e = host.querySelector<SVGElement>('#e')!;
		expect(host.querySelector('animate')).toBeNull();
		timelineAt(tl, 0); // half a second into the loop: at the peak
		expect(e.style.opacity).toBe('0.8');
		timelineAt(tl, 0.75); // 1.25 s in: a third of the way down from the peak
		expect(Number(e.style.opacity)).toBeCloseTo(0.8 * (1 - 0.75 / 1.5), 3);
		timelineAt(tl, 1.5); // the loop's edge: the next loop's first value
		expect(e.style.opacity).toBe('0');
	});

	it('eases along key splines and holds discrete steps', () => {
		const host = plate(
			'<rect id="s"><animate attributeName="width" values="0;10" dur="1s" calcMode="spline" keySplines=".42 0 .58 1" repeatCount="indefinite"/></rect>' +
				'<rect id="d"><animate attributeName="x" values="1;2;3" dur="3s" calcMode="discrete" repeatCount="indefinite"/></rect>'
		);
		const tl = prepareTimeline(host)!;
		timelineAt(tl, 0.5);
		expect(Number(host.querySelector('#s')!.getAttribute('width'))).toBeCloseTo(5, 3);
		timelineAt(tl, 0.25);
		expect(Number(host.querySelector('#s')!.getAttribute('width'))).toBeLessThan(2.5);
		expect(host.querySelector('#d')!.getAttribute('x')).toBe('1');
		timelineAt(tl, 1.5);
		expect(host.querySelector('#d')!.getAttribute('x')).toBe('2');
		timelineAt(tl, 2.9);
		expect(host.querySelector('#d')!.getAttribute('x')).toBe('3');
	});

	it('keeps the base value before a later begin, and freezes or lets go at the end', () => {
		const host = plate(
			'<circle id="f" r="1"><animate attributeName="r" from="2" to="4" dur="1s" begin="1s" fill="freeze"/></circle>' +
				'<circle id="g" r="1"><animate attributeName="r" from="2" to="4" dur="1s" begin="1s"/></circle>'
		);
		const tl = prepareTimeline(host)!;
		const r = (id: string) => host.querySelector(`#${id}`)!.getAttribute('r');
		timelineAt(tl, 0.5);
		expect([r('f'), r('g')]).toEqual(['1', '1']);
		timelineAt(tl, 1.5);
		expect([r('f'), r('g')]).toEqual(['3', '3']);
		timelineAt(tl, 5);
		expect([r('f'), r('g')]).toEqual(['4', '1']);
	});

	it('morphs a path between values of one shape', () => {
		const host = plate('<path id="p" d="M0 0 L1 1"><animate attributeName="d" values="M0 0 L1 1;M0 0 L3 -1" dur="2s" repeatCount="indefinite"/></path>');
		at(host, 1);
		expect(host.querySelector('#p')!.getAttribute('d')).toBe('M0 0 L2 0');
	});

	it('sums transform animations onto the element’s own transform, in order of begin', () => {
		const host = plate(
			'<g id="t" transform="rotate(10)"><animateTransform attributeName="transform" type="translate" values="0 0;10 20" dur="2s" begin="-1s" additive="sum" repeatCount="indefinite"/>' +
				'<animateTransform attributeName="transform" type="scale" values="1;3" dur="2s" additive="sum" repeatCount="indefinite"/></g>'
		);
		at(host, 0);
		expect(host.querySelector('#t')!.getAttribute('transform')).toBe('rotate(10) translate(5 10) scale(1)');
	});

	it('replaces the element’s own transform while a replacing animation runs, and gives it back after', () => {
		const host = plate('<g id="t" transform="rotate(10)"><animateTransform attributeName="transform" type="translate" values="0 0;10 0" dur="1s" begin="1s"/></g>');
		const tl = prepareTimeline(host)!;
		timelineAt(tl, 0.5);
		expect(host.querySelector('#t')!.getAttribute('transform')).toBe('rotate(10)');
		timelineAt(tl, 1.5);
		expect(host.querySelector('#t')!.getAttribute('transform')).toBe('translate(5 0)');
		timelineAt(tl, 3);
		expect(host.querySelector('#t')!.getAttribute('transform')).toBe('rotate(10)');
	});

	it('leaves to SMIL what it cannot play exactly', () => {
		const host = plate(
			'<g id="m"><animateMotion path="M0 0 L10 0" dur="1s"/><animateTransform attributeName="transform" type="rotate" values="0;90" dur="1s"/></g>' +
				'<rect id="two"><animate attributeName="x" values="0;1" dur="1s"/><animate attributeName="x" values="2;3" dur="1s" begin="0.5s"/></rect>' +
				'<rect id="add"><animate attributeName="y" values="0;1" dur="1s" additive="sum"/></rect>' +
				'<rect id="ev"><animate attributeName="y" values="0;1" dur="1s" begin="click"/></rect>' +
				'<rect id="pct"><animate attributeName="width" values="10%;20%" dur="1s"/></rect>' +
				'<rect id="fill"><animate attributeName="fill" values="red;blue" dur="1s"/></rect>'
		);
		expect(prepareTimeline(host)).toBeNull();
		expect(host.querySelectorAll('animate, animateTransform, animateMotion')).toHaveLength(8);
		expect(hasSmil(host.querySelector('svg')!)).toBe(true);
	});

	it('says when a layer has no SMIL left', () => {
		const host = plate('<rect><animate attributeName="x" values="0;1" dur="1s"/></rect>');
		prepareTimeline(host);
		expect(hasSmil(host.querySelector('svg')!)).toBe(false);
	});

	it('skips a piece culled out of the page, sets it when it is back, and never re-sets an unchanged value', () => {
		const host = plate('<g id="piece"><rect id="r"><animate attributeName="opacity" values="0;0;1" keyTimes="0;.5;1" dur="2s" repeatCount="indefinite"/></rect></g>');
		const tl = prepareTimeline(host)!;
		const piece = host.querySelector('#piece')!;
		const r = host.querySelector<SVGElement>('#r')!;
		const mark = document.createComment('');
		piece.replaceWith(mark);
		timelineAt(tl, 1.5);
		expect(r.style.opacity).toBe('');
		mark.replaceWith(piece);
		timelineAt(tl, 1.5);
		expect(r.style.opacity).toBe('0.5');
		const set = vi.spyOn(r.style, 'setProperty');
		timelineAt(tl, 0.2);
		timelineAt(tl, 0.4); // still 0: nothing written
		expect(set).toHaveBeenCalledTimes(1);
	});
});
