import React from 'react';
import { Link, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import SpeciesTile from './SpeciesTile';
import { useVisit, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { SpecPlate, RecordRow, TileGrid, EmptyState } from '@/components/system/record';
import { Term } from '@/components/system/term';
import { Fold, FoldGroup } from '@/components/system/fold';
import { IndexList, IndexRow } from '@/components/system/index-row';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Definitions for internal vocabulary that reaches the visitor undefined
 * (site audit issue #438). Registry fields quote
 * docs/species-templates/REGISTRY-DEFINITIONS.md's own one-line field
 * meaning where the doc states one; the rest are the ratified non-registry
 * text. Kept identical to record/RecordView.tsx's TERM_DEFS.
 */
const TERM_DEFS = {
    corporeality: 'Whether the creature has a physical body that occupies space and can be touched, struck, and held, or no persistent physical body at all.',
    composition: 'What the body is made of at rest.',
    bodyPlan: 'How the creature presents in the field and moves through it at rest.',
    covering: 'The outer surface of the resting body.',
    communication: 'Outward signaling to other creatures.',
    ambientMedia: 'The phases of matter the creature can sustain activity in: atmosphere, liquid, or vacuum.',
    lifespan: 'How long a working life this body has, from a season to something that never wears out.',
    chirality: "Which molecular handedness this individual's genome rolled, or whether its body has none to roll.",
    intensity: 'Strength of the ability on a scale of 100.',
};

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

function bodyValue(value) {
    return <span className="font-body normal-case tracking-normal text-ink">{value}</span>;
}

/**
 * Humanizes an ability field's raw registry value into visitor-facing
 * prose, per the ratified vocabulary map for the six signature-ability
 * fields (activation, delivery, effects/action, medium, instrument). Falls
 * back to capitalizing the first letter for anything not in the map.
 */
const ABILITY_VALUE_MAP = {
    ongoing: 'Ongoing',
    discrete: 'Single act',
    single: 'Single act',
    contact: 'By contact',
    projectile: 'Projectile',
    area: 'Over an area',
    restrain: 'Restrain',
    ranged: 'At range',
    self: 'On itself',
    touch: 'By touch',
    line: 'In a line',
    burst: 'In a burst',
};

const ELEMENT_NAMES = new Set([
    'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
    'chemical', 'air', 'psychic', 'ice', 'metal', 'sand',
]);

function humanizeAbilityValue(value) {
    if (!value) return value;
    const key = String(value).toLowerCase();
    if (ABILITY_VALUE_MAP[key]) return ABILITY_VALUE_MAP[key];
    if (ELEMENT_NAMES.has(key)) return capitalize(key);
    return capitalize(String(value));
}

function MeterRow({ name, band, maxBand }) {
    const ceiling = maxBand || 100;
    const fillPct = Math.min(100, Math.round((band[0] / ceiling) * 100));
    return (
        <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 py-1 md:grid-cols-[8.5rem_1fr_3.5rem] md:gap-3">
            <span className="type-legend">{name}</span>
            <div className="relative h-1.5 bg-s0">
                <div className="absolute inset-y-0 left-0 bg-el" style={{ width: `${fillPct}%` }} />
            </div>
            <span className="type-data text-right text-small text-ink">{bandText(band)}</span>
        </div>
    );
}

/**
 * Foot linking into The Story. With reading progress, it is "Continue the
 * story" pointing at the reader's furthest part. Without progress, it is
 * "This species in the story" pointing at the first era that names the
 * species' home world -- resolved through lore.getWorldFirstEra, the same
 * lit test the world page's In-the-story chips use.
 */
function ContinueTheStory({ homePlanet }) {
    const resume = useResume();
    const resumeEra = resume ? lore.getEra(resume.eraKey) : null;
    const target = resumeEra || (homePlanet && lore.getWorldFirstEra(homePlanet)) || lore.getEras()[0];
    if (!target) return null;
    const label = resumeEra ? 'Continue the story' : 'This species in the story';
    return (
        <IndexList>
            <IndexRow
                to={lore.routeFor('era', target.key)}
                title={label}
                meta={`Part ${target.order + 1}, ${target.name}`}
            />
        </IndexList>
    );
}

function TemplatePhysiology({ view }) {
    const p = view.record.physiology;
    const composition = [p.composition.primary.name, p.composition.secondary ? p.composition.secondary.name : null]
        .filter(Boolean)
        .join(' / ');
    const breathes = p.breathes && p.breathes.length > 0 ? p.breathes.map((m) => m.name).join(', ') : null;
    const ambientMedia = p.environmentalTolerance && p.environmentalTolerance.ambientMedia
        ? p.environmentalTolerance.ambientMedia.map((m) => m.name).join(', ')
        : '';
    const temperature = p.environmentalTolerance && p.environmentalTolerance.temperatureC
        ? `${p.environmentalTolerance.temperatureC.min} to ${p.environmentalTolerance.temperatureC.max} °C`
        : '';
    const chirality = p.genome && p.genome.chirality ? p.genome.chirality.name : '';

    // Height, weight, diet, lifespan and communication already print in the
    // identity strip's key-facts plate, so they are left out here on
    // purpose -- nothing repeats between the strip and this plate.
    const entries = [
        { key: <Term definition={TERM_DEFS.corporeality}>Corporeality</Term>, value: p.corporeality.name },
        { key: <Term definition={TERM_DEFS.composition}>Composition</Term>, value: composition },
        { key: <Term definition={TERM_DEFS.bodyPlan}>Body plan</Term>, value: p.bodyPlan.name },
        { key: <Term definition={TERM_DEFS.covering}>Covering</Term>, value: p.covering.name },
        { key: 'Breathes', value: breathes || (ambientMedia ? undefined : 'Not recorded') },
        { key: <Term definition={TERM_DEFS.ambientMedia}>Ambient media</Term>, value: ambientMedia || 'Not recorded' },
        { key: 'Temperature band', value: temperature || 'Not recorded' },
        { key: <Term definition={TERM_DEFS.chirality}>Chirality</Term>, value: chirality || 'Not recorded' },
    ].filter((e) => e.value !== undefined)
        .map((e) => ({ ...e, value: bodyValue(e.value) }));

    return <SpecPlate columns={2} entries={entries} />;
}

function LegacyPhysiology({ view }) {
    const legacy = view.legacy;
    const entries = [
        { key: 'Attack range', value: legacy.traits.attackRange || 'Not recorded' },
        { key: 'Flight', value: legacy.traits.canFly ? 'Yes' : 'No' },
    ].map((e) => ({ ...e, value: bodyValue(e.value) }));
    return <SpecPlate columns={2} entries={entries} />;
}

const ABILITY_FIELD_GLOSSES = {
    Instrument: 'The body part or channel the ability works through.',
    Activation: 'How it fires: a single discrete act, or ongoing while held.',
    Delivery: 'How it reaches its target: by contact, as a projectile, over an area.',
    Effects: 'What it does to the target.',
    Medium: 'The element it works through.',
    Intensity: 'Strength on a scale of 100. A species shows its range; one creature shows its number.',
};

function Signature({ signature }) {
    if (!signature) return null;
    return (
        <Card variant="panel" className="p-4">
            <p className="type-legend m-0">Signature ability</p>
            <p className="type-subhead m-0">{signature.name}</p>
            <p className="m-0 font-body text-body text-ink">{signature.description}</p>
            <SpecPlate
                columns={2}
                entries={[
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Instrument}>Instrument</Term>, value: bodyValue(humanizeAbilityValue(signature.instrument)) },
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Activation}>Activation</Term>, value: bodyValue(humanizeAbilityValue(signature.activation)) },
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Delivery}>Delivery</Term>, value: bodyValue(humanizeAbilityValue(signature.delivery)) },
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Effects}>Effects</Term>, value: bodyValue(humanizeAbilityValue(signature.action)) },
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Medium}>Medium</Term>, value: bodyValue(humanizeAbilityValue(signature.medium)) },
                    { key: <Term definition={ABILITY_FIELD_GLOSSES.Intensity}>Intensity</Term>, value: bodyValue(bandText(signature.intensity)) },
                ]}
            />
        </Card>
    );
}

