import React, { useMemo, useState } from 'react';
import * as lore from '../../lore';
import SpeciesTile from './SpeciesTile';
import { TileGrid, EmptyState } from '@/components/system/record';
import { usePageTitle } from '@/components/system/head';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FilterBar } from '@/components/system/filters';
import { Station, StationRow } from '@/components/system/station-row';

const ELEMENTS = [
    'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
    'chemical', 'air', 'psychic', 'ice', 'metal', 'sand',
];

/**
 * Bestiary: the catalogue of all 29 species, filterable by element and
 * world, sortable by name or world.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Bestiary and species".
 */
export default function Bestiary() {
    usePageTitle('Bestiary');
    const [element, setElement] = useState('all');
    const [world, setWorld] = useState('all');
    const [sort, setSort] = useState('name');

    const worlds = lore.getWorlds();
    const species = lore.getSpeciesList();

    const list = useMemo(() => {
        let filtered = species;
        if (element !== 'all') filtered = filtered.filter((s) => s.element === element);
        if (world !== 'all') filtered = filtered.filter((s) => s.homePlanet === world);
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
    }, [species, element, world, sort]);

    const active = element !== 'all' || world !== 'all' || sort !== 'name';

    return (
        <div>
            <FilterBar
                className="mb-5"
                active={active}
                activeCount={(element !== 'all' ? 1 : 0) + (world !== 'all' ? 1 : 0)}
                onClear={() => {
                    setElement('all');
                    setWorld('all');
                    setSort('name');
                }}
            >
                <StationRow value={element} onChange={setElement} aria-label="Filter by element" className="basis-full">
                    <Station active={element === 'all'} onClick={() => setElement('all')}>All</Station>
                    {ELEMENTS.map((el) => (
                        <Station key={el} active={element === el} onClick={() => setElement(el)}>{el}</Station>
                    ))}
                </StationRow>

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

                {/* The masthead already carries "Bestiary" and the total count; this
                    is the live filtered count, which does change, so it stays. */}
                <p className="type-data m-0 ml-auto text-small text-ink-2 max-sm:ml-0 max-sm:basis-full">{list.length} of {species.length} species</p>
            </FilterBar>

            {list.length === 0 ? (
                <EmptyState legend="No results">No species match the current filter.</EmptyState>
            ) : (
                <TileGrid>
                    {list.map((s) => <SpeciesTile key={s.key} species={s} />)}
                </TileGrid>
            )}
        </div>
    );
}
