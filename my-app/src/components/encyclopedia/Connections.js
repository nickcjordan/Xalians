import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import './Connections.css';

const PHONE_QUERY = '(max-width: 700px)';

function useIsPhone() {
    const [isPhone, setIsPhone] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PHONE_QUERY).matches : false
    ));
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mql = window.matchMedia(PHONE_QUERY);
        const onChange = () => setIsPhone(mql.matches);
        mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange);
        return () => {
            mql.removeEventListener ? mql.removeEventListener('change', onChange) : mql.removeListener(onChange);
        };
    }, []);
    return isPhone;
}

const CHAPTER_LABEL_RE = /Ch\.\s*(\d+)$/;

// The sample's own link target. World samples point at the paragraph
// (chapter) inside that world's history; entry/species/tour samples point
// at the record the excerpt came from.
function sampleRoute(sample) {
    if (sample.kind === 'world') {
        const match = CHAPTER_LABEL_RE.exec(sample.label);
        if (match) {
            const chapterIndex = Number(match[1]) - 1;
            return lore.routeFor('paragraph', `${sample.key}:${chapterIndex}`);
        }
        return lore.routeFor('world', sample.key);
    }
    if (sample.kind === 'entry') return lore.routeFor('entry', sample.key);
    if (sample.kind === 'species') return lore.routeFor('species', sample.key);
    if (sample.kind === 'tour') return lore.routeFor('tour', sample.key);
    return null;
}

// Wraps every whole-word (optionally plural) mention of `name` in the
// excerpt with a <mark>, the same way the co-occurrence index itself finds
// mentions (see lore/connections.js findMention).
function markSubject(excerpt, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b(${escaped}s?)\\b`, 'gi');
    const parts = excerpt.split(re);
    if (parts.length === 1) return excerpt;
    return parts.map((part, i) => (
        i % 2 === 1
            ? <mark key={i} className="enc-conn-mark">{part}</mark>
            : part
    ));
}

function tallyDots(count) {
    const capped = Math.min(count, 8);
    const dots = [];
    for (let i = 0; i < capped; i++) {
        dots.push(<span key={i} className="g-lamp enc-conn-tally-dot" aria-hidden="true" />);
    }
    return dots;
}

function ConnectionSample({ row }) {
    const route = sampleRoute(row.sample);
    const excerptNode = markSubject(row.sample.excerpt, row.name);

    return (
        <p className="g-mono enc-conn-sample">
            {route ? (
                <Link to={route} className="enc-conn-sample-label">{row.sample.label}</Link>
            ) : (
                <span className="enc-conn-sample-label">{row.sample.label}</span>
            )}
            {' '}
            <span className="enc-conn-sample-excerpt">{excerptNode}</span>
        </p>
    );
}

function ConnectionRowHead({ row, route }) {
    return (
        <>
            <Link to={route} className="g-record-term enc-conn-name">{row.name}</Link>
            {row.element && <span className="g-chip g-chip--outline enc-conn-element">{row.element}</span>}
            <span className="enc-conn-tally" title={`${row.count} shared mentions`}>
                {tallyDots(row.count)}
                <span className="g-mono enc-conn-tally-num">{row.count}</span>
            </span>
        </>
    );
}

function ConnectionRow({ row, isPhone }) {
    const route = lore.routeFor(row.kind, row.key);
    const scopeClass = row.element ? `g-el-${row.element}` : '';

    if (isPhone) {
        return (
            <li className={`enc-conn-row ${scopeClass}`}>
                <details className="enc-conn-row-details">
                    <summary className="enc-conn-row-summary">
                        <ConnectionRowHead row={row} route={route} />
                    </summary>
                    <ConnectionSample row={row} />
                </details>
            </li>
        );
    }

    return (
        <li className={`enc-conn-row ${scopeClass}`}>
            <div className="enc-conn-row-summary">
                <ConnectionRowHead row={row} route={route} />
            </div>
            <ConnectionSample row={row} />
        </li>
    );
}

/**
 * Connections: the other encyclopedia records that share text with this
 * one -- world history chapters, species descriptions, entry definitions,
 * tour beats. Renders nothing when there are none.
 * Contract: docs/design/xalian-encyclopedia-ux-pass.md, batch 3 "Connections".
 */
export default function Connections({ kind, recordKey, limit = 12 }) {
    const isPhone = useIsPhone();
    const rows = lore.getConnections(kind, recordKey, { limit });
    if (rows.length === 0) return null;

    return (
        <section className="enc-section enc-conn">
            <div className="enc-section-head">
                <h2 className="g-h2">Connections</h2>
                <span className="enc-count">{rows.length}</span>
            </div>
            <ul className="g-panel g-panel--recessed enc-conn-list">
                {rows.map((row) => (
                    <ConnectionRow key={`${row.kind}:${row.key}`} row={row} isPhone={isPhone} />
                ))}
            </ul>
        </section>
    );
}
