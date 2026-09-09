import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import { useVisit, useReadMark, markRead, useResume } from './trail';
import './WorldView.css';

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

function sentenceCase(text) {
    if (!text) return text;
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// The physical plate is a small display-set so fields can change in one
// place while the planet data block is mid-redesign (per contract). Terrain
// reads in body face, sentence case (docs/DESIGN_SYSTEM.md common brief rule
// 6); the rest are data-face values.
const PHYSICAL_DISPLAY_SET = [
    ['Terrain', (p) => sentenceCase(p.terrainLabel), false],
    ['Size vs Earth', (p) => `${p.sizeVsEarth}x`, true],
    ['Radius km', (p) => Number(p.radiusKm).toLocaleString('en-US'), true],
    ['Gravity vs Earth', (p) => `${p.gravityVsEarth}x`, true],
    ['Temperature range', (p) => `${p.temperatureC.low} to ${p.temperatureC.high} C`, true],
];

const MOBILITY_ORDER = ['flight', 'swim', 'burrow', 'climb', 'sprint'];

function chapterEraTag(chapter) {
    return chapter.era && chapter.era !== 'natural' ? chapter.era : null;
}

function chapterEraLabel(chapter, eraLabel) {
    if (!chapterEraTag(chapter)) return 'Natural history';
    return eraLabel || chapter.era;
}

/** One stop on the "In the story" rail: a .g-tab-link when the world has chapters or events in this era, plain --g-text-3 text with no box otherwise. */
function ChronicleStation({ row }) {
    const count = row.chapters.length;
    const lit = count > 0 || row.events.length > 0;
    const titleAttr = row.events.length > 0 ? row.events.map((e) => e.title).join(', ') : undefined;

    if (!lit) {
        return (
            <span className="enc-world-chronicle-station enc-world-chronicle-station--dim" aria-hidden="true">
                {row.era.name}
            </span>
        );
    }

    return (
        <Link
            to={lore.routeFor('era', row.era.key)}
            className="g-tab-link enc-world-chronicle-station"
            title={titleAttr}
        >
            {row.era.name}
            {count > 0 && <span className="g-mono enc-world-chronicle-station-count">{count} ch</span>}
        </Link>
    );
}

/** One row in the sticky chapter rail. Reads its own read mark and reports clicks as a fallback read trigger. */
function ChapterRailRow({ chapter, index, world, label, onFallbackRead }) {
    const read = useReadMark('chapter', `${world.key}:${chapter.index}`);
    const words = chapter.text.trim().split(/\s+/).slice(0, 8).join(' ');

    return (
        <a
            href={`#chapter-${chapter.index}`}
            className="enc-world-chapter-index-row"
            onClick={onFallbackRead}
        >
            <span className={`enc-read-dot ${read ? 'enc-read-dot--on' : ''}`} aria-hidden="true" />
            <span className="g-mono enc-world-chapter-index-num">
                CH. {String(index + 1).padStart(2, '0')}
            </span>
            <span className="g-badge enc-world-chapter-index-era">{label}</span>
            <span className="enc-world-chapter-index-snippet">{words}&hellip;</span>
        </a>
    );
}

/** The narrator's short lede placing the world in the story, with its Records consulted chips. Renders nothing when the writer has not reached this world yet. */
function WorldLede({ world }) {
    const lede = lore.getWorldLede(world.key);
    if (!lede) return null;
    return (
        <div className="enc-world-lede">
            <p className="g-body enc-prose enc-tour-prose">{lede.prose}</p>
            {(lede.sources.length > 0 || lede.entries.length > 0) && (
                <div className="enc-tour-consulted">
                    <p className="g-kicker">Records consulted</p>
                    <div className="enc-chips">
                        {lede.entries.map((entry) => (
                            <Link key={entry.key} to={lore.routeFor('entry', entry.key)} className="g-chip g-chip--outline">
                                {entry.title}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
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

/**
 * WorldView: the survey record for one world -- plate, narrator's lede,
 * history chapters, native fauna, entries naming the world, then the
 * environmental report and Connections behind closed folds.
 * Contract: docs/design/xalian-encyclopedia-story-pass.md "Record pages".
 */
export default function WorldView() {
    const { key } = useParams();
    const world = lore.getWorld(key);
    const isPhone = useIsPhone();

    useVisit(
        world
            ? { kind: 'world', key: world.key, name: world.name, element: world.element }
            : { kind: null, key: null }
    );

    const hasIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;
    const chapterRefs = useRef([]);

    useEffect(() => {
        if (!world || !hasIntersectionObserver) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const chapterIndex = entry.target.getAttribute('data-chapter-index');
                        if (chapterIndex != null) {
                            markRead('chapter', `${world.key}:${chapterIndex}`);
                        }
                    }
                });
            },
            { threshold: [0.5] }
        );

        chapterRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [world && world.key, hasIntersectionObserver]);

    if (!world) {
        return (
            <div className="enc-world">
                <p className="g-empty">No record for &ldquo;{key}&rdquo;.</p>
            </div>
        );
    }

    const eras = lore.getEras();
    const eraNameByKey = new Map(eras.map((e) => [e.key, e.name]));
    const timeline = lore.getWorldTimeline(world.key);
    const { physical, report } = world;

    const handleFallbackRead = (chapterIndex) => () => {
        if (!hasIntersectionObserver) {
            markRead('chapter', `${world.key}:${chapterIndex}`);
        }
    };

    const connectionsCount = lore.getConnections('world', world.key, { limit: 12 }).length;

    return (
        <article className={`enc-world g-el-${world.element}`}>
            <div className="enc-record enc-world-fold">
                <div className="enc-world-plate-col">
                    <div className="g-panel enc-world-plate">
                        <div className="enc-world-mount">
                            <img
                                src={`/${world.images.planet}`}
                                alt={`${world.name} globe`}
                                className="enc-world-globe"
                            />
                        </div>
                    </div>

                    <div className="g-spec enc-world-facts">
                        {PHYSICAL_DISPLAY_SET.map(([label, format, mono]) => (
                            <React.Fragment key={label}>
                                <span className="g-spec-key">{label}</span>
                                <span className={mono ? 'g-spec-val g-mono' : 'g-spec-val enc-world-facts-terrain'}>
                                    {format(physical)}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="enc-world-record-col">
                    <WorldLede world={world} />
                </div>
            </div>

            <div className="enc-world-chronicle-row">
                <span className="g-legend-v4 enc-world-chronicle-label">In the story</span>
                <nav className="enc-world-chronicle g-tabs" aria-label="In the story">
                    {timeline.map((row) => (
                        <ChronicleStation key={row.era.key} row={row} />
                    ))}
                </nav>
            </div>

            <div className="enc-world-below">
                    <section className="enc-section enc-world-record-section">
                        <div className="enc-section-head">
                            <h2 className="g-h2">History</h2>
                        </div>
                        <div className="enc-world-history-layout">
                            <ol className="enc-world-history">
                                {world.chapters.map((chapter, i) => {
                                    const eraKey = chapterEraTag(chapter);
                                    const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                                    return (
                                        <li
                                            key={chapter.index}
                                            id={`chapter-${chapter.index}`}
                                            data-chapter-index={chapter.index}
                                            ref={(el) => {
                                                chapterRefs.current[i] = el;
                                            }}
                                            className="enc-world-chapter"
                                        >
                                            <div className="enc-world-chapter-head">
                                                <span className="g-mono enc-world-chapter-num">
                                                    CH. {String(i + 1).padStart(2, '0')}
                                                </span>
                                                {eraKey ? (
                                                    <Link to={lore.routeFor('era', eraKey)} className="g-badge">
                                                        {label}
                                                    </Link>
                                                ) : (
                                                    <span className="g-badge">{label}</span>
                                                )}
                                            </div>
                                            <Prose text={chapter.text} />
                                        </li>
                                    );
                                })}
                            </ol>

                            {isPhone ? (
                                <details className="g-panel g-panel--recessed enc-world-chapter-index" aria-label="Chapters">
                                    <summary className="g-panel-head enc-world-chapter-index-summary">
                                        <h3 className="g-h3">Chapters ({world.chapters.length})</h3>
                                    </summary>
                                    <ol className="enc-world-chapter-index-list">
                                        {world.chapters.map((chapter, i) => {
                                            const eraKey = chapterEraTag(chapter);
                                            const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                                            return (
                                                <li key={chapter.index}>
                                                    <ChapterRailRow
                                                        chapter={chapter}
                                                        index={i}
                                                        world={world}
                                                        label={label}
                                                        onFallbackRead={handleFallbackRead(chapter.index)}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </details>
                            ) : (
                                <nav className="g-panel g-panel--recessed enc-world-chapter-index" aria-label="Chapters">
                                    <header className="g-panel-head">
                                        <h3 className="g-h3">Chapters</h3>
                                    </header>
                                    <ol className="enc-world-chapter-index-list">
                                        {world.chapters.map((chapter, i) => {
                                            const eraKey = chapterEraTag(chapter);
                                            const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                                            return (
                                                <li key={chapter.index}>
                                                    <ChapterRailRow
                                                        chapter={chapter}
                                                        index={i}
                                                        world={world}
                                                        label={label}
                                                        onFallbackRead={handleFallbackRead(chapter.index)}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </nav>
                            )}
                        </div>
                    </section>

                    {world.nativeSpecies.length > 0 && (
                        <section className="enc-world-record-section">
                            <div className="enc-section-head enc-world-record-section-head">
                                <h2 className="g-h3">Native Fauna</h2>
                                <span className="enc-count">{world.nativeSpecies.length} species</span>
                            </div>
                            <div className="enc-grid enc-card-grid">
                                {world.nativeSpecies.map((s) => (
                                    <Link
                                        key={s.key}
                                        to={lore.routeFor('species', s.key)}
                                        className={`g-panel g-card-link g-el-${s.element} enc-tile`}
                                    >
                                        <div className="enc-tile-bar" />
                                        <div className="enc-tile-art">
                                            <XalianImage
                                                colored
                                                speciesName={s.name}
                                                primaryType={s.element}
                                                moreClasses="enc-tile-art-img"
                                            />
                                        </div>
                                        <div className="enc-tile-meta">
                                            <span className="g-h3 enc-tile-name">{s.name}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {world.entries.length > 0 && (
                        <section className="enc-world-record-section">
                            <div className="enc-section-head enc-world-record-section-head">
                                <h2 className="g-h3">Entries Naming This World</h2>
                            </div>
                            <div className="g-panel enc-world-entries">
                                {world.entries.map((entry) => (
                                    <div key={entry.key} className={`g-record ${entry.element ? `g-el-${entry.element}` : ''}`}>
                                        <Link to={lore.routeFor('entry', entry.key)} className="g-record-term">
                                            {entry.title}
                                        </Link>
                                        <Prose text={entry.definition} className="g-record-body" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <ContinueTheStory />

                    <Fold label="Cross references" count={connectionsCount}>
                        <Connections kind="world" recordKey={world.key} limit={12} />
                    </Fold>

                    <Fold label="Generator survey">
                        <div className="g-panel enc-world-report">
                            <p className="enc-world-report-line">UNIT &nbsp;{report.unit}</p>
                            <p className="enc-world-report-line">PROTOCOL &nbsp;{report.protocol}</p>
                            <p className="enc-world-report-line enc-world-report-line--faint">CYCLE &nbsp;{report.cycle}</p>

                            <p className="enc-world-report-line enc-world-report-block">
                                TERRAIN &nbsp;{report.terrain.features.join(' / ')}
                            </p>
                            {report.terrain.notes && (
                                <p className="enc-world-report-line enc-world-report-line--faint">{report.terrain.notes}</p>
                            )}

                            <p className="enc-world-report-line enc-world-report-block">MOBILITY</p>
                            {MOBILITY_ORDER.filter((k) => report.mobility[k]).map((k) => {
                                const m = report.mobility[k];
                                return (
                                    <p key={k} className="enc-world-report-line">
                                        {k.toUpperCase()} &nbsp;{m.rating.toUpperCase()}
                                        {m.note && <span className="enc-world-report-line--faint"> &mdash; {m.note}</span>}
                                    </p>
                                );
                            })}

                            <p className="enc-world-report-line enc-world-report-block">FAUNA</p>
                            {report.fauna.observations.map((obs, i) => (
                                <p key={i} className="enc-world-report-line">{obs}</p>
                            ))}

                            <p className="enc-world-report-line enc-world-report-block">
                                HAZARDS &nbsp;{report.hazards.join(' / ')}
                            </p>

                            <p className="enc-world-report-line enc-world-report-block">
                                OUTPUT PRIORITIES &nbsp;{report.outputPriorities.join(' / ')}
                            </p>

                            <p className="enc-world-report-line enc-world-report-line--faint enc-world-report-block">RECEIPT UNCONFIRMED, filed by hand&mdash;archivist</p>
                        </div>
                    </Fold>
            </div>
        </article>
    );
}