function GeneratorTemplate({ record }) {
    return (
        <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section>
                    <SectionHead title="Capabilities" />
                    <Card variant="panel">
                        {record.capabilities.map((c) => <MeterRow key={c.key} name={c.name} band={c.band} />)}
                    </Card>
                </section>

                <section>
                    <SectionHead title="Senses" />
                    <Card variant="panel">
                        {record.senses.graded.map((s) => <MeterRow key={s.key} name={s.name} band={s.band} />)}
                        {record.senses.special.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-edge pt-3">
                                {record.senses.special.map((s) => (
                                    <Badge key={s.key} variant="chip-outline" title={s.nature}>{s.name}</Badge>
                                ))}
                            </div>
                        )}
                    </Card>
                </section>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <section>
                    <SectionHead title="Attributes" />
                    <Card variant="panel">
                        {record.attributes.map((a) => <MeterRow key={a.key} name={a.name} band={a.band} />)}
                    </Card>
                </section>

                <section>
                    <SectionHead title="Traits" />
                    <div className="flex flex-wrap gap-2">
                        {record.traits.map((t) => (
                            <Badge key={t.key} variant="chip-outline" title={t.nature} className="gap-2">
                                {t.name} <span className="type-data">{t.percent}</span>
                            </Badge>
                        ))}
                    </div>

                    <SectionHead title="Archetypes" className="mt-4" />
                    <Card variant="panel">
                        <ol className="m-0 flex flex-col gap-2 p-0">
                            {record.archetypes.map((a) => (
                                <li key={a.key} className="flex flex-wrap items-baseline gap-3">
                                    <span className="type-legend text-small">{a.name}</span>
                                    <span className="type-data text-small">{a.weight}</span>
                                    <span className="font-body text-small text-ink-2">{a.nature}</span>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </section>
            </div>

            <div className="mt-6">
                <section>
                    <SectionHead title="Instruments" />
                    <div className="flex flex-wrap gap-2">
                        {record.instruments.map((i) => (
                            <Badge key={i.key} variant="chip-outline">{i.name}</Badge>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

function LegacyRatings({ view }) {
    const ratings = Object.entries(view.legacy.statRatings || {}).filter(([, v]) => v);
    return (
        <section>
            <SectionHead title="Legacy ratings" />
            <SpecPlate
                entries={ratings.map(([key, value]) => ({
                    key: humanize(key),
                    value: bodyValue(capitalize(value)),
                }))}
            />
            <p className="mt-4 max-w-[62ch] font-body text-small text-ink-2">
                This species does not yet have a full record. Readouts arrive with its template.
            </p>
        </section>
    );
}

/** Two-column key-facts plate for the identity strip: home world, height,
 * weight, diet, lifespan, communication for a template species; home world,
 * height, weight, attack range and flight for a legacy stub. */
function KeyFacts({ view }) {
    if (view.source !== 'template') {
        const legacy = view.legacy;
        return (
            <SpecPlate
                columns={2}
                entries={[
                    {
                        key: 'Home world',
                        value: (
                            <Link to={lore.routeFor('world', view.homePlanet)} className={`el-${view.element} font-body normal-case tracking-normal text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink`}>
                                {view.planet ? view.planet.name : view.homePlanet}
                            </Link>
                        ),
                    },
                    { key: 'Height', value: bodyValue(legacy.height) },
                    { key: 'Weight', value: bodyValue(legacy.weight) },
                    { key: 'Attack range', value: bodyValue(legacy.traits.attackRange || 'Not recorded') },
                    { key: 'Flight', value: bodyValue(legacy.traits.canFly ? 'Yes' : 'No') },
                ]}
            />
        );
    }

    const p = view.record.physiology;
    const communication = p.communication && p.communication.length > 0
        ? p.communication.map((c) => c.name).join(', ')
        : 'None recorded';

    return (
        <SpecPlate
            columns={2}
            entries={[
                {
                    key: 'Home world',
                    value: (
                        <Link to={lore.routeFor('world', view.homePlanet)} className={`el-${view.element} font-body normal-case tracking-normal text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink`}>
                            {view.planet ? view.planet.name : view.homePlanet}
                        </Link>
                    ),
                },
                { key: 'Height', value: bodyValue(`${bandText(p.size.heightCm)} cm`) },
                { key: 'Weight', value: bodyValue(`${bandText(p.size.weightKg)} kg`) },
                { key: 'Diet', value: bodyValue(p.diet.name) },
                {
                    key: <Term definition={TERM_DEFS.lifespan}>Lifespan</Term>,
                    value: bodyValue(
                        <>
                            {p.lifespan.name}
                            {p.lifespan.nature && <span className="mt-0.5 block font-body text-small text-ink-2">{p.lifespan.nature}</span>}
                        </>
                    ),
                },
                { key: <Term definition={TERM_DEFS.communication}>Communication</Term>, value: bodyValue(communication) },
            ]}
        />
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
    usePageTitle(view ? view.name : 'Not found');
    useVisit(view
        ? { kind: 'species', key, name: view.name, element: view.element }
        : { kind: null, key: null });

    if (!view) {
        return (
            <div>
                <EmptyState legend="Not found">No record for &ldquo;{key}&rdquo;.</EmptyState>
            </div>
        );
    }

    const isTemplate = view.source === 'template';
    const connectionsCount = lore.getConnections('species', key, { limit: 12 }).length;
    const worldName = view.planet ? view.planet.name : view.homePlanet;
    const worldmates = view.planet && Array.isArray(view.planet.nativeSpecies)
        ? view.planet.nativeSpecies.filter((s) => s.key !== key)
        : [];

    return (
        <article className={`el-${view.element} flex flex-col gap-8`}>
            <Card variant="panel" className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="mx-auto w-full max-w-[280px] md:mx-0">
                    <XalianImage colored speciesName={view.name} primaryType={view.element} moreClasses="w-full" />
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <Prose text={view.description} except={view.entry && view.entry.key} size="lead" />
                    <KeyFacts view={view} />
                </div>
            </Card>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,62ch)_minmax(0,1fr)]">
                <Card variant="panel" className="p-0 px-5">
                    {view.nameOrigin && (
                        <RecordRow term="Name origin">{view.nameOrigin}</RecordRow>
                    )}

                    {Array.isArray(view.appearance) && view.appearance.length > 0 && (
                        <RecordRow term="Appearance">
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 font-body text-small text-ink-2">
                                {view.appearance.map((quality) => (
                                    <li key={quality}>{quality}</li>
                                ))}
                            </ul>
                        </RecordRow>
                    )}

                    {Array.isArray(view.fields) && view.fields.length > 0 && view.fields.map((field) => (
                        <RecordRow key={field.key} term={field.label}>{field.text}</RecordRow>
                    ))}
                </Card>

                <div className="flex min-w-0 flex-col gap-6">
                    {isTemplate && view.record.abilities.map((ability) => <Signature key={ability.name} signature={ability} />)}
                    <div>
                        <SectionHead title="Physiology" />
                        {isTemplate ? <TemplatePhysiology view={view} /> : <LegacyPhysiology view={view} />}
                    </div>
                </div>
            </div>

            {worldmates.length > 0 && (
                <section>
                    <SectionHead title={`Also from ${worldName}`} count={worldmates.length} />
                    <TileGrid>
                        {worldmates.map((s) => <SpeciesTile key={s.key} species={s} />)}
                    </TileGrid>
                </section>
            )}

            <ContinueTheStory homePlanet={view.homePlanet} />

            <FoldGroup>
                <Fold label="Cross references" count={connectionsCount}>
                    <Connections kind="species" recordKey={key} limit={12} bare />
                </Fold>
                <Fold label="For builders">
                    <p className="mb-4 font-body text-small text-ink-2">
                        Machine-readable data the Generator and the games use.
                    </p>
                    {isTemplate ? <GeneratorTemplate record={view.record} /> : <LegacyRatings view={view} />}
                </Fold>
            </FoldGroup>
        </article>
    );
}
