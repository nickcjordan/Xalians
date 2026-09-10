import * as React from 'react';
import { toast } from 'sonner';
import {
    Sparkles, Flame, Droplet, Leaf, Ghost, Zap, Moon, Shield, Snowflake,
    Info,
} from 'lucide-react';

import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';

import { Shell, Masthead, SectionHead } from '@/components/system/masthead';
import { SpecPlate, RecordRow, Meter, MoveSet, EmptyState } from '@/components/system/record';
import { HelixMark, HelixSpinner, BrandLockup } from '@/components/system/brand';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bold, Italic } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent, tabTriggerClass } from '@/components/ui/tabs';
import {
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
    Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
    Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext,
} from '@/components/ui/pagination';
import {
    Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Kbd } from '@/components/ui/kbd';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
// Brief B ("patterns") sections, built from @/components/system/layout, @/components/system/status,
// @/components/system/a11y, @/components/system/stepper, @/components/system/readouts,
// @/components/system/filters, @/components/system/data-table, @/components/system/identity.
import { SECTIONS as PATTERN_SECTIONS } from './styleguide/patternSections';

/**
 * The design system reference, version 4 on the new stack
 * (docs/DESIGN_SYSTEM.md sections 3-8, docs/design/frontend-stack-migration.md).
 * Rendered from the real shadcn components and system components, so it
 * cannot drift from what the site actually ships. If something here looks
 * wrong, the system is wrong.
 */

const SECTIONS: { id: string; label: string }[] = [
    { id: 'brand', label: 'Brand' },
    { id: 'color', label: 'Color' },
    { id: 'type', label: 'Type' },
    { id: 'depth', label: 'Depth and corners' },
    { id: 'controls', label: 'Controls' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'forms', label: 'Forms' },
    { id: 'chips-badges', label: 'Chips and badges' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'loading', label: 'Loading' },
    { id: 'empty', label: 'Empty state' },
    { id: 'toasts', label: 'Toasts' },
    { id: 'record', label: 'Record' },
    { id: 'move-set', label: 'Move set' },
    { id: 'cards', label: 'Cards' },
    { id: 'overlays', label: 'Overlays' },
    { id: 'data', label: 'Data' },
    { id: 'icons', label: 'Icons' },
    ...PATTERN_SECTIONS.map(({ id, label }) => ({ id, label })),
];

const ELEMENTS = [
    'electric', 'air', 'fire', 'water', 'ice', 'plant', 'rock', 'light',
    'dark', 'metal', 'sand', 'chemical', 'psychic', 'ghost',
];

const BUTTON_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;

const MOVES = [
    { name: 'Glacial Slash', rating: 12, description: 'A cutting strike drawn from the coolant lines, biting deep into anything warm-blooded.' },
    { name: 'Corrosive Impact', rating: 7, description: 'A slower blow that leaves a chemical residue eating at the wound after contact.' },
    { name: 'Mighty Pinch', rating: 8, description: 'A basic close-quarters grip attack, no element behind it.' },
];

const SPECIES_ROWS = [
    { name: 'Hypnopet', world: 'Telypso', element: 'psychic', height: '93 in / 236 cm' },
    { name: 'Dromeus', world: 'Magmuth', element: 'fire', height: '104 in / 264 cm' },
    { name: 'Hippochamp', world: 'Poseidas', element: 'water', height: '78 in / 198 cm' },
    { name: 'Yetimoth', world: 'Krystos', element: 'ice', height: '112 in / 284 cm' },
];

const ICON_SIZE_GROUPS: { cls: string; label: string; icons: [React.ComponentType<{ className?: string }>, React.ComponentType<{ className?: string }>] }[] = [
    { cls: 'size-3.5', label: 'size-3.5 · 14', icons: [Flame, Droplet] },
    { cls: 'size-4', label: 'size-4 · 16', icons: [Leaf, Ghost] },
    { cls: 'size-5', label: 'size-5 · 20', icons: [Zap, Moon] },
    { cls: 'size-6', label: 'size-6 · 24', icons: [Shield, Snowflake] },
];

