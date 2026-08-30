import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import { surface } from '../../../../constants/designTokens';

class AttackMoveChooserModal extends React.Component {

    getEffectivenessHint = (typeEffectiveness) => {
        if (typeEffectiveness === 0) {
            return { text: 'no effect', color: 'red' };
        } else if (typeEffectiveness < 1) {
            return { text: 'not very effective', color: 'gray' };
        } else if (typeEffectiveness === 1) {
            return { text: 'effective', color: 'white' };
        } else {
            return { text: 'super effective', color: '#3ddc5b' };
        }
    }

    buildDamagePreview = (move) => {
        let result = duelCalculator.calculateAttackResult(this.props.attacker, this.props.defender, this.props.G, this.props.ctx, true, move);
        let damage = result && result.damage ? result.damage : 0;
        let typeEffectiveness = result && result.typeEffectiveness != null ? result.typeEffectiveness : 1;
        let hint = this.getEffectivenessHint(typeEffectiveness);
        return { damage: Math.round(damage * 10) / 10, hint: hint };
    }

    renderMoveRow = (move, index) => {
        let preview = this.buildDamagePreview(move);
        return (
            <Button
                key={`duel-attack-move-choice-${index}`}
                variant="outline-light"
                onClick={() => this.props.onSelect(index)}
                style={{ width: '100%', margin: '5px 0', padding: '10px', textAlign: 'left', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
                <Row style={{ alignItems: 'center' }}>
                    <Col xs={2} style={{ display: 'flex', justifyContent: 'center' }}>
                        {move.type &&
                            <XalianTypeSymbolBadge size={28} type={move.type} classes='type-badge' />
                        }
                    </Col>
                    <Col xs={5}>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{move.name}</div>
                        <div style={{ color: 'darkgray', fontSize: '0.8em' }}>Rating: {move.rating}</div>
                    </Col>
                    <Col xs={5} style={{ textAlign: 'right' }}>
                        <div style={{ color: 'white' }}>~{preview.damage} dmg</div>
                        <div style={{ color: preview.hint.color, fontSize: '0.8em' }}>{preview.hint.text}</div>
                    </Col>
                </Row>
            </Button>
        );
    }

    renderBasicAttackRow = () => {
        let preview = this.buildDamagePreview(null);
        return (
            <Button
                key='duel-attack-move-choice-basic'
                variant="outline-light"
                onClick={() => this.props.onSelect(null)}
                style={{ width: '100%', margin: '5px 0', padding: '10px', textAlign: 'left', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
                <Row style={{ alignItems: 'center' }}>
                    <Col xs={2} />
                    <Col xs={5}>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>Basic Attack</div>
                    </Col>
                    <Col xs={5} style={{ textAlign: 'right' }}>
                        <div style={{ color: 'white' }}>~{preview.damage} dmg</div>
                        <div style={{ color: preview.hint.color, fontSize: '0.8em' }}>{preview.hint.text}</div>
                    </Col>
                </Row>
            </Button>
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
                size="sm"
                centered
                className="themed-modal dark-themed-modal"
            >
                <Modal.Header closeButton closeVariant="white" style={{ borderBottom: '1px solid #444' }}>
                    <Modal.Title style={{ color: 'white', fontSize: '1.1em' }}>
                        {this.props.attacker.species.name} attacks {this.props.defender.species.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: surface.surface2 }}>
                    <Stack gap={1}>
                        {moves.map((move, index) => this.renderMoveRow(move, index))}
                        {this.renderBasicAttackRow()}
                    </Stack>
                    <Button
                        variant="secondary"
                        onClick={this.props.onCancel}
                        style={{ width: '100%', marginTop: '10px' }}
                    >
                        Cancel
                    </Button>
                </Modal.Body>
            </Modal>
        );
    }

}

export default AttackMoveChooserModal;
