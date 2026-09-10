import React, { useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { useReadMark } from './trail';
import { RecordRow, EmptyState } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tabTriggerClass } from '@/components/ui/tabs';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function initialOf(title) {
    const c = (title || '').trim().charAt(0).toUpperCase();
    return ALPHABET.includes(c) ? c : '#';
}

function IndexRecord({ entry }) {
    const read = useReadMark('entry', entry.key);
    return (
        <RecordRow
            id={`index-${entry.key}`}
            className={entry.element ? `el-${entry.element}` : ''}
            term={
                <div>
                    <Link to={lore.routeFor('entry', entry.key)} className="no-underline hover:underline">
                        {entry.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{entry.category}</Badge>
                        {entry.element && <Badge variant="chip" className={`el-${entry.element}`}>{entry.element}</Badge>}
                        {read && <Badge variant="ok">Reviewed</Badge>}
                    </div>
                </div>
            }
        >
            <Prose text={entry.definition} except={entry.key} className="m-0 max-w-none text-small text-ink-2" />
        </RecordRow>
    );
}

/**
 * Index: every entry, searchable, filterable by category, alphabetical.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Index and entry".
 */
export default function Index() {
    const location = useLocation();
    const history = useHistory();
    const initialQuery = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('q') || '';
    }, [location.search]);

    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState('all');
    const categories = lore.getCategories();

    const trimmed = query.trim();
    const entries = useMemo(() => {
        let list;
        if (trimmed.length >= 2) {
            const hits = lore.search(trimmed, { limit: 500 }).filter((h) => h.kind === 'entry');
            list = hits.map((h) => lore.getEntry(h.key)).filter(Boolean);
        } else {
            list = lore.getEntries();
        }
        if (category !== 'all') list = list.filter((e) => e.category === category);
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }, [trimmed, category]);

    const liveLetters = useMemo(() => {
        const set = new Set();
        entries.forEach((e) => set.add(initialOf(e.title)));
        return set;
    }, [entries]);

    const scrollToLetter = (letter) => {
        const entry = entries.find((e) => initialOf(e.title) === letter);
        if (!entry) return;
        const el = document.getElementById(`index-${entry.key}`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
    };

    let lastInitial = null;

    function pullRandom() {
        const record = lore.getRandomRecord();
        history.push(lore.routeFor(record.kind, record.key));
    }

    return (
        <div>
            <div className="md:sticky md:top-0 md:z-10 md:bg-room md:pb-2 md:pt-3">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <Input
                        className="min-w-48 flex-[1_1_16rem]"
                        type="search"
                        placeholder="SEARCH ENTRIES"
                        aria-label="Search entries"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button type="button" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={pullRandom}>
                        Random entry
                    </Button>
                    <div className="flex flex-wrap gap-0.5 max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto" aria-label="Filter by category">
                        <button
                            type="button"
                            data-state={category === 'all' ? 'active' : 'inactive'}
                            className={`${tabTriggerClass} max-sm:shrink-0`}
                            aria-pressed={category === 'all'}
                            onClick={() => setCategory('all')}
                        >
                            All
                        </button>
                        {categories.map((c) => (
                            <button
                                key={c}
                                type="button"
                                data-state={category === c ? 'active' : 'inactive'}
                                className={`${tabTriggerClass} max-sm:shrink-0`}
                                aria-pressed={category === c}
                                onClick={() => setCategory(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-0.5 max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto" role="group" aria-label="Jump to letter">
                    {ALPHABET.map((letter) => {
                        const live = liveLetters.has(letter);
                        return live ? (
                            <Button
                                key={letter}
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="min-w-8 max-sm:h-9 max-sm:w-9 max-sm:shrink-0"
                                onClick={() => scrollToLetter(letter)}
                            >
                                {letter}
                            </Button>
                        ) : (
                            <span
                                key={letter}
                                className="type-legend flex min-w-8 items-center justify-center text-[13px] text-ink-3 max-sm:h-9 max-sm:w-9 max-sm:shrink-0"
                                aria-hidden="true"
                            >
                                {letter}
                            </span>
                        );
                    })}
                </div>
            </div>

            <p className="type-data m-0 text-small text-ink-2">{entries.length} record{entries.length === 1 ? '' : 's'}</p>

            {entries.length === 0 ? (
                <EmptyState legend="No results">No record matches the current filter.</EmptyState>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
                    {entries.map((entry) => {
                        const initial = initialOf(entry.title);
                        const showHeading = initial !== lastInitial;
                        lastInitial = initial;
                        return (
                            <React.Fragment key={entry.key}>
                                {showHeading && (
                                    <p
                                        className="type-legend col-span-full m-0 mt-4 border-b border-edge pb-1 text-ink-2 first:mt-0"
                                        aria-hidden="true"
                                    >
                                        {initial}
                                    </p>
                                )}
                                <IndexRecord entry={entry} />
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            <RecordRow className="mt-6" term="The whole archive as one document">
                Every world, species, and entry in one file, generated for machines and offline reading.{' '}
                <a href="/lore/xalia.md" target="_blank" rel="noopener" className="text-ink underline hover:text-ink-2">Markdown</a>
                {' · '}
                <a href="/lore/xalia.html" target="_blank" rel="noopener" className="text-ink underline hover:text-ink-2">HTML</a>
                {' · '}
                <a href="/lore/xalia.json" target="_blank" rel="noopener" className="text-ink underline hover:text-ink-2">JSON</a>
            </RecordRow>
        </div>
    );
}
