import { describe, it, expect, afterEach, vi } from 'vitest';
import { atOneX } from '../plateStage';

const html = '<svg><image href="/assets/plates/x/live/sky-0.webp" x="0"/><image href="/assets/plates/x/live/1x/far-1.webp"/><rect/></svg>';

function screenOf(width: number, dpr: number) {
	vi.stubGlobal('innerWidth', width);
	vi.stubGlobal('devicePixelRatio', dpr);
}

describe('baked plate pictures', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('takes the 1x set on a phone and on a 1x desktop', () => {
		screenOf(390, 3);
		expect(atOneX(html)).toContain('/live/1x/sky-0.webp');
		screenOf(1440, 1);
		expect(atOneX(html)).toContain('/live/1x/sky-0.webp');
		// never twice
		expect(atOneX(html)).not.toContain('1x/1x/');
	});

	it('keeps the 2x set on a high density desktop screen', () => {
		screenOf(1440, 2);
		expect(atOneX(html)).toBe(html);
	});
});
