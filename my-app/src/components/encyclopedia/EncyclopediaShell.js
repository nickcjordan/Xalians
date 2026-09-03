import React from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import LoreSearch from './LoreSearch';
import TrailStrip from './TrailStrip';

const SECTIONS = [
    { to: '/encyclopedia', label: 'Reading Room', exact: true },
    { to: '/encyclopedia/tour', label: 'First Survey' },
    { to: '/encyclopedia/chronicle', label: 'Chronicle' },
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

    function pullRecord() {
        const record = lore.getRandomRecord();
        history.push(lore.routeFor(record.kind, record.key));
    }

    return (
        <div className="g-shell page-shell enc-shell">
            <header className="enc-masthead">
                <div className="enc-masthead-text">
                    <p className="g-kicker">Xalian Generator / Archive</p>
                    <h1 className="g-title enc-title">{masthead.title}</h1>
                    <p className="g-mono enc-version">canon rev. {masthead.version}</p>
                </div>
                <div className="enc-masthead-tools">
                    <LoreSearch key={location.pathname} />
                    <button type="button" className="g-btn enc-btn-small enc-pull-record" onClick={pullRecord}>
                        Pull a record
                    </button>
                </div>
            </header>
            <nav className="g-segmented enc-sections" aria-label="Encyclopedia sections">
                {SECTIONS.map((s) => {
                    const active = s.exact ? location.pathname === s.to : location.pathname.startsWith(s.to);
                    return (
                        <NavLink key={s.to} to={s.to} className="g-segment" aria-pressed={active}>
                            {s.label}
                        </NavLink>
                    );
                })}
            </nav>
            <TrailStrip />
            <div className="enc-body">{children}</div>
        </div>
    );
}
