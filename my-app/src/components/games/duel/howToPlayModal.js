import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import * as duelConstants from '../../../gameplay/duel/duelGameConstants';
import { hull } from '../../../constants/designTokens';

// The rules text is derived from constants rather than hardcoded so it cannot
// drift away from the actual game as tunables change.
const MAX_HIT_PERCENT = Math.round(duelConstants.MAX_SINGLE_HIT_HEALTH_FRACTION * 100);
const MAX_EVASION_PERCENT = Math.round(duelConstants.MAX_EVASION_DAMAGE_REDUCTION * 100);

const SECTIONS = [
    {
        title: 'The goal',
        icon: 'bi-flag-fill',
        lines: [
            'Two flags sit on the board — one on each side. Carry the enemy flag back to your home row (your back row) and you win instantly.',
            'Eliminating every enemy piece also wins the duel.',
        ],
    },
    {
        title: 'Setting up',
        icon: 'bi-grid-3x3-gap-fill',
        lines: [
            'Before play begins, place each of your pieces on any open square of your home row. Tap a piece below the board, then tap the square you want it on.',
        ],
    },
    {
        title: 'Your turn',
        icon: 'bi-hourglass-split',
        lines: [
            `Each turn your team gets ${duelConstants.MAX_SPACES_MOVED_PER_TURN} squares of movement to spend and exactly one attack.`,
            'The movement is a shared pool — spend it all on one piece, or split it between several. You can move and attack in any order.',
            'End your turn early at any time with the End turn button.',
        ],
    },
    {
        title: 'Moving',
        icon: 'bi-arrows-move',
        lines: [
            'Tap a piece to select it, then tap a highlighted square to move there. Movement is orthogonal — no diagonals.',
            'Each piece also has its own range limit of 1 to 3 squares per turn, no matter how much team movement is left.',
            'Pieces block movement, so you have to path around a crowd — unless the piece can fly, in which case it moves over other pieces (it still cannot land on an occupied square).',
            `A piece carrying a flag is slowed to ${duelConstants.FLAG_CARRIER_MAX_SPACES_PER_TURN} squares per turn, so a fast grab still has to survive the walk home.`,
        ],
    },
    {
        title: 'Attacking',
        icon: 'bi-lightning-charge-fill',
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
        icon: 'bi-battery-half',
        lines: [
            `Every piece has up to ${duelConstants.MAX_STAMINA_POINTS} stamina. Moving costs 1 per square and attacking costs more the further away the target is.`,
            'Pieces recover 1 stamina each turn, so a piece that has been working hard needs a turn to breathe.',
        ],
    },
    {
        title: 'Flags',
        icon: 'bi-flag',
        lines: [
            'Knock out a flag carrier and the flag drops on the square where they fell — anyone can pick it up from there.',
            'Step your own piece onto your dropped flag to return it to its starting square.',
        ],
    },
    {
        title: 'Reading the board',
        icon: 'bi-eye-fill',
        lines: [
            'Green dots are squares your selected piece can move to.',
            'Red striped circles show how far that piece can attack.',
            'A red X marks an enemy you can hit right now — the bigger and brighter it is, the better the matchup.',
        ],
    },
];

class HowToPlayModal extends React.Component {

    renderSection = (section) => {
        return (
            <section className="howto-section" key={`duel-how-to-${section.title}`}>
                <h3 className="howto-title">
                    <i className={`bi ${section.icon}`} />
                    {section.title}
                </h3>
                {section.lines.map((line, i) => (
                    <p className="howto-line" key={`duel-how-to-${section.title}-${i}`}>
                        {line}
                    </p>
                ))}
            </section>
        );
    }

    render() {
        return (
            <Modal
                show={this.props.show}
                onHide={this.props.onHide}
                size="lg"
                centered
                scrollable
                className="themed-modal dark-themed-modal"
            >
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: '1px solid #444', backgroundColor: hull.base }}>
                    <Modal.Title style={{ color: 'white', fontSize: '1.2em' }}>How to play Duel</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: hull.base }}>
                    <p style={{ color: '#a0a0a0', fontSize: '0.9em', marginBottom: '20px' }}>
                        Duel is a squad tactics game: capture the flag on a chess-sized board, with elemental creatures instead of chess pieces.
                    </p>
                    {SECTIONS.map(this.renderSection)}
                </Modal.Body>
                <Modal.Footer style={{ borderTop: '1px solid #444', backgroundColor: hull.base }}>
                    <Button variant="xalianGreen" onClick={this.props.onHide}>Got it</Button>
                </Modal.Footer>
            </Modal>
        );
    }

}

export default HowToPlayModal;
