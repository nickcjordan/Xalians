import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import WorldArt from './WorldArt';
import planetArtwork from '@xalians/content/planetArtwork.json';
import XalianImage from '../xalianImage';
import Connections from './Connections';
import { useVisit, useReadGroup, markRead, useResume } from './trail';
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

/** Read status is complete only when every source passage has been read. */
function ChapterRailRow({ chapter, worldKey, active, onFallbackRead }) {
    const read = useReadGroup('chapter', chapter.paragraphs.map((p) => worldKey + ':' + p.index));
    return (
        <a
            href={'#section-' + chapter.key}
            aria-current={active ? 'location' : undefined}
            className={'flex min-h-11 items-baseline gap-2 border-l-2 py-2 pl-3 text-ink no-underline hover:bg-s2 ' + (active ? 'border-viable' : 'border-transparent')}
            onClick={onFallbackRead}
        >
            <span className="type-data shrink-0 text-small text-ink-2">{String(chapter.index + 1).padStart(2, '0')}</span>
            <span className="min-w-0 font-body text-small">{chapter.title}</span>
            {read && <span className="type-data ml-auto text-small text-ink-3">Read</span>}
        </a>
    );
}

/** The narrator's short lede placing the world in the story, with its Records consulted entries as links. */
function WorldLede({ world }) {
    const lede = lore.getWorldLede(world.key);
    if (!lede) return null;
    return (
        <div className="flex flex-col gap-3">
            <p className="type-legend m-0">Editorial summary</p>
            <Prose text={lede.prose} size="lead" className="m-0 text-ink-2" />
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
    const [activeChapter, setActiveChapter] = useState(0);

    useEffect(() => {
        if (!world) return undefined;
        let frame;
        const update = () => {
            let active = 0;
            world.readingChapters.forEach((chapter, index) => {
                const heading = document.getElementById(`section-${chapter.key}`);
                if (heading && heading.getBoundingClientRect().top <= 160) active = index;
            });
            setActiveChapter(active);
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
        schedule();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, [world]);

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
            {/* The art column takes up to 480px, so splitting at md (720) left
                the facts beside it about 118px wide -- narrower than a single
                era station, which then overran the card. The split waits until
                there is room for both halves. */}
            <Card variant="panel" className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
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

            <section className="mx-auto w-full min-w-0 max-w-[calc(62ch+232px)] font-body text-body">
                <SectionHead title="History" count={world.readingChapters.length + ' chapters'} />
                <p className="mb-6 font-body text-small text-ink-2">Original world history, arranged into named chapters. Passage numbers preserve citations to the source.</p>
                <ReadingLayout rail={
                    <ReadingRail label={'Chapters (' + world.readingChapters.length + ')'}>
                        <nav aria-label="History chapters">
                            <ol className="m-0 flex list-none flex-col p-0">
                                {world.readingChapters.map((chapter) => (
                                    <li key={chapter.key}>
                                        <ChapterRailRow chapter={chapter} worldKey={world.key} active={activeChapter === chapter.index} onFallbackRead={handleFallbackRead(chapter.start)} />
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </ReadingRail>
                }>
                    {world.readingChapters.map((chapter) => (
                        <section key={chapter.key} data-history-chapter={chapter.key} className="mb-10 last:mb-0">
                            <h3 id={'section-' + chapter.key} className="type-subhead m-0 mb-5 scroll-mt-20">
                                <span className="type-data mr-3 text-small text-ink-2">{String(chapter.index + 1).padStart(2, '0')}</span>
                                {chapter.title}
                            </h3>
                            {chapter.paragraphs.map((paragraph, index) => (
                                <ReadingBlock key={paragraph.index} text={
                                    <>
                                        <div id={'chapter-' + paragraph.index} data-chapter-index={paragraph.index} ref={(el) => { chapterRefs.current[paragraph.index] = el; }} className="scroll-mt-20">
                                            <span id={'chapter-' + world.key + '-' + paragraph.index} className="sr-only">{lore.passageLabel(paragraph.index)}</span>
                                            <Prose text={paragraph.text} linkOnce precedingText={chapter.paragraphs.slice(0, index).map((p) => p.text).join(' ')} className="m-0 leading-relaxed" />
                                        </div>
                                        {paragraph.index === world.illustrationAfter && secondArt && (
                                            <div className="my-6"><WorldArt art={secondArt} /></div>
                                        )}
                                    </>
                                } />
                            ))}
                        </section>
                    ))}
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
