import React, { useMemo, useState } from 'react';
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
            className={`g-tile g-el-${s.element} enc-bestiary-tile`}
        >
            <div className="g-tile-art">
                <XalianImage colored speciesName={s.name} primaryType={s.element} moreClasses="enc-bestiary-portrait" />
            </div>
            <span className="g-tile-name">{s.name}</span>
            <div className="g-tile-meta">
                <span className="g-chip">{s.element}</span>
                <span className="enc-bestiary-world">{s.planet ? s.planet.name : s.homePlanet}</span>
            </div>
            <div className="enc-bestiary-lamps">
                <span className={`g-lamp enc-bestiary-lamp ${s.source === 'template' ? '' : 'g-lamp--off'}`}>
                    {s.source === 'template' ? 'record' : 'pending'}
                </span>
                {read && (
                    <span className="g-lamp enc-bestiary-lamp enc-bestiary-read-lamp" title="Reviewed">
                        reviewed
                    </span>
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

    const worlds = lore.getWorlds();
    const species = lore.getSpeciesList();

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
            <div className="enc-section-head">
                <h1 className="g-h2">Bestiary</h1>
                <span className="enc-count">{list.length} of {species.length} specimens</span>
            </div>

            <div className="enc-filters">
                <div className="g-segmented" role="group" aria-label="Filter by element">
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

                <div className="g-segmented" role="group" aria-label="Sort by">
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
                <div className="enc-grid">
                    {list.map((s) => <BestiaryTile key={s.key} species={s} />)}
                </div>
            )}
        </div>
    );
}
