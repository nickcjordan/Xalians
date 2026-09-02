import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import './WorldView.css';

// The physical plate is a small display-set so fields can change in one
// place while the planet data block is mid-redesign (per contract).
const PHYSICAL_DISPLAY_SET = [
    ['Terrain', (p) => p.terrainLabel],
    ['Size vs Earth', (p) => `${p.sizeVsEarth}x`],
    ['Radius km', (p) => Number(p.radiusKm).toLocaleString('en-US')],
    ['Gravity vs Earth', (p) => `${p.gravityVsEarth}x`],
    ['Temperature range', (p) => `${p.temperatureC.low} to ${p.temperatureC.high} C`],
];

const MOBILITY_ORDER = ['flight', 'swim', 'burrow', 'climb', 'sprint'];

function chapterEraTag(chapter) {
    return chapter.era && chapter.era !== 'natural' ? chapter.era : null;
}

function chapterEraLabel(chapter, eraLabel) {
    if (!chapterEraTag(chapter)) return 'Natural history';
    return eraLabel || chapter.era;
}

/**
 * WorldView: the survey record for one world -- plate, environmental report,
 * history chapters, native fauna, and entries naming the world.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Worlds and world".
 */
export default function WorldView() {
    const { key } = useParams();
    const world = lore.getWorld(key);

    if (!world) {
        return (
            <div className="enc-world">
                <Link to="/encyclopedia/worlds" className="enc-back">&laquo; Back to Worlds</Link>
                <p className="g-empty">No record for &ldquo;{key}&rdquo;.</p>
            </div>
        );
    }

    const eras = lore.getEras();
    const eraNameByKey = new Map(eras.map((e) => [e.key, e.name]));
    const { physical, report } = world;

    return (
        <article className={`enc-world g-el-${world.element}`}>
            <Link to="/encyclopedia/worlds" className="enc-back">&laquo; Back to Worlds</Link>

            <header className="enc-designation">
                <h1 className="g-title">{world.name}</h1>
                <div className="enc-chips">
                    <span className="g-chip">{world.element}</span>
                    <span className="g-chip g-chip--outline">Survey Record</span>
                </div>
            </header>

            <div className="enc-record">
                <div className="enc-world-plate">
                    <div className="g-specimen enc-world-mount">
                        <div className="g-specimen-inner">
                            <img
                                src={`/${world.images.planet}`}
                                alt={`${world.name} globe`}
                                className="enc-world-globe"
                            />
                        </div>
                    </div>
                    <div className="g-spec enc-world-spec">
                        {PHYSICAL_DISPLAY_SET.map(([label, format]) => (
                            <React.Fragment key={label}>
                                <span className="g-spec-key">{label}</span>
                                <span className="g-spec-val g-mono">{format(physical)}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="g-screen enc-world-report">
                    <p className="g-screen-line">UNIT &nbsp;{report.unit}</p>
                    <p className="g-screen-line">PROTOCOL &nbsp;{report.protocol}</p>
                    <p className="g-screen-line g-screen-line--dim">CYCLE &nbsp;{report.cycle}</p>

                    <p className="g-screen-line enc-world-report-block">
                        TERRAIN &nbsp;{report.terrain.features.join(' / ')}
                    </p>
                    {report.terrain.notes && (
                        <p className="g-screen-line g-screen-line--dim">{report.terrain.notes}</p>
                    )}

                    <p className="g-screen-line enc-world-report-block">MOBILITY</p>
                    {MOBILITY_ORDER.filter((k) => report.mobility[k]).map((k) => {
                        const m = report.mobility[k];
                        return (
                            <p key={k} className="g-screen-line">
                                {k.toUpperCase()} &nbsp;{m.rating.toUpperCase()}
                                {m.note && <span className="g-screen-line--dim"> &mdash; {m.note}</span>}
                            </p>
                        );
                    })}

                    <p className="g-screen-line enc-world-report-block">FAUNA</p>
                    {report.fauna.observations.map((obs, i) => (
                        <p key={i} className="g-screen-line">{obs}</p>
                    ))}

                    <p className="g-screen-line enc-world-report-block">
                        HAZARDS &nbsp;{report.hazards.join(' / ')}
                    </p>

                    <p className="g-screen-line enc-world-report-block">
                        OUTPUT PRIORITIES &nbsp;{report.outputPriorities.join(' / ')}
                    </p>

                    <p className="g-screen-line g-screen-line--dim enc-world-report-block">RECEIPT UNCONFIRMED_</p>
                </div>
            </div>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">History</h2>
                </div>
                <div className="enc-world-history-layout">
                    <ol className="enc-world-history">
                        {world.chapters.map((chapter, i) => {
                            const eraKey = chapterEraTag(chapter);
                            const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                            return (
                                <li key={chapter.index} id={`chapter-${chapter.index}`} className="enc-world-chapter">
                                    <div className="enc-world-chapter-head">
                                        <span className="g-mono enc-world-chapter-num">
                                            CH. {String(i + 1).padStart(2, '0')}
                                        </span>
                                        {eraKey ? (
                                            <Link to={lore.routeFor('era', eraKey)} className="g-chip g-chip--outline">
                                                {label}
                                            </Link>
                                        ) : (
                                            <span className="g-chip g-chip--outline">{label}</span>
                                        )}
                                    </div>
                                    <Prose text={chapter.text} />
                                </li>
                            );
                        })}
                    </ol>

                    <nav className="g-panel g-panel--recessed enc-world-chapter-index" aria-label="Chapters">
                        <header className="g-panel-head">
                            <h3 className="g-h3">Chapters</h3>
                        </header>
                        <ol className="enc-world-chapter-index-list">
                            {world.chapters.map((chapter, i) => {
                                const eraKey = chapterEraTag(chapter);
                                const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                                const words = chapter.text.trim().split(/\s+/).slice(0, 8).join(' ');
                                return (
                                    <li key={chapter.index}>
                                        <a href={`#chapter-${chapter.index}`} className="enc-world-chapter-index-row">
                                            <span className="g-mono enc-world-chapter-index-num">
                                                CH. {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <span className="g-chip g-chip--outline enc-world-chapter-index-era">
                                                {label}
                                            </span>
                                            <span className="enc-world-chapter-index-snippet">{words}&hellip;</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                </div>
            </section>

            {world.nativeSpecies.length > 0 && (
                <section className="enc-section">
                    <div className="enc-section-head">
                        <h2 className="g-h2">Native Fauna</h2>
                        <span className="enc-count">{world.nativeSpecies.length} species</span>
                    </div>
                    <div className="enc-grid">
                        {world.nativeSpecies.map((s) => (
                            <Link
                                key={s.key}
                                to={lore.routeFor('species', s.key)}
                                className={`g-tile g-el-${s.element} enc-world-species-tile`}
                            >
                                <div className="g-tile-art enc-world-species-art">
                                    <XalianImage
                                        colored
                                        speciesName={s.name}
                                        primaryType={s.element}
                                        moreClasses="species-tile-img"
                                    />
                                </div>
                                <div className="g-tile-meta">
                                    <span className="g-tile-name">{s.name}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {world.entries.length > 0 && (
                <section className="enc-section">
                    <div className="enc-section-head">
                        <h2 className="g-h2">Entries Naming This World</h2>
                    </div>
                    <div className="g-panel g-panel--recessed enc-world-entries">
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
        </article>
    );
}
