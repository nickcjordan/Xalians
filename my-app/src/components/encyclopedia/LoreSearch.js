import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import * as lore from '../../lore';

const KIND_LABEL = { entry: 'Entry', world: 'World', species: 'Species', paragraph: 'History', era: 'Era' };
const KIND_ORDER = ['entry', 'species', 'world', 'era', 'paragraph'];

function hitId(h) {
    return `enc-search-hit-${h.kind}-${h.key}`;
}

/**
 * The one search field on every Encyclopedia screen. Typing opens a results
 * screen grouped by kind; Enter goes to the Index with the query applied.
 */
export default function LoreSearch() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
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

    const trimmed = query.trim();
    const hits = trimmed.length >= 2 ? lore.search(trimmed, { limit: 18 }) : [];
    const groups = KIND_ORDER
        .map((kind) => ({ kind, hits: hits.filter((h) => h.kind === kind) }))
        .filter((g) => g.hits.length);

    // Flat list in the same order the hits render, so ArrowDown/ArrowUp can
    // walk it without caring about the group headers in between.
    const flatHits = groups.flatMap((g) => g.hits);

    useEffect(() => {
        setActiveIndex(-1);
    }, [query]);

    function goTo(hit) {
        setOpen(false);
        setQuery('');
        setActiveIndex(-1);
        history.push(hit.route);
    }

    function submit(e) {
        e.preventDefault();
        if (open && activeIndex >= 0 && flatHits[activeIndex]) {
            goTo(flatHits[activeIndex]);
            return;
        }
        if (!trimmed) return;
        setOpen(false);
        history.push(`/encyclopedia/index?q=${encodeURIComponent(trimmed)}`);
    }

    function onKeyDownInput(e) {
        if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
            setActiveIndex(-1);
            if (inputRef.current) inputRef.current.blur();
            return;
        }
        if (!open || flatHits.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % flatHits.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? flatHits.length - 1 : i - 1));
        }
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
                role="combobox"
                aria-expanded={open && trimmed.length >= 2}
                aria-controls="enc-search-listbox"
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 && flatHits[activeIndex] ? hitId(flatHits[activeIndex]) : undefined}
            />
            <span className="g-chip g-chip--outline enc-search-hint g-mono" aria-hidden="true">/</span>
            {open && trimmed.length >= 2 && (
                <div id="enc-search-listbox" className="g-screen enc-search-screen" role="listbox" aria-label="Search results">
                    {groups.length === 0 && <p className="g-screen-line g-screen-line--dim">NO RECORD MATCHES “{trimmed.toUpperCase()}”</p>}
                    {groups.map((g) => (
                        <div key={g.kind} className="enc-search-group">
                            <p className="g-screen-line g-screen-line--dim">{KIND_LABEL[g.kind].toUpperCase()}</p>
                            {g.hits.map((h) => {
                                const index = flatHits.indexOf(h);
                                const active = index === activeIndex;
                                return (
                                    <Link
                                        key={`${h.kind}:${h.key}`}
                                        id={hitId(h)}
                                        to={h.route}
                                        role="option"
                                        aria-selected={active}
                                        className={`g-screen-line enc-search-hit${active ? ' enc-search-hit--active' : ''}`}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => { setOpen(false); setQuery(''); setActiveIndex(-1); }}
                                    >
                                        <span className="enc-search-hit-title">{h.title}</span>
                                        {h.snippet && <span className="enc-search-hit-snippet"> {h.snippet}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </form>
    );
}
