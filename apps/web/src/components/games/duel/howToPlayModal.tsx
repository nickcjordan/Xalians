// Tier: chrome. The duel board itself, entered from here, keeps its own v3 design (phase 3).
import * as React from 'react';
import { Flag, Grid3x3, Hourglass, Move, Zap, BatteryMedium, FlagOff, Eye } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import * as duelConstants from '@xalians/rules/duel/duelGameConstants';

// The rules text is derived from constants rather than hardcoded so it cannot
// drift away from the actual game as tunables change.
const MAX_HIT_PERCENT = Math.round(duelConstants.MAX_SINGLE_HIT_HEALTH_FRACTION * 100);
const MAX_EVASION_PERCENT = Math.round(duelConstants.MAX_EVASION_DAMAGE_REDUCTION * 100);

type Section = {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    lines: string[];
};

const SECTIONS: Section[] = [
    {
        title: 'The goal',
        icon: Flag,
        lines: [
            'Two flags sit on the board — one on each side. Carry the enemy flag back to your home row (your back row) and you win instantly.',
            'Eliminating every enemy piece also wins the duel.',
        ],
    },
    {
        title: 'Setting up',
        icon: Grid3x3,
        lines: [
            'Before play begins, place each of your pieces on any open square of your home row. Tap a piece below the board, then tap the square you want it on.',
        ],
    },
    {
        title: 'Your turn',
        icon: Hourglass,
        lines: [
            `Each turn your team gets ${duelConstants.MAX_SPACES_MOVED_PER_TURN} squares of movement to spend and exactly one attack.`,
            'The movement is a shared pool — spend it all on one piece, or split it between several. You can move and attack in any order.',
            'End your turn early at any time with the End turn button.',
        ],
    },
    {
        title: 'Moving',
        icon: Move,
        lines: [
            'Tap a piece to select it, then tap a highlighted square to move there. Movement is orthogonal — no diagonals.',
            'Each piece also has its own range limit of 1 to 3 squares per turn, no matter how much team movement is left.',
            'Pieces block movement, so you have to path around a crowd — unless the piece can fly, in which case it moves over other pieces (it still cannot land on an occupied square).',
            `A piece carrying a flag is slowed to ${duelConstants.FLAG_CARRIER_MAX_SPACES_PER_TURN} squares per turn, so a fast grab still has to survive the walk home.`,
        ],
    },
    {
        title: 'Attacking',
        icon: Zap,
        lines: [
            'Select a piece and tap an enemy in range to attack. Each species has its own reach of 1 to 3 squares, and attacks ignore blockers — there is no line of sight.',
            'You then choose which of that piece\'s four moves to use, or a plain Basic Attack. Every option shows its estimated damage and how effective it will be before you commit.',
            'Damage depends on the attacker\'s attack stat against the defender\'s defense, the move\'s rating, and elemental matchups. A move matching the attacker\'s own element hits 50% harder.',
            `Elemental matchups swing hard: a move can be resisted, doubled, or blocked outright. No single hit can take more than ${MAX_HIT_PERCENT}% of a full health bar, so nothing is ever a one-shot.`,
            `A high evasion stat blunts incoming damage by up to ${MAX_EVASION_PERCENT}%.`,
        ],
    },
    {
        title: 'Stamina',
        icon: BatteryMedium,
        lines: [
            `Every piece has up to ${duelConstants.MAX_STAMINA_POINTS} stamina. Moving costs 1 per square and attacking costs more the further away the target is.`,
            'Pieces recover 1 stamina each turn, so a piece that has been working hard needs a turn to breathe.',
        ],
    },
    {
        title: 'Flags',
        icon: FlagOff,
        lines: [
            'Knock out a flag carrier and the flag drops on the square where they fell — anyone can pick it up from there.',
            'Step your own piece onto your dropped flag to return it to its starting square.',
        ],
    },
    {
        title: 'Reading the board',
        icon: Eye,
        lines: [
            'Green dots are squares your selected piece can move to.',
            'Red striped circles show how far that piece can attack.',
            'A red X marks an enemy you can hit right now — the bigger and brighter it is, the better the matchup.',
        ],
    },
];

type HowToPlayModalProps = {
    show: boolean;
    onHide: () => void;
};

function renderSection(section: Section) {
    const Icon = section.icon;
    return (
        <section className="mb-5 last:mb-0" key={`duel-how-to-${section.title}`}>
            <h3 className="type-subhead mb-2 flex items-center gap-2">
                <Icon className="size-4" />
                {section.title}
            </h3>
            {section.lines.map((line, i) => (
                <p className="mb-2 font-body text-body text-ink-2 last:mb-0" key={`duel-how-to-${section.title}-${i}`}>
                    {line}
                </p>
            ))}
        </section>
    );
}

function HowToPlayModal({ show, onHide }: HowToPlayModalProps) {
    return (
        <Dialog open={show} onOpenChange={(open: boolean) => { if (!open) { onHide(); } }}>
            <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[85vh] overflow-hidden sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="type-heading">How to play Duel</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full min-h-0 pr-4">
                    <p className="mb-5 font-body text-lead text-ink">
                        Duel is a squad tactics game: capture the flag on a chess-sized board, with elemental creatures instead of chess pieces.
                    </p>
                    {SECTIONS.map(renderSection)}
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={onHide}>Got it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default HowToPlayModal;
