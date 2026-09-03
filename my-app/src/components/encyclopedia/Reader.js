import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { markRead, useReadMark } from './trail';
import './Reader.css';

/** The Foreword link that opens Part 1: the reader is the whole Chronicle told as one book. */
function Foreword() {
    return (
        <p className="g-mono enc-reader-foreword">
            <Link to="/encyclopedia/tour" className="g-link">Foreword: the First Survey</Link>
        </p>
    );
}

/** One paragraph's margin note: the world as an element chip link, the chapter number, and a read lamp. */
function MarginNote({ world, index, read }) {
    return (
        <div className="enc-reader-note">
            <Link to={lore.routeFor('world', world.key)} className={`g-chip g-chip--outline g-el-${world.element} enc-reader-note-chip`}>
                {world.name}
            </Link>
            <span className="g-mono enc-reader-note-chapter">Ch. {String(index).padStart(2, '0')}</span>
            <span className={`g-lamp enc-reader-note-lamp ${read ? '' : 'g-lamp--off'}`} aria-hidden="true" />
        </div>
    );
}

function ReaderParagraph({ world, index, text, onVisible }) {
    const read = useReadMark('chapter', `${world.key}:${index}`);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        onVisible();
                    }
                });
            },
            { threshold: [0.5] }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [world.key, index]);

    return (
        <div ref={ref} data-reader-paragraph="true" className="enc-reader-para">
            <MarginNote world={world} index={index} read={read} />
            <Prose text={text} className="enc-reader-para-text" />
        </div>
    );
}

function ReaderSection({ section }) {
    return (
        <section className="enc-reader-section">
            <p className="g-kicker enc-reader-section-head">{section.head || 'Elsewhere in the era'}</p>
            {section.paragraphs.map((p) => (
                <ReaderParagraph
                    key={`${p.world.key}:${p.index}`}
                    world={p.world}
                    index={p.index}
                    text={p.text}
                    onVisible={() => markRead('chapter', `${p.world.key}:${p.index}`)}
                />
            ))}
        </section>
    );
}

/** Sticky progress rail: the seven parts as stations, plus a mono paragraph-progress figure at desktop, collapsing to a top strip on phones. */
function ProgressRail({ reader, part, progress }) {
    return (
        <nav className="enc-reader-rail" aria-label="Chronicle parts">
            <ol className="enc-reader-rail-stations">
                {reader.parts.map((p) => (
                    <li key={p.era.key}>
                        <Link
                            to={`/encyclopedia/read/${p.era.key}`}
                            className="enc-reader-rail-station"
                            aria-current={p.era.key === part.era.key ? 'true' : undefined}
                        >
                            <span className="g-mono enc-reader-rail-index">{String(p.order + 1).padStart(2, '0')}</span>
                            <span className="enc-reader-rail-name">{p.era.name}</span>
                        </Link>
                    </li>
                ))}
            </ol>
            <p className="g-mono enc-reader-rail-progress">
                Part {part.order + 1} of {reader.parts.length}
                <br />
                {progress} / {reader.totalParagraphs} read
            </p>
        </nav>
    );
}

export default function Reader() {
    const { era: eraKey } = useParams();
    const history = useHistory();
    const reader = useMemo(() => lore.getReader(), []);
    const part = eraKey ? lore.getReaderPart(eraKey) : lore.getReaderPart(reader.parts[0].era.key);

    const [progress, setProgress] = useState(0);

    // Count paragraphs read across the whole Chronicle, not just this part,
    // so the figure reflects the reader's overall progress as they move
    // between parts. Re-reads storage (guarded, per trail.js) whenever a
    // mark changes, including marks made by this page's own observers.
    useEffect(() => {
        function recompute() {
            let readKeys;
            try {
                const raw = window.localStorage.getItem('enc.read.v1');
                const read = raw ? JSON.parse(raw) : {};
                readKeys = new Set(
                    Object.keys(read || {})
                        .filter((k) => k.startsWith('chapter:'))
                        .map((k) => k.slice('chapter:'.length))
                );
            } catch (e) {
                readKeys = new Set();
            }
            let count = 0;
            for (const p of reader.parts) {
                for (const section of p.sections) {
                    for (const paragraph of section.paragraphs) {
                        if (readKeys.has(`${paragraph.world.key}:${paragraph.index}`)) count += 1;
                    }
                }
            }
            setProgress(count);
        }
        recompute();
        window.addEventListener('enc-trail-change', recompute);
        window.addEventListener('storage', recompute);
        return () => {
            window.removeEventListener('enc-trail-change', recompute);
            window.removeEventListener('storage', recompute);
        };
    }, [reader]);

    // Left/right arrow keys move between parts when focus is not in an input.
    useEffect(() => {
        function onKeyDown(e) {
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
            if (!part) return;
            if (e.key === 'ArrowLeft' && part.prev) {
                history.push(`/encyclopedia/read/${part.prev}`);
            } else if (e.key === 'ArrowRight' && part.next) {
                history.push(`/encyclopedia/read/${part.next}`);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [part, history]);

    if (!part) {
        return (
            <div className="enc-reader">
                <Link to="/encyclopedia/read" className="enc-back">&laquo; Back to the Chronicle</Link>
                <p className="g-empty">No record for &ldquo;{eraKey}&rdquo;.</p>
            </div>
        );
    }

    const prevEra = part.prev ? lore.getReaderPart(part.prev).era : null;
    const nextEra = part.next ? lore.getReaderPart(part.next).era : null;
    const isFirst = part.order === 0;
    const isLast = part.next === null;

    return (
        <div className="enc-reader">
            <div className="enc-reader-layout">
                <ProgressRail reader={reader} part={part} progress={progress} />
                <div className="enc-reader-main">
                    {isFirst && <Foreword />}
                    <p className="g-kicker enc-reader-kicker">Part {part.order + 1}</p>
                    <h1 className="g-title enc-reader-title">{part.era.name}</h1>
                    <p className="g-body enc-prose enc-reader-def">{part.era.definition}</p>

                    {part.sections.map((section, i) => (
                        <ReaderSection key={`${part.era.key}-${i}`} section={section} />
                    ))}

                    <div className="enc-reader-nav">
                        {prevEra ? (
                            <Link to={`/encyclopedia/read/${prevEra.key}`} className="g-btn enc-reader-nav-btn">
                                &larr; {prevEra.name}
                            </Link>
                        ) : (
                            <span />
                        )}
                        {nextEra && (
                            <Link to={`/encyclopedia/read/${nextEra.key}`} className="g-btn enc-reader-nav-btn">
                                Continue to Part {part.order + 2}: {nextEra.name} &rarr;
                            </Link>
                        )}
                    </div>

                    {isLast && (
                        <div className="enc-reader-end">
                            <p className="g-kicker">End of the Chronicle</p>
                            <div className="enc-reader-end-links">
                                <Link to="/encyclopedia/species" className="g-btn enc-reader-nav-btn">The Bestiary</Link>
                                <Link to="/encyclopedia/worlds" className="g-btn enc-reader-nav-btn">The Worlds</Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