function Swatch({ label, className, style, labelClassName }: { label: string; className: string; style?: React.CSSProperties; labelClassName: string }) {
    return (
        <div className={`flex h-20 items-end p-2 ${className}`} style={style}>
            <span className={`type-legend ${labelClassName}`}>{label}</span>
        </div>
    );
}

const sampleSchema = z.object({
    name: z.string().min(2, 'Names need at least two letters.').regex(/^[A-Za-z]+$/, 'Names use letters only. Remove spaces and punctuation.'),
    world: z.string().min(1, 'Choose a home world.'),
});

function SampleForm() {
    const form = useForm<z.infer<typeof sampleSchema>>({
        resolver: zodResolver(sampleSchema),
        defaultValues: { name: 'hypno pet!', world: '' },
        mode: 'onTouched',
    });
    React.useEffect(() => { form.trigger(); }, [form]);
    return (
        <Form {...form}>
            <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(() => toast.success('Kept.'))}>
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormDescription>What this Xalian is called in your collection.</FormDescription>
                        <FormMessage className="text-small text-plague-outline-ink" />
                    </FormItem>
                )} />
                <FormField control={form.control} name="world" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Home world</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Choose a world" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="telypso">Telypso</SelectItem>
                                <SelectItem value="magmuth">Magmuth</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage className="text-small text-plague-outline-ink" />
                    </FormItem>
                )} />
                <div className="flex gap-3">
                    <Button type="submit">Keep</Button>
                    <Button type="button" variant="secondary" onClick={() => form.reset()}>Reset</Button>
                </div>
            </form>
        </Form>
    );
}

