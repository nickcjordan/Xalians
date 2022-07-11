import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel'
import Spinner from 'react-bootstrap/Spinner'
import { Hub } from 'aws-amplify';
import fitty from 'fitty';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { EasePack } from 'gsap/EasePack';
import { ExpoScaleEase } from 'gsap/EasePack';
import MorphSVGPlugin from 'gsap/MorphSVGPlugin';
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import * as duelValueTranslator from '../../../../gameplay/duel/duelValueTranslator';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';
import XalianImage from '../../../xalianImage';
gsap.registerPlugin(ScrollTrigger, TextPlugin, EasePack, ScrollToPlugin, DrawSVGPlugin, ScrambleTextPlugin, ExpoScaleEase, MorphSVGPlugin);

class AttackActionModal extends React.Component {

    closeModal = () => {
        // if (this.props.animationTl) {
        //     this.props.animationTl.play();
        // }
        gsap.to('#attack-action-modal', {autoAlpha: 0, duration: 0.35}).then(() => {
            this.props.onHide();
        }
        );
        
    }

    onAnimationComplete = () => {
        setTimeout(this.closeModal, 1000);
    }

    componentDidMount() {
        // calculate variables
        let attackerElem = document.getElementById('duel-attack-action-' + this.props.attacker.xalianId + '-animation');
        let defenderElem = document.getElementById('duel-attack-action-' + this.props.defender.xalianId + '-animation');
        let attackerRect = attackerElem.getBoundingClientRect();
        let defenderRect = defenderElem.getBoundingClientRect();

        let attackerBadge = document.getElementById("duel-attack-action-attacker-type-icon");
        let defenderBadge = document.getElementById("duel-attack-action-defender-type-icon");
        let badgeWidthOffset = attackerBadge.clientWidth/2;
        let xOffset = badgeWidthOffset;

        // init modal-global timeline
        let modalTl = gsap.timeline({ onComplete: this.onAnimationComplete });

        // fade in entire modal
        modalTl.to('#attack-action-modal', {autoAlpha: 1, duration: 0.25});
        
        // fade in pieces
        // modalTl.from(attackerElem, { ease: "expo.in", opacity: 0}, "<");
        // modalTl.from(defenderElem, { ease: "expo.in", delay: 0.2, opacity: 0}, "<");

        if (this.props.attackerStartRect && this.props.defenderStartRect) { // move pieces in from location on board if provided
            modalTl.from(attackerElem, {x: this.props.attackerStartRect.x - attackerRect.x, y: this.props.attackerStartRect.y - attackerRect.y, ease: "expo.in"}, "<");
            modalTl.from(defenderElem, {x: this.props.defenderStartRect.x - defenderRect.x, y: this.props.defenderStartRect.y - defenderRect.y, ease: "expo.in"}, "<");
        } else { // otherwise fade in from the side
            modalTl.from(attackerElem, {xPercent: -200, opacity: 0, ease: "expo.in"}, "<");
            // modalTl.from(attackerElem, {xPercent: -200, ease: "expo.in"}, "<");
            modalTl.from(defenderElem, {xPercent: 200, opacity: 0, ease: "expo.in", delay: 0.2}, "<");
            // modalTl.from(defenderElem, {xPercent: 200, ease: "expo.in", delay: 0.2}, "<");
        }

        
        let attackerBadgeTl = gsap.timeline();
        attackerBadgeTl.fromTo(attackerBadge, {opacity: 0}, {opacity: 1, duration: 0.2});
        attackerBadgeTl.to(attackerBadge, {x: xOffset, scale: 1.5, ease: "expo.in"}, "<");
        
        let defenderBadgeTl = gsap.timeline();
        defenderBadgeTl.fromTo(defenderBadge, {opacity: 0}, {opacity: 1, duration: 0.2});
        defenderBadgeTl.to(defenderBadge, {x: -xOffset, scale: 1.5, ease: "expo.in"}, "<");
        
        // bounce to type badge based on effectiveness
        let effectivenessScore = this.props.result && this.props.result.typeEffectiveness ? this.props.result.typeEffectiveness : 0;
        let effectiveness = duelValueTranslator.effectivenessScoreToText(effectivenessScore);
        this.addBounceAnimation(effectiveness, attackerBadgeTl, attackerBadge, defenderBadgeTl, defenderBadge, xOffset);

        modalTl.add(attackerBadgeTl).add(defenderBadgeTl, "<");
        
        let effectivenessTextElem = document.getElementById('duel-attack-action-effectiveness-text');
        modalTl.fromTo(effectivenessTextElem, {opacity: 0}, {opacity: 1});

        let defenderHealthDelta = this.buildXalianHealthDelta(this.props.defender.state.health, this.props.result.damage);
        let attackerHealthDelta = this.buildXalianHealthDelta(this.props.attacker.state.health, this.props.result.reactionDamage);

        let defenderDropShadowBlur = Math.min(4, defenderHealthDelta.end.percent);
        let attackerDropShadowBlur = Math.min(4, attackerHealthDelta.end.percent);
        

        modalTl.fromTo('#duel-attack-action-attacker-health-bar-wrapper, #duel-attack-action-defender-health-bar-wrapper', {autoAlpha: 0}, {autoAlpha: 1, duration: 0.15}, "<");
        modalTl.to('#duel-attack-action-defender-health-bar', {width: `${defenderHealthDelta.end.percent}%`, backgroundColor: defenderHealthDelta.end.color, boxShadow: `0px 0px ${defenderDropShadowBlur}px ${defenderDropShadowBlur}px ${defenderHealthDelta.end.color}`, duration: 0.5});
        modalTl.to('#duel-attack-action-attacker-health-bar', {width: `${attackerHealthDelta.end.percent}%`, backgroundColor: attackerHealthDelta.end.color, boxShadow: `0px 0px ${attackerDropShadowBlur}px ${attackerDropShadowBlur}px ${attackerHealthDelta.end.color}`, duration: 0.5}, "<");
        modalTl.fromTo('#duel-attack-action-attacker-result-damage, #duel-attack-action-defender-result-damage', {autoAlpha: 0}, {autoAlpha: 1, duration: 0.5}, "<");
        if (defenderDropShadowBlur == 0) {
            modalTl.to(defenderElem, {opacity: 0.25, duration: 0.25});
        }
        if (attackerDropShadowBlur == 0) {
            modalTl.to(attackerElem, {opacity: 0.25, duration: 0.25});
        }

        let fits = fitty('.fit-text'); // fitting title to modal
    }

