import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import './Index.css';

/**
 * Index: every entry, searchable, filterable by category, alphabetical.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Index and entry".
 */
export default function Index() {
    const location = useLocation();
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

    return (
        <div className="enc-index">
            <div className="enc-index-controls">
                <input
                    className="g-input enc-index-search"
                    type="search"
                    placeholder="SEARCH ENTRIES"
                    aria-label="Search entries"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="g-segmented enc-index-chips" aria-label="Filter by category">
                    <button
                        type="button"
                        className="g-segment"
                        aria-pressed={category === 'all'}
                        onClick={() => setCategory('all')}
                    >
                        All
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className="g-segment"
                            aria-pressed={category === c}
                            onClick={() => setCategory(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            <p className="enc-count">{entries.length} record{entries.length === 1 ? '' : 's'}</p>

            {entries.length === 0 ? (
                <p className="g-empty">No record matches the current filter.</p>
            ) : (
                <div className="g-panel g-panel--recessed enc-index-panel">
                    <div className="enc-index-list">
                        {entries.map((entry) => (
                            <div key={entry.key} className={`g-record ${entry.element ? `g-el-${entry.element}` : ''}`}>
                                <div>
                                    <Link to={lore.routeFor('entry', entry.key)} className="g-record-term">
                                        {entry.title}
                                    </Link>
                                    <div className="enc-index-chips-row">
                                        <span className="g-chip">{entry.category}</span>
                                        {entry.element && <span className="g-chip">{entry.element}</span>}
                                    </div>
                                </div>
                                <Prose text={entry.definition} except={entry.key} className="g-record-body" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
