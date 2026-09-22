import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import WorldArt from './WorldArt';
import planetArtwork from '@xalians/content/planetArtwork.json';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import { useVisit, useReadMark, markRead, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { SpecPlate, RecordRow, Tile, TileArt, TileMeta, TileGrid, EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Fold, FoldGroup } from '@/components/system/fold';
import { IndexList, IndexRow } from '@/components/system/index-row';
import { Station, StationRow } from '@/components/system/station-row';
import { ReadingLayout, ReadingRail, ReadingBlock } from '@/components/system/reading-layout';

function sentenceCase(text) {
    if (!text) return text;
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// The physical plate is a small display-set so fields can change in one
// place while the planet data block is mid-redesign (per contract). Terrain
// reads in body face, sentence case (docs/DESIGN_SYSTEM.md common brief rule
// 6); the rest are data-face values.
const EARTH_GRAVITY_MS2 = 9.81;

const PHYSICAL_DISPLAY_SET = [
    ['Terrain', (p) => sentenceCase(p.terrainLabel), false],
    ['Radius', (p) => `${Number(p.radiusKm).toLocaleString('en-US')} km`, true],
    ['Surface gravity', (p) => `${(p.gravityVsEarth * EARTH_GRAVITY_MS2).toFixed(1)} m/s²`, true],
    ['Temperature range', (p) => `${p.temperatureC.low} to ${p.temperatureC.high} °C`, true],
];

const MOBILITY_ORDER = ['flight', 'swim', 'burrow', 'climb', 'sprint'];

function chapterEraTag(chapter) {
    return chapter.era && chapter.era !== 'natural' ? chapter.era : null;
}

function chapterEraLabel(chapter, eraLabel) {
    if (!chapterEraTag(chapter)) return 'Natural history';
    return eraLabel || chapter.era;
}

/** One row in the chapter rail. Reads its own read mark and reports clicks as a fallback read trigger. */
function ChapterRailRow({ chapter, index, label, onFallbackRead }) {
    const read = useReadMark('chapter', `${chapter.worldKey}:${chapter.index}`);
    const words = chapter.text.trim().split(/\s+/).slice(0, 8).join(' ');

    return (
        <a
            href={`#chapter-${chapter.index}`}
            className="flex flex-wrap items-baseline gap-2 py-2 text-ink no-underline hover:bg-s2"
            onClick={onFallbackRead}
        >
            <span className={`inline-block size-1.5 rounded-full ${read ? 'bg-viable' : 'bg-edge-strong'}`} aria-hidden="true" />
            <span className="type-data shrink-0 text-[11px] text-ink-2">
                {lore.chapterLabel(index).toUpperCase()}
            </span>
            <span className="type-legend shrink-0 text-[11px] text-ink-3">{label}</span>
            <span className="min-w-0 flex-[1_1_100%] overflow-hidden whitespace-nowrap text-ellipsis font-body text-small text-ink-2">
                {words}&hellip;
            </span>
        </a>
    );
}

/** The narrator's short lede placing the world in the story, with its Records consulted entries as links. */
function WorldLede({ world }) {
    const lede = lore.getWorldLede(world.key);
    if (!lede) return null;
    return (
        <div className="flex flex-col gap-3">
            <Prose text={lede.prose} className="text-lead text-ink-2" />
            {(lede.sources.length > 0 || lede.entries.length > 0) && (
                <div className="flex flex-col gap-2">
                    <p className="type-legend m-0">Records consulted</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {lede.entries.map((entry) => (
                            <Link
                                key={entry.key}
                                to={lore.routeFor('entry', entry.key)}
                                className="type-legend text-ink-2 no-underline hover:text-ink"
                            >
                                {entry.title}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Foot linking into The Story. With reading progress, it is "Continue the
 * story" pointing at the reader's furthest part. Without progress, it is
 * "This world in the story" pointing at the first era that names this world
 * -- the same lit test the In-the-story stations above use (getWorldTimeline
 * in lore/chronicle.js), read via getWorldFirstEra so the two never disagree.
 */
function ContinueTheStory({ world }) {
    const resume = useResume();
    const resumeEra = resume ? lore.getEra(resume.eraKey) : null;
    const target = resumeEra || lore.getWorldFirstEra(world.key) || lore.getEras()[0];
    if (!target) return null;
    const label = resumeEra ? 'Continue the story' : 'This world in the story';
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

/**
 * WorldView: the survey record for one world -- identity strip (hero art,
 * narrator's lede, physical facts, In the story stations), history chapters
 * in the reading layout, native fauna, entries naming the world, then the
 * environmental report and Connections behind closed folds.
 * Contract: docs/design/encyclopedia-polish-plan-2026-09-19.md "Shape B" and
 * "Shape C".
 */
export default function WorldView() {
    const { key } = useParams();
    const world = lore.getWorld(key);

    usePageTitle(world ? world.name : 'Not found');

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
    const lede = lore.getWorldLede(world.key);
    const heroArt = planetArtwork[world.key][0];
    const secondArt = planetArtwork[world.key][1];

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

    return (
        <article className={`el-${world.element} flex flex-col gap-8`}>
            <Card variant="panel" className="grid gap-6 md:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
                <WorldArt art={heroArt} hero />

                <div className="flex min-w-0 flex-col gap-5">
                    {lede && <WorldLede world={world} />}

                    <SpecPlate columns={2} entries={factsEntries} />

                    {/* `items-start` on the column sized the rail to its content
                        rather than to this box, which defeated both the wrap and
                        the scroll it falls back to: the seven era stations ran
                        over 1000px off the side of a phone with no way to reach
                        them. The rail must be allowed to fill the width. */}
                    <div className="flex flex-col items-stretch gap-2 border-t border-edge pt-4">
                        <span className="type-legend whitespace-nowrap">In the story</span>
                        <StationRow value={null} onChange={() => {}} aria-label="In the story" className="min-w-0">
                            {timeline.map((row) => {
                                const count = row.chapters.length;
                                const lit = count > 0 || row.events.length > 0;
                                return (
                                    <Station
                                        key={row.era.key}
                                        to={lit ? lore.routeFor('era', row.era.key) : undefined}
                                        disabled={!lit}
                                        count={count > 0 ? count : undefined}
                                    >
                                        {row.era.name}
                                    </Station>
                                );
                            })}
                        </StationRow>
                    </div>
                </div>
            </Card>

            <section className="min-w-0">
                <SectionHead title="History" count={`${world.chapters.length} chapters`} />
                <ReadingLayout>
                    <ReadingRail label={`Chapters (${world.chapters.length})`}>
                        <ol className="m-0 flex list-none flex-col p-0">
                            {world.chapters.map((chapter, i) => {
                                const eraKey = chapterEraTag(chapter);
                                const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                                return (
                                    <li key={chapter.index}>
                                        <ChapterRailRow
                                            chapter={{ ...chapter, worldKey: world.key }}
                                            index={i}
                                            label={label}
                                            onFallbackRead={handleFallbackRead(chapter.index)}
                                        />
                                    </li>
                                );
                            })}
                        </ol>
                    </ReadingRail>

                    {world.chapters.map((chapter, i) => {
                        const eraKey = chapterEraTag(chapter);
                        const label = chapterEraLabel(chapter, eraKey ? eraNameByKey.get(eraKey) : null);
                        return (
                            <ReadingBlock
                                key={chapter.index}
                                divided
                                text={
                                    <div
                                        id={`chapter-${chapter.index}`}
                                        data-chapter-index={chapter.index}
                                        ref={(el) => {
                                            chapterRefs.current[i] = el;
                                        }}
                                        className="scroll-mt-16"
                                    >
                                        <p className="type-data m-0 mb-2 text-ink-2">
                                            {lore.chapterLabel(i).toUpperCase()}
                                        </p>
                                        <Prose text={chapter.text} />
                                    </div>
                                }
                                margin={
                                    <>
                                        {eraKey ? (
                                            <Link
                                                to={lore.routeFor('era', eraKey)}
                                                className="type-legend text-ink-2 no-underline hover:text-ink"
                                            >
                                                {label}
                                            </Link>
                                        ) : (
                                            <span className="type-legend text-ink-3">{label}</span>
                                        )}
                                        {i === 1 && secondArt && <WorldArt art={secondArt} />}
                                    </>
                                }
                            />
                        );
                    })}
                </ReadingLayout>
            </section>

            {world.nativeSpecies.length > 0 && (
                <section className="min-w-0">
                    <SectionHead title="Native Fauna" count={`${world.nativeSpecies.length} species`} />
                    <TileGrid>
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
                    </TileGrid>
                </section>
            )}

            {world.entries.length > 0 && (
                <section className="min-w-0">
                    <SectionHead title="Entries Naming This World" />
                    <div className="grid grid-cols-1 border-t border-edge lg:grid-cols-2 lg:gap-x-6">
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
                                <Prose text={entry.definition} className="m-0 text-small text-ink-2" />
                            </RecordRow>
                        ))}
                    </div>
                </section>
            )}

            <ContinueTheStory world={world} />

            <FoldGroup>
                <Fold label="Cross references" count={connectionsCount}>
                    <Connections kind="world" recordKey={world.key} limit={12} bare />
                </Fold>
                <Fold label="For builders">
                    <p className="mb-4 font-body text-small text-ink-2">
                        Machine-readable data the Generator and the games use.
                    </p>
                    <SpecPlate
                        columns={2}
                        entries={[
                            { key: 'Unit', value: report.unit },
                            { key: 'Protocol', value: report.protocol },
                            { key: 'Cycle', value: report.cycle },
                            { key: 'Terrain', value: report.terrain.features.join(', ') },
                            ...(report.terrain.notes ? [{ key: 'Terrain notes', value: report.terrain.notes, body: true }] : []),
                            ...MOBILITY_ORDER.filter((k) => report.mobility[k]).map((k) => {
                                const m = report.mobility[k];
                                return {
                                    key: k.charAt(0).toUpperCase() + k.slice(1),
                                    value: m.note ? `${m.rating} (${m.note})` : m.rating,
                                    body: true,
                                };
                            }),
                            {
                                key: 'Fauna',
                                value: (
                                    <ul className="m-0 flex list-none flex-col gap-1 p-0 font-body normal-case tracking-normal">
                                        {report.fauna.observations.map((obs, i) => (
                                            <li key={i}>{obs}</li>
                                        ))}
                                    </ul>
                                ),
                            },
                            { key: 'Hazards', value: report.hazards.join(', ') },
                            { key: 'Output priorities', value: report.outputPriorities.join(', ') },
                        ]}
                    />
                </Fold>
            </FoldGroup>
        </article>
    );
}
