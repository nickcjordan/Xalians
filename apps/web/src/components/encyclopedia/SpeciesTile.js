import React from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import XalianImage from '../xalianImage';
import { useReadMark } from './trail';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';

/**
 * One species catalogue tile: art on the element wash, name, home world in
 * the data face, a Reviewed badge when read. Shared by the Bestiary grid and
 * a species record's "Also from <world>" readouts strip.
 */
export default function SpeciesTile({ species: s }) {
    const read = useReadMark('species', s.key);
    return (
        <Tile as={Link} to={lore.routeFor('species', s.key)} className={`el-${s.element}`}>
            <TileArt>
                <XalianImage colored speciesName={s.name} primaryType={s.element} moreClasses="w-full" />
            </TileArt>
            <TileMeta>
                <span className="type-subhead block text-base">{s.name}</span>
                <span className="type-data mt-1 block text-small text-ink-3">{s.planet ? s.planet.name : s.homePlanet}</span>
                {read && (
                    <div className="mt-2 flex gap-2">
                        <Badge variant="ok">Reviewed</Badge>
                    </div>
                )}
            </TileMeta>
        </Tile>
    );
}
