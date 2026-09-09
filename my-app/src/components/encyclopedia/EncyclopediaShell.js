import React, { useMemo } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import * as lore from '../../lore';
import { isRead } from './trail';
import LoreSearch from './LoreSearch';
import Pronunciation from './Pronunciation';
import TrailStrip from './TrailStrip';
import BackToTop from './BackToTop';

function sectionSubtitle(to) {
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

function elementChip(key, element) {
    return { key, label: element, className: `g-chip g-el-${element}` };
}

function reviewedBadge(kind, key) {
    return isRead(kind, key) ? <span className="g-badge g-badge--ok">Reviewed</span> : null;
}

function pronunciationSubtitle(pronunciation) {
    if (!pronunciation || !pronunciation.respelling) return null;
    return <Pronunciation pronunciation={pronunciation} />;
}

/**
 * The one masthead for the current address. Section pages (the list views:
 * Reading room, The Story, Worlds, Bestiary, Powers, Index) get the section
 * name as the title and its count as the subtitle. Record pages (a world, a
 * species, a story part, an index entry) get the record type as the kicker,
 * the record's own name as the title, its pronunciation as the subtitle, and
 * its element/world chips beside the title. No section or record component
 * renders a second heading of its own -- this is the only one.
 */
function resolveMasthead(pathname) {
    const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const section = parts[1];
    const key = parts[2];

    if (!section) {
        return { kicker: 'Encyclopedia', title: 'Reading room', subtitle: sectionSubtitle('/encyclopedia') };
    }

    if (section === 'story') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'The story', subtitle: sectionSubtitle('/encyclopedia/story') };
        }
        const part = lore.getStoryPart(key);
        if (!part) {
            return { kicker: 'The story', title: 'Not found', back: { label: 'Back to The Story', to: '/encyclopedia/story' } };
        }
        return {
            kicker: 'The story',
            title: part.era.name,
            subtitle: `Part ${part.order} of ${lore.getStory().parts.length}`,
            back: { label: 'Back to The Story', to: '/encyclopedia/story' },
        };
    }

    if (section === 'worlds') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'Worlds', subtitle: sectionSubtitle('/encyclopedia/worlds') };
        }
        const world = lore.getWorld(key);
        if (!world) {
            return { kicker: 'World record', title: 'Not found', back: { label: 'Back to Worlds', to: '/encyclopedia/worlds' } };
        }
        return {
            kicker: 'World record',
            title: world.name,
            subtitle: pronunciationSubtitle((lore.getEntry(world.key) || {}).pronunciation),
            chips: [elementChip('el', world.element)],
            back: { label: 'Back to Worlds', to: '/encyclopedia/worlds' },
        };
    }

    if (section === 'species') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'Bestiary', subtitle: sectionSubtitle('/encyclopedia/species') };
        }
        const view = lore.getSpecies(key);
        if (!view) {
            return { kicker: 'Species record', title: 'Not found', back: { label: 'Back to Bestiary', to: '/encyclopedia/species' } };
        }
        const worldName = view.planet ? view.planet.name : view.homePlanet;
        return {
            kicker: 'Species record',
            title: view.name,
            subtitle: pronunciationSubtitle((lore.getEntry(view.key) || {}).pronunciation),
            chips: [
                elementChip('el', view.element),
                { key: 'world', label: worldName, to: lore.routeFor('world', view.homePlanet), className: `g-chip g-el-${view.element}` },
            ],
            badge: reviewedBadge('species', key),
            back: { label: 'Back to Bestiary', to: '/encyclopedia/species' },
        };
    }

    if (section === 'powers') {
        return { kicker: 'Encyclopedia', title: 'Powers', subtitle: sectionSubtitle('/encyclopedia/powers') };
    }

    if (section === 'index') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'Index', subtitle: sectionSubtitle('/encyclopedia/index') };
        }
        const entry = lore.getEntry(key);
        if (!entry) {
            return { kicker: 'Index', title: 'Not found', back: { label: 'Back to Index', to: '/encyclopedia/index' } };
        }
        const era = entry.category === 'history' ? lore.getEraForEntry(key) : null;
        const chips = [];
        if (entry.element) chips.push(elementChip('el', entry.element));
        if (era) chips.push({ key: 'era', label: era.name, to: lore.routeFor('era', era.key), className: 'g-chip g-chip--outline' });
        return {
            kicker: entry.category,
            title: entry.title,
            subtitle: pronunciationSubtitle(entry.pronunciation),
            chips,
            badge: reviewedBadge('entry', key),
            back: { label: 'Back to Index', to: '/encyclopedia/index' },
        };
    }

    return { kicker: 'Encyclopedia', title: 'Archive' };
}

function MastheadChip({ chip }) {
    if (chip.to) {
        return <Link to={chip.to} className={chip.className}>{chip.label}</Link>;
    }
    return <span className={chip.className}>{chip.label}</span>;
}

/**
 * Core frame (docs/DESIGN_SYSTEM.md section 2): navbar (rendered by the
 * page), then .g-masthead -- kicker, title, chips and subtitle resolved from
 * the address by resolveMasthead, search on the right -- then section
 * navigation as .g-tabs, with a "Back to <section>" .g-link at the tabs
 * row's right end on a record page. No forward action lives here; the
 * Encyclopedia is reference, not a workflow.
 */
export default function EncyclopediaShell({ children }) {
    const location = useLocation();
    const masthead = useMemo(() => resolveMasthead(location.pathname), [location.pathname]);

    const activeSection = (() => {
        const hit = SECTIONS.find((s) => (s.exact ? location.pathname === s.to : location.pathname.startsWith(s.to)));
        return hit || null;
    })();

    const chips = masthead.chips || [];
    // The Index page runs its own search box (tied to its category/alphabet
    // filters); the masthead search would be a second search field on the
    // same screen, so it steps aside there rather than duplicating it.
    const hideAsideSearch = location.pathname === '/encyclopedia/index';

    return (
        <div className="g-shell enc-shell">
            <header className="g-masthead">
                <div className="g-masthead-heading">
                    <p className="g-kicker">{masthead.kicker}</p>
                    <div className="enc-masthead-title-row">
                        <h1 className="g-title">{masthead.title}</h1>
                        {chips.map((chip) => <MastheadChip key={chip.key} chip={chip} />)}
                        {masthead.badge}
                    </div>
                    {masthead.subtitle && (
                        typeof masthead.subtitle === 'string'
                            ? <p className="g-body enc-shell-subtitle">{masthead.subtitle}</p>
                            : <div className="enc-shell-subtitle">{masthead.subtitle}</div>
                    )}
                </div>
                {!hideAsideSearch && (
                    <div className="g-masthead-aside enc-shell-aside">
                        <LoreSearch key={location.pathname} />
                    </div>
                )}
            </header>

            <nav className="g-tabs enc-scrollrow enc-shell-tabs" aria-label="Encyclopedia sections">
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
                {masthead.back && (
                    <Link to={masthead.back.to} className="g-link enc-shell-tabs-back">
                        &laquo; {masthead.back.label}
                    </Link>
                )}
            </nav>

            <div className="enc-body">{children}</div>

            <TrailStrip />
            <BackToTop />
        </div>
    );
}
