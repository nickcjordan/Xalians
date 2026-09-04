import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import LoreSearch from './LoreSearch';
import TrailStrip from './TrailStrip';
import BackToTop from './BackToTop';

const SECTIONS = [
    { to: '/encyclopedia', label: 'Reading Room', exact: true },
    { to: '/encyclopedia/story', label: 'The Story' },
    { to: '/encyclopedia/worlds', label: 'Worlds' },
    { to: '/encyclopedia/species', label: 'Bestiary' },
    { to: '/encyclopedia/powers', label: 'Powers' },
    { to: '/encyclopedia/index', label: 'Index' },
];

/**
 * Masthead, the section key bank, the search screen, and the outlet.
 * Sections render inside `.enc-body`; they own their own layout from there.
 */
export default function EncyclopediaShell({ children }) {
    const masthead = lore.getMasthead();
    const location = useLocation();
    const history = useHistory();
    const sectionsRef = useRef(null);

    function pullRecord() {
        const record = lore.getRandomRecord();
        history.push(lore.routeFor(record.kind, record.key));
    }

    const activeTo = (() => {
        const hit = SECTIONS.find((s) => (s.exact ? location.pathname === s.to : location.pathname.startsWith(s.to)));
        return hit ? hit.to : null;
    })();

    // The masthead compresses to its compact form (kicker and version
    // hidden, title one step smaller) on every route except the Reading
    // Room itself, where the front matter deserves the full frame.
    const isRoom = location.pathname.replace(/\/+$/, '') === '/encyclopedia';

    // Keep the active station in view when the bank scrolls horizontally at
    // phone widths, without scrolling the page itself.
    useEffect(() => {
        const nav = sectionsRef.current;
        if (!nav) return;
        const active = nav.querySelector('.g-segment[aria-pressed="true"]');
        if (active && active.scrollIntoView) {
            active.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
    }, [activeTo]);

    return (
        <div className="g-shell page-shell enc-shell">
            <header className={`enc-masthead ${isRoom ? '' : 'enc-masthead--compact'}`}>
                <div className="enc-masthead-text">
                    <p className="g-kicker">Xalian Generator / Archive</p>
                    <h1 className="g-title enc-title">{masthead.title}</h1>
                    <p className="g-mono enc-version">canon rev. {masthead.version}</p>
                </div>
                <div className="enc-masthead-tools">
                    <LoreSearch key={location.pathname} />
                    <button type="button" className="g-btn enc-btn-small enc-pull-record" onClick={pullRecord}>
                        <span className="enc-btn-label-full">Pull a record</span>
                        <span className="enc-btn-label-short">Pull</span>
                    </button>
                </div>
            </header>
            <nav ref={sectionsRef} className="g-segmented enc-sections enc-scrollrow" aria-label="Encyclopedia sections">
                {SECTIONS.map((s) => {
                    const active = s.to === activeTo;
                    return (
                        <NavLink key={s.to} to={s.to} className="g-segment" aria-pressed={active} aria-current={active ? 'page' : undefined}>
                            {s.label}
                        </NavLink>
                    );
                })}
            </nav>
            <div className="enc-body">{children}</div>
            <TrailStrip />
            <BackToTop />
        </div>
    );
}