    addBounceAnimation = (effectiveness, attackerBadgeTl, attackerBadge, defenderBadgeTl, defenderBadge, xOffset) => {
        if (effectiveness === duelConstants.typeEffectiveness.IMMUNE) {
            this.addBounceAwayAnimation(attackerBadgeTl, attackerBadge, 0);
        } else if (effectiveness === duelConstants.typeEffectiveness.LOW_EFFECT) {
            this.addBounceAwayAnimation(attackerBadgeTl, attackerBadge, (xOffset/2));
            this.addBounceAwayAnimation(defenderBadgeTl, defenderBadge, 0);
        } else if (effectiveness === duelConstants.typeEffectiveness.MEDIUM_EFFECT) {
            this.addBounceAwayAnimation(attackerBadgeTl, attackerBadge, xOffset - (xOffset/3), 1);
            this.addBounceAwayAnimation(defenderBadgeTl, defenderBadge, -(xOffset - (xOffset/2)), 1);
        } else if (effectiveness === duelConstants.typeEffectiveness.HIGH_EFFECT) {
            this.addBounceAwayAnimation(attackerBadgeTl, attackerBadge, xOffset - 0, 1.5);
            this.addBounceAwayAnimation(defenderBadgeTl, defenderBadge, -(xOffset - (xOffset)), 1);
        } else if (effectiveness === duelConstants.typeEffectiveness.SUPER_EFFECT) {
            this.addBounceAwayAnimation(defenderBadgeTl, defenderBadge, 0);
        }
    }

