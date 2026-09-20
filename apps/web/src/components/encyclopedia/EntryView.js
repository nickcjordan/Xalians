import React from 'react';
import { Link, useParams } from 'react-router';
import artwork from '@xalians/content/loreArtwork.json';
import * as lore from '../../lore';
import Prose from './Prose';
import LoreArt from './LoreArt';
import Connections from './Connections';
import EntryHoverCard from './EntryHoverCard';
import { useVisit, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { SpecPlate, EmptyState } from '@/components/system/record';
import { Fold, FoldGroup } from '@/components/system/fold';
import { IndexList, IndexRow } from '@/components/system/index-row';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const NAV_LINK_CLASS = 'type-legend text-ink-2 no-underline hover:text-ink';

function bodyValue(value) {
    return <span className="font-body normal-case tracking-normal text-ink">{value}</span>;
}

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

/** "Continue the story" foot: one row pointing at the reader's furthest part, or Part 1 when nothing is stored. */
function ContinueTheStory() {
    const resume = useResume();
    const eras = lore.getEras();
    const era = resume ? lore.getEra(resume.eraKey) : null;
    const target = era || eras[0];
    if (!target) return null;
    return (
        <IndexList>
            <IndexRow
                to={lore.routeFor('era', target.key)}
                title="Continue the story"
                meta={`Part ${target.order + 1}, ${target.name}`}
            />
        </IndexList>
    );
}

// Wraps every whole-word (optionally plural) mention of `name` in `text` with
// a <mark>, the same way Connections marks its subject, but the viable tint
// (content, not the plain grey mark Connections uses for interface state).
function markName(text, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b(${escaped}s?)\\b`, 'gi');
    const parts = text.split(re);
    if (parts.length === 1) return text;
    return parts.map((part, i) => (
        i % 2 === 1
            ? <mark key={i} className="bg-viable-tint px-0.5 text-inherit">{part}</mark>
            : part
    ));
}

/** An entry page is the thread of one name through the story; past this many excerpts in one era the part itself is the better read. */
const EXCERPTS_PER_ERA = 3;

/** One era's reading in "In the story": the fixed points that name this entry, then the excerpts as reader-style rows with world chip and chapter in the margin. */
function StoryEra({ row, entryTitle }) {
    return (
        <div>
            <div className="mb-3 flex items-baseline gap-3">
                <Link to={lore.routeFor('era', row.era.key)} className="type-subhead no-underline hover:text-edge-strong">
                    {row.era.name}
                </Link>
                <span className="type-data text-small text-ink-2">Part {row.era.order + 1}</span>
            </div>

            {row.events.length > 0 && (
                <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                    {row.events.map(({ event }) => (
                        <li key={event.key}>
                            <Link
                                to={lore.routeFor('event', `${row.era.key}:${event.key}`)}
                                className="font-body text-body text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink"
                            >
                                {event.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {row.excerpts.slice(0, EXCERPTS_PER_ERA).map((excerpt) => (
                <div
                    key={`${excerpt.world.key}:${excerpt.index}`}
                    className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-edge py-3 first:border-t-0 max-sm:grid-cols-1"
                >
                    <div className={`el-${excerpt.world.element} flex flex-col items-start gap-1`}>
                        <Link to={lore.routeFor('world', excerpt.world.key)}>
                            <Badge variant="chip-outline">{excerpt.world.name}</Badge>
                        </Link>
                        <span className="type-data text-small text-ink-2">{lore.chapterLabel(excerpt.index)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="m-0 max-w-[62ch] font-body text-body text-ink">
                            {markName(excerptWindow(excerpt.text, entryTitle), entryTitle)}
                        </p>
                        <Link
                            to={`${lore.routeFor('era', row.era.key)}#chapter-${excerpt.world.key}-${excerpt.index}`}
                            className={`mt-2 block ${NAV_LINK_CLASS}`}
                        >
                            Read in Part {row.era.order + 1}
                        </Link>
                    </div>
                </div>
            ))}
            {row.excerpts.length > EXCERPTS_PER_ERA && (
                <Link to={lore.routeFor('era', row.era.key)} className={`mt-2 block ${NAV_LINK_CLASS}`}>
                    {row.excerpts.length - EXCERPTS_PER_ERA} more in Part {row.era.order + 1}
                </Link>
            )}
        </div>
    );
}

