import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import './Chronicle.css';

/**
 * Chronicle: the seven eras on a vertical rail. Canon carries no dates, so
 * the rail is order, not time: a single left-hand rule with a brass-ringed
 * station per era. Each station's footprint strip is a 14-cell readout, one
 * cell per world in planet order, lit when the world is in the era.
 */
function FootprintStrip({ eraKey }) {
    const footprint = lore.getEraFootprint(eraKey);
    return (
        <div className="enc-chronicle-footprint" role="list" aria-label="Worlds in this era">
            {footprint.worlds.map((row) => {
                const lit = row.chapterCount > 0 || row.events.length > 0;
                return (
                    <Link
                        key={row.world.key}
                        to={lore.routeFor('world', row.world.key)}
                        role="listitem"
                        className={`enc-chronicle-footprint-cell g-el-${row.world.element} ${lit ? 'is-lit' : 'is-dim'}`}
                        title={row.world.name}
                        aria-label={`${row.world.name}${lit ? '' : ', not in this era'}`}
                    />
                );
            })}
        </div>
    );
}

export default function Chronicle() {
    const eras = lore.getEras();
    return (
        <div className="enc-chronicle">
            <p className="g-body enc-prose enc-chronicle-preface">
                Canon carries no dates. The eras below are ordered; within an era, events are ordered only where a
                source phrase fixes them.
            </p>
            <ol className="enc-chronicle-rail">
                {eras.map((era, i) => {
                    const worldCount = era.worlds.length;
                    const firmEvents = era.events.filter((ev) => ev.firmness === 'firm').slice(0, 5);
                    return (
                        <li key={era.key} className="enc-chronicle-station">
                            <span className="enc-chronicle-dot" aria-hidden="true" />
                            <span className="g-mono enc-chronicle-index">{String(i + 1).padStart(2, '0')}</span>
                            <div className="enc-chronicle-station-body">
                                <Link to={lore.routeFor('era', era.key)} className="g-link enc-chronicle-name">
                                    {era.name}
                                </Link>
                                <p className="g-body enc-prose enc-chronicle-def">{era.definition}</p>
                                <p className="enc-count">
                                    {era.events.length} event{era.events.length === 1 ? '' : 's'} &middot; {worldCount}{' '}
                                    world{worldCount === 1 ? '' : 's'} with chapters
                                </p>
                            </div>
                            <div className="enc-chronicle-station-side">
                                {firmEvents.length > 0 && (
                                    <ul className="g-mono enc-chronicle-firm-events">
                                        {firmEvents.map((ev) => (
                                            <li key={ev.key}>
                                                <Link to={lore.routeFor('event', `${era.key}:${ev.key}`)} className="g-link">
                                                    {ev.title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <FootprintStrip eraKey={era.key} />
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