    addBounceAwayAnimation = (tl, elem, xOffset, shrinkScale = 0.8) => {
        tl.to(elem, {x: xOffset, scale: shrinkScale, ease: "none", duration: 0.5}, ">");
        tl.to(elem, {yPercent: -100, ease: "power1.out", duration: 0.25}, "<");
        tl.to(elem, {yPercent: 0, ease: "bounce.out", duration: 0.25}, ">");
    }

    buildXalianHealthDelta = (startingHealth, damage = 0) => {
            let endingHealth = Math.max(0, startingHealth - damage);
            let startingHealthPercentage = gsap.utils.normalize(0, 10, startingHealth)*100;
            let endingHealthPercentage = gsap.utils.normalize(0, 10, endingHealth)*100;
            let barColorStart = startingHealthPercentage > 50 ? 'green' : startingHealthPercentage > 25 ? 'orange' : 'red';
            let barColorEnd = endingHealthPercentage > 50 ? 'green' : endingHealthPercentage > 25 ? 'orange' : 'red';
            return {
                start: {
                    health: startingHealth,
                    percent: startingHealthPercentage,
                    color: barColorStart
                },
                end: {
                    health: endingHealth,
                    percent: endingHealthPercentage,
                    color: barColorEnd
                }
            }
    }

    buildDropShadowFilter = (teamColor) => {
        return `${this.dropShadow(this.props.cellSize / 50, gsap.utils.interpolate(teamColor, "white", 0.75))} ${this.dropShadow(this.props.cellSize / 25, gsap.utils.interpolate(teamColor, "white", 0.5))} ${this.dropShadow(this.props.cellSize / 6, teamColor)}`;
    }

    dropShadow = (blur, color, x = 0, y = 0) => {
        return `drop-shadow(${x}px ${y}px ${blur}px ${color})`;
    }
    
