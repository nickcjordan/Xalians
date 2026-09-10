import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import { SectionHead } from '@/components/system/masthead';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
            ? <mark key={i} className="bg-viable-tint px-0.5 text-inherit">{part}</mark>
            : part
    ));
}

function tallyDots(count) {
    const capped = Math.min(count, 8);
    const dots = [];
    for (let i = 0; i < capped; i++) {
        dots.push(<span key={i} className="inline-block size-1.5 rounded-full bg-viable" aria-hidden="true" />);
    }
    return dots;
}

function ConnectionSample({ row }) {
    const route = sampleRoute(row.sample);
    const excerptNode = markSubject(row.sample.excerpt, row.name);

    return (
        <p className="type-data m-0 mt-2 pl-0 text-small text-ink-2">
            {route ? (
                <Link to={route} className="text-ink-3 no-underline hover:text-edge-strong">{row.sample.label}</Link>
            ) : (
                <span className="text-ink-3">{row.sample.label}</span>
            )}
            {' '}
            <span className="text-ink-2">{excerptNode}</span>
        </p>
    );
}

function ConnectionRowHead({ row, route }) {
    return (
        <>
            <Link to={route} className="type-legend text-body text-ink no-underline hover:text-ink">{row.name}</Link>
            {row.element && <Badge variant="chip-outline">{row.element}</Badge>}
            <span className="ml-auto inline-flex items-center gap-[3px]" title={`${row.count} shared mentions`}>
                {tallyDots(row.count)}
                <span className="type-data ml-2 text-small text-ink-2">{row.count}</span>
            </span>
        </>
    );
}

function ConnectionRow({ row, isPhone }) {
    const route = lore.routeFor(row.kind, row.key);
    const scopeClass = row.element ? `el-${row.element}` : '';

    if (isPhone) {
        return (
            <li className={`border-b border-edge py-3 last:border-b-0 ${scopeClass}`}>
                <details className="w-full">
                    <summary className="flex flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden [&::marker]:content-none cursor-pointer">
                        <ConnectionRowHead row={row} route={route} />
                    </summary>
                    <ConnectionSample row={row} />
                </details>
            </li>
        );
    }

    return (
        <li className={`border-b border-edge py-3 last:border-b-0 ${scopeClass}`}>
            <div className="flex flex-wrap items-center gap-3">
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
        <section className="mt-8">
            <SectionHead title="Connections" count={rows.length} />
            <Card variant="panel" className="p-0">
                <ul className="m-0 flex flex-col px-4 py-2">
                    {rows.map((row) => (
                        <ConnectionRow key={`${row.kind}:${row.key}`} row={row} isPhone={isPhone} />
                    ))}
                </ul>
            </Card>
        </section>
    );
}
