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
                            {appearances.map((app, i) => {
                                const route = lore.routeFor(app.kind, app.key);
                                const hash = app.kind === 'world' && typeof app.paragraph === 'number'
                                    ? `#chapter-${app.paragraph}`
                                    : '';
                                return (
                                    <div key={`${app.kind}:${app.key}:${i}`} className="enc-entry-appearance">
                                        <div className="enc-chips">
                                            <span className="g-chip g-chip--outline">{APPEARANCE_KIND_LABEL[app.kind] || app.kind}</span>
                                            <Link to={`${route}${hash}`} className="g-record-term enc-entry-appearance-name">
                                                {app.name}
                                            </Link>
                                        </div>
                                        <p className="g-body">{app.excerpt}</p>
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