    render() {

        

        document.body.click(function (event) {
            if (!document.getElementById(event.target).closest('#openModal').length && !document.getElementById(event.target).is('#openModal')) {
                this.closeModal();
            }
        })

        let effectivenessScore = this.props.result && this.props.result.typeEffectiveness ? this.props.result.typeEffectiveness : 0;
        let effectivenessText = duelValueTranslator.effectivenessScoreToTextConversational(effectivenessScore);


        let defenderHealthDelta = this.buildXalianHealthDelta(this.props.defender.state.health, this.props.result.damage);
        let attackerHealthDelta = this.buildXalianHealthDelta(this.props.attacker.state.health, this.props.result.reactionDamage);
        return (<React.Fragment>

            {this.props.result &&
                <div onClick={this.closeModal} style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }} ></div>
            }
            {this.props.result &&
                <Modal id='attack-action-modal'
                    show={this.props.show} onHide={this.props.onHide}
                    size="sm"
                    centered
                    className={this.props.light ? "themed-modal light-themed-modal" : "themed-modal dark-themed-modal"}
                >
                    <Modal.Body>
                         <div style={{ width: '90%', margin: 'auto', padding: '5px 0 5px 0', fontStyle: 'italic' }} >
                            <h2 className='fit-text' style={{ color: 'white' }} >{this.props.attacker.species.name} attacks {this.props.defender.species.name}!</h2>
                         </div>
                         <div style={{ width: '90%', margin: 'auto', padding: '10px 0 5px 0' }} >
                            <h2 className='fit-text' id='duel-attack-action-effectiveness-text' style={{ color: 'white' }}>{effectivenessText}</h2>
                         </div>

                                
                        <Row style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center', padding: '20px 20px 20px 20px' }}>
                            <Col >
                                <div id='duel-attack-action-attacker-type-icon'>

                                    <XalianTypeSymbolBadge
                                        size={(this.props.cellSize || 50) / 2}
                                        style={{ top: '50%', right: 0, margin: 'auto' }}
                                        type={this.props.attacker.elementType}
                                        classes='type-badge' />
                                </div>
                            </Col>
                            <Col >
                                <div id='duel-attack-action-defender-type-icon'>

                                    <XalianTypeSymbolBadge
                                        size={(this.props.cellSize || 50) / 2}
                                        style={{ top: '50%', left: 0, margin: 'auto' }}
                                        type={this.props.defender.elementType}
                                        classes='type-badge' />
                                </div>
                            </Col>
                        </Row>
                        <Row style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center', padding: '20px 20px 20px 20px' }}>
                            <Col >
                                <XalianImage id={'duel-attack-action-' + this.props.attacker.xalianId + '-animation'}
                                    speciesName={this.props.attacker.species.name}
                                    primaryType={this.props.attacker.elementType}
                                    padding={'0px'}
                                    moreClasses="duel-attack-action-xalian"
                                    fill={'black'}
                                    filter={this.buildDropShadowFilter(this.props.attackerColor)} />

                            </Col>
                            <Col >
                                <XalianImage id={'duel-attack-action-' + this.props.defender.xalianId + '-animation'}
                                    speciesName={this.props.defender.species.name}
                                    primaryType={this.props.defender.elementType}
                                    padding={'0px'}
                                    moreClasses="duel-attack-action-xalian"
                                    fill={'black'}
                                    filter={this.buildDropShadowFilter(this.props.defenderColor)} />

                            </Col>
                        </Row>
                        <Row style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center', padding: '5px 20px 5px 20px' }}>
                            <Col >
                                <div id='duel-attack-action-attacker-health-bar-wrapper' style={{ width: '100%', height: '2px', marginTop: '10%', opacity: 0 }}>
                                    <div id='duel-attack-action-attacker-health-bar' style={{ width: `${attackerHealthDelta.start.percent}%`, backgroundColor: attackerHealthDelta.start.color, pointerEvents: 'none', boxShadow: `0px 0px 4px 4px ${attackerHealthDelta.start.color}`, height: '100%' }} />
                                </div>
                            </Col>
                            <Col >
                                <div id='duel-attack-action-defender-health-bar-wrapper' style={{ width: '100%', height: '2px', marginTop: '10%', opacity: 0 }}>
                                    <div id='duel-attack-action-defender-health-bar' style={{ width: `${defenderHealthDelta.start.percent}%`, backgroundColor: defenderHealthDelta.start.color, pointerEvents: 'none', boxShadow: `0px 0px 4px 4px ${defenderHealthDelta.start.color}`, height: '100%' }} />
                                </div>
                            </Col>
                        </Row>
                        
                        <Row style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center', padding: '0px 20px 0px 20px' }}>

                            <Col xs={6}>
                                {this.props.result.reactionDamage && (parseInt(this.props.result.reactionDamage) > 0) ?
                                    <div id='duel-attack-action-attacker-result-damage' style={{ width: '100%', margin: 'auto', marginTop: '10px' }}>
                                        <h4 style={{ opacity: 0.75, color: 'red', textAlign: 'center', fontWeight: 'bolder' }}>-{this.props.result.reactionDamage}</h4>
                                    </div>
                                    : null
                                }
                            </Col>

                            <Col xs={6}>
                                {this.props.result.damage && (this.props.result.damage > 0) &&
                                    <div id='duel-attack-action-defender-result-damage' style={{ width: '100%', margin: 'auto', marginTop: '10px' }}>
                                        <h4 style={{ opacity: 0.75, color: 'red', textAlign: 'center', fontWeight: 'bolder' }}>-{this.props.result.damage}</h4>
                                    </div>
                                }
                            </Col>
                        </Row>
                
                        

                    </Modal.Body>

                </Modal>
            }

        </React.Fragment>
        );




    }

}

export default AttackActionModal;