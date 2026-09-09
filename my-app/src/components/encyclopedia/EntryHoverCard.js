import React, { useState } from 'react';
import * as lore from '../../lore';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

/**
 * A small printed card that appears on hover or focus over a linked term:
 * the entry's title, category, and definition. Static, no motion.
 */
export default function EntryHoverCard({ entryKey, children }) {
    const [show, setShow] = useState(false);
    const entry = lore.getEntry(entryKey);
    if (!entry) return children;

    return (
        <Popover open={show}>
            <PopoverTrigger asChild>
                <span
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                    onFocus={() => setShow(true)}
                    onBlur={() => setShow(false)}
                >
                    {children}
                </span>
            </PopoverTrigger>
            <PopoverContent
                role="tooltip"
                className={`w-80 border-edge bg-s1 p-4 text-left shadow-float ${entry.element ? `el-${entry.element}` : ''}`}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <p className="type-legend m-0">{entry.category}</p>
                <p className="type-heading m-0 mt-1 text-[15px]">{entry.title}</p>
                <p className="m-0 mt-1 font-body text-small text-ink-2">{entry.definition}</p>
            </PopoverContent>
        </Popover>
    );
}
