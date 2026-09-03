import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import './Powers.css';

function EntryRecord({ entry }) {
    return (
        <div className={`g-record ${entry.element ? `g-el-${entry.element}` : ''}`}>
            <Link to={lore.routeFor('entry', entry.key)} className="g-record-term">
                {entry.title}
            </Link>
            <Prose text={entry.definition} except={entry.key} className="g-record-body" />
        </div>
    );
}

/**
 * Powers and Peoples: factions, notable people, and the demonyms of the
 * fourteen worlds. Contract: docs/design/xalian-encyclopedia-page.md §5
 * "Powers and peoples".
 */
export default function Powers() {
    const { factions, people, peoples } = lore.getPowers();

    return (
        <div className="enc-powers">
            <section className="enc-section enc-powers-first">
                <div className="enc-section-head">
                    <h2 className="g-h2">Factions</h2>
                    <span className="enc-count">{factions.length} record{factions.length === 1 ? '' : 's'}</span>
                </div>
                {factions.length === 0 ? (
                    <p className="g-empty">No record on file.</p>
                ) : (
                    <div className="g-panel g-panel--recessed enc-powers-panel">
                        {factions.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">People</h2>
                    <span className="enc-count">{people.length} record{people.length === 1 ? '' : 's'}</span>
                </div>
                {people.length === 0 ? (
                    <p className="g-empty">No record on file.</p>
                ) : (
                    <div className="g-panel g-panel--recessed enc-powers-panel">
                        {people.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Xalian Peoples</h2>
                    <span className="enc-count">{peoples.length} record{peoples.length === 1 ? '' : 's'}</span>
                </div>
                <div className="g-panel g-panel--recessed enc-powers-panel">
                    {peoples.map((p) => (
                        <div key={p.name} className={`g-record ${p.planet ? `g-el-${p.planet.element}` : ''}`}>
                            <div>
                                <p className="g-record-term">{p.name}</p>
                                {p.planet && (
                                    <Link to={lore.routeFor('world', p.planet.key)} className="g-chip enc-powers-world-chip">
                                        {p.planet.name}
                                    </Link>
                                )}
                            </div>
                            {p.entry ? (
                                <Prose text={p.entry.definition} except={p.entry.key} className="g-record-body" />
                            ) : (
                                <p className="g-mono enc-powers-no-entry">
                                    No entry on file; see {p.planet ? p.planet.name : 'their homeworld'}.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
