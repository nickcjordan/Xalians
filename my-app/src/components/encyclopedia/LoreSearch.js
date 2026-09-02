import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import * as lore from '../../lore';

const KIND_LABEL = { entry: 'Entry', world: 'World', species: 'Species', paragraph: 'History', era: 'Era' };
const KIND_ORDER = ['entry', 'species', 'world', 'era', 'paragraph'];

/**
 * The one search field on every Encyclopedia screen. Typing opens a results
 * screen grouped by kind; Enter goes to the Index with the query applied.
 */
export default function LoreSearch() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const history = useHistory();
    const box = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function onDocClick(e) {
            if (box.current && !box.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => {
        function isTypingTarget(el) {
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        }
        function onKeyDown(e) {
            if (e.key === '/' && !isTypingTarget(document.activeElement)) {
                e.preventDefault();
                if (inputRef.current) inputRef.current.focus();
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    function onKeyDownInput(e) {
        if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
            if (inputRef.current) inputRef.current.blur();
        }
    }

    const trimmed = query.trim();
    const hits = trimmed.length >= 2 ? lore.search(trimmed, { limit: 18 }) : [];
    const groups = KIND_ORDER
        .map((kind) => ({ kind, hits: hits.filter((h) => h.kind === kind) }))
        .filter((g) => g.hits.length);

    function submit(e) {
        e.preventDefault();
        if (!trimmed) return;
        setOpen(false);
        history.push(`/encyclopedia/index?q=${encodeURIComponent(trimmed)}`);
    }

    return (
        <form className="enc-search" role="search" onSubmit={submit} ref={box}>
            <input
                ref={inputRef}
                className="g-input enc-search-input"
                type="search"
                placeholder="SEARCH THE ARCHIVE"
                aria-label="Search the encyclopedia"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDownInput}
                autoComplete="off"
            />
            <span className="g-chip g-chip--outline enc-search-hint g-mono" aria-hidden="true">/</span>
            {open && trimmed.length >= 2 && (
                <div className="g-screen enc-search-screen" role="listbox" aria-label="Search results">
                    {groups.length === 0 && <p className="g-screen-line g-screen-line--dim">NO RECORD MATCHES “{trimmed.toUpperCase()}”</p>}
                    {groups.map((g) => (
                        <div key={g.kind} className="enc-search-group">
                            <p className="g-screen-line g-screen-line--dim">{KIND_LABEL[g.kind].toUpperCase()}</p>
                            {g.hits.map((h) => (
                                <Link
                                    key={`${h.kind}:${h.key}`}
                                    to={h.route}
                                    className="g-screen-line enc-search-hit"
                                    onClick={() => { setOpen(false); setQuery(''); }}
                                >
                                    <span className="enc-search-hit-title">{h.title}</span>
                                    {h.snippet && <span className="enc-search-hit-snippet"> {h.snippet}</span>}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </form>
    );
}
