import * as React from 'react';
import { Search, ZoomIn, ZoomOut } from 'lucide-react';

import XalianImage from '../../components/xalianImage';
import { SectionHead } from '@/components/system/masthead';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * Depth, round two (docs/design/v4-pressed-plate.html, 2026-09-10): the
 * pieces that shipped and, beside them, the pieces that were built for the
 * proposal and not carried into the system, rendered live on the room so
 * they can be judged on the real ground rather than a mockup. The "not
 * adopted" pieces are styled inline here on purpose: nothing in globals.css
 * or the components carries them, so deleting this section deletes them.
 */

// A darker step under a level-2 key: the mass a secondary key would carry.
const MASS_S2 = 'shadow-[0_3px_0_0_var(--color-glass)] hover:-translate-y-px hover:shadow-[0_4px_0_0_var(--color-glass)] active:translate-y-[3px] active:shadow-none';
const MASS_PLAGUE = 'shadow-[0_3px_0_0_color-mix(in_srgb,var(--color-plague)_55%,black)] hover:-translate-y-px active:translate-y-[3px] active:shadow-none';
const MASS_EL_XS = 'shadow-[0_2px_0_0_color-mix(in_srgb,var(--color-el)_50%,black)] hover:-translate-y-px active:translate-y-[2px] active:shadow-none';
const MASS_EL_DIAG = 'shadow-[4px_4px_0_0_color-mix(in_srgb,var(--color-el)_45%,black)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_color-mix(in_srgb,var(--color-el)_45%,black)] active:translate-x-1 active:translate-y-1 active:shadow-none';

function Demo({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col items-start gap-3 ${className}`}>
            {children}
            <span className="type-legend text-ink-3">{label}</span>
        </div>
    );
}

function Verdict({ kept, children }: { kept: boolean; children: React.ReactNode }) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <Badge variant={kept ? 'ok' : 'default'}>{kept ? 'Adopted' : 'Not adopted'}</Badge>
            <span className="text-body text-ink-2">{children}</span>
        </div>
    );
}

function SpeciesTile({ name, world, element, className = '', num }: { name: string; world: string; element: string; className?: string; num?: string }) {
    return (
        <Tile href="#" onClick={(e) => e.preventDefault()} className={`el-${element} w-[168px] ${className}`}>
            <TileArt className="relative">
                <XalianImage colored speciesName={name} primaryType={element} moreClasses="w-full" />
                {num ? <span className="type-data absolute right-2 top-1.5 text-[10.5px] text-black/60">{num}</span> : null}
            </TileArt>
            <TileMeta>
                <span className="type-subhead block text-base">{name}</span>
                <span className="type-data mt-1 block text-small text-ink-3">{world}</span>
            </TileMeta>
        </Tile>
    );
}

function AdoptedBlock() {
    return (
        <Card variant="panel" className="mt-6">
            <Verdict kept>Thickness means pressable, only where the face is colored enough for the mass to read. Textures instead of flat fills.</Verdict>
            <div className="flex flex-wrap items-start gap-8 pb-2">
                <Demo label="Primary key, 4px on viable-lo"><Button>Generate</Button></Demo>
                <Demo label="Element tile, its hue dimmed"><SpeciesTile name="Hypnopet" world="Telypso" element="psychic" /></Demo>
                <Demo label="Wash: grain and vignette">
                    <div className="el-fire w-[168px]"><XalianImage colored speciesName="Dromeus" primaryType="fire" moreClasses="w-full" /></div>
                </Demo>
                <Demo label="Level-0 grid (recessed card)">
                    <Card variant="recessed" className="w-[260px]"><p className="type-legend m-0">Recessed</p><p className="m-0 mt-2 text-body text-ink-2">The 32px layout grid on level 0.</p></Card>
                </Demo>
                <Demo label="Room grain and edge vignette">
                    <p className="m-0 max-w-[26ch] text-body text-ink-2">Under every chrome page; look at the left and right edges of this page at full width.</p>
                </Demo>
            </div>
        </Card>
    );
}

function NotAdoptedBlock() {
    return (
        <Card variant="panel" className="mt-6">
            <Verdict kept={false}>Built for the proposal, left out of the system. Judge them on the real ground: a darker step under a dark key mostly vanishes.</Verdict>
            <div className="flex flex-wrap items-start gap-8 pb-2">
                <Demo label="Secondary key with mass, 3px"><Button variant="secondary" className={MASS_S2}>Keep</Button></Demo>
                <Demo label="Destructive key with mass"><Button variant="destructive" className={MASS_PLAGUE}>Release</Button></Demo>
                <Demo label="Icon key with mass"><Button variant="secondary" size="icon" aria-label="Search" className={MASS_S2}><Search /></Button></Demo>
                <Demo label="Selected means pressed">
                    <ToggleGroup type="single" defaultValue="all" variant="outline" className="pb-[3px]">
                        {['all', 'fire', 'water', 'dark'].map((v) => (
                            <ToggleGroupItem key={v} value={v} className={`${MASS_S2} data-[state=on]:translate-y-[3px] data-[state=on]:shadow-none data-[state=on]:hover:translate-y-[3px]`}>{v}</ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </Demo>
                <Demo label="Filter chips with mass, 2px">
                    <div className="flex gap-2">
                        {[['fire', 'Fire'], ['water', 'Water'], ['psychic', 'Psychic']].map(([el, label]) => (
                            <button key={el} type="button" className={`el-${el} ${MASS_EL_XS}`}><Badge variant="chip">{label}</Badge></button>
                        ))}
                    </div>
                </Demo>
                <Demo label="Switch knob with mass">
                    <Switch defaultChecked className="[&>span]:shadow-[0_2px_0_0_rgba(0,0,0,0.45)]" />
                </Demo>
                <Demo label="Slot sinks (inset lip)">
                    <Input placeholder="Worlds, species, terms" className="w-[280px] bg-room shadow-[inset_0_3px_0_0_rgba(0,0,0,0.45)]" />
                </Demo>
                <Demo label="Record number on the plate"><SpeciesTile name="Yetimoth" world="Krystos" element="ice" num="SP-029" /></Demo>
                <Demo label="Diagonal mass"><SpeciesTile name="Hippochamp" world="Poseidas" element="water" className={`shadow-none ${MASS_EL_DIAG}`} /></Demo>
                <Demo label="Icon group with mass">
                    <div className="flex">
                        <Button variant="secondary" size="icon" aria-label="Zoom in" className={`${MASS_S2} -mr-px`}><ZoomIn /></Button>
                        <Button variant="secondary" size="icon" aria-label="Zoom out" className={MASS_S2}><ZoomOut /></Button>
                    </div>
                </Demo>
            </div>
        </Card>
    );
}

export const SECTIONS: { id: string; label: string; node: React.ReactNode }[] = [
    {
        id: 'depth-2',
        label: 'Depth, round two',
        node: (
            <section id="depth-2" className="mt-12">
                <SectionHead title="Depth, round two" />
                <p className="text-body text-ink-2">The pressed plate, 2026-09-10: what shipped, and what was built for the proposal and set aside. Hover and press everything.</p>
                <AdoptedBlock />
                <NotAdoptedBlock />
            </section>
        ),
    },
];
