import * as React from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

import speciesData from '@xalians/content/species.json';
import { themeColors } from '@/constants/designTokens';
import XalianImage from '../../components/xalianImage';

import { SectionHead } from '@/components/system/masthead';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from '@/components/ui/avatar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
    Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { Combobox } from '@/components/ui/combobox';
import {
    Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import {
    Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
    InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupText,
} from '@/components/ui/input-group';
import {
    FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldContent, FieldDescription, FieldError,
} from '@/components/ui/field';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';

/**
 * Style guide sections for the missing shadcn primitives (brief A). Wired
 * into styleGuidePage.tsx per docs/DESIGN_SYSTEM.md section 10 / the common
 * brief rule 8: this file owns only these ids and their content.
 */

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="type-legend mt-2">{children}</p>;
}

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            {children}
            <Caption>{label}</Caption>
        </div>
    );
}

const SPECIES_NAMES: { value: string; label: string }[] = (speciesData as { name: string }[])
    .map((s) => ({ value: s.name, label: s.name }));

const STAT_DATA = [
    { stat: 'Health', value: 78 },
    { stat: 'Std ATK', value: 62 },
    { stat: 'Spc ATK', value: 54 },
    { stat: 'Std DEF', value: 70 },
    { stat: 'Spc DEF', value: 58 },
    { stat: 'Speed', value: 45 },
    { stat: 'Evasion', value: 40 },
    { stat: 'Stamina', value: 66 },
];

const STAT_CHART_CONFIG: ChartConfig = {
    value: { label: 'Rating', color: 'var(--color-viable)' },
};

