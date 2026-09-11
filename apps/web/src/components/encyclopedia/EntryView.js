import React from 'react';
import { Link, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import Connections from './Connections';
import { useVisit, useResume } from './trail';
import { SectionHead } from '@/components/system/masthead';
import { RecordRow, EmptyState } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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
        <div className="mt-8 border-t border-edge pt-4">
            <RecordRow
                className="border-b-0 py-0"
                term="Continue the story"
            >
                <Link to={lore.routeFor('era', target.key)} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
                    Part {target.order + 1}, {target.name}
                </Link>
            </RecordRow>
        </div>
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

/** One era's reading in "In the story": the fixed points that name this entry, then the excerpts as reader-style paragraphs. */
function StoryEra({ row, entryTitle }) {
    return (
        <section className="border-t border-edge pt-5 first-of-type:border-t-0 first-of-type:pt-0 [&+&]:mt-5">
            <div className="mb-3 flex items-baseline gap-3">
                <Link to={lore.routeFor('era', row.era.key)} className="type-heading text-[19px] no-underline hover:text-edge-strong">
                    {row.era.name}
                </Link>
                <span className="type-data text-small text-ink-2">Part {row.era.order + 1}</span>
            </div>

            {row.events.length > 0 && (
                <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                    {row.events.map(({ event }) => (
                        <li key={event.key} className="block before:mr-2 before:inline-block before:size-[5px] before:bg-ink-3 before:align-middle before:content-['']">
                            <Link
                                to={lore.routeFor('event', `${row.era.key}:${event.key}`)}
                                className="font-body text-body text-ink underline decoration-ink-3"
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
                    className="grid grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-t border-edge py-3 first:border-t-0 max-sm:grid-cols-1"
                >
                    <div className={`el-${excerpt.world.element} flex flex-col items-start gap-1`}>
                        <Link to={lore.routeFor('world', excerpt.world.key)}>
                            <Badge variant="chip-outline">{excerpt.world.name}</Badge>
                        </Link>
                        <span className="type-data text-small text-ink-2">Ch. {String(excerpt.index).padStart(2, '0')}</span>
                    </div>
                    <p className="m-0 max-w-[62ch] font-body text-body text-ink">
                        {markName(excerptWindow(excerpt.text, entryTitle), entryTitle)}{' '}
                        <Link
                            to={`${lore.routeFor('era', row.era.key)}#chapter-${excerpt.world.key}-${excerpt.index}`}
                            className="ml-2 text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink"
                        >
                            Read in Part {row.era.order + 1}
                        </Link>
                    </p>
                </div>
            ))}
            {row.excerpts.length > EXCERPTS_PER_ERA && (
                <p className="type-data m-0 mb-5 mt-2 text-[11px]">
                    <Link to={lore.routeFor('era', row.era.key)} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
                        and {row.excerpts.length - EXCERPTS_PER_ERA} more in Part {row.era.order + 1}
                    </Link>
                </p>
            )}
        </section>
    );
}

/**
 * EntryView: one encyclopedia entry, its related entries, and every place
 * it appears in world histories and species descriptions.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Index and entry".
 */
export default function EntryView() {
    const { key } = useParams();
    const entry = lore.getEntry(key);
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

    return (
        <div className={scopeClass}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
                <div className="min-w-0 max-w-[40ch] lg:sticky lg:top-8">
                    <Prose text={entry.definition} except={key} />
                </div>

                <div className="flex min-w-0 flex-col gap-8">
                    {story.length > 0 && (
                        <section>
                            <SectionHead title="In the Story" />
                            {story.map((row) => (
                                <StoryEra key={row.era.key} row={row} entryTitle={entry.title} />
                            ))}
                        </section>
                    )}

                    {related.length > 0 && (
                        <section>
                            <SectionHead title="Related" />
                            <Card variant="panel" className="p-0 px-4 py-2">
                                {related.map((rel) => (
                                    <RecordRow
                                        key={rel.key}
                                        className={rel.element ? `el-${rel.element}` : ''}
                                        term={
                                            <Link to={lore.routeFor('entry', rel.key)} className="no-underline hover:underline">
                                                {rel.title}
                                            </Link>
                                        }
                                    >
                                        <Prose text={rel.definition} except={rel.key} className="m-0 text-small text-ink-2" />
                                    </RecordRow>
                                ))}
                            </Card>
                        </section>
                    )}

                    {story.length === 0 && related.length === 0 && (
                        <EmptyState legend="No cross-references">No cross-references on file.</EmptyState>
                    )}

                    <ContinueTheStory />

                    <Accordion type="single" collapsible>
                        <AccordionItem value="cross-references" className="border border-edge bg-s1 px-5">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="type-legend">Cross references</span>
                                {typeof connectionsCount === 'number' && (
                                    <span className="type-data ml-auto mr-2 text-small text-ink-2">{connectionsCount}</span>
                                )}
                            </AccordionTrigger>
                            <AccordionContent>
                                <Connections kind="entry" recordKey={key} limit={12} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
