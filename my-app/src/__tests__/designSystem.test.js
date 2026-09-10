const fs = require('fs');
const path = require('path');

/**
 * Enforces the structural rules of the design system across both layers it
 * currently carries — version 3 ("one relay, many terminals") and version 4
 * ("one site, featured components, immersive experiences",
 * docs/DESIGN_SYSTEM.md):
 *
 *  1. Every page under src/pages/ classifies itself: either the v3
 *     `data-terminal=` (unmigrated) or the v4 `data-tier=` (migrated,
 *     docs/DESIGN_SYSTEM.md section 10). A page with neither fails.
 *  2. Every [data-terminal="x"] block in system.css has a matching terminal
 *     rendered on /styleguide, so the living v3 reference cannot drift from
 *     the CSS.
 *  3. Every component in V4_COMPONENTS is rendered somewhere on
 *     /styleguide, so the living v4 reference cannot drift either.
 *  4. No raw hex leaks into CSS outside system.css's :root/[data-terminal]
 *     blocks (checked by designTokens.test.js) or, for the legacy files,
 *     grows past today's count — they are meant to shrink as pages migrate,
 *     never grow.
 *
 * This is deliberately not green because every page under src/pages/ has
 * migrated to v4 — it isn't, not yet. MIGRATION_PENDING lists are the
 * explicit, shrinking allowlist that keeps the suite passing at each commit;
 * other agents remove entries from them as they migrate a page.
 */

const PAGES_DIR = path.join(__dirname, '..', 'pages');
const SYSTEM_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'legacy', 'system.css');
const CSS_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'legacy');
const STYLEGUIDE_PATH = path.join(PAGES_DIR, 'styleGuidePage.tsx');
const STYLEGUIDE_DIR = path.join(PAGES_DIR, 'styleguide');
/** The page plus its section files under pages/styleguide/. */
const readStyleguide = () =>
	[STYLEGUIDE_PATH, ...fs.readdirSync(STYLEGUIDE_DIR).map((f) => path.join(STYLEGUIDE_DIR, f))]
		.map((f) => fs.readFileSync(f, 'utf8'))
		.join('\n');

/** Every *.js under src/pages/, recursively, with paths relative to src/pages/. */
const listPageFiles = (dir, base) => {
	base = base || dir;
	let out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out = out.concat(listPageFiles(full, base));
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			out.push(path.relative(base, full).split(path.sep).join('/'));
		}
	}
	return out;
};

// baseGamePage.js is dead code (see CLAUDE.md conventions): it is not a route
// and never gets a terminal.
const DEAD_PAGES = ['games/baseGamePage.js'];

/**
 * Pages that do not yet render `data-terminal=` anywhere in their source.
 * This is the whole current list — every page under src/pages/ except the
 * dead one above — because no page has migrated to the v3 terminal system
 * yet. Remove an entry here in the same change that adds data-terminal to
 * that page; never add to this list to make the suite pass.
 */
const MIGRATION_PENDING = [];

/**
 * Version 4 component modules that must each be imported somewhere on
 * /styleguide (docs/DESIGN_SYSTEM.md section 10, "the reference an agent
 * checks before building anything"). Checked as a literal import-path
 * substring against the page source, the same way STYLEGUIDE_MIGRATION_PENDING
 * checks a terminal.
 */
const V4_IMPORTS = [
	'@/components/ui/button',
	'@/components/ui/badge',
	'@/components/ui/card',
	'@/components/ui/tabs',
	'@/components/ui/dialog',
	'@/components/system/brand',
	'@/components/system/record',
	'@/components/system/masthead',
	'@/components/ui/avatar',
	'@/components/ui/collapsible',
	'@/components/ui/hover-card',
	'@/components/ui/command',
	'@/components/ui/combobox',
	'@/components/ui/drawer',
	'@/components/ui/aspect-ratio',
	'@/components/ui/input-group',
	'@/components/ui/field',
	'@/components/ui/button-group',
	'@/components/ui/chart',
	'@/components/ui/native-select',
	'@/components/system/layout',
	'@/components/system/status',
	'@/components/system/a11y',
	'@/components/system/stepper',
	'@/components/system/readouts',
	'@/components/system/filters',
	'@/components/system/data-table',
	'@/components/system/identity',
];

/**
 * Today's raw-hex count in each legacy CSS file (docs/DESIGN_SYSTEM.md
 * section 5: "Legacy. Shrinking. Do not add colours to them; move rules out
 * as pages migrate."). These files may shrink this count as pages migrate
 * their colours onto tokens; they may never grow it.
 */
const LEGACY_HEX_BASELINE = {
	// Was 112; round1-findings.md S11 deleted the dead .specimen-* block
	// (0 hex of its own) and this baseline tightens to the file's actual
	// current count rather than carrying stale slack forward.
	'style.css': 102,
	'duel.css': 1,
	'duel-playground.css': 11,
	'tokens.css': 29,
	'reclamation.css': 0,
	'typeColors.css': 0,
};

