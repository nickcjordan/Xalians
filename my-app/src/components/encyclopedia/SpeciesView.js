import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import { useVisit } from './trail';
import './SpeciesView.css';

function bandText(band) {
    if (!Array.isArray(band)) return '';
    return `${band[0]} to ${band[1]}`;
}

function humanize(key) {
    return key
        .replace(/Rating$/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function meterRow(key, name, band, maxBand) {
    const ceiling = maxBand || 100;
    const ghostPct = Math.min(100, Math.round((band[1] / ceiling) * 100));
    const fillPct = Math.min(100, Math.round((band[0] / ceiling) * 100));
    return (
        <div className="g-meter-row" key={key}>
            <span className="g-meter-name">{name}</span>
            <div className="g-meter">
                <div className="g-meter-ghost" style={{ width: `${ghostPct}%` }} />
                <div className="g-meter-fill" style={{ width: `${fillPct}%` }} />
            </div>
            <span className="g-meter-value">{bandText(band)}</span>
        </div>
    );
}

function TemplatePlate({ view }) {
    const p = view.record.physiology;
    const composition = [p.composition.primary.name, p.composition.secondary ? p.composition.secondary.name : null]
        .filter(Boolean)
        .join(' / ');
    const communication = p.communication && p.communication.length > 0
        ? p.communication.map((c) => c.name).join(', ')
        : 'None recorded';
    const ambientMedia = p.environmentalTolerance && p.environmentalTolerance.ambientMedia
        ? p.environmentalTolerance.ambientMedia.map((m) => m.name).join(', ')
        : '';
    const temperature = p.environmentalTolerance && p.environmentalTolerance.temperatureC
        ? `${p.environmentalTolerance.temperatureC.min} to ${p.environmentalTolerance.temperatureC.max} °C`
        : '';
    const breathes = p.breathes ? p.breathes.map((m) => m.name).join(', ') : ambientMedia;
    const chirality = p.genome && p.genome.chirality ? p.genome.chirality.name : '';

    return (
        <div className="g-spec">
            <span className="g-spec-key">Corporeality</span>
            <span className="g-spec-val">{p.corporeality.name}</span>
            <span className="g-spec-key">Composition</span>
            <span className="g-spec-val">{composition}</span>
            <span className="g-spec-key">Body plan</span>
            <span className="g-spec-val">{p.bodyPlan.name}</span>
            <span className="g-spec-key">Covering</span>
            <span className="g-spec-val">{p.covering.name}</span>
            <span className="g-spec-key">Height</span>
            <span className="g-spec-val">{bandText(p.size.heightCm)} cm</span>
            <span className="g-spec-key">Weight</span>
            <span className="g-spec-val">{bandText(p.size.weightKg)} kg</span>
            <span className="g-spec-key">Diet</span>
            <span className="g-spec-val">{p.diet.name}</span>
            <span className="g-spec-key">Communication</span>
            <span className="g-spec-val">{communication}</span>
            <span className="g-spec-key">Breathes</span>
            <span className="g-spec-val">{breathes || 'Not recorded'}</span>
            <span className="g-spec-key">Ambient media</span>
            <span className="g-spec-val">{ambientMedia || 'Not recorded'}</span>
            <span className="g-spec-key">Temperature band</span>
            <span className="g-spec-val">{temperature || 'Not recorded'}</span>
            <span className="g-spec-key">Lifespan</span>
            <span className="g-spec-val">
                {p.lifespan.name}
                {p.lifespan.nature && <span className="g-mono enc-species-dim"> {p.lifespan.nature}</span>}
            </span>
            <span className="g-spec-key">Chirality</span>
            <span className="g-spec-val">{chirality || 'Not recorded'}</span>
        </div>
    );
}

function LegacyPlate({ view }) {
    const legacy = view.legacy;
    return (
        <div className="g-spec">
            <span className="g-spec-key">Height</span>
            <span className="g-spec-val">{legacy.height}</span>
            <span className="g-spec-key">Weight</span>
            <span className="g-spec-val">{legacy.weight}</span>
            <span className="g-spec-key">Attack range</span>
            <span className="g-spec-val">{legacy.traits.attackRange || 'Not recorded'}</span>
            <span className="g-spec-key">Flight</span>
            <span className="g-spec-val">{legacy.traits.canFly ? 'Yes' : 'No'}</span>
        </div>
    );
}

function TemplateSections({ view }) {
    const record = view.record;
    return (
        <>
            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Capabilities</h2>
                </div>
                <div className="g-panel g-panel--recessed">
                    {record.capabilities.map((c) => meterRow(c.key, c.name, c.band))}
                </div>
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Senses</h2>
                </div>
                <div className="g-panel g-panel--recessed">
                    {record.senses.graded.map((s) => meterRow(s.key, s.name, s.band))}
                    {record.senses.special.length > 0 && (
                        <div className="enc-species-chip-row">
                            {record.senses.special.map((s) => (
                                <span key={s.key} className="g-chip" title={s.nature}>{s.name}</span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Attributes</h2>
                </div>
                <div className="g-panel g-panel--recessed">
                    {record.attributes.map((a) => meterRow(a.key, a.name, a.band))}
                </div>
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Traits</h2>
                </div>
                <div className="enc-species-chip-row">
                    {record.traits.map((t) => (
                        <span key={t.key} className="g-chip" title={t.nature}>
                            {t.name} <span className="g-mono">{t.percent}</span>
                        </span>
                    ))}
                </div>
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Archetypes</h2>
                </div>
                <ol className="g-panel g-panel--recessed enc-species-archetypes">
                    {record.archetypes.map((a) => (
                        <li key={a.key}>
                            <span className="enc-species-archetype-name">{a.name}</span>
                            <span className="g-mono">{a.weight}</span>
                            <span className="g-body enc-species-dim">{a.nature}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="enc-section">
                <div className="enc-section-head">
                    <h2 className="g-h2">Instruments</h2>
                </div>
                <div className="enc-species-chip-row">
                    {record.instruments.map((i) => (
                        <span key={i.key} className="g-chip">{i.name}</span>
                    ))}
                </div>
            </section>

            {record.signature && (
                <section className="enc-section">
                    <div className="enc-section-head">
                        <h2 className="g-h2">Signature</h2>
                    </div>
                    <div className="g-screen enc-species-signature">
                        <p className="g-mono">{record.signature.name}</p>
                        <p className="g-mono">
                            INSTRUMENT {record.signature.instrument} / ACTION {record.signature.action} / MEDIUM {record.signature.medium}
                        </p>
                        <p className="g-mono">INTENSITY {bandText(record.signature.intensity)}</p>
                        <p className="g-mono">{record.signature.description}</p>
                    </div>
                </section>
            )}
        </>
    );
}

function LegacySections({ view }) {
    const ratings = Object.entries(view.legacy.statRatings || {}).filter(([, v]) => v);
    return (
        <section className="enc-section">
            <div className="enc-section-head">
                <h2 className="g-h2">Legacy ratings</h2>
            </div>
            <div className="g-spec">
                {ratings.map(([key, value]) => (
                    <React.Fragment key={key}>
                        <span className="g-spec-key">{humanize(key)}</span>
                        <span className="g-spec-val">{capitalize(value)}</span>
                    </React.Fragment>
                ))}
            </div>
            <p className="g-notice g-notice--inert">
                This species has not yet been migrated to the ratified record. Readouts arrive with its template.
            </p>
        </section>
    );
}

/**
 * SpeciesView: specimen record built from a ratified template when one
 * exists, from the legacy species.json stub otherwise.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Bestiary and species".
 */
export default function SpeciesView() {
    const { key } = useParams();
    const view = lore.getSpecies(key);
    const wasRead = useVisit(view
        ? { kind: 'species', key, name: view.name, element: view.element }
        : { kind: null, key: null });

    if (!view) {
        return (
            <div className="enc-species">
                <Link to="/encyclopedia/species" className="enc-back">&laquo; Back to Bestiary</Link>
                <p className="g-empty">No record for &ldquo;{key}&rdquo;.</p>
            </div>
        );
    }

    const isTemplate = view.source === 'template';
    const worldName = view.planet ? view.planet.name : view.homePlanet;

    return (
        <article className={`enc-species g-el-${view.element}`}>
            <Link to="/encyclopedia/species" className="enc-back">&laquo; Back to Bestiary</Link>

            <header className="enc-designation">
                <h1 className="g-title">{view.name}</h1>
                <div className="enc-chips">
                    <span className="g-chip">{view.element}</span>
                    <Link to={lore.routeFor('world', view.homePlanet)} className={`g-chip g-el-${view.element}`}>
                        {worldName}
                    </Link>
                </div>
                <span className={`g-lamp ${isTemplate ? '' : 'g-lamp--off'}`}>
                    {isTemplate ? 'Record ratified' : 'Record pending migration'}
                </span>
                {wasRead && <p className="g-mono enc-species-reviewed">reviewed</p>}
            </header>

            <div className="enc-record">
                <div className="enc-species-plate">
                    <div className="g-specimen">
                        <div className="g-specimen-inner">
                            <XalianImage colored speciesName={view.name} primaryType={view.element} moreClasses="enc-species-portrait" />
                        </div>
                    </div>
                    {isTemplate ? <TemplatePlate view={view} /> : <LegacyPlate view={view} />}
                </div>

                <div className="enc-species-body">
                    <Prose text={view.description} except={view.entry && view.entry.key} />

                    {view.biomeNiche && (
                        <div className="enc-species-niche">
                            <p className="g-kicker">Niche</p>
                            <p className="g-body">{view.biomeNiche}</p>
                        </div>
                    )}

                    {view.entry && (
                        <div className="g-panel g-panel--recessed enc-species-entry">
                            <div className="g-panel-head">
                                <span className="g-label">Encyclopedia entry</span>
                            </div>
                            <Prose text={view.entry.definition} except={view.entry.key} />
                        </div>
                    )}
                </div>
            </div>

            {isTemplate ? <TemplateSections view={view} /> : <LegacySections view={view} />}
        </article>
    );
}
