import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router-dom';
import encyclopedia from '../../json/encyclopedia.json';
import Pronunciation from '../../components/encyclopedia/Pronunciation';
import EntryView from '../../components/encyclopedia/EntryView';

const byKey = Object.fromEntries(encyclopedia.entries.map((e) => [e.key, e]));

// No @testing-library/react in this project, so mount with react-dom directly
// and read the painted DOM. Returns the container so a test can assert on
// what actually rendered rather than on props.
function paint(element) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	act(() => {
		ReactDOM.render(element, container);
	});
	return container;
}


describe('pronunciation data', () => {
	it('carries a respelling and IPA on every entry that has one', () => {
		const withPron = encyclopedia.entries.filter((e) => e.pronunciation);
		expect(withPron.length).toBeGreaterThan(80);
		for (const e of withPron) {
			expect(e.pronunciation.respelling, e.key).toBeTruthy();
			expect(e.pronunciation.ipa, e.key).toBeTruthy();
		}
	});

	it('holds the rulings Nick made', () => {
		expect(byKey['phantiri'].pronunciation.respelling).toBe('fan-TEER-ee');
		expect(byKey['xalia'].pronunciation.respelling).toBe('ZAY-lee-uh');
		expect(byKey['xalians'].pronunciation.respelling).toBe('ZAY-lee-unz');
		expect(byKey['saiphus'].pronunciation.respelling).toBe('SIGH-fus');
		expect(byKey['grimedes'].pronunciation.respelling).toBe('gri-MEE-deez');
		expect(byKey['vallerii'].pronunciation.respelling).toBe('val-LEH-ree-eye');
		expect(byKey['luceras'].pronunciation.respelling).toBe('loo-SEH-rus');
		expect(byKey['algael'].pronunciation.respelling).toBe('AL-gale');
	});

	it('leaves transparent English names unmarked', () => {
		for (const key of ['death-tide', 'drilltail', 'world-trees', 'the-end-wars']) {
			expect(byKey[key].pronunciation, key).toBeUndefined();
		}
	});

	it('never contradicts itself across entries sharing a name', () => {
		const p = (k) => byKey[k].pronunciation.respelling;
		expect(p('operation-phantiri')).toBe(p('phantiri'));
		expect(p('battle-of-grimedes')).toBe(p('grimedes'));
		expect(p('magmuth-massacre')).toBe(p('magmuth'));
	});
});

describe('pronunciation rendering', () => {
	it('paints the respelling for an entry that has one', () => {
		const c = paint(<Pronunciation pronunciation={byKey['phantiri'].pronunciation} />);
		expect(c.textContent).toContain('fan-TEER-ee');
		expect(c.querySelector('.enc-pronunciation')).toBeTruthy();
		// the IPA rides along as the title attribute
		expect(c.querySelector('.enc-pronunciation').getAttribute('title')).toBe(byKey['phantiri'].pronunciation.ipa);
	});

	it('renders nothing at all when an entry has none', () => {
		const c = paint(<Pronunciation pronunciation={undefined} />);
		expect(c.innerHTML).toBe('');
	});

	it('shows up under the title on a real entry page', () => {
		const c = paint(
			<MemoryRouter initialEntries={['/encyclopedia/entry/telypso']}>
				<Route path="/encyclopedia/entry/:key"><EntryView /></Route>
			</MemoryRouter>
		);
		const h1 = c.querySelector('h1.g-title');
		expect(h1.textContent).toBe('Telypso');
		const pron = c.querySelector('.enc-pronunciation');
		expect(pron.textContent).toBe('teh-LIP-so');
		// and it sits after the title inside the same designation header
		expect(h1.parentElement.contains(pron)).toBe(true);
		expect(h1.compareDocumentPosition(pron) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