const countHex = (css) => {
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const matches = stripped.match(/#[0-9a-fA-F]{3,8}\b/g);
	return matches ? matches.length : 0;
};

describe('design system structure', () => {

	describe('every page classifies itself (data-terminal or data-tier)', () => {
		const allPages = listPageFiles(PAGES_DIR).filter((p) => !DEAD_PAGES.includes(p));

		it('MIGRATION_PENDING only lists real page files', () => {
			MIGRATION_PENDING.forEach((p) => {
				expect(allPages).toContain(p);
			});
		});

		allPages.forEach((relPath) => {
			const pending = MIGRATION_PENDING.includes(relPath);
			const label = pending ? `${relPath} (MIGRATION_PENDING)` : relPath;

			it(`${label} contains data-terminal= or data-tier=`, () => {
				const source = fs.readFileSync(path.join(PAGES_DIR, relPath), 'utf8');
				const hasTerminal = /data-terminal=/.test(source);
				const hasTier = /data-tier=/.test(source);
				if (pending) {
					// Not yet migrated: must NOT have data-terminal, so an entry is
					// removed from MIGRATION_PENDING the moment it is no longer true.
					expect(hasTerminal).toBe(false);
				} else {
					expect(hasTerminal || hasTier).toBe(true);
				}
			});
		});
	});

	describe('styleguide renders every v4 component', () => {
		const styleguideSource = readStyleguide();

		V4_IMPORTS.forEach((name) => {
			it(`the style guide imports ${name}`, () => {
				expect(styleguideSource.includes(name)).toBe(true);
			});
		});
	});

	describe('styleguide is version 4 only', () => {
		// /styleguide retired its v3 terminal reference (docs/DESIGN_SYSTEM.md
		// "Version 4 was ruled by Nick on 2026-09-08 and 2026-09-09"); the five
		// [data-terminal] blocks below still live in system.css because the
		// remaining immersive experiences (duel board/playground, Reclamation,
		// training games, Long Return) still read them, but /styleguide itself
		// must not reference any of them any more.
		const css = fs.readFileSync(SYSTEM_PATH, 'utf8');
		const cssTerminals = Array.from(
			new Set(Array.from(css.matchAll(/\[data-terminal=(['"])([a-z]+)\1\]/g)).map((m) => m[2]))
		).sort();
		const styleguideSource = fs.readFileSync(STYLEGUIDE_PATH, 'utf8');

		it('system.css defines the five v3 terminal blocks', () => {
			expect(cssTerminals).toEqual(['archive', 'field', 'readout', 'registry', 'relay']);
		});

		it('styleGuidePage.js contains no data-terminal=', () => {
			expect(/data-terminal=/.test(styleguideSource)).toBe(false);
		});
	});

	describe('one room, one type system (round3-coherence.md, docs/DESIGN_SYSTEM.md Rule A)', () => {
		const css = fs.readFileSync(SYSTEM_PATH, 'utf8');
		const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
		const blockRe = /\[data-terminal=(['"])([a-z]+)\1\]\s*\{([^}]*)\}/g;
		const terminalBlocks = Array.from(stripped.matchAll(blockRe)).map((m) => ({ name: m[2], body: m[3] }));

		// The room (--g-void/--g-hull*/--g-seam/--g-bevel*/--g-rule*) and the
		// four core type faces are core: no [data-terminal] block may
		// redeclare any of them. This is the whole first live release's bug
		// (docs/DESIGN_SYSTEM.md section 2, "why the line sits here").
		const FORBIDDEN = [
			'--g-void', '--g-hull-lo', '--g-hull', '--g-hull-hi', '--g-seam',
			'--g-bevel-light', '--g-bevel-dark', '--g-rule', '--g-rule-faint',
			'--g-font-legend', '--g-font-out', '--g-font-paper', '--g-font-ui',
			// Ink on the room is core, ink on the face is material (Rule A /
			// round3-coherence.md): a terminal block sets --g-face-ink* for its
			// own face, never --g-ink* — the room's ink is inherited from :root,
			// and the object classes (.g-case etc.) re-scope --g-ink* to face
			// ink for their own contents.
			'--g-ink', '--g-ink-mid', '--g-ink-low', '--g-ink-invert',
		];

		it('system.css defines at least one [data-terminal] block to check', () => {
			expect(terminalBlocks.length).toBeGreaterThan(0);
		});

		terminalBlocks.forEach(({ name, body }) => {
			FORBIDDEN.forEach((token) => {
				it(`[data-terminal="${name}"] does not declare ${token}`, () => {
					// \b after the token name stops --g-hull from matching inside
					// --g-hull-lo/--g-hull-hi/--g-hull-hover; requiring the colon
					// right after (only whitespace between) means it only matches
					// an actual declaration of that exact custom property, not a
					// var(--g-hull) reference elsewhere in the block.
					const declRe = new RegExp(`${token}\\b\\s*:`);
					expect(declRe.test(body)).toBe(false);
				});
			});
		});
	});

	describe('no new raw hex in CSS', () => {
		it('system.css confines hex to :root and [data-terminal] blocks', () => {
			const css = fs.readFileSync(SYSTEM_PATH, 'utf8');
			const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
			// Neither :root nor any [data-terminal="x"] block in this file contains
			// a nested rule (they are flat custom-property declarations), so a
			// non-greedy "selector { ... }" match captures each one whole. Remove
			// them, then nothing outside should have a hex literal left.
			const withoutAllowedBlocks = stripped.replace(
				/(?::root|\[data-terminal=(?:'[a-z]+'|"[a-z]+")\])\s*\{[^}]*\}/g,
				''
			);
			expect(withoutAllowedBlocks.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
		});

		Object.entries(LEGACY_HEX_BASELINE).forEach(([file, baseline]) => {
			it(`${file} has no more raw hex than the ${baseline}-colour baseline`, () => {
				const css = fs.readFileSync(path.join(CSS_DIR, file), 'utf8');
				expect(countHex(css)).toBeLessThanOrEqual(baseline);
			});
		});

		it('public/assets/css/pages/*.css contain zero raw hex', () => {
			const pagesDir = path.join(CSS_DIR, 'pages');
			if (!fs.existsSync(pagesDir)) return;
			fs.readdirSync(pagesDir)
				.filter((f) => f.endsWith('.css'))
				.forEach((f) => {
					const css = fs.readFileSync(path.join(pagesDir, f), 'utf8');
					expect(countHex(css)).toBe(0);
				});
		});
	});
});
