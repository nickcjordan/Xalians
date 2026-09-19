import React from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import EntryHoverCard from './EntryHoverCard';

const TERM_LINK_CLASS = 'text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink';

const SIZE_CLASS = {
    body: 'text-body',
    lead: 'text-lead',
    small: 'text-small',
};

/**
 * Renders canonical prose with every encyclopedia title turned into a link.
 * This is the only component that makes prose links; sections pass text in,
 * never markup. `except` suppresses the self-link on an entry's own page.
 * `size` sets the one text-size class ("body" default, "lead", "small") so
 * callers stop stacking a size class on top of this component's own.
 */
export default function Prose({ text, except, as: Tag = 'p', size = 'body', className = '' }) {
    if (!text) return null;
    const segments = lore.linkify(text, { except });
    const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.body;
    return (
        <Tag className={`measure font-body ${sizeClass} text-ink ${className}`.trim()}>
            {segments.map((seg, i) =>
                seg.key ? (
                    <EntryHoverCard key={i} entryKey={seg.key}>
                        <Link to={lore.routeFor('entry', seg.key)} className={TERM_LINK_CLASS}>{seg.text}</Link>
                    </EntryHoverCard>
                ) : (
                    <React.Fragment key={i}>{seg.text}</React.Fragment>
                )
            )}
        </Tag>
    );
}