/** The two-column Category / Era / Pronunciation / Appears-in plate for the identity strip. */
function IdentityPlate({ entry, story }) {
    const era = entry.category === 'history' ? lore.getEraForEntry(entry.key) : null;
    const chapterCount = story.reduce((n, row) => n + row.excerpts.length, 0);
    const partCount = story.length;

    const entries = [
        { key: 'Category', value: bodyValue(entry.category) },
    ];
    if (era) {
        entries.push({
            key: 'Era',
            value: (
                <Link to={lore.routeFor('era', era.key)} className="font-body normal-case tracking-normal text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
                    {era.name}
                </Link>
            ),
        });
    }
    if (entry.pronunciation && entry.pronunciation.respelling) {
        entries.push({ key: 'Pronunciation', value: entry.pronunciation.respelling });
    }
    if (chapterCount > 0) {
        entries.push({
            key: 'Appears in',
            value: bodyValue(`${chapterCount} chapter${chapterCount === 1 ? '' : 's'} across ${partCount} part${partCount === 1 ? '' : 's'}`),
        });
    }

    return <SpecPlate columns={2} entries={entries} />;
}

/**
 * EntryView: one encyclopedia entry -- an identity strip (art when the entry
 * has it, the definition, and its category/era/pronunciation/appears-in
 * facts), the article and its place in the story in the text track with
 * Related sticky beside it, the story foot, and Cross references.
 * Contract: docs/design/encyclopedia-polish-plan-2026-09-19.md, Shape B.
 */
export default function EntryView() {
    const { key } = useParams();
    const entry = lore.getEntry(key);
    usePageTitle(entry ? entry.title : 'Not found');
    useVisit(entry
        ? { kind: 'entry', key, name: entry.title, element: entry.element }
        : { kind: null, key: null });

    if (!entry) {
        return (
            <div>
                <EmptyState legend="Not found">No record for &ldquo;{key}&rdquo;.</EmptyState>
            </div>
        );
    }

    const related = lore.getRelated(key);
    const story = lore.getEntryStory(key);
    const connectionsCount = lore.getConnections('entry', key, { limit: 12 }).length;
    const scopeClass = entry.element ? `el-${entry.element}` : '';
    const hasArt = Boolean(artwork.entries[key]);
    const hasSecondTrack = story.length > 0 || related.length > 0;

    return (
        <div className={`flex flex-col gap-8 ${scopeClass}`}>
            <Card
                variant="panel"
                className={hasArt
                    ? 'grid gap-6 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)]'
                    : 'grid gap-6 md:grid-cols-[minmax(0,62ch)_minmax(0,1fr)] md:items-start'}
            >
                {hasArt ? (
                    <>
                        <div className="min-w-0">
                            <LoreArt kind="entries" recordKey={key} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-4">
                            <Prose text={entry.definition} except={key} size="lead" />
                            <IdentityPlate entry={entry} story={story} />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Without art the definition takes the text track and the
                            plate fills the second, so the strip never runs half empty. */}
                        <Prose text={entry.definition} except={key} size="lead" className="m-0" />
                        <div className="min-w-0">
                            <IdentityPlate entry={entry} story={story} />
                        </div>
                    </>
                )}
            </Card>

            <div className={hasSecondTrack ? 'grid gap-8 lg:grid-cols-[minmax(0,62ch)_minmax(0,1fr)]' : ''}>
                <div className="flex min-w-0 flex-col gap-8">
                    {entry.article && entry.article.length > 0 && (
                        <section className="flex flex-col gap-4">
                            {entry.article.map((paragraph, i) => (
                                <Prose key={i} text={paragraph} except={key} />
                            ))}
                        </section>
                    )}

                    {story.length > 0 && (
                        <section className="flex flex-col gap-6">
                            <SectionHead title="In the story" />
                            {story.map((row) => (
                                <StoryEra key={row.era.key} row={row} entryTitle={entry.title} />
                            ))}
                        </section>
                    )}

                    {story.length === 0 && related.length === 0 && !(entry.article && entry.article.length > 0) && (
                        <EmptyState legend="No cross-references">No cross-references on file.</EmptyState>
                    )}
                </div>

                {related.length > 0 && (
                    <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                        <SectionHead title="Related" />
                        <div className="flex flex-col divide-y divide-edge">
                            {related.map((rel) => (
                                <div key={rel.key} className={`py-3 first:pt-0 last:pb-0 ${rel.element ? `el-${rel.element}` : ''}`}>
                                    <EntryHoverCard entryKey={rel.key}>
                                        <Link to={lore.routeFor('entry', rel.key)} className="type-legend text-ink no-underline hover:text-ink">
                                            {rel.title}
                                        </Link>
                                    </EntryHoverCard>
                                    <p className="m-0 mt-1 line-clamp-2 font-body text-small text-ink-2">{rel.definition}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ContinueTheStory />

            <FoldGroup>
                <Fold label="Cross references" count={connectionsCount}>
                    <Connections kind="entry" recordKey={key} limit={12} bare />
                </Fold>
            </FoldGroup>
        </div>
    );
}
