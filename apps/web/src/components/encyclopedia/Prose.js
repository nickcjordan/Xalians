import React from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import EntryHoverCard from './EntryHoverCard';

const TERM_LINK_CLASS = 'text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink';

/**
 * Renders canonical prose with every encyclopedia title turned into a link.
 * This is the only component that makes prose links; sections pass text in,
 * never markup. `except` suppresses the self-link on an entry's own page.
 */
export default function Prose({ text, except, as: Tag = 'p', className = '' }) {
    if (!text) return null;
    const segments = lore.linkify(text, { except });
    return (
        <Tag className={`measure font-body text-body text-ink ${className}`.trim()}>
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
