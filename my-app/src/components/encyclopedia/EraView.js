import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
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

function EventPanel({ event }) {
    return (
        <div className="enc-era-event">
            <h4 className="g-h3 enc-era-event-title">{event.title}</h4>
            {event.planets.length > 0 && (
                <div className="enc-chips enc-era-event-chips">
                    {event.planets.map((planet) => (
                        <Link
                            key={planet.key}
                            to={lore.routeFor('world', planet.key)}
                            className={`g-chip g-el-${planet.element}`}
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
    );
}

function EventsSection({ era }) {
    const groups = useMemo(() => groupEvents(era.events), [era]);
    return (
        <section className="enc-section">
            <div className="enc-section-head">
                <h2 className="g-h2">Events</h2>
                <span className="enc-count">{era.events.length}</span>
            </div>
            <div className="enc-era-event-list">
                {groups.map((group, i) =>
                    group.kind === 'firm' ? (
                        <React.Fragment key={i}>
                            <hr className="g-seam-rule" />
                            <div className="g-panel g-panel--raised">
                                <EventPanel event={group.events[0]} />
                            </div>
                        </React.Fragment>
                    ) : (
                        <div className="g-panel g-panel--recessed" key={i}>
                            <p className="g-kicker">Contemporaneous, unordered</p>
                            {group.events.map((event) => (
                                <EventPanel event={event} key={event.key} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </section>
    );
}

function WorldByWorldSection({ era }) {
    const [filter, setFilter] = useState('all');
    const worlds = era.worlds;
    const visible = filter === 'all' ? worlds : worlds.filter((g) => g.planet.key === filter);

    return (
        <section className="enc-section">
            <div className="enc-section-head">
                <h2 className="g-h2">World by world</h2>
            </div>
            <div className="g-segmented enc-filters" role="group" aria-label="Filter by world">
                <button
                    type="button"
                    className="g-segment"
                    aria-pressed={filter === 'all'}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                {worlds.map((g) => (
                    <button
                        type="button"
                        key={g.planet.key}
                        className="g-segment"
                        aria-pressed={filter === g.planet.key}
                        onClick={() => setFilter(g.planet.key)}
                    >
                        {g.planet.name}
                    </button>
                ))}
            </div>
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
        </section>
    );
}

export default function EraView() {
    const { era: eraKey } = useParams();
    const era = lore.getEra(eraKey);
    const eras = lore.getEras();

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

    return (
        <div className="enc-era">
            <Link to="/encyclopedia/chronicle" className="enc-back">
                &larr; Back to Chronicle
            </Link>
            <div className="enc-designation">
                <span className="g-mono">{String(era.order + 1).padStart(2, '0')}</span>
                <h1 className="g-title">{era.name}</h1>
            </div>
            <p className="g-body enc-prose">{era.definition}</p>

            <EventsSection era={era} />
            <WorldByWorldSection era={era} />

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
    );
}
