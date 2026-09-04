import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import Connections from './Connections';
import Pronunciation from './Pronunciation';
import { useVisit, useResume } from './trail';
import './EntryView.css';

/**
 * The part of a history paragraph that carries the entry: the sentence that
 * names it plus one sentence either side. An entry page is the thread of one
 * name through the story, not the whole book again; the full paragraph is
 * one click away in the part. Falls back to the whole text when the name is
 * not found sentence by sentence.
 */
function excerptWindow(text, title) {
    const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
    if (sentences.length <= 3) return text;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    const hit = sentences.findIndex((s) => re.test(s));
    if (hit === -1) return text;
    const start = Math.max(0, hit - 1);
    const end = Math.min(sentences.length, hit + 2);
    const body = sentences.slice(start, end).join('').trim();
    return `${start > 0 ? '… ' : ''}${body}${end < sentences.length ? ' …' : ''}`;
}

/** "Continue the story" foot: one .g-record line pointing at the reader's furthest part, or Part 1 when nothing is stored. */
function ContinueTheStory() {
    const resume = useResume();
    const eras = lore.getEras();
    const era = resume ? lore.getEra(resume.eraKey) : null;
    const target = era || eras[0];
    if (!target) return null;
    return (
        <div className="g-record enc-continue">
            <span className="g-record-term">Continue the story</span>
            <Link to={lore.routeFor('era', target.key)} className="g-record-body g-link">
                Part {target.order + 1}, {target.name}
            </Link>
        </div>
    );
}

/** A closed-by-default panel of secondary record data. */
function Fold({ label, count, children }) {
    return (
        <details className="g-panel enc-fold">
            <summary className="enc-fold-summary">
                <span className="g-kicker enc-fold-label">{label}</span>
                {typeof count === 'number' && <span className="g-mono enc-fold-count">{count}</span>}
                <span className="enc-fold-chevron" aria-hidden="true" />
            </summary>
            <div className="enc-fold-body">{children}</div>
        </details>
    );
}

// Wraps every whole-word (optionally plural) mention of `name` in `text` with
// a <mark>, the same way Connections marks its subject (see Connections.js
// markSubject / lore/connections.js findMention).
function markName(text, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b(${escaped}s?)\\b`, 'gi');
    const parts = text.split(re);
    if (parts.length === 1) return text;
    return parts.map((part, i) => (
        i % 2 === 1
            ? <mark key={i} className="enc-conn-mark">{part}</mark>
            : part
    ));
}

/** An entry page is the thread of one name through the story; past this many excerpts in one era the part itself is the better read. */
const EXCERPTS_PER_ERA = 3;

/** One era's reading in "In the story": the fixed points that name this entry, then the excerpts as reader-style paragraphs. */
function StoryEra({ row, entryTitle }) {
    return (
        <section className="enc-entry-story-era">
            <div className="enc-entry-story-era-head">
                <Link to={lore.routeFor('era', row.era.key)} className="g-h3 enc-entry-story-era-name">
                    {row.era.name}
                </Link>
                <span className="g-mono enc-fold-count">Part {row.era.order + 1}</span>
            </div>

            {row.events.length > 0 && (
                <ul className="enc-entry-story-points">
                    {row.events.map(({ event }) => (
                        <li key={event.key} className="enc-entry-story-point">
                            <Link
                                to={lore.routeFor('event', `${row.era.key}:${event.key}`)}
                                className="g-record-term enc-entry-story-point-link"
                            >
                                {event.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {row.excerpts.slice(0, EXCERPTS_PER_ERA).map((excerpt) => (
                <div key={`${excerpt.world.key}:${excerpt.index}`} className="enc-reader-para enc-entry-story-para">
                    <div className="enc-reader-note">
                        <Link
                            to={lore.routeFor('world', excerpt.world.key)}
                            className={`g-chip g-chip--outline g-el-${excerpt.world.element} enc-reader-note-chip`}
                        >
                            {excerpt.world.name}
                        </Link>
                        <span className="g-mono enc-reader-note-chapter">Ch. {String(excerpt.index).padStart(2, '0')}</span>
                    </div>
                    <div>
                        <p className="g-body enc-prose enc-reader-para-text">
                            {markName(excerptWindow(excerpt.text, entryTitle), entryTitle)}
                        </p>
                        <Link
                            to={`${lore.routeFor('era', row.era.key)}#chapter-${excerpt.world.key}-${excerpt.index}`}
                            className="g-link enc-entry-story-read-link"
                        >
                            Read in Part {row.era.order + 1}
                        </Link>
                    </div>
                </div>
            ))}
            {row.excerpts.length > EXCERPTS_PER_ERA && (
                <p className="g-mono enc-entry-story-more">
                    <Link to={lore.routeFor('era', row.era.key)} className="g-link">
                        and {row.excerpts.length - EXCERPTS_PER_ERA} more in Part {row.era.order + 1}
                    </Link>
                </p>
            )}
        </section>
    );
}

