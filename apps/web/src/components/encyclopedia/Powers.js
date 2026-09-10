import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { SectionHead } from '@/components/system/masthead';
import { RecordRow, EmptyState } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';

function EntryRecord({ entry }) {
    return (
        <RecordRow
            className={entry.element ? `el-${entry.element}` : ''}
            term={
                <Link to={lore.routeFor('entry', entry.key)} className="no-underline hover:underline">
                    {entry.title}
                </Link>
            }
        >
            <Prose text={entry.definition} except={entry.key} className="m-0 max-w-none text-small text-ink-2" />
        </RecordRow>
    );
}

/**
 * Powers and Peoples: factions, notable people, and the demonyms of the
 * fourteen worlds. Contract: docs/design/xalian-encyclopedia-page.md §5
 * "Powers and peoples".
 */
export default function Powers() {
    const { factions, vallerii, peoples } = lore.getPowers();

    return (
        <div>
            <section>
                <SectionHead title="The Vallerii" count={`${vallerii.length} record${vallerii.length === 1 ? '' : 's'}`} />
                {vallerii.length === 0 ? (
                    <EmptyState legend="No record">No record on file.</EmptyState>
                ) : (
                    <div className="border-t border-edge">
                        {vallerii.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <SectionHead title="Factions" count={`${factions.length} record${factions.length === 1 ? '' : 's'}`} />
                {factions.length === 0 ? (
                    <EmptyState legend="No record">No record on file.</EmptyState>
                ) : (
                    <div className="border-t border-edge">
                        {factions.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <SectionHead title="Xalian Peoples" count={`${peoples.length} record${peoples.length === 1 ? '' : 's'}`} />
                <div className="border-t border-edge">
                    {peoples.map((p) => (
                        <RecordRow
                            key={p.name}
                            className={p.planet ? `el-${p.planet.element}` : ''}
                            term={
                                <div>
                                    <p className="m-0">{p.name}</p>
                                    {p.planet && (
                                        <Link to={lore.routeFor('world', p.planet.key)} className="mt-2 inline-block">
                                            <Badge variant="chip">{p.planet.name}</Badge>
                                        </Link>
                                    )}
                                </div>
                            }
                        >
                            {p.entry ? (
                                <Prose text={p.entry.definition} except={p.entry.key} className="m-0 max-w-none text-small text-ink-2" />
                            ) : (
                                <p className="type-data m-0 text-small text-ink-3">
                                    No entry on file; see {p.planet ? p.planet.name : 'their homeworld'}.
                                </p>
                            )}
                        </RecordRow>
                    ))}
                </div>
            </section>
        </div>
    );
}
