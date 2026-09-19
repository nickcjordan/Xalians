import React from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import planetArtwork from '@xalians/content/planetArtwork.json';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { usePageTitle } from '@/components/system/head';

function sentenceCase(text) {
    if (!text) return text;
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Worlds: the survey tile catalogue, fourteen worlds keyed by element, in
 * file order (planetRecords.json order, per contract). The masthead already
 * carries the section title and the "N worlds surveyed" count; this section
 * renders no heading of its own.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Worlds and world".
 */
export default function Worlds() {
    usePageTitle('Worlds');
    const worlds = lore.getWorlds();

    return (
        <div className="grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-3 sm:gap-4 sm:gap-y-5 md:grid-cols-4 min-[1080px]:grid-cols-5 xl:grid-cols-6">
            {worlds.map((world) => (
                <Tile as={Link} key={world.key} to={lore.routeFor('world', world.key)} className={`el-${world.element}`}>
                    <TileArt>
                        <img
                            src={`/${planetArtwork[world.key][0].thumbnail}`}
                            alt={planetArtwork[world.key][0].alt}
                            width={384}
                            height={256}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
                    </TileArt>
                    <TileMeta>
                        <span className="type-subhead block text-base">{world.name}</span>
                        <span className="mt-1 line-clamp-2 block font-body text-small text-ink-2">
                            {sentenceCase(world.physical.terrainLabel)}
                        </span>
                    </TileMeta>
                </Tile>
            ))}
        </div>
    );
}
