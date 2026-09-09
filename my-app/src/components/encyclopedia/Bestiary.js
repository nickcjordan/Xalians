import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import XalianImage from '../xalianImage';
import { useReadMark } from './trail';
import './Bestiary.css';

const ELEMENTS = [
    'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
    'chemical', 'air', 'psychic', 'ice', 'metal', 'sand',
];

function BestiaryTile({ species: s }) {
    const read = useReadMark('species', s.key);
    return (
        <Link
            to={lore.routeFor('species', s.key)}
            className={`g-panel g-card-link g-el-${s.element} enc-tile`}
        >
            <div className="enc-tile-bar" />
            <div className="enc-tile-art">
                <XalianImage colored speciesName={s.name} primaryType={s.element} moreClasses="enc-tile-art-img" />
            </div>
            <div className="enc-tile-meta">
                <span className="g-h3 enc-tile-name">{s.name}</span>
                <span className="g-mono enc-tile-sub">{s.planet ? s.planet.name : s.homePlanet}</span>
                {(s.source !== 'template' || read) && (
                    <div className="enc-tile-badges">
                        {s.source !== 'template' && <span className="g-badge g-badge--info">Pending record</span>}
                        {read && <span className="g-badge g-badge--ok">Reviewed</span>}
                    </div>
                )}
            </div>
        </Link>
    );
}

/**
 * Bestiary: the catalogue of all 29 species, filterable by element and
 * world, sortable by name or world.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Bestiary and species".
 */
export default function Bestiary() {
    const [element, setElement] = useState('all');
    const [world, setWorld] = useState('all');
    const [sort, setSort] = useState('name');
    const [ratifiedOnly, setRatifiedOnly] = useState(false);
    const elementRowRef = useRef(null);

    const worlds = lore.getWorlds();
    const species = lore.getSpeciesList();

    // Keep the pressed element segment in view when the row scrolls on phones.
    useEffect(() => {
        const row = elementRowRef.current;
        if (!row) return;
        const pressed = row.querySelector('[aria-pressed="true"]');
        if (pressed && pressed.scrollIntoView) {
            pressed.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [element]);

    const list = useMemo(() => {
        let filtered = species;
        if (element !== 'all') filtered = filtered.filter((s) => s.element === element);
        if (world !== 'all') filtered = filtered.filter((s) => s.homePlanet === world);
        if (ratifiedOnly) filtered = filtered.filter((s) => s.source === 'template');
        const sorted = [...filtered];
        if (sort === 'world') {
            sorted.sort((a, b) => {
                const worldCompare = (a.planet ? a.planet.name : '').localeCompare(b.planet ? b.planet.name : '');
                return worldCompare !== 0 ? worldCompare : a.name.localeCompare(b.name);
            });
        } else {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        }
        return sorted;
    }, [species, element, world, sort, ratifiedOnly]);

    return (
        <div className="enc-bestiary">
            {/* The masthead already carries "Bestiary" and the total count; this
                is the live filtered count, which does change, so it stays. */}
            <p className="enc-count enc-bestiary-count">{list.length} of {species.length} specimens</p>

            <div className="enc-filters">
                <div className="g-segmented enc-scrollrow" role="group" aria-label="Filter by element" ref={elementRowRef}>
                    <button type="button" className="g-segment" aria-pressed={element === 'all'} onClick={() => setElement('all')}>
                        All
                    </button>
                    {ELEMENTS.map((el) => (
                        <button
                            key={el}
                            type="button"
                            className="g-segment"
                            aria-pressed={element === el}
                            onClick={() => setElement(el)}
                        >
                            {el}
                        </button>
                    ))}
                </div>

                <select
                    className="g-select enc-bestiary-world-select"
                    aria-label="Filter by world"
                    value={world}
                    onChange={(e) => setWorld(e.target.value)}
                >
                    <option value="all">All worlds</option>
                    {worlds.map((w) => (
                        <option key={w.key} value={w.key}>{w.name}</option>
                    ))}
                </select>

                <div className="g-segmented enc-scrollrow" role="group" aria-label="Sort by">
                    <button type="button" className="g-segment" aria-pressed={sort === 'name'} onClick={() => setSort('name')}>
                        Name
                    </button>
                    <button type="button" className="g-segment" aria-pressed={sort === 'world'} onClick={() => setSort('world')}>
                        World
                    </button>
                </div>

                <button
                    type="button"
                    className="g-segment enc-bestiary-ratified-toggle"
                    aria-pressed={ratifiedOnly}
                    onClick={() => setRatifiedOnly((v) => !v)}
                >
                    Ratified
                </button>
            </div>

            {list.length === 0 ? (
                <p className="g-empty">No specimens match the current filter.</p>
            ) : (
                <div className="enc-grid enc-card-grid">
                    {list.map((s) => <BestiaryTile key={s.key} species={s} />)}
                </div>
            )}
        </div>
    );
}
