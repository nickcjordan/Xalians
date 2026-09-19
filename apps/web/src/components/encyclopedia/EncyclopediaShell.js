import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import * as lore from '../../lore';
import { isRead } from './trail';
import LoreSearch from './LoreSearch';
import Pronunciation from './Pronunciation';
import TrailStrip from './TrailStrip';
import BackToTop from './BackToTop';
import { Shell, Masthead } from '@/components/system/masthead';
import { Badge } from '@/components/ui/badge';
import { Station, StationRow } from '@/components/system/station-row';
import {
    Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
    return { key, label: element, className: `el-${element}`, chip: true };
}

function reviewedBadge(kind, key) {
    return isRead(kind, key) ? <Badge variant="ok">Reviewed</Badge> : null;
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
            return { kicker: 'The story', title: 'Not found' };
        }
        return {
            kicker: 'The story',
            title: part.era.name,
            subtitle: `Part ${part.order} of ${lore.getStory().parts.length}`,
            crumb: { section: 'The Story', sectionTo: '/encyclopedia/story', title: part.era.name },
        };
    }

    if (section === 'worlds') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'Worlds', subtitle: sectionSubtitle('/encyclopedia/worlds') };
        }
        const world = lore.getWorld(key);
        if (!world) {
            return { kicker: 'World record', title: 'Not found' };
        }
        return {
            kicker: 'World record',
            title: world.name,
            subtitle: pronunciationSubtitle((lore.getEntry(world.key) || {}).pronunciation),
            chips: [elementChip('el', world.element)],
            crumb: { section: 'Worlds', sectionTo: '/encyclopedia/worlds', title: world.name },
        };
    }

    if (section === 'species') {
        if (!key) {
            return { kicker: 'Encyclopedia', title: 'Bestiary', subtitle: sectionSubtitle('/encyclopedia/species') };
        }
        const view = lore.getSpecies(key);
        if (!view) {
            return { kicker: 'Species record', title: 'Not found' };
        }
        const worldName = view.planet ? view.planet.name : view.homePlanet;
        return {
            kicker: 'Species record',
            title: view.name,
            subtitle: pronunciationSubtitle((lore.getEntry(view.key) || {}).pronunciation),
            chips: [
                elementChip('el', view.element),
                { key: 'world', label: worldName, to: lore.routeFor('world', view.homePlanet), className: `el-${view.element}`, outline: true },
            ],
            badge: reviewedBadge('species', key),
            crumb: { section: 'Bestiary', sectionTo: '/encyclopedia/species', title: view.name },
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
            return { kicker: 'Index', title: 'Not found' };
        }
        const era = entry.category === 'history' ? lore.getEraForEntry(key) : null;
        const chips = [];
        if (entry.element) chips.push(elementChip('el', entry.element));
        if (era) chips.push({ key: 'era', label: era.name, to: lore.routeFor('era', era.key), outline: true });
        return {
            kicker: entry.category,
            title: entry.title,
            subtitle: pronunciationSubtitle(entry.pronunciation),
            chips,
            badge: reviewedBadge('entry', key),
            crumb: { section: 'Index', sectionTo: '/encyclopedia/index', title: entry.title },
        };
    }

    return { kicker: 'Encyclopedia', title: 'Archive' };
}

function MastheadChip({ chip }) {
    const badge = <Badge variant={chip.chip ? 'chip' : 'chip-outline'} className={chip.className}>{chip.label}</Badge>;
    if (chip.to) {
        return <Link to={chip.to} className={chip.className}>{badge}</Link>;
    }
    return <span className={chip.className}>{badge}</span>;
}

/** Encyclopedia / <Section> / <Record>, shown above the masthead on record routes only. */
function EncyclopediaBreadcrumb({ crumb }) {
    if (!crumb) return null;
    return (
        <Breadcrumb className="pt-6">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link to="/encyclopedia">Encyclopedia</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link to={crumb.sectionTo}>{crumb.section}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
}

/**
 * Core frame (docs/DESIGN_SYSTEM.md section 2): navbar (rendered by the
 * page), a breadcrumb above the masthead on record routes only, then
 * Masthead -- kicker, title, chips and subtitle resolved from the address by
 * resolveMasthead, search on the right on every route -- then section
 * navigation as a station row. No forward action lives here; the
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

    return (
        <Shell className="overflow-x-clip">
            <EncyclopediaBreadcrumb crumb={masthead.crumb} />

            <Masthead
                kicker={masthead.kicker}
                title={masthead.title}
                beside={<>
                    {chips.map((chip) => <MastheadChip key={chip.key} chip={chip} />)}
                    {masthead.badge}
                </>}
                subtitle={masthead.subtitle}
                aside={<LoreSearch key={location.pathname} />}
            />

            <StationRow value={activeSection ? activeSection.to : null} onChange={() => {}} aria-label="Encyclopedia sections" className="mb-5">
                {SECTIONS.map((s) => (
                    <Station
                        key={s.to}
                        to={s.to}
                        active={s === activeSection}
                    >
                        {s.label}
                    </Station>
                ))}
            </StationRow>

            <div className="min-h-[40vh]">{children}</div>

            <TrailStrip />
            <BackToTop />
        </Shell>
    );
}