/**
 * EntryView: one encyclopedia entry, its related entries, and every place
 * it appears in world histories and species descriptions.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Index and entry".
 */
export default function EntryView() {
    const { key } = useParams();
    const entry = lore.getEntry(key);
    const wasRead = useVisit(entry
        ? { kind: 'entry', key, name: entry.title, element: entry.element }
        : { kind: null, key: null });

    if (!entry) {
        return (
            <div className="enc-entry">
                <Link to="/encyclopedia/index" className="enc-back">&laquo; Back to Index</Link>
                <p className="g-empty">No record for &ldquo;{key}&rdquo;.</p>
            </div>
        );
    }

    const related = lore.getRelated(key);
    const story = lore.getEntryStory(key);
    const era = entry.category === 'history' ? lore.getEraForEntry(key) : null;
    const connectionsCount = lore.getConnections('entry', key, { limit: 12 }).length;
    const scopeClass = entry.element ? `g-el-${entry.element}` : '';

    return (
        <div className={`enc-entry ${scopeClass}`}>
            <Link to="/encyclopedia/index" className="enc-back">&laquo; Back to Index</Link>

            <article className="enc-entry-doc">
                <header className="enc-designation">
                    <h1 className="g-title">{entry.title}</h1>
                    <Pronunciation pronunciation={entry.pronunciation} />
                    <div className="enc-chips">
                        <span className="g-chip">{entry.category}</span>
                        {entry.element && <span className="g-chip">{entry.element}</span>}
                        {era && (
                            <Link to={lore.routeFor('era', era.key)} className={`g-chip g-chip--outline enc-entry-era-chip`}>
                                {era.name}
                            </Link>
                        )}
                    </div>
                    {wasRead && <p className="g-mono enc-entry-reviewed">reviewed</p>}
                </header>

                <div className="enc-record">
                    <div className="enc-entry-plate">
                        <Prose text={entry.definition} except={key} />
                    </div>

                    <div className="enc-entry-rails">
                        {story.length > 0 && (
                            <section className="enc-section enc-entry-story">
                                <div className="enc-section-head">
                                    <h2 className="g-h2">In the Story</h2>
                                </div>
                                {story.map((row) => (
                                    <StoryEra key={row.era.key} row={row} entryTitle={entry.title} />
                                ))}
                            </section>
                        )}

                        {related.length > 0 && (
                            <section className="enc-section">
                                <div className="enc-section-head">
                                    <h2 className="g-h2">Related</h2>
                                </div>
                                <div className="g-panel g-panel--recessed enc-entry-related">
                                    {related.map((rel) => (
                                        <div key={rel.key} className={`g-record ${rel.element ? `g-el-${rel.element}` : ''}`}>
                                            <Link to={lore.routeFor('entry', rel.key)} className="g-record-term">
                                                {rel.title}
                                            </Link>
                                            <Prose text={rel.definition} except={rel.key} className="g-record-body" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {story.length === 0 && related.length === 0 && (
                            <p className="g-empty">No cross-references on file.</p>
                        )}

                        <ContinueTheStory />

                        <Fold label="Cross references" count={connectionsCount}>
                            <Connections kind="entry" recordKey={key} limit={12} />
                        </Fold>
                    </div>
                </div>
            </article>
        </div>
    );
}
