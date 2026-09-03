import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import EntryHoverCard from './EntryHoverCard';

/**
 * Renders canonical prose with every encyclopedia title turned into a link.
 * This is the only component that makes prose links; sections pass text in,
 * never markup. `except` suppresses the self-link on an entry's own page.
 */
export default function Prose({ text, except, as: Tag = 'p', className = '' }) {
    if (!text) return null;
    const segments = lore.linkify(text, { except });
    return (
        <Tag className={`g-body enc-prose ${className}`.trim()}>
            {segments.map((seg, i) =>
                seg.key ? (
                    <EntryHoverCard key={i} entryKey={seg.key}>
                        <Link to={lore.routeFor('entry', seg.key)} className="g-link enc-term">{seg.text}</Link>
                    </EntryHoverCard>
                ) : (
                    <React.Fragment key={i}>{seg.text}</React.Fragment>
                )
            )}
        </Tag>
    );
}
