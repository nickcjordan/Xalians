import React from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import LoreSearch from './LoreSearch';
import TrailStrip from './TrailStrip';
import BackToTop from './BackToTop';

function subtitleForSection(to) {
    switch (to) {
        case '/encyclopedia': {
            const story = lore.getStory();
            return `${story.parts.length} parts, ${lore.getWorlds().length} worlds, ${lore.getSpeciesList().length} species`;
        }
        case '/encyclopedia/story':
            return `${lore.getStory().parts.length} parts, one per era`;
        case '/encyclopedia/worlds':
            return `${lore.getWorlds().length} worlds surveyed`;
        case '/encyclopedia/species':
            return `${lore.getSpeciesList().length} species, ${lore.getWorlds().length} worlds`;
        case '/encyclopedia/powers': {
            const powers = lore.getPowers();
            return `${powers.factions.length + powers.vallerii.length + powers.peoples.length} powers and peoples`;
        }
        case '/encyclopedia/index':
            return `${lore.getEntries().length} entries`;
        default:
            return null;
    }
}

const SECTIONS = [
    { to: '/encyclopedia', label: 'Reading Room', title: 'Reading room', exact: true },
    { to: '/encyclopedia/story', label: 'The Story', title: 'The story' },
    { to: '/encyclopedia/worlds', label: 'Worlds', title: 'Worlds' },
    { to: '/encyclopedia/species', label: 'Bestiary', title: 'Bestiary' },
    { to: '/encyclopedia/powers', label: 'Powers', title: 'Powers' },
    { to: '/encyclopedia/index', label: 'Index', title: 'Index' },
];

/**
 * Core frame (docs/DESIGN_SYSTEM.md section 2): navbar (rendered by the
 * page), then .g-masthead -- kicker "Encyclopedia", title the current
 * section, subtitle the section's counts, search on the right -- then
 * section navigation as .g-tabs. No forward action lives here; the
 * Encyclopedia is reference, not a workflow.
 */
export default function EncyclopediaShell({ children }) {
    const location = useLocation();
    const history = useHistory();

    function pullRecord() {
        const record = lore.getRandomRecord();
        history.push(lore.routeFor(record.kind, record.key));
    }

    const activeSection = (() => {
        const hit = SECTIONS.find((s) => (s.exact ? location.pathname === s.to : location.pathname.startsWith(s.to)));
        return hit || null;
    })();

    const title = activeSection ? activeSection.title : 'Archive';
    const subtitle = activeSection ? subtitleForSection(activeSection.to) : null;

    return (
        <div className="g-shell enc-shell">
            <header className="g-masthead">
                <div className="g-masthead-heading">
                    <p className="g-kicker">Encyclopedia</p>
                    <h1 className="g-title">{title}</h1>
                    {subtitle && <p className="g-body enc-shell-subtitle">{subtitle}</p>}
                </div>
                <div className="g-masthead-aside enc-shell-aside">
                    <LoreSearch key={location.pathname} />
                    <button type="button" className="g-btn g-btn--quiet enc-btn-small enc-pull-record" onClick={pullRecord}>
                        <span className="enc-btn-label-full">Pull a record</span>
                        <span className="enc-btn-label-short">Pull</span>
                    </button>
                </div>
            </header>

            <nav className="g-tabs enc-scrollrow" aria-label="Encyclopedia sections">
                {SECTIONS.map((s) => (
                    <NavLink
                        key={s.to}
                        to={s.to}
                        exact={s.exact}
                        className="g-tab-link"
                        activeClassName="on"
                        aria-current={s === activeSection ? 'page' : undefined}
                    >
                        {s.label}
                    </NavLink>
                ))}
            </nav>

            <div className="enc-body">{children}</div>

            <TrailStrip />
            <BackToTop />
        </div>
    );
}
