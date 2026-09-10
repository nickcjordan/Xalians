import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import { useVisit, useReadMark, markRead, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { SpecPlate, RecordRow, Tile, TileArt, TileMeta, EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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

/** One stop on the "In the story" rail: a tab link when the world has chapters or events in this era, plain dim text otherwise. */
function ChronicleStation({ row }) {
    const count = row.chapters.length;
    const lit = count > 0 || row.events.length > 0;
    const titleAttr = row.events.length > 0 ? row.events.map((e) => e.title).join(', ') : undefined;

    if (!lit) {
        return (
            <span className="type-legend inline-flex items-center px-4 py-2 text-[13px] text-ink-3" aria-hidden="true">
                {row.era.name}
            </span>
        );
    }

    return (
        <Link
            to={lore.routeFor('era', row.era.key)}
            className="type-legend inline-flex items-center gap-2 border border-edge bg-s1 px-3 py-2 text-[12px] text-ink-2 no-underline hover:text-ink"
            title={titleAttr}
        >
            {row.era.name}
            {count > 0 && <span className="type-data text-[11px] text-ink-2">{count} ch</span>}
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
            className="flex flex-wrap items-baseline gap-2 py-2 text-ink no-underline hover:bg-s2"
            onClick={onFallbackRead}
        >
            <span className={`inline-block size-1.5 rounded-full ${read ? 'bg-viable' : 'bg-edge-strong'}`} aria-hidden="true" />
            <span className="type-data shrink-0 text-[11px] text-ink-2">
                CH. {String(index + 1).padStart(2, '0')}
            </span>
            <Badge className="shrink-0">{label}</Badge>
            <span className="min-w-0 flex-[1_1_100%] overflow-hidden whitespace-nowrap text-ellipsis font-body text-small text-ink-2">
                {words}&hellip;
            </span>
        </a>
    );
}

/** The narrator's short lede placing the world in the story, with its Records consulted chips. Renders nothing when the writer has not reached this world yet. */
function WorldLede({ world }) {
    const lede = lore.getWorldLede(world.key);
    if (!lede) return null;
    return (
        <div className="flex flex-col gap-3">
            <Prose text={lede.prose} />
            {(lede.sources.length > 0 || lede.entries.length > 0) && (
                <div className="flex flex-col gap-2">
                    <p className="type-legend m-0">Records consulted</p>
                    <div className="flex flex-wrap gap-2">
                        {lede.entries.map((entry) => (
                            <Link key={entry.key} to={lore.routeFor('entry', entry.key)}>
                                <Badge variant="chip-outline">{entry.title}</Badge>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
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
            <div>
                <EmptyState legend="Not found">No record for &ldquo;{key}&rdquo;.</EmptyState>
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

    const factsEntries = PHYSICAL_DISPLAY_SET.map(([label, format, mono]) => ({
        key: label,
        value: mono ? format(physical) : <span className="font-body normal-case tracking-normal text-ink-2">{format(physical)}</span>,
    }));

    function chapterList() {
        return world.chapters.map((chapter, i) => {
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
        });
    }

    return (
        <article className={`el-${world.element}`}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid aspect-square w-full place-items-center bg-el/24">
                        <img
                            src={`/${world.images.planet}`}
                            alt={`${world.name} globe`}
                            className="h-[72%] w-[72%] object-contain"
                        />
                    </div>
                    <SpecPlate entries={factsEntries} />
                </div>

                <div className="flex min-w-0 flex-col gap-5">
                    <WorldLede world={world} />
                </div>
            </div>

            <div className="mt-6 flex flex-col items-start gap-2 border-t border-edge pt-4">
                <span className="type-legend whitespace-nowrap">In the story</span>
                <nav className="min-w-0 flex flex-wrap gap-1" aria-label="In the story">
                    {timeline.map((row) => (
                        <ChronicleStation key={row.era.key} row={row} />
                    ))}
                </nav>
            </div>

            <div className="mt-6 flex flex-col gap-6">
                <section className="min-w-0">
                    <SectionHead title="History" />
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                        <ol className="m-0 flex min-w-0 max-w-[68ch] list-none flex-col gap-6 p-0">
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
                                        className="scroll-mt-16"
                                    >
                                        <div className="mb-2 flex items-baseline gap-3">
                                            <span className="type-data text-ink-2">
                                                CH. {String(i + 1).padStart(2, '0')}
                                            </span>
                                            {eraKey ? (
                                                <Link to={lore.routeFor('era', eraKey)}>
                                                    <Badge>{label}</Badge>
                                                </Link>
                                            ) : (
                                                <Badge>{label}</Badge>
                                            )}
                                        </div>
                                        <Prose text={chapter.text} />
                                    </li>
                                );
                            })}
                        </ol>

                        {isPhone ? (
                            <Accordion type="single" collapsible className="min-w-0 lg:order-first">
                                <AccordionItem value="chapters" className="border border-edge bg-s0 px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <h3 className="type-legend m-0 text-ink-2">Chapters ({world.chapters.length})</h3>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ol className="m-0 flex list-none flex-col p-0">{chapterList()}</ol>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ) : (
                            <Card variant="recessed" className="min-w-0 p-4 pb-2 lg:sticky lg:top-6">
                                <nav aria-label="Chapters">
                                    <header className="mb-2 border-b border-edge pb-2">
                                        <h3 className="type-heading m-0 text-[19px]">Chapters</h3>
                                    </header>
                                    <ol className="m-0 flex list-none flex-col p-0">{chapterList()}</ol>
                                </nav>
                            </Card>
                        )}
                    </div>
                </section>

                {world.nativeSpecies.length > 0 && (
                    <section className="min-w-0">
                        <SectionHead title="Native Fauna" count={`${world.nativeSpecies.length} species`} />
                        <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-3 sm:gap-4 sm:gap-y-5 md:grid-cols-4 min-[1080px]:grid-cols-5 xl:grid-cols-6">
                            {world.nativeSpecies.map((s) => (
                                <Tile as={Link} key={s.key} to={lore.routeFor('species', s.key)} className={`el-${s.element}`}>
                                    <TileArt>
                                        <XalianImage
                                            colored
                                            speciesName={s.name}
                                            primaryType={s.element}
                                            moreClasses="w-full"
                                        />
                                    </TileArt>
                                    <TileMeta>
                                        <span className="type-subhead block text-base">{s.name}</span>
                                    </TileMeta>
                                </Tile>
                            ))}
                        </div>
                    </section>
                )}

                {world.entries.length > 0 && (
                    <section className="min-w-0">
                        <SectionHead title="Entries Naming This World" />
                        <Card variant="panel" className="p-0 px-4 py-2">
                            {world.entries.map((entry) => (
                                <RecordRow
                                    key={entry.key}
                                    className={entry.element ? `el-${entry.element}` : ''}
                                    term={
                                        <Link to={lore.routeFor('entry', entry.key)} className="no-underline hover:underline">
                                            {entry.title}
                                        </Link>
                                    }
                                >
                                    <Prose text={entry.definition} className="m-0 max-w-none text-small text-ink-2" />
                                </RecordRow>
                            ))}
                        </Card>
                    </section>
                )}

                <ContinueTheStory />

                <Accordion type="single" collapsible className="flex flex-col gap-2">
                    <AccordionItem value="cross-references" className="border border-edge bg-s1 px-5">
                        <AccordionTrigger className="hover:no-underline">
                            <span className="type-legend">Cross references</span>
                            <span className="type-data ml-auto mr-2 text-small text-ink-2">{connectionsCount}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Connections kind="world" recordKey={world.key} limit={12} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="generator-survey" className="border border-edge bg-s1 px-5">
                        <AccordionTrigger className="hover:no-underline">
                            <span className="type-legend">Generator survey</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Card variant="panel">
                                <p className="type-data m-0 mb-1 text-small text-ink">UNIT &nbsp;{report.unit}</p>
                                <p className="type-data m-0 mb-1 text-small text-ink">PROTOCOL &nbsp;{report.protocol}</p>
                                <p className="type-data m-0 mb-1 text-small text-ink-2">CYCLE &nbsp;{report.cycle}</p>

                                <p className="type-data m-0 mb-1 mt-3 text-[11px] uppercase text-ink-3">
                                    TERRAIN &nbsp;{report.terrain.features.join(' / ')}
                                </p>
                                {report.terrain.notes && (
                                    <p className="type-data m-0 mb-1 text-small text-ink-2">{report.terrain.notes}</p>
                                )}

                                <p className="type-data m-0 mb-1 mt-3 text-[11px] uppercase text-ink-3">MOBILITY</p>
                                {MOBILITY_ORDER.filter((k) => report.mobility[k]).map((k) => {
                                    const m = report.mobility[k];
                                    return (
                                        <p key={k} className="type-data m-0 mb-1 text-small text-ink">
                                            {k.toUpperCase()} &nbsp;{m.rating.toUpperCase()}
                                            {m.note && <span className="text-ink-2"> &mdash; {m.note}</span>}
                                        </p>
                                    );
                                })}

                                <p className="type-data m-0 mb-1 mt-3 text-[11px] uppercase text-ink-3">FAUNA</p>
                                {report.fauna.observations.map((obs, i) => (
                                    <p key={i} className="type-data m-0 mb-1 text-small text-ink">{obs}</p>
                                ))}

                                <p className="type-data m-0 mb-1 mt-3 text-[11px] uppercase text-ink-3">
                                    HAZARDS &nbsp;{report.hazards.join(' / ')}
                                </p>

                                <p className="type-data m-0 mb-1 mt-3 text-[11px] uppercase text-ink-3">
                                    OUTPUT PRIORITIES &nbsp;{report.outputPriorities.join(' / ')}
                                </p>

                                <p className="type-data m-0 mt-3 text-[11px] uppercase text-ink-2">RECEIPT UNCONFIRMED, filed by hand&mdash;archivist</p>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </article>
    );
}
