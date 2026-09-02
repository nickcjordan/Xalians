import React from 'react';
import Modal from 'react-bootstrap/Modal';
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import { ink, lamp, stat } from '../../../../constants/designTokens';

/**
 * Choosing which move to strike with.
 *
 * Was a stack of translucent white outline-light buttons. It is now a firing
 * selector: each move is a recessed row on the housing with its element plate
 * on the left, its designation printed beside it and its projected damage in
 * machine type down the right.
 */
class AttackMoveChooserModal extends React.Component {

    getEffectivenessHint = (typeEffectiveness) => {
        if (typeEffectiveness === 0) {
            return { text: 'No effect', color: lamp.red };
        } else if (typeEffectiveness < 1) {
            return { text: 'Not very effective', color: ink.low };
        } else if (typeEffectiveness === 1) {
            return { text: 'Effective', color: ink.mid };
        } else {
            return { text: 'Super effective', color: stat.stamina };
        }
    }

    buildDamagePreview = (move) => {
        let result = duelCalculator.calculateAttackResult(this.props.attacker, this.props.defender, this.props.G, this.props.ctx, true, move);
        let damage = result && result.damage ? result.damage : 0;
        let typeEffectiveness = result && result.typeEffectiveness != null ? result.typeEffectiveness : 1;
        let hint = this.getEffectivenessHint(typeEffectiveness);
        return { damage: Math.round(damage * 10) / 10, hint: hint };
    }

    /** one selector row; `move` is null for the unarmed basic attack */
    renderOption = (move, key, index) => {
        let preview = this.buildDamagePreview(move);
        return (
            <button
                type="button"
                key={key}
                className="duel-move-option"
                onClick={() => this.props.onSelect(index)}>

                <span className="duel-move-plate">
                    {move && move.type &&
                        <XalianTypeSymbolBadge size={26} type={move.type} classes='type-badge' />
                    }
                </span>

                <span className="duel-move-ident">
                    <span className="duel-move-name">{move ? move.name : 'Basic Attack'}</span>
                    <span className="duel-move-rating">
                        {move ? `Rating ${move.rating}` : 'Unarmed strike'}
                    </span>
                </span>

                <span className="duel-move-readout">
                    <span className="duel-move-damage">{preview.damage}</span>
                    <span className="duel-move-effect" style={{ color: preview.hint.color }}>
                        {preview.hint.text}
                    </span>
                </span>
            </button>
        );
    }

    render() {
        if (!this.props.attacker || !this.props.defender) {
            return null;
        }
        let moves = this.props.attacker.moves || [];
        return (
            <Modal
                show={this.props.show}
                onHide={this.props.onCancel}
                centered
                className="themed-modal dark-themed-modal duel-modal"
            >
                <Modal.Header closeButton closeVariant="white">
                    <Modal.Title>
                        {this.props.attacker.species.name} <span className="duel-modal-title-joiner">strikes</span> {this.props.defender.species.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="duel-move-legend">Firing solutions</p>
                    <div className="duel-move-list">
                        {moves.map((move, index) => this.renderOption(move, `duel-attack-move-choice-${index}`, index))}
                        {this.renderOption(null, 'duel-attack-move-choice-basic', null)}
                    </div>
                    <div className="duel-move-cancel-row">
                        <button type="button" className="g-btn" onClick={this.props.onCancel}>Cancel</button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

}

export default AttackMoveChooserModal;
