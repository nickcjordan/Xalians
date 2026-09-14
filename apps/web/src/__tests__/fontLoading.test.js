const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');

describe('font loading', () => {
	const html = read('index.html');
	const stylesheetUrls = [...html.matchAll(/<link\s+href="([^"]+)"\s+rel="stylesheet">/g)]
		.map((match) => match[1])
		.filter((href) => href.startsWith('https://fonts.googleapis.com/'));

	it('uses one Google Fonts request and preconnects both origins', () => {
		expect(stylesheetUrls).toHaveLength(1);
		expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
		expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
	});

	it('requests only the audited live families and variants', () => {
		const url = new URL(stylesheetUrls[0]);
		expect(url.searchParams.getAll('family')).toEqual([
			'Abel',
			'Atkinson Hyperlegible:wght@400;700',
			'Cinzel:wght@500',
			'Iceland',
			'Martian Mono:wght@400;500',
			'Michroma',
			'Saira:wght@500;600;700',
		]);
		expect(url.searchParams.get('display')).toBe('swap');
	});

	it('keeps retired remote fallbacks out of the blocking request', () => {
		const requested = stylesheetUrls[0];
		[
			'Barlow',
			'IBM+Plex',
			'Oswald',
			'Share+Tech',
			'Space+Mono',
			'Special+Elite',
			'Caveat',
			'Spectral',
			'Chakra+Petch',
		].forEach((family) => expect(requested).not.toContain(family));
	});
});