function StyleGuidePage() {
    return (
        <main className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
            <XalianNavbar />

            <Shell>
                <Masthead
                    kicker="Design system"
                    title="Version 4"
                    subtitle="Every token and component, rendered from the real components."
                />

                <nav className="flex flex-wrap gap-2" aria-label="Style guide sections">
                    {SECTIONS.map((s) => (
                        <a key={s.id} href={`#${s.id}`} className={tabTriggerClass}>{s.label}</a>
                    ))}
                </nav>

                {/* ---- brand ---- */}
                <section id="brand" className="mt-12">
                    <SectionHead title="Brand" />
                    <p className="text-body text-ink-2">The mark, the lockup in its two sizes, and the mark alone.</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <Card variant="panel" className="items-start">
                            <span className="type-legend">Lockup</span>
                            <BrandLockup />
                        </Card>
                        <Card variant="panel" className="items-start">
                            <span className="type-legend">Lockup, big</span>
                            <BrandLockup big />
                        </Card>
                        <Card variant="panel" className="items-start">
                            <span className="type-legend">The mark alone</span>
                            <HelixMark className="h-16" title="Xalians" />
                        </Card>
                    </div>
                </section>

                {/* ---- color ---- */}
                <section id="color" className="mt-12">
                    <SectionHead title="Color" />
                    <p className="text-body text-ink-2">The accent&apos;s three tiers, the four status colors, and the fourteen element hues.</p>

                    <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden border border-edge">
                        <Swatch label="viable-hi" className="bg-viable-hi" labelClassName="text-viable-ink" />
                        <Swatch label="viable" className="bg-viable" labelClassName="text-viable-ink" />
                        <Swatch label="viable-lo" className="bg-viable-lo" labelClassName="text-viable-ink" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-edge sm:grid-cols-4">
                        <Swatch label="ok" className="bg-viable" labelClassName="text-viable-ink" />
                        <Swatch label="warn" className="bg-caution" labelClassName="text-viable-ink" />
                        <Swatch label="danger" className="bg-plague" labelClassName="text-viable-ink" />
                        <Swatch label="info" className="bg-neutral" labelClassName="text-viable-ink" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-edge sm:grid-cols-7">
                        {ELEMENTS.map((el) => (
                            <div key={el} className={`el-${el} flex h-20 items-end bg-el p-2`}>
                                <span className="type-legend text-black/80">{el}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---- type ---- */}
                <section id="type" className="mt-12">
                    <SectionHead title="Type" />
                    <p className="text-body text-ink-2">The three faces, chosen by role: legend and heading, body, and data.</p>
                    <Card variant="panel" className="mt-6 items-start gap-3">
                        <p className="type-display m-0">Creatures grown for dying worlds</p>
                        <p className="type-title m-0">Hypnopet</p>
                        <p className="type-heading m-0">The Age of Unbirth</p>
                        <p className="type-subhead m-0">Stats, current and potential</p>
                        <p className="type-legend m-0">Species on file</p>
                        <p className="m-0 font-body text-lead text-ink">Xalians are bioengineered creatures the Vallerii Generators grow to survive the worst planets in the galaxy.</p>
                        <p className="m-0 font-body text-body text-ink-2">Created by the Telypso Generator as a therapy animal for the insane Vallerii imprisoned on that world.</p>
                        <p className="m-0 font-body text-small text-ink-3">Sign in to pick from your Xalians.</p>
                        <p className="type-data m-0 text-small text-ink">93 in / 236 cm &nbsp; 830 lbs / 376 kg &nbsp; #00015</p>
                        <p className="type-data m-0 text-heading text-ink">1,204</p>
                    </Card>
                </section>

                {/* ---- depth and corners ---- */}
                <section id="depth" className="mt-12">
                    <SectionHead title="Depth and corners" />
                    <p className="text-body text-ink-2">Surfaces step up in tone; the chamfer is reserved for the glass tier and the one primary key, nothing else is cut.</p>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <div className="flex h-24 items-center justify-center border border-edge bg-s0"><span className="type-legend">s0</span></div>
                        <div className="flex h-24 items-center justify-center bg-s1"><span className="type-legend">s1</span></div>
                        <div className="flex h-24 items-center justify-center bg-s2"><span className="type-legend">s2</span></div>
                        <Card variant="glass" className="flex h-24 items-center justify-center p-0"><span className="type-legend">glass</span></Card>
                        <div className="flex h-24 items-center justify-center bg-s2 shadow-float"><span className="type-legend">floating</span></div>
                    </div>
                </section>

                {/* ---- controls ---- */}
                <section id="controls" className="mt-12">
                    <SectionHead title="Controls" />
                    <p className="text-body text-ink-2">Every button variant, each at rest, disabled, and with an icon; then the size scale.</p>
                    <Card variant="panel" className="mt-6 items-stretch gap-0">
                        {BUTTON_VARIANTS.map((variant) => (
                            <div key={variant} className="flex flex-wrap items-center gap-3 border-b border-edge py-4 first:pt-0 last:border-b-0 last:pb-0">
                                <span className="type-legend w-24 shrink-0">{variant}</span>
                                <Button variant={variant}>Generate</Button>
                                <Button variant={variant} disabled>Disabled</Button>
                                <Button variant={variant}><Sparkles /> Generate</Button>
                            </div>
                        ))}
                    </Card>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button size="xs">XS</Button>
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                        <Button size="icon" aria-label="Icon size"><Sparkles /></Button>
                    </div>
                </section>

                {/* ---- inputs ---- */}
                <section id="inputs" className="mt-12">
                    <SectionHead title="Inputs" />
                    <p className="text-body text-ink-2">Rest, filled, error and disabled, plus the select, checkbox, radio, switch, slider and toggle group.</p>
                    <Card variant="panel" className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="flex flex-col gap-3">
                            <Input placeholder="Search worlds, species, terms" />
                            <Input defaultValue="Hypnopet" />
                            <div>
                                <Input aria-invalid defaultValue="hypno pet!" />
                                <p className="mt-1 text-small text-plague-outline-ink">Names use letters only. Remove the space and the exclamation mark.</p>
                            </div>
                            <Input defaultValue="Hypnopet" disabled />
                            <Textarea placeholder="Describe this Xalian&apos;s temperament..." />
                        </div>
                        <div className="flex flex-col gap-4">
                            <Select defaultValue="telypso">
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="telypso">Telypso</SelectItem>
                                    <SelectItem value="magmuth">Magmuth</SelectItem>
                                    <SelectItem value="grimedes">Grimedes</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <Checkbox id="sg-keep" defaultChecked />
                                <Label htmlFor="sg-keep">Keep this Xalian</Label>
                            </div>
                            <RadioGroup defaultValue="bot" className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="bot" id="sg-bot" />
                                    <Label htmlFor="sg-bot">Bot</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="second" id="sg-second" />
                                    <Label htmlFor="sg-second">Second player</Label>
                                </div>
                            </RadioGroup>
                            <div className="flex items-center gap-2">
                                <Switch id="sg-randomize" defaultChecked />
                                <Label htmlFor="sg-randomize">Randomize positions</Label>
                            </div>
                            <Slider defaultValue={[60]} />
                            <ToggleGroup type="single" defaultValue="4" variant="outline">
                                <ToggleGroupItem value="2">2</ToggleGroupItem>
                                <ToggleGroupItem value="3">3</ToggleGroupItem>
                                <ToggleGroupItem value="4">4</ToggleGroupItem>
                                <ToggleGroupItem value="5">5</ToggleGroupItem>
                                <ToggleGroupItem value="6">6</ToggleGroupItem>
                            </ToggleGroup>
                            <div className="flex items-center gap-2">
                                <Toggle aria-label="Bold" defaultPressed><Bold /></Toggle>
                                <Toggle aria-label="Italic"><Italic /></Toggle>
                                <Toggle aria-label="Disabled" disabled><Bold /></Toggle>
                                <span className="type-legend">Toggle: pressed, rest, disabled</span>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* ---- forms ---- */}
                <section id="forms" className="mt-12">
                    <SectionHead title="Forms" />
                    <p className="text-body text-ink-2">A form is react-hook-form with a zod schema inside the Form parts: label, control, description, message. Submit is the one primary key; errors say what is wrong and how to fix it. Long content scrolls inside a ScrollArea, never the dialog.</p>
                    <Card variant="panel" className="mt-6 grid gap-6 md:grid-cols-2">
                        <SampleForm />
                        <ScrollArea className="h-56 border border-edge bg-s0 p-4">
                            <p className="type-legend">Scroll area</p>
                            {Array.from({ length: 12 }, (_, i) => (
                                <p key={i} className="mt-3 text-body text-ink-2">Entry {i + 1}. The Vallerii built Xalian Generators to bioengineer life adapted to each planet's extreme environment.</p>
                            ))}
                        </ScrollArea>
                    </Card>
                </section>

                {/* ---- chips and badges ---- */}
                <section id="chips-badges" className="mt-12">
                    <SectionHead title="Chips are content, badges are state" />
                    <p className="text-body text-ink-2">A chip carries an element hue and names an element. A badge carries a status color and names a state.</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <span className="el-psychic"><Badge variant="chip">Psychic</Badge></span>
                        <span className="el-dark"><Badge variant="chip">Dark</Badge></span>
                        <span className="el-fire"><Badge variant="chip">Fire</Badge></span>
                        <span className="el-fire"><Badge variant="chip-outline">Fire</Badge></span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <Badge>Not set</Badge>
                        <Badge variant="ok">Kept</Badge>
                        <Badge variant="warn">Expiring</Badge>
                        <Badge variant="danger">Unclaimed</Badge>
                        <Badge variant="info">Not set</Badge>
                    </div>
                </section>

                {/* ---- tabs ---- */}
                <section id="tabs" className="mt-12">
                    <SectionHead title="Tabs" />
                    <p className="text-body text-ink-2">A Radix Tabs set, default variant, with the underline marking the active trigger.</p>
                    <Tabs defaultValue="bestiary" className="mt-6">
                        <TabsList>
                            <TabsTrigger value="reading">Reading room</TabsTrigger>
                            <TabsTrigger value="worlds">Worlds</TabsTrigger>
                            <TabsTrigger value="bestiary">Bestiary</TabsTrigger>
                            <TabsTrigger value="index">Index</TabsTrigger>
                        </TabsList>
                        <TabsContent value="reading" className="text-body text-ink-2">The Story: the Age of Unbirth, the APEX Accords, and the End Wars, told as a spine you can read start to finish.</TabsContent>
                        <TabsContent value="worlds" className="text-body text-ink-2">Fourteen planets, one per element, each with a full written history and its own catalogue of native Xalians.</TabsContent>
                        <TabsContent value="bestiary" className="text-body text-ink-2">Twenty-nine species on file, each with its home world, its element, and its measurements.</TabsContent>
                        <TabsContent value="index" className="text-body text-ink-2">The glossary: sixty-three terms, from Algael to Zolto, cross-linked back into the story and the worlds.</TabsContent>
                    </Tabs>
                </section>

                {/* ---- loading ---- */}
                <section id="loading" className="mt-12">
                    <SectionHead title="Loading" />
                    <p className="text-body text-ink-2">The helix reads its rungs while the page waits. No skeletons anywhere on the site.</p>
                    <div className="mt-6 flex items-end gap-8">
                        <HelixSpinner size="sm" />
                        <HelixSpinner size="md" />
                        <HelixSpinner size="lg" />
                    </div>
                </section>

                {/* ---- empty state ---- */}
                <section id="empty" className="mt-12">
                    <SectionHead title="Empty state" />
                    <p className="text-body text-ink-2">A solid hairline box on level 0 with a legend line and one sentence that says what to do.</p>
                    <EmptyState legend="No Xalians yet" className="mt-6">
                        Generate one and keep it to see it here.
                    </EmptyState>
                </section>

                {/* ---- toasts ---- */}
                <section id="toasts" className="mt-12">
                    <SectionHead title="Toasts" />
                    <p className="text-body text-ink-2">Level two, a strong edge, a status dot, and one sentence, plus the inline alert for on-page notices.</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => toast.success('Hypnopet kept to your account.')}>Trigger success toast</Button>
                        <Button variant="secondary" onClick={() => toast.error('Could not reach the registry. Your Xalian is still on this page.')}>Trigger error toast</Button>
                    </div>
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Could not reach the registry</AlertTitle>
                        <AlertDescription>Your Xalian is still on this page. Try keeping it again in a moment.</AlertDescription>
                    </Alert>
                </section>

                {/* ---- record ---- */}
                <section id="record" className="mt-12">
                    <SectionHead title="Record" />
                    <p className="text-body text-ink-2">The spec plate, record rows on hairlines, and the stat meter, keyed to the element in scope.</p>
                    <Card variant="panel" className="el-psychic mt-6 gap-6">
                        <SpecPlate
                            entries={[
                                { key: 'Designation', value: 'Hypnopet' },
                                { key: 'Origin', value: 'Telypso' },
                                { key: 'Height', value: '93 in / 236 cm' },
                                { key: 'Mass', value: '830 lbs / 376 kg' },
                            ]}
                        />
                        <SpecPlate
                            columns={2}
                            entries={[
                                { key: 'Designation', value: 'Hypnopet' },
                                { key: 'Origin', value: 'Telypso' },
                                { key: 'Height', value: '93 in / 236 cm' },
                                { key: 'Mass', value: '830 lbs / 376 kg' },
                                { key: 'Primary type', value: 'Psychic' },
                                { key: 'Secondary type', value: 'None' },
                                { key: 'Record', value: '#00015' },
                                { key: 'Generator version', value: '4.2' },
                            ]}
                        />
                        <div>
                            <RecordRow term="Telypso">Possibly the oldest world in Xalia, where reality answers to thought.</RecordRow>
                            <RecordRow term="APEX">The automated protocol that turned on the Vallerii who built it.</RecordRow>
                            <RecordRow term="Scrambler Token">A chip carrying one randomly generated, plague-immune genome.</RecordRow>
                        </div>
                        <div>
                            <Meter name="Std attack" value={741} />
                            <Meter name="Speed" value={651} />
                            <Meter name="Stamina" value={582} />
                        </div>
                    </Card>
                </section>

                {/* ---- move set ---- */}
                <section id="move-set" className="mt-12">
                    <SectionHead title="Move set" />
                    <p className="text-body text-ink-2">A rated list: the rating in the data face, the name in legend, the description as prose.</p>
                    <Card variant="panel" className="mt-6">
                        <MoveSet moves={MOVES} />
                    </Card>
                </section>

                {/* ---- cards ---- */}
                <section id="cards" className="mt-12">
                    <SectionHead title="Cards" />
                    <p className="text-body text-ink-2">Two bestiary tiles and one home-style species plate, both plain links keyed to their element.</p>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Card variant="link" className="el-psychic overflow-hidden p-0">
                            <div className="h-[3px] bg-el" />
                            <div className="bg-el aspect-square p-[4%]">
                                <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" moreClasses="w-full" />
                            </div>
                            <div className="flex flex-col gap-1 p-3">
                                <span className="type-subhead">Hypnopet</span>
                                <span className="type-data text-small text-ink-3">Telypso</span>
                            </div>
                        </Card>
                        <Card variant="link" className="el-fire overflow-hidden p-0">
                            <div className="h-[3px] bg-el" />
                            <div className="bg-el aspect-square p-[4%]">
                                <XalianImage colored speciesName="Dromeus" primaryType="Fire" moreClasses="w-full" />
                            </div>
                            <div className="flex flex-col gap-1 p-3">
                                <span className="type-subhead">Dromeus</span>
                                <span className="type-data text-small text-ink-3">Magmuth</span>
                            </div>
                        </Card>
                        <a href="#" className="el-water flex flex-col items-center gap-2" onClick={(e) => e.preventDefault()}>
                            <div className="bg-el aspect-square w-full p-[4%]">
                                <XalianImage colored speciesName="Hippochamp" primaryType="Water" moreClasses="w-full" />
                            </div>
                            <span className="type-legend text-center text-ink">Hippochamp</span>
                        </a>
                    </div>
                </section>

                {/* ---- overlays ---- */}
                <section id="overlays" className="mt-12">
                    <SectionHead title="Overlays" />
                    <p className="text-body text-ink-2">Modal, confirm, drawer, menu, popover, tooltip and fold, all Radix primitives restyled to the contract.</p>
                    <div className="mt-6 flex flex-wrap items-start gap-4">
                        <Dialog>
                            <DialogTrigger asChild><Button variant="secondary">Open dialog</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Keep Hypnopet?</DialogTitle>
                                    <DialogDescription>This adds it to your account. You can release it later from your Xalians page.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                                    <Button>Keep it</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive">Release Hypnopet</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Release Hypnopet?</AlertDialogTitle>
                                    <AlertDialogDescription>It leaves your account for good. This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive">Release</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Sheet>
                            <SheetTrigger asChild><Button variant="secondary">Open sheet</Button></SheetTrigger>
                            <SheetContent side="right">
                                <SheetHeader>
                                    <SheetTitle>Squad</SheetTitle>
                                    <SheetDescription>The Xalians carrying your flag this match.</SheetDescription>
                                </SheetHeader>
                                <SheetFooter>
                                    <SheetClose asChild><Button variant="secondary">Close</Button></SheetClose>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="secondary">Actions</Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>View record</DropdownMenuItem>
                                <DropdownMenuItem>Rename</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive">Release</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Popover>
                            <PopoverTrigger asChild><Button variant="secondary">Show origin</Button></PopoverTrigger>
                            <PopoverContent>
                                <p className="text-small text-ink-2">Telypso is possibly the oldest world in Xalia, at the galactic center, where reality answers to thought.</p>
                            </PopoverContent>
                        </Popover>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Species info"><Info /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Species record and lineage</TooltipContent>
                        </Tooltip>
                    </div>

                    <Accordion type="single" collapsible className="mt-6 max-w-2xl">
                        <AccordionItem value="a1">
                            <AccordionTrigger>What is a Scrambler Token?</AccordionTrigger>
                            <AccordionContent>A chip printed by the Mercurius Machine, carrying one randomly generated, encrypted, plague-immune Xalian genome.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="a2">
                            <AccordionTrigger>Why does Kozrak run tournaments?</AccordionTrigger>
                            <AccordionContent>Xalians battle to win Scrambler Tokens, which their handlers use to repopulate their homeworlds with plague-immune creatures.</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </section>

                {/* ---- data ---- */}
                <section id="data" className="mt-12">
                    <SectionHead title="Data" />
                    <p className="text-body text-ink-2">Table, pagination, breadcrumb, progress, separator and keyboard hints, all reading the data face.</p>

                    <Table className="mt-6">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Species</TableHead>
                                <TableHead>World</TableHead>
                                <TableHead>Element</TableHead>
                                <TableHead>Height</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {SPECIES_ROWS.map((row) => (
                                <TableRow key={row.name}>
                                    <TableCell className="font-body">{row.name}</TableCell>
                                    <TableCell className="font-body">{row.world}</TableCell>
                                    <TableCell>
                                        <span className={`el-${row.element}`}><Badge variant="chip">{row.element}</Badge></span>
                                    </TableCell>
                                    <TableCell className="type-data">{row.height}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Pagination className="mt-6 justify-start">
                        <PaginationContent>
                            <PaginationItem><PaginationPrevious href="#" onClick={(e) => e.preventDefault()} /></PaginationItem>
                            <PaginationItem><PaginationLink href="#" onClick={(e) => e.preventDefault()}>1</PaginationLink></PaginationItem>
                            <PaginationItem><PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>2</PaginationLink></PaginationItem>
                            <PaginationItem><PaginationLink href="#" onClick={(e) => e.preventDefault()}>3</PaginationLink></PaginationItem>
                            <PaginationItem><PaginationNext href="#" onClick={(e) => e.preventDefault()} /></PaginationItem>
                        </PaginationContent>
                    </Pagination>

                    <Breadcrumb className="mt-6">
                        <BreadcrumbList>
                            <BreadcrumbItem><BreadcrumbLink href="/encyclopedia">Encyclopedia</BreadcrumbLink></BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem><BreadcrumbLink href="/encyclopedia#bestiary">Bestiary</BreadcrumbLink></BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem><BreadcrumbPage>Hypnopet</BreadcrumbPage></BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="mt-6 max-w-sm">
                        <Progress value={62} />
                    </div>

                    <Separator className="my-6" />

                    <div className="flex items-center gap-3">
                        <span className="text-small text-ink-2">Search the encyclopedia</span>
                        <Kbd>/</Kbd>
                        <span className="text-small text-ink-2">Close a modal</span>
                        <Kbd>Esc</Kbd>
                    </div>
                </section>

                {/* ---- icons ---- */}
                <section id="icons" className="mt-12">
                    <SectionHead title="Icons" />
                    <p className="text-body text-ink-2">Lucide only, at the four sizes the site uses.</p>
                    <div className="mt-6 flex flex-wrap items-end gap-8">
                        {ICON_SIZE_GROUPS.map(({ cls, label, icons: [IconA, IconB] }) => (
                            <div key={cls} className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-3 text-ink">
                                    <IconA className={cls} />
                                    <IconB className={cls} />
                                </div>
                                <span className="type-legend">{label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {PATTERN_SECTIONS.map((s) => (
                    <section key={s.id} id={s.id} className="mt-12">{s.node}</section>
                ))}

            </Shell>
        </main>
    );
}

export default StyleGuidePage;
