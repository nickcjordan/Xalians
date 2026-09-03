import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
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
                    <div className="enc-chips">
                        <span className="g-chip">{entry.category}</span>
                        {entry.element && <span className="g-chip">{entry.element}</span>}
                    </div>
                </header>

                <Prose text={entry.definition} except={key} />

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

                {!hasCrossRefs && (
                    <p className="g-empty">No cross-references on file.</p>
                )}
            </article>
        </div>
    );
}
