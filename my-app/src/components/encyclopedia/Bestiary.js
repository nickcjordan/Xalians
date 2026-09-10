import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import XalianImage from '../xalianImage';
import { useReadMark } from './trail';
import { Tile, TileArt, TileMeta, EmptyState } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import { tabTriggerClass } from '@/components/ui/tabs';

const ELEMENTS = [
    'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
    'chemical', 'air', 'psychic', 'ice', 'metal', 'sand',
];

function BestiaryTile({ species: s }) {
    const read = useReadMark('species', s.key);
    return (
        <Tile as={Link} to={lore.routeFor('species', s.key)} className={`el-${s.element}`}>
            <TileArt>
                <XalianImage colored speciesName={s.name} primaryType={s.element} moreClasses="w-full" />
            </TileArt>
            <TileMeta>
                <span className="type-subhead block text-base">{s.name}</span>
                <span className="type-data mt-1 block text-small text-ink-3">{s.planet ? s.planet.name : s.homePlanet}</span>
                {(s.source !== 'template' || read) && (
                    <div className="mt-2 flex gap-2">
                        {s.source !== 'template' && <Badge variant="info">Pending record</Badge>}
                        {read && <Badge variant="ok">Reviewed</Badge>}
                    </div>
                )}
            </TileMeta>
        </Tile>
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
        <div>
            <div
                className="mb-3 flex flex-wrap gap-0.5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]"
                role="group"
                aria-label="Filter by element"
                ref={elementRowRef}
            >
                <button
                    type="button"
                    data-state={element === 'all' ? 'active' : 'inactive'}
                    className={`${tabTriggerClass} max-sm:shrink-0`}
                    aria-pressed={element === 'all'}
                    onClick={() => setElement('all')}
                >
                    All
                </button>
                {ELEMENTS.map((el) => (
                    <button
                        key={el}
                        type="button"
                        data-state={element === el ? 'active' : 'inactive'}
                        className={`${tabTriggerClass} max-sm:shrink-0`}
                        aria-pressed={element === el}
                        onClick={() => setElement(el)}
                    >
                        {el}
                    </button>
                ))}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3 max-sm:flex-row max-sm:flex-wrap">
                <Select value={world} onValueChange={setWorld}>
                    <SelectTrigger aria-label="Filter by world" className="min-w-[10rem] max-sm:flex-1 max-sm:basis-full">
                        <SelectValue placeholder="All worlds" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All worlds</SelectItem>
                        {worlds.map((w) => (
                            <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <ToggleGroup type="single" value={sort} onValueChange={(v) => v && setSort(v)} variant="outline" aria-label="Sort by">
                    <ToggleGroupItem value="name">Name</ToggleGroupItem>
                    <ToggleGroupItem value="world">World</ToggleGroupItem>
                </ToggleGroup>

                <Toggle
                    pressed={ratifiedOnly}
                    onPressedChange={setRatifiedOnly}
                    variant="outline"
                    className="whitespace-nowrap"
                >
                    Ratified
                </Toggle>

                {/* The masthead already carries "Bestiary" and the total count; this
                    is the live filtered count, which does change, so it stays. */}
                <p className="type-data m-0 ml-auto text-small text-ink-2 max-sm:ml-0 max-sm:basis-full">{list.length} of {species.length} specimens</p>
            </div>

            {list.length === 0 ? (
                <EmptyState legend="No results">No specimens match the current filter.</EmptyState>
            ) : (
                <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-3 sm:gap-4 sm:gap-y-5 md:grid-cols-4 min-[1080px]:grid-cols-5 xl:grid-cols-6">
                    {list.map((s) => <BestiaryTile key={s.key} species={s} />)}
                </div>
            )}
        </div>
    );
}
