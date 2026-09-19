import React from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { RecordRow, EmptyState } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';

function EntryRecord({ entry }) {
    return (
        <RecordRow
            className={`break-inside-avoid ${entry.element ? `el-${entry.element}` : ''}`}
            term={
                <Link to={lore.routeFor('entry', entry.key)} className="no-underline hover:underline">
                    {entry.title}
                </Link>
            }
        >
            <Prose text={entry.definition} except={entry.key} className="m-0 text-small text-ink-2" />
        </RecordRow>
    );
}

/**
 * Powers and Peoples: factions, notable people, and the demonyms of the
 * fourteen worlds. Contract: docs/design/xalian-encyclopedia-page.md §5
 * "Powers and peoples".
 */
export default function Powers() {
    usePageTitle('Powers');
    const { factions, vallerii, peoples } = lore.getPowers();

    return (
        <div>
            <section>
                <SectionHead title="The Vallerii" count={`${vallerii.length} record${vallerii.length === 1 ? '' : 's'}`} />
                {vallerii.length === 0 ? (
                    <EmptyState legend="No record">No record on file.</EmptyState>
                ) : (
                    <div className="columns-1 border-t border-edge lg:columns-2">
                        {vallerii.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <SectionHead title="Factions" count={`${factions.length} record${factions.length === 1 ? '' : 's'}`} />
                {factions.length === 0 ? (
                    <EmptyState legend="No record">No record on file.</EmptyState>
                ) : (
                    <div className="columns-1 border-t border-edge lg:columns-2">
                        {factions.map((entry) => <EntryRecord key={entry.key} entry={entry} />)}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <SectionHead title="Xalian Peoples" count={`${peoples.length} record${peoples.length === 1 ? '' : 's'}`} />
                <div className="columns-1 border-t border-edge lg:columns-2">
                    {peoples.map((p) => (
                        <RecordRow
                            key={p.name}
                            className={`break-inside-avoid ${p.planet ? `el-${p.planet.element}` : ''}`}
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
                                <Prose text={p.entry.definition} except={p.entry.key} className="m-0 text-small text-ink-2" />
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
