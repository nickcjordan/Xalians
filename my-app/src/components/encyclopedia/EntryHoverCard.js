import React, { useState } from 'react';
import * as lore from '../../lore';

/**
 * A small printed card that appears on hover or focus over a linked term:
 * the entry's title, category, and definition. Static, no motion.
 */
export default function EntryHoverCard({ entryKey, children }) {
    const [show, setShow] = useState(false);
    const entry = lore.getEntry(entryKey);
    if (!entry) return children;
    return (
        <span
            className="enc-hover"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onFocus={() => setShow(true)}
            onBlur={() => setShow(false)}
        >
            {children}
            {show && (
                <span className={`g-panel g-panel--raised enc-hover-card ${entry.element ? `g-el-${entry.element}` : ''}`} role="tooltip">
                    <span className="g-kicker enc-hover-cat">{entry.category}</span>
                    <span className="enc-hover-title">{entry.title}</span>
                    <span className="g-body enc-hover-def">{entry.definition}</span>
                </span>
            )}
        </span>
    );
}
