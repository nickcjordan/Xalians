import React from 'react';
import { Link, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import AbilityCard from './AbilityCard';
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

const TERM_DEFS = lore.TERM_DEFS;

function bandText(band) {
    if (!Array.isArray(band)) return '';
    return `${band[0]} to ${band[1]}`;
}

function bodyValue(value) {
    return <span className="font-body normal-case tracking-normal text-ink">{value}</span>;
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
        { key: <Term definition={TERM_DEFS.composition}>Composition</Term>, value: composition },
        { key: <Term definition={TERM_DEFS.bodyPlan}>Body plan</Term>, value: p.bodyPlan.name },
        { key: <Term definition={TERM_DEFS.covering}>Covering</Term>, value: p.covering.name },
        { key: 'Breathes', value: breathes || (ambientMedia ? undefined : 'Not recorded') },
        { key: <Term definition={TERM_DEFS.ambientMedia}>Ambient media</Term>, value: ambientMedia || 'Not recorded' },
        { key: 'Temperature band', value: temperature || 'Not recorded' },
        { key: <Term definition={TERM_DEFS.chirality}>Chirality</Term>, value: chirality || 'Not recorded' },
        { key: <Term definition={TERM_DEFS.protections}>Protections</Term>, value: p.protections.length > 0 ? p.protections.join(', ') : undefined },
        { key: <Term definition={TERM_DEFS.traversal}>Traversal</Term>, value: p.traversal.length > 0 ? p.traversal.map((t) => t.name).join(', ') : undefined },
    ].filter((e) => e.value !== undefined)
        .map((e) => ({ ...e, value: bodyValue(e.value) }));

    return <SpecPlate columns={2} entries={entries} />;
}

function ChipList({ items }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((i) => (
                <Badge key={i.key} variant="chip-outline" title={i.nature}>{i.name}</Badge>
            ))}
        </div>
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
                    <SectionHead title="Temperament" />
                    <Card variant="panel">
                        {record.temperament.map((t) => <MeterRow key={t.key} name={t.name} band={t.band} />)}
                    </Card>
                </section>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <section>
                    <SectionHead title="Anatomy" />
                    <ChipList items={record.anatomy} />
                </section>
                <section>
                    <SectionHead title="Channels and conduits" />
                    {record.channels.length === 0 && record.conduits.length === 0
                        ? <p className="m-0 font-body text-small text-ink-2">None. Every act comes from the body itself.</p>
                        : <ChipList items={[...record.channels, ...record.conduits.map((c) => ({ key: `conduit-${c.key}`, name: `${c.name} carries ${c.element}` }))]} />}
                </section>
            </div>
        </>
    );
}

/** Two-column key-facts plate for the identity strip: home world, mass,
 * every overall dimension the template records, diet, lifespan and
 * communication. */
const DIMENSIONS = [['heightCm', 'Height'], ['lengthCm', 'Length'], ['widthCm', 'Width']];

function KeyFacts({ view }) {
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
                { key: 'Mass', value: bodyValue(`${bandText(p.size.massKg)} kg`) },
                ...DIMENSIONS.filter(([field]) => p.size[field]).map(([field, label]) => ({ key: label, value: bodyValue(`${bandText(p.size[field])} cm`) })),
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
 * SpeciesView: specimen record built from the species' v5 template.
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

            <div className="grid gap-8 xl:grid-cols-[minmax(0,62ch)_minmax(0,1fr)]">
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
                    {view.record.abilities.map((ability) => <AbilityCard key={ability.key} ability={ability} />)}
                    <div>
                        <SectionHead title="Physiology" />
                        <TemplatePhysiology view={view} />
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
                    <GeneratorTemplate record={view.record} />
                </Fold>
            </FoldGroup>
        </article>
    );
}
