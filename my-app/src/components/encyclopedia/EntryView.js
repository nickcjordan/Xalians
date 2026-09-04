import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import Connections from './Connections';
import Pronunciation from './Pronunciation';
import { useVisit } from './trail';
import './EntryView.css';

const APPEARANCE_KIND_LABEL = { world: 'World', species: 'Species' };

/**
 * EntryView: one encyclopedia entry, its related entries, and every place
 * it appears in world histories and species descriptions.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Index and entry".
 */
export default function EntryView() {
    const { key } = useParams();
    const entry = lore.getEntry(key);
    const wasRead = useVisit(entry
        ? { kind: 'entry', key, name: entry.title, element: entry.element }
        : { kind: null, key: null });

    if (!entry) {
        return (
            <div className="enc-entry">
                <Link to="/encyclopedia/index" className="enc-back">&laquo; Back to Index</Link>
                <p className="g-empty">No record for &ldquo;{key}&rdquo;.</p>
            </div>
        );
    }

    const related = lore.getRelated(key);
    const appearances = lore.getAppearances(key);
    const chronicle = lore.getEventsForEntry(key);
    const era = entry.category === 'history' ? lore.getEraForEntry(key) : null;
    const hasCrossRefs = related.length > 0 || appearances.length > 0;
    const scopeClass = entry.element ? `g-el-${entry.element}` : '';

    // Group appearances by (kind, key): one row per world or species, each
    // excerpt on its own line, so a world with many hits is one row, not
    // one near-identical row per paragraph.
    const groupedAppearances = [];
    const groupIndexByKey = new Map();
    for (const app of appearances) {
        const groupKey = `${app.kind}:${app.key}`;
        let group = groupIndexByKey.get(groupKey);
        if (group === undefined) {
            group = groupedAppearances.length;
            groupIndexByKey.set(groupKey, group);
            groupedAppearances.push({ kind: app.kind, key: app.key, name: app.name, hits: [] });
        }
        groupedAppearances[group].hits.push(app);
    }

    return (
        <div className={`enc-entry ${scopeClass}`}>
            <Link to="/encyclopedia/index" className="enc-back">&laquo; Back to Index</Link>

            <article className="enc-entry-doc">
                <header className="enc-designation">
                    <h1 className="g-title">{entry.title}</h1>
                    <Pronunciation pronunciation={entry.pronunciation} />
                    <div className="enc-chips">
                        <span className="g-chip">{entry.category}</span>
                        {entry.element && <span className="g-chip">{entry.element}</span>}
                        {era && (
                            <Link to={lore.routeFor('era', era.key)} className={`g-chip g-chip--outline enc-entry-era-chip`}>
                                {era.name}
                            </Link>
                        )}
                    </div>
                    {wasRead && <p className="g-mono enc-entry-reviewed">reviewed</p>}
                </header>

                <div className="enc-record">
                    <div className="enc-entry-plate">
                        <Prose text={entry.definition} except={key} />
                    </div>

                    <div className="enc-entry-rails">
                        {chronicle.length > 0 && (
                            <section className="enc-section enc-entry-chronicle">
                                <div className="enc-section-head">
                                    <h2 className="g-h2">In the Chronicle</h2>
                                </div>
                                <div className="g-panel g-panel--recessed enc-entry-chronicle-rows">
                                    {chronicle.map((row) => (
                                        <div key={`${row.era.key}:${row.event.key}`} className="enc-entry-chronicle-row">
                                            <div className="enc-chips">
                                                <Link
                                                    to={lore.routeFor('era', row.era.key)}
                                                    className="g-chip g-chip--outline enc-entry-chronicle-era"
                                                >
                                                    {row.era.name}
                                                </Link>
                                                <Link
                                                    to={lore.routeFor('event', `${row.era.key}:${row.event.key}`)}
                                                    className="g-record-term enc-entry-chronicle-event"
                                                >
                                                    {row.event.title}
                                                </Link>
                                                {row.inferred && (
                                                    <span className="g-mono enc-entry-chronicle-inferred">by title</span>
                                                )}
                                            </div>
                                            {row.event.planets.length > 0 && (
                                                <div className="enc-chips enc-entry-chronicle-worlds">
                                                    {row.event.planets.map((planet) => (
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
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <Connections kind="entry" recordKey={key} limit={12} />

                        {appearances.length > 0 && (
                            <section className="enc-section">
                                <div className="enc-section-head">
                                    <h2 className="g-h2">Appears In</h2>
                                </div>
                                <div className="enc-entry-appearances">
                                    {groupedAppearances.map((group) => {
                                        const route = lore.routeFor(group.kind, group.key);
                                        return (
                                            <div key={`${group.kind}:${group.key}`} className="enc-entry-appearance">
                                                <div className="enc-chips">
                                                    <span className="g-chip g-chip--outline">{APPEARANCE_KIND_LABEL[group.kind] || group.kind}</span>
                                                    <Link to={route} className="g-record-term enc-entry-appearance-name">
                                                        {group.name}
                                                    </Link>
                                                </div>
                                                <ul className="enc-entry-appearance-hits">
                                                    {group.hits.map((hit, i) => {
                                                        const hash = group.kind === 'world' && typeof hit.paragraph === 'number'
                                                            ? `#chapter-${hit.paragraph}`
                                                            : '';
                                                        return (
                                                            <li key={i} className="enc-entry-appearance-hit">
                                                                {hash && (
                                                                    <Link
                                                                        to={`${route}${hash}`}
                                                                        className="g-mono enc-entry-appearance-chapter"
                                                                    >
                                                                        CH. {String(hit.paragraph + 1).padStart(2, '0')}
                                                                    </Link>
                                                                )}
                                                                <p className="g-body enc-entry-appearance-excerpt">{hit.excerpt}</p>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {related.length > 0 && (
                            <section className="enc-section">
                                <div className="enc-section-head">
                                    <h2 className="g-h2">Related</h2>
                                </div>
                                <div className="g-panel g-panel--recessed enc-entry-related">
                                    {related.map((rel) => (
                                        <div key={rel.key} className={`g-record ${rel.element ? `g-el-${rel.element}` : ''}`}>
                                            <Link to={lore.routeFor('entry', rel.key)} className="g-record-term">
                                                {rel.title}
                                            </Link>
                                            <Prose text={rel.definition} except={rel.key} className="g-record-body" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {!hasCrossRefs && chronicle.length === 0 && (
                            <p className="g-empty">No cross-references on file.</p>
                        )}
                    </div>
                </div>
            </article>
        </div>
    );
}
