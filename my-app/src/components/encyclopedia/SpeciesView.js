import React from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import { useVisit, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { SpecPlate, RecordRow, EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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

/** "Continue the story" foot: one row pointing at the reader's furthest part, or Part 1 when nothing is stored. */
function ContinueTheStory() {
    const resume = useResume();
    const eras = lore.getEras();
    const era = resume ? lore.getEra(resume.eraKey) : null;
    const target = era || eras[0];
    if (!target) return null;
    return (
        <div className="border-t border-edge pt-4">
            <RecordRow className="border-b-0 py-0" term="Continue the story">
                <Link to={lore.routeFor('era', target.key)} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
                    Part {target.order + 1}, {target.name}
                </Link>
            </RecordRow>
        </div>
    );
}

function TemplatePhysiology({ view }) {
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

    const entries = [
        { key: 'Corporeality', value: p.corporeality.name },
        { key: 'Composition', value: composition },
        { key: 'Body plan', value: p.bodyPlan.name },
        { key: 'Covering', value: p.covering.name },
        { key: 'Height', value: `${bandText(p.size.heightCm)} cm` },
        { key: 'Weight', value: `${bandText(p.size.weightKg)} kg` },
        { key: 'Diet', value: p.diet.name },
        { key: 'Communication', value: communication },
        { key: 'Breathes', value: breathes || 'Not recorded' },
        { key: 'Ambient media', value: ambientMedia || 'Not recorded' },
        { key: 'Temperature band', value: temperature || 'Not recorded' },
        {
            key: 'Lifespan',
            value: (
                <>
                    {p.lifespan.name}
                    {p.lifespan.nature && <span className="mt-0.5 block font-body text-small text-ink-2">{p.lifespan.nature}</span>}
                </>
            ),
        },
        { key: 'Chirality', value: chirality || 'Not recorded' },
    ].map((e) => ({ ...e, value: <span className="font-body normal-case tracking-normal text-ink">{e.value}</span> }));

    return <SpecPlate columns={2} entries={entries} className="max-w-4xl" />;
}

function LegacyPhysiology({ view }) {
    const legacy = view.legacy;
    const entries = [
        { key: 'Height', value: legacy.height },
        { key: 'Weight', value: legacy.weight },
        { key: 'Attack range', value: legacy.traits.attackRange || 'Not recorded' },
        { key: 'Flight', value: legacy.traits.canFly ? 'Yes' : 'No' },
    ].map((e) => ({ ...e, value: <span className="font-body normal-case tracking-normal text-ink">{e.value}</span> }));
    return <SpecPlate columns={2} entries={entries} className="max-w-4xl" />;
}

function Signature({ signature }) {
    if (!signature) return null;
    return (
        <Card variant="panel" className="p-4">
            <p className="type-legend m-0">Signature</p>
            <p className="type-heading m-0 text-[19px]">{signature.name}</p>
            <SpecPlate
                entries={[
                    { key: 'Instrument', value: signature.instrument },
                    { key: 'Action', value: signature.action },
                    { key: 'Medium', value: signature.medium },
                    { key: 'Intensity', value: bandText(signature.intensity) },
                ]}
            />
            <p className="m-0 font-body text-small text-ink-2">{signature.description}</p>
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
                    value: <span className="font-body normal-case tracking-normal text-ink">{capitalize(value)}</span>,
                }))}
            />
            <p className="mt-4 max-w-[62ch] font-body text-small text-ink-2">
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

    return (
        <article className={`el-${view.element}`}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-4 max-sm:contents">
                    <Card variant="panel" className="p-5 max-sm:order-1 max-sm:max-w-[320px]">
                        <div className="grid aspect-square w-full place-items-center bg-el p-[4%]">
                            <XalianImage colored speciesName={view.name} primaryType={view.element} moreClasses="w-full" />
                        </div>
                    </Card>
                    {isTemplate && <div className="max-sm:order-3"><Signature signature={view.record.signature} /></div>}
                </div>

                <div className="flex min-w-0 flex-col gap-4 max-sm:order-2">
                    <Prose text={view.description} except={view.entry && view.entry.key} />

                    {Array.isArray(view.appearance) && view.appearance.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <h3 className="type-heading m-0 text-[19px]">Appearance</h3>
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 font-body text-body text-ink-2">
                                {view.appearance.map((quality) => (
                                    <li key={quality}>{quality}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {view.habits && (
                        <div className="flex flex-col gap-1">
                            <h3 className="type-heading m-0 text-[19px]">Habits</h3>
                            <p className="m-0 font-body text-body text-ink-2">{view.habits}</p>
                        </div>
                    )}

                    {view.biomeNiche && (
                        <div className="flex flex-col gap-1">
                            <h3 className="type-heading m-0 text-[19px]">Niche</h3>
                            <p className="m-0 font-body text-body text-ink-2">{view.biomeNiche}</p>
                        </div>
                    )}
                </div>
            </div>

            <section className="mt-7">
                <SectionHead title="Physiology" />
                {isTemplate ? <TemplatePhysiology view={view} /> : <LegacyPhysiology view={view} />}
            </section>

            <div className="mt-8">
                <ContinueTheStory />
            </div>

            <Accordion type="single" collapsible className="mt-6 flex flex-col gap-2">
                <AccordionItem value="generator-template" className="border border-edge bg-s1 px-5">
                    <AccordionTrigger className="hover:no-underline">
                        <span className="type-legend">Generator template</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p className="mb-4">
                            <Badge variant={isTemplate ? 'ok' : 'info'}>
                                {isTemplate ? 'Record ratified' : 'Record pending migration'}
                            </Badge>
                        </p>
                        {isTemplate ? <GeneratorTemplate record={view.record} /> : <LegacyRatings view={view} />}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cross-references" className="border border-edge bg-s1 px-5">
                    <AccordionTrigger className="hover:no-underline">
                        <span className="type-legend">Cross references</span>
                        <span className="type-data ml-auto mr-2 text-small text-ink-2">{connectionsCount}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Connections kind="species" recordKey={key} limit={12} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </article>
    );
}