const ELEMENT_COUNTS = Object.entries(
    (speciesData as { type: string }[]).reduce<Record<string, number>>((acc, s) => {
        const key = s.type.toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {})
)
    .map(([element, count]) => ({ element, label: element.toUpperCase(), count }))
    .sort((a, b) => b.count - a.count);

const ELEMENT_CHART_CONFIG: ChartConfig = ELEMENT_COUNTS.reduce((acc, { element }) => {
    acc[element] = { label: element, color: `var(--color-el-${element})` };
    return acc;
}, {} as ChartConfig);

function AvatarSection() {
    return (
        <section id="avatar" className="mt-12">
            <SectionHead title="Avatar" />
            <p className="text-body text-ink-2">Account identity: a square level-2 plate with a hairline edge and initials in the legend face.</p>
            <div className="mt-6 flex flex-wrap items-end gap-8">
                <Demo label="sm, image">
                    <Avatar size="sm"><AvatarImage src="/xalians_dna_logo.svg" alt="" /><AvatarFallback>NJ</AvatarFallback></Avatar>
                </Demo>
                <Demo label="md, fallback">
                    <Avatar size="md"><AvatarFallback>NJ</AvatarFallback></Avatar>
                </Demo>
                <Demo label="lg, fallback">
                    <Avatar size="lg"><AvatarFallback>NJ</AvatarFallback></Avatar>
                </Demo>
                <Demo label="group">
                    <AvatarGroup>
                        <Avatar size="md"><AvatarFallback>NJ</AvatarFallback></Avatar>
                        <Avatar size="md"><AvatarFallback>KZ</AvatarFallback></Avatar>
                        <Avatar size="md"><AvatarFallback>+3</AvatarFallback></Avatar>
                    </AvatarGroup>
                </Demo>
            </div>
        </section>
    );
}

function CollapsibleSection() {
    return (
        <section id="collapsible" className="mt-12">
            <SectionHead title="Collapsible" />
            <p className="text-body text-ink-2">A disclosure row: full-width legend trigger, chevron rotates open, content indented on a hairline.</p>
            <div className="mt-6 max-w-md">
                <Collapsible defaultOpen>
                    <CollapsibleTrigger>Open by default</CollapsibleTrigger>
                    <CollapsibleContent>
                        <p className="font-body text-small text-ink-2">Kozrak runs arena tournaments; Xalians battle to win Scrambler Tokens to repopulate their homeworlds.</p>
                    </CollapsibleContent>
                </Collapsible>
                <Collapsible>
                    <CollapsibleTrigger>Closed at rest</CollapsibleTrigger>
                    <CollapsibleContent>
                        <p className="font-body text-small text-ink-2">Content revealed on open.</p>
                    </CollapsibleContent>
                </Collapsible>
            </div>
            <Caption>rest and open</Caption>
        </section>
    );
}

function HoverCardSection() {
    return (
        <section id="hover-card" className="mt-12">
            <SectionHead title="Hover card" />
            <p className="text-body text-ink-2">A floating preview, 320px, for a species or glossary term named in running text.</p>
            <div className="mt-6">
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <Button variant="link">Hypnopet</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                        <div className="flex items-start gap-3">
                            <div className="w-16 shrink-0 el-psychic">
                                <XalianImage colored speciesName="Hypnopet" primaryType="psychic" moreClasses="w-full" />
                            </div>
                            <div>
                                <p className="type-legend">Telypso &middot; Psychic</p>
                                <p className="mt-1 font-body text-small text-ink-2">A therapy creature bred to harmonize Telypso&apos;s psychically reactive dreamscape.</p>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
                <Caption>hover the name to open</Caption>
            </div>
        </section>
    );
}

function CommandSection() {
    const [open, setOpen] = React.useState(false);
    const [comboValue, setComboValue] = React.useState('');

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <section id="command" className="mt-12">
            <SectionHead title="Command" />
            <p className="text-body text-ink-2">The palette (opened by a button or the / key) and the combobox, a single-select search list built from the same parts.</p>
            <div className="mt-6 flex flex-wrap items-start gap-8">
                <Demo label="palette, press / or the button">
                    <Button variant="secondary" onClick={() => setOpen(true)}>
                        <Search /> Search<span className="ml-2 font-data text-tiny text-ink-3">/</span>
                    </Button>
                </Demo>
                <Demo label="combobox, choosing a species">
                    <Combobox
                        options={SPECIES_NAMES}
                        value={comboValue}
                        onValueChange={setComboValue}
                        placeholder="Choose a species…"
                        searchPlaceholder="Search species…"
                        emptyText="No species found."
                    />
                </Demo>
                <Demo label="inline list, empty state">
                    <Command className="w-72 border border-edge-strong">
                        <CommandInput placeholder="Search glossary…" />
                        <CommandList>
                            <CommandEmpty>No matching term.</CommandEmpty>
                            <CommandGroup heading="Elements">
                                <CommandItem>Fire <CommandShortcut>F</CommandShortcut></CommandItem>
                                <CommandItem>Water <CommandShortcut>W</CommandShortcut></CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </Demo>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search species and glossary terms">
                <CommandInput placeholder="Type a species or term…" />
                <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup heading="Species">
                        {SPECIES_NAMES.slice(0, 6).map((s) => (
                            <CommandItem key={s.value} onSelect={() => setOpen(false)}>{s.label}</CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </section>
    );
}

function DrawerSection() {
    return (
        <section id="drawer" className="mt-12">
            <SectionHead title="Drawer" />
            <p className="text-body text-ink-2">The phone bottom sheet. On desktop widths, <code className="font-data text-small">Sheet</code> is the choice instead; both are shown here.</p>
            <div className="mt-6 flex flex-wrap gap-8">
                <Demo label="Drawer (phone)">
                    <Drawer>
                        <DrawerTrigger asChild><Button variant="secondary">Open drawer</Button></DrawerTrigger>
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle>Filter results</DrawerTitle>
                                <DrawerDescription>Narrow the catalogue by element and world.</DrawerDescription>
                            </DrawerHeader>
                            <DrawerFooter>
                                <Button>Apply</Button>
                                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </Demo>
                <Demo label="Sheet (desktop)">
                    <Sheet>
                        <SheetTrigger asChild><Button variant="secondary">Open sheet</Button></SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Filter results</SheetTitle>
                                <SheetDescription>Narrow the catalogue by element and world.</SheetDescription>
                            </SheetHeader>
                            <SheetFooter>
                                <Button>Apply</Button>
                                <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </Demo>
            </div>
        </section>
    );
}

function AspectRatioSection() {
    return (
        <section id="aspect-ratio" className="mt-12">
            <SectionHead title="Aspect ratio" />
            <p className="text-body text-ink-2">A fixed-ratio box: 1:1 for a species plate, 16:9 for a world banner.</p>
            <div className="mt-6 grid max-w-xl grid-cols-2 gap-6">
                <Demo label="1:1, species plate">
                    <AspectRatio ratio={1} className="w-full el-fire bg-el/12">
                        <XalianImage colored speciesName="Dromeus" primaryType="fire" moreClasses="w-full" />
                    </AspectRatio>
                </Demo>
                <Demo label="16:9, world">
                    <AspectRatio ratio={16 / 9} className="w-full el-water bg-el overflow-hidden">
                        <div className="flex size-full items-center justify-center">
                            <XalianImage colored speciesName="Hippochamp" primaryType="water" moreClasses="h-full w-auto shrink-0" />
                        </div>
                    </AspectRatio>
                </Demo>
            </div>
        </section>
    );
}

function InputGroupSection() {
    return (
        <section id="input-group" className="mt-12">
            <SectionHead title="Input group" />
            <p className="text-body text-ink-2">An input with a leading icon and a trailing addon or clear key; the group carries the focus ring, not the field.</p>
            <div className="mt-6 flex flex-wrap gap-6">
                <Demo label="rest, leading icon">
                    <InputGroup className="w-64">
                        <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
                        <InputGroupInput placeholder="Search the encyclopedia" />
                    </InputGroup>
                </Demo>
                <Demo label="trailing clear key">
                    <InputGroup className="w-64">
                        <InputGroupInput defaultValue="Hypnopet" />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton size="icon-xs" aria-label="Clear"><X /></InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Demo>
                <Demo label="text addon, disabled">
                    <InputGroup className="w-64 opacity-40">
                        <InputGroupInput defaultValue="0" disabled />
                        <InputGroupAddon align="inline-end"><InputGroupText>cm</InputGroupText></InputGroupAddon>
                    </InputGroup>
                </Demo>
            </div>
        </section>
    );
}

function FieldSetSection() {
    return (
        <section id="field-set" className="mt-12">
            <SectionHead title="Field set" />
            <p className="text-body text-ink-2">Form layout without react-hook-form: a fieldset, a legend, fields stacked on the 4px scale, description and error messages.</p>
            <div className="mt-6 max-w-md">
                <FieldSet>
                    <FieldLegend>Trainer profile</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="fs-name">Display name</FieldLabel>
                            <FieldContent>
                                <Input id="fs-name" placeholder="Nick" />
                                <FieldDescription>Shown on the leaderboard and match results.</FieldDescription>
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="fs-email">Contact email</FieldLabel>
                            <FieldContent>
                                <Input id="fs-email" defaultValue="not an email" aria-invalid />
                                <FieldError>Enter a valid email address.</FieldError>
                            </FieldContent>
                        </Field>
                    </FieldGroup>
                </FieldSet>
            </div>
        </section>
    );
}

function ButtonGroupSection() {
    return (
        <section id="button-group" className="mt-12">
            <SectionHead title="Button group" />
            <p className="text-body text-ink-2">Adjacent secondary buttons sharing borders, for a tight set of related actions like map zoom.</p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
                <Demo label="rest">
                    <ButtonGroup>
                        <Button variant="secondary" size="icon" aria-label="Zoom in"><ZoomIn /></Button>
                        <ButtonGroupSeparator />
                        <Button variant="secondary" size="icon" aria-label="Zoom out"><ZoomOut /></Button>
                        <ButtonGroupSeparator />
                        <Button variant="secondary" size="icon" aria-label="Fit to screen"><Maximize2 /></Button>
                    </ButtonGroup>
                </Demo>
                <Demo label="disabled">
                    <ButtonGroup className="opacity-40">
                        <Button variant="secondary" size="icon" disabled aria-label="Zoom in"><ZoomIn /></Button>
                        <ButtonGroupSeparator />
                        <Button variant="secondary" size="icon" disabled aria-label="Zoom out"><ZoomOut /></Button>
                    </ButtonGroup>
                </Demo>
            </div>
        </section>
    );
}

function ChartSection() {
    return (
        <section id="chart" className="mt-12">
            <SectionHead title="Chart" />
            <p className="text-body text-ink-2">The recharts wrapper, themed from the tokens: a radar of the eight stats, and a bar of the fourteen element counts inside their own element scopes.</p>
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <Card variant="panel">
                    <p className="type-legend mb-2">Stat radar</p>
                    <ChartContainer config={STAT_CHART_CONFIG} className="mx-auto aspect-square w-full max-h-72">
                        <RadarChart data={STAT_DATA}>
                            <PolarGrid stroke="var(--color-edge)" />
                            <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--color-ink-2)', fontFamily: 'var(--font-data)', fontSize: 11 }} />
                            <PolarRadiusAxis tick={false} axisLine={false} />
                            <Radar dataKey="value" stroke="var(--color-viable)" fill="var(--color-viable)" fillOpacity={0.28} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                    </ChartContainer>
                </Card>
                <Card variant="panel">
                    <p className="type-legend mb-2">Species by element</p>
                    <ChartContainer config={ELEMENT_CHART_CONFIG} className="aspect-auto h-96 w-full">
                        <BarChart data={ELEMENT_COUNTS} layout="vertical" margin={{ left: 8 }}>
                            <CartesianGrid horizontal={false} stroke="var(--color-edge)" />
                            <XAxis type="number" tick={{ fill: 'var(--color-ink-2)', fontFamily: 'var(--font-data)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-edge)' }} tickLine={false} />
                            <YAxis type="category" dataKey="label" width={70} tick={{ fill: 'var(--color-ink-2)', fontFamily: 'var(--font-legend)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" radius={0}>
                                {ELEMENT_COUNTS.map((entry) => (
                                    <Cell key={entry.element} fill={themeColors[entry.element as keyof typeof themeColors]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </Card>
            </div>
            <p className="mt-4 font-body text-small text-ink-3">
                Recharts <code className="font-data">fill</code> on an SVG <code className="font-data">&lt;Cell&gt;</code> cannot read a CSS custom property at paint time in every browser tested, so the per-element bar colors come from <code className="font-data">@/constants/designTokens</code>&apos;s <code className="font-data">themeColors</code> (the JS mirror of the <code className="font-data">--color-el-*</code> tokens) rather than <code className="font-data">var(--color-el)</code>. Stroke and grid colors, which recharts applies as inline style attributes, do read the CSS variables directly.
            </p>
        </section>
    );
}

function NativeSelectSection() {
    return (
        <section id="native-select" className="mt-12">
            <SectionHead title="Native select" />
            <p className="text-body text-ink-2">A plain select styled like the text input, for the phone layout where the Radix select is heavier than needed.</p>
            <div className="mt-6 flex flex-wrap items-end gap-6">
                <Demo label="rest">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ns-world" className="type-legend">World</Label>
                        <NativeSelect id="ns-world" defaultValue="magmuth">
                            <NativeSelectOption value="magmuth">Magmuth</NativeSelectOption>
                            <NativeSelectOption value="poseidas">Poseidas</NativeSelectOption>
                            <NativeSelectOption value="zolton">Zolton</NativeSelectOption>
                        </NativeSelect>
                    </div>
                </Demo>
                <Demo label="disabled">
                    <NativeSelect disabled defaultValue="magmuth">
                        <NativeSelectOption value="magmuth">Magmuth</NativeSelectOption>
                    </NativeSelect>
                </Demo>
            </div>
        </section>
    );
}

export const SECTIONS: { id: string; label: string; node: React.ReactNode }[] = [
    { id: 'avatar', label: 'Avatar', node: <AvatarSection /> },
    { id: 'collapsible', label: 'Collapsible', node: <CollapsibleSection /> },
    { id: 'hover-card', label: 'Hover card', node: <HoverCardSection /> },
    { id: 'command', label: 'Command', node: <CommandSection /> },
    { id: 'drawer', label: 'Drawer', node: <DrawerSection /> },
    { id: 'aspect-ratio', label: 'Aspect ratio', node: <AspectRatioSection /> },
    { id: 'input-group', label: 'Input group', node: <InputGroupSection /> },
    { id: 'field-set', label: 'Field set', node: <FieldSetSection /> },
    { id: 'button-group', label: 'Button group', node: <ButtonGroupSection /> },
    { id: 'chart', label: 'Chart', node: <ChartSection /> },
    { id: 'native-select', label: 'Native select', node: <NativeSelectSection /> },
];

export default SECTIONS;
