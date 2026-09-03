import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { useVisit, useReadMark } from './trail';
import './EraView.css';

function groupEvents(events) {
    // Firm events render solo; contemporaneous events (sharing an order value,
    // firmness 'era-only') are grouped together under one panel.
    const groups = [];
    let current = null;
    for (const event of events) {
        if (event.firmness === 'firm') {
            groups.push({ kind: 'firm', order: event.order, events: [event] });
            current = null;
            continue;
        }
        if (current && current.order === event.order) {
            current.events.push(event);
        } else {
            current = { kind: 'contemporaneous', order: event.order, events: [event] };
            groups.push(current);
        }
    }
    return groups;
}

function EventCard({ event, expanded, onToggle, cardRef }) {
    return (
        <div id={`event-${event.key}`} ref={cardRef} className="g-panel g-panel--raised enc-era-event-card">
            <button
                type="button"
                className="enc-era-event-head"
                aria-expanded={expanded}
                onClick={onToggle}
            >
                <span className="g-h3 enc-era-event-title">{event.title}</span>
                {event.planets.length > 0 && (
                    <span className="enc-chips enc-era-event-chips">
                        {event.planets.map((planet) => (
                            <span key={planet.key} className={`g-chip g-chip--outline g-el-${planet.element}`}>
                                {planet.name}
                            </span>
                        ))}
                    </span>
                )}
            </button>
            {expanded && (
                <div className="enc-era-event-body">
                    {event.entry && (
                        <Link to={lore.routeFor('entry', event.entry.key)} className="g-link enc-era-event-entry">
                            Entry: {event.entry.title}
                        </Link>
                    )}
                    {event.anchors.length > 0 && (
                        <div className="g-screen enc-era-event-screen">
                            {event.anchors.map((anchor, i) => (
                                <div className="enc-era-anchor" key={i}>
                                    <Link
                                        to={`${lore.routeFor('world', anchor.planet.key)}#chapter-${anchor.paragraph}`}
                                        className="g-screen-line g-screen-line--dim enc-era-anchor-link"
                                    >
                                        {anchor.planet.name} CH. {String(anchor.paragraph).padStart(2, '0')}
                                    </Link>
                                    <p className="g-screen-line enc-quote enc-era-anchor-text">&ldquo;{anchor.quote}&rdquo;</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ContemporaneousCard({ group, expanded, onToggle, cardRef, registerAnchor }) {
    return (
        <div className="g-panel g-panel--recessed enc-era-event-card" ref={cardRef}>
            <button
                type="button"
                className="enc-era-event-head"
                aria-expanded={expanded}
                onClick={onToggle}
            >
                <span className="g-kicker">Contemporaneous, unordered</span>
                <span className="enc-era-contemp-titles">
                    {group.events.map((ev) => ev.title).join(' / ')}
                </span>
            </button>
            {expanded && (
                <div className="enc-era-event-body">
                    {group.events.map((event) => (
                        <div id={`event-${event.key}`} ref={registerAnchor(event.key)} key={event.key} className="enc-era-event">
                            <h4 className="g-h3 enc-era-event-title">{event.title}</h4>
                            {event.planets.length > 0 && (
                                <div className="enc-chips enc-era-event-chips">
                                    {event.planets.map((planet) => (
                                        <Link
                                            key={planet.key}
                                            to={lore.routeFor('world', planet.key)}
                                            className={`g-chip g-chip--outline g-el-${planet.element}`}
                                        >
                                            {planet.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {event.entry && (
                                <Link to={lore.routeFor('entry', event.entry.key)} className="g-link enc-era-event-entry">
                                    Entry: {event.entry.title}
                                </Link>
                            )}
                            {event.anchors.length > 0 && (
                                <div className="g-screen enc-era-event-screen">
                                    {event.anchors.map((anchor, i) => (
                                        <div className="enc-era-anchor" key={i}>
                                            <Link
                                                to={`${lore.routeFor('world', anchor.planet.key)}#chapter-${anchor.paragraph}`}
                                                className="g-screen-line g-screen-line--dim enc-era-anchor-link"
                                            >
                                                {anchor.planet.name} CH. {String(anchor.paragraph).padStart(2, '0')}
                                            </Link>
                                            <p className="g-screen-line enc-quote enc-era-anchor-text">&ldquo;{anchor.quote}&rdquo;</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EventsSection({ era, hashEventKey, worldFilter, onClearFilter }) {
    const allGroups = useMemo(() => groupEvents(era.events), [era]);
    const groups = useMemo(() => {
        if (worldFilter === 'all') return allGroups;
        return allGroups.filter((g) => g.events.some((ev) => ev.planets.some((p) => p.key === worldFilter)));
    }, [allGroups, worldFilter]);

    // The first firm event is open by default; a hash match opens and
    // scrolls to its card on mount, whether it is a firm event or one of a
    // contemporaneous group.
    const firstFirmIndex = groups.findIndex((g) => g.kind === 'firm');
    const initialOpen = useMemo(() => {
        const open = new Set();
        if (firstFirmIndex >= 0) open.add(firstFirmIndex);
        if (hashEventKey) {
            groups.forEach((g, i) => {
                if (g.events.some((ev) => ev.key === hashEventKey)) open.add(i);
            });
        }
        return open;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [era, worldFilter]);

    const [openGroups, setOpenGroups] = useState(initialOpen);
    const cardRefs = useRef({});

    useEffect(() => {
        setOpenGroups(initialOpen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [era, worldFilter]);

    useEffect(() => {
        if (!hashEventKey) return;
        const node = cardRefs.current[hashEventKey];
        if (node && node.scrollIntoView) {
            node.scrollIntoView({ block: 'start' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [era, hashEventKey]);

    const toggle = (i) => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    };

    const expandAll = () => {
        setOpenGroups(new Set(groups.map((_, i) => i)));
    };

    const collapseAll = () => {
        setOpenGroups(new Set());
    };

    const allExpanded = groups.length > 0 && openGroups.size === groups.length;

    const registerAnchor = (key) => (node) => {
        cardRefs.current[key] = node;
    };

    const filterWorld = worldFilter !== 'all' ? era.worlds.find((g) => g.planet.key === worldFilter) : null;

    return (
        <section className="enc-section">
            <div className="enc-section-head">
                <h2 className="g-h2">Events</h2>
                <span className="enc-count">{groups.length}</span>
                <button
                    type="button"
                    className="g-btn enc-era-event-toggle-all"
                    onClick={allExpanded ? collapseAll : expandAll}
                    disabled={groups.length === 0}
                >
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
            </div>
            {filterWorld && (
                <p className="g-mono enc-era-event-filter-line">
                    {groups.length} of {allGroups.length} events name {filterWorld.planet.name}
                    {' '}
                    <button type="button" className="g-link enc-era-event-filter-clear" onClick={onClearFilter}>
                        Show all
                    </button>
                </p>
            )}
            <div className="enc-era-event-list">
                {groups.map((group, i) =>
                    group.kind === 'firm' ? (
                        <EventCard
                            key={group.events[0].key}
                            event={group.events[0]}
                            expanded={openGroups.has(i)}
                            onToggle={() => toggle(i)}
                            cardRef={(node) => {
                                cardRefs.current[group.events[0].key] = node;
                            }}
                        />
                    ) : (
                        <ContemporaneousCard
                            key={`group-${group.order}-${i}`}
                            group={group}
                            expanded={openGroups.has(i)}
                            onToggle={() => toggle(i)}
                            registerAnchor={registerAnchor}
                        />
                    )
                )}
            </div>
        </section>
    );
}

function ChapterReadLamp({ planetKey, index }) {
    const read = useReadMark('chapter', `${planetKey}:${index}`);
    if (!read) return null;
    return <span className="g-lamp enc-era-chapter-lamp" aria-hidden="true" />;
}

function WorldByWorldSection({ era, worldFilter }) {
    const worlds = era.worlds;
    const visible = worldFilter === 'all' ? worlds : worlds.filter((g) => g.planet.key === worldFilter);

    return (
        <div className="enc-era-world-list">
            {visible.map((group) => (
                <div
                    key={group.planet.key}
                    className={`g-panel g-panel--tagged g-el-${group.planet.element} enc-era-world-panel`}
                    data-tag={group.planet.name}
                >
                    <div className="g-panel-head">
                        <Link to={lore.routeFor('world', group.planet.key)} className="g-link g-h3">
                            {group.planet.name}
                        </Link>
                    </div>
                    {group.paragraphs.map((chapter) => (
                        <div key={chapter.index} className="enc-era-chapter">
                            <p className="g-mono enc-era-chapter-label">
                                <ChapterReadLamp planetKey={group.planet.key} index={chapter.index} />
                                CH. {String(chapter.index).padStart(2, '0')}
                            </p>
                            <Prose text={chapter.text} />
                            {chapter.era !== era.key && chapter.alsoEras.includes(era.key) && (
                                <p className="g-mono enc-era-chapter-also">
                                    also: {lore.getEra(chapter.era)?.name || chapter.era}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function StoryParagraph({ row, showRunningHead }) {
    return (
        <div className="enc-era-story-row">
            {showRunningHead && (
                <p className="g-kicker enc-era-story-head">{row.eventTitle || 'Elsewhere in the era'}</p>
            )}
            <div className="enc-era-story-para">
                <Link
                    to={lore.routeFor('world', row.world.key)}
                    className={`g-chip g-chip--outline g-el-${row.world.element} enc-era-story-chip`}
                >
                    {row.world.name}
                </Link>
                <p className="g-mono enc-era-story-chapter">
                    <ChapterReadLamp planetKey={row.world.key} index={row.index} />
                    CH. {String(row.index).padStart(2, '0')}
                </p>
                <Prose text={row.text} className="enc-era-story-text" />
            </div>
        </div>
    );
}

function StorySection({ era, worldFilter }) {
    const story = useMemo(() => lore.getEraStory(era.key), [era]);
    const visible = worldFilter === 'all' ? story : story.filter((row) => row.world.key === worldFilter);

    return (
        <div className="enc-era-story">
            {visible.map((row, i) => {
                const prev = visible[i - 1];
                const showRunningHead = !prev || prev.eventTitle !== row.eventTitle;
                return (
                    <StoryParagraph key={`${row.world.key}:${row.index}`} row={row} showRunningHead={showRunningHead} />
                );
            })}
        </div>
    );
}

function ReadingModeSection({ era, worldFilter }) {
    const history = useHistory();
    const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const mode = params.get('mode') === 'story' ? 'story' : 'world';

    const setMode = (next) => {
        const nextParams = new URLSearchParams(location.search);
        if (next === 'story') nextParams.set('mode', 'story');
        else nextParams.delete('mode');
        const search = nextParams.toString();
        history.replace({ pathname: location.pathname, search: search ? `?${search}` : '' });
    };

    return (
        <section className="enc-section enc-era-reading">
            <div className="enc-section-head">
                <h2 className="g-h2">Reading</h2>
                <div className="g-segmented" role="group" aria-label="Reading mode">
                    <button
                        type="button"
                        className="g-segment"
                        aria-pressed={mode === 'world'}
                        onClick={() => setMode('world')}
                    >
                        By world
                    </button>
                    <button
                        type="button"
                        className="g-segment"
                        aria-pressed={mode === 'story'}
                        onClick={() => setMode('story')}
                    >
                        As one story
                    </button>
                </div>
            </div>
            {mode === 'world' ? (
                <WorldByWorldSection era={era} worldFilter={worldFilter} />
            ) : (
                <StorySection era={era} worldFilter={worldFilter} />
            )}
        </section>
    );
}

function EraRail({ eras, era, worldFilter, onFilter }) {
    const footprint = useMemo(() => lore.getEraFootprint(era.key), [era]);
    const litWorlds = footprint.worlds.filter((row) => row.chapterCount > 0 || row.events.length > 0);

    return (
        <nav className="enc-era-rail" aria-label="Eras">
            <ol className="enc-era-rail-stations">
                {eras.map((e, i) => (
                    <li key={e.key}>
                        <Link
                            to={lore.routeFor('era', e.key)}
                            className="enc-era-rail-station"
                            aria-current={e.key === era.key ? 'true' : undefined}
                        >
                            <span className="g-mono enc-era-rail-index">{String(i + 1).padStart(2, '0')}</span>
                            <span className="enc-era-rail-name">{e.name}</span>
                        </Link>
                    </li>
                ))}
            </ol>
            <p className="g-mono enc-era-rail-summary">
                {era.events.length} event{era.events.length === 1 ? '' : 's'}, {litWorlds.length} world
                {litWorlds.length === 1 ? '' : 's'}
            </p>
            <div className="enc-era-rail-footprint">
                <p className="g-kicker enc-era-rail-kicker">Worlds in this era</p>
                <div className="enc-chips enc-era-rail-chips">
                    <button
                        type="button"
                        className="g-chip g-chip--outline enc-era-rail-chip"
                        aria-pressed={worldFilter === 'all'}
                        onClick={() => onFilter('all')}
                    >
                        All
                    </button>
                    {litWorlds.map((row) => (
                        <button
                            type="button"
                            key={row.world.key}
                            className={`g-chip ${worldFilter === row.world.key ? '' : 'g-chip--outline'} g-el-${row.world.element} enc-era-rail-chip`}
                            aria-pressed={worldFilter === row.world.key}
                            onClick={() => onFilter(row.world.key)}
                        >
                            {row.world.name}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
}

export default function EraView() {
    const { era: eraKey } = useParams();
    const history = useHistory();
    const location = useLocation();
    const era = lore.getEra(eraKey);
    const eras = lore.getEras();

    // The world filter is presented in the query string (?world=<key>) so the
    // galaxy map, and any other page, can link straight to a filtered era.
    // An unknown key is ignored (falls back to 'all').
    const initialWorldFromQuery = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('world');
        if (key && lore.getWorld(key)) return key;
        return 'all';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [worldFilter, setWorldFilterState] = useState(initialWorldFromQuery);

    const setWorldFilter = (next) => {
        setWorldFilterState(next);
        const params = new URLSearchParams(location.search);
        if (next === 'all') params.delete('world');
        else params.set('world', next);
        const search = params.toString();
        history.replace({ pathname: location.pathname, search: search ? `?${search}` : '' });
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('world');
        setWorldFilterState(key && lore.getWorld(key) ? key : 'all');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eraKey]);

    useVisit({ kind: 'era', key: eraKey, name: era ? era.name : eraKey });

    if (!era) {
        return (
            <div>
                <p className="g-empty">No record for &ldquo;{eraKey}&rdquo;.</p>
                <Link to="/encyclopedia/chronicle" className="enc-back">
                    &larr; Back to Chronicle
                </Link>
            </div>
        );
    }

    const index = eras.findIndex((e) => e.key === era.key);
    const prev = index > 0 ? eras[index - 1] : null;
    const next = index < eras.length - 1 ? eras[index + 1] : null;
    const hashEventKey = location.hash.startsWith('#event-') ? location.hash.slice('#event-'.length) : null;

    return (
        <div className="enc-era enc-era-layout">
            <EraRail eras={eras} era={era} worldFilter={worldFilter} onFilter={setWorldFilter} />
            <div className="enc-era-main">
                <Link to="/encyclopedia/chronicle" className="enc-back">
                    &larr; Back to Chronicle
                </Link>
                <div className="enc-designation">
                    <span className="g-mono">{String(era.order + 1).padStart(2, '0')}</span>
                    <h1 className="g-title">{era.name}</h1>
                </div>
                <p className="g-body enc-prose">{era.definition}</p>

                <EventsSection
                    era={era}
                    hashEventKey={hashEventKey}
                    worldFilter={worldFilter}
                    onClearFilter={() => setWorldFilter('all')}
                />
                <ReadingModeSection era={era} worldFilter={worldFilter} />

                <div className="enc-era-nav">
                    {prev ? (
                        <Link to={lore.routeFor('era', prev.key)} className="g-btn enc-era-nav-btn">
                            &larr; {prev.name}
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next && (
                        <Link to={lore.routeFor('era', next.key)} className="g-btn enc-era-nav-btn">
                            {next.name} &rarr;
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
