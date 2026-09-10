import React, { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Card } from '@/components/ui/card';

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
        <form className="relative flex w-80 max-w-[60vw] flex-col gap-1 max-sm:w-auto max-sm:flex-1" role="search" onSubmit={submit} ref={box}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    className="w-full pr-9"
                    type="search"
                    placeholder="Search worlds, species, terms"
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
                <Kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-ink-3" aria-hidden="true">/</Kbd>
            </div>
            {open && trimmed.length >= 2 && (
                <Card
                    variant="raised"
                    id="enc-search-listbox"
                    role="listbox"
                    aria-label="Search results"
                    className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto p-4 shadow-float"
                >
                    {groups.length === 0 && <p className="m-0 font-body text-body text-ink-2">No record matches &ldquo;{trimmed}&rdquo;.</p>}
                    {groups.map((g) => (
                        <div key={g.kind} className="[&+&]:mt-3">
                            <p className="type-legend m-0 mb-1 text-[10px] text-ink-3">{KIND_LABEL[g.kind]}</p>
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
                                        className={`block px-1 py-1 text-ink no-underline outline-none ${active ? 'bg-s2' : ''}`}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => { setOpen(false); setQuery(''); setActiveIndex(-1); }}
                                    >
                                        <span className="font-semibold">{h.title}</span>
                                        {h.snippet && <span className="text-[13px] opacity-75"> {h.snippet}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </Card>
            )}
        </form>
    );
}
