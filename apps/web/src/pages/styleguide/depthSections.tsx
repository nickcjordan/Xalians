import * as React from 'react';

import XalianImage from '../../components/xalianImage';
import { SectionHead } from '@/components/system/masthead';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * Depth (docs/DESIGN_SYSTEM.md section 5.1, ratified 2026-09-11).
 *
 * Thickness means pressable. Every demo below is a real component reading the
 * real rule, so nothing here can flatter the system: if a mass reads badly on
 * this page it reads badly on a real one. The flat half matters as much as the
 * thick half, because the rule only carries meaning while most things stay
 * flat.
 *
 * The alternatives that were built for the proposal and judged live (mass
 * straight down, mass on chips, mass under the switch knob, sinking slots, a
 * record number on the plate) were set aside on 2026-09-11 and deleted with
 * this pass. They are in the history of this file if one is ever reopened.
 */

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-3">
            {children}
            <span className="type-legend text-ink-3">{label}</span>
        </div>
    );
}

function SpeciesTile({ name, world, element }: { name: string; world: string; element: string }) {
    return (
        <Tile href="#" onClick={(e) => e.preventDefault()} className={`el-${element} w-[168px]`}>
            <TileArt>
                <XalianImage colored speciesName={name} primaryType={element} moreClasses="w-full" />
            </TileArt>
            <TileMeta>
                <span className="type-subhead block text-base">{name}</span>
                <span className="type-data mt-1 block text-small text-ink-3">{world}</span>
            </TileMeta>
        </Tile>
    );
}

function Pressable() {
    return (
        <Card variant="panel" className="mt-6">
            <p className="type-legend m-0 text-ink-2">Thick, because it can be pressed</p>
            <p className="m-0 mt-2 max-w-[68ch] text-body text-ink-2">
                The mass is solid, never blurred, cast down and to the right. Its color belongs to the
                object: the ink under an ordinary key, the darker viable under the primary, a darkened
                plague under destructive, the element dimmed under a tile. Hover lifts by one pixel and the
                mass grows. Press moves the object into its own mass and the mass disappears.
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-8 pb-2">
                <Demo label="Primary key, on viable-lo"><Button>Generate</Button></Demo>
                <Demo label="Secondary and destructive, in the ink">
                    <div className="flex gap-4">
                        <Button variant="secondary">Keep</Button>
                        <Button variant="destructive">Release</Button>
                    </div>
                </Demo>
                <Demo label="Segmented: selected is already pressed">
                    <ToggleGroup type="single" defaultValue="all" variant="outline">
                        {['all', 'fire', 'water'].map((v) => (
                            <ToggleGroupItem key={v} value={v}>{v}</ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </Demo>
                <Demo label="Tile, its own hue dimmed">
                    <SpeciesTile name="Hypnopet" world="Telypso" element="psychic" />
                </Demo>
            </div>
        </Card>
    );
}

function Flat() {
    return (
        <Card variant="panel" className="mt-6">
            <p className="type-legend m-0 text-ink-2">Flat, because it cannot</p>
            <p className="m-0 mt-2 max-w-[68ch] text-body text-ink-2">
                Cards, panels, badges, chips, inputs, slots and meters are read, not operated, so none of
                them has thickness. This is the half that makes the other half mean something: give a card
                a mass and a key stops announcing anything.
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-8 pb-2">
                <Demo label="Card">
                    <Card variant="panel" className="w-[220px]">
                        <p className="type-legend m-0">Panel</p>
                        <p className="m-0 mt-2 text-body text-ink-2">Read, not pressed.</p>
                    </Card>
                </Demo>
                <Demo label="Badges and chips">
                    <div className="flex gap-2">
                        <Badge variant="ok">Viable</Badge>
                        <Badge variant="info">Pending</Badge>
                        <span className="el-fire"><Badge variant="chip">Fire</Badge></span>
                    </div>
                </Demo>
                <Demo label="Input"><Input placeholder="Worlds, species, terms" className="w-[260px]" /></Demo>
                <Demo label="Recessed card, on the level-0 grid">
                    <Card variant="recessed" className="w-[240px]">
                        <p className="type-legend m-0">Recessed</p>
                        <p className="m-0 mt-2 text-body text-ink-2">The 32px layout grid.</p>
                    </Card>
                </Demo>
            </div>
        </Card>
    );
}

function Printed() {
    return (
        <Card variant="panel" className="mt-6">
            <p className="type-legend m-0 text-ink-2">Printed, not filled</p>
            <p className="m-0 mt-2 max-w-[68ch] text-body text-ink-2">
                Nothing on the site is a flat fill. A wash carries fine grain over a vignette that deepens
                its hue toward the edges, and the room itself wears the same grain with a vignette at the
                left and right edges of the page.
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-8 pb-2">
                <Demo label="Element wash: grain and vignette">
                    <div className="el-fire w-[168px]">
                        <XalianImage colored speciesName="Dromeus" primaryType="fire" moreClasses="w-full" />
                    </div>
                </Demo>
                <Demo label="Two types: the blend keeps the grain">
                    <div className="el-ice w-[168px]">
                        <XalianImage colored speciesName="Akinza" primaryType="ice" secondaryType="water" moreClasses="w-full" />
                    </div>
                </Demo>
                <Demo label="Room grain and edge vignette">
                    <p className="m-0 max-w-[26ch] text-body text-ink-2">
                        Under every chrome page. Look at the left and right edges of this page at full width.
                    </p>
                </Demo>
            </div>
        </Card>
    );
}

export const SECTIONS: { id: string; label: string; node: React.ReactNode }[] = [
    {
        id: 'thickness',
        label: 'Thickness',
        node: (
            <section id="thickness" className="mt-12">
                <SectionHead title="Thickness" />
                <p className="text-body text-ink-2">
                    Thickness means pressable (section 5.1, ratified 2026-09-11). Hover and press everything
                    here; the rule is only legible in motion.
                </p>
                <Pressable />
                <Flat />
                <Printed />
            </section>
        ),
    },
];
