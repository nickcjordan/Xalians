import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel'
import Spinner from 'react-bootstrap/Spinner'
import { Hub } from 'aws-amplify';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { EasePack } from 'gsap/EasePack';
import { ExpoScaleEase } from 'gsap/EasePack';
import MorphSVGPlugin from 'gsap/MorphSVGPlugin';
import XalianTypeSymbolBadge from './board/xalianTypeSymbolBadge';

gsap.registerPlugin(ScrollTrigger, TextPlugin, EasePack, ScrollToPlugin, DrawSVGPlugin, ScrambleTextPlugin, ExpoScaleEase, MorphSVGPlugin);

class AttackActionModal extends React.Component {

    closeModal = () => {
        this.props.onHide();
    }

    render() {

        document.body.click(function (event) {
            if(!document.getElementById(event.target).closest('#openModal').length && !document.getElementById(event.target).is('#openModal')) {
                 this.props.onHide();
            }     
         })

            let effectiveness = this.props.attackData && this.props.attackData.attackResult ? this.props.attackData.attackResult.typeEffectiveness : 0;



            return (<React.Fragment>

            {this.props.attackData && 
                <div onClick={this.closeModal} style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }} ></div>
            }
            {this.props.attackData && 
                    <Modal
                    show={this.props.show} onHide={this.props.onHide}
                    size="sm"
                    centered
                    className={this.props.light ? "themed-modal light-themed-modal" : "themed-modal dark-themed-modal"}
                    >
                    <Modal.Body>
                        <Row style={{display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center'}}>
                            <Col >
                                <XalianTypeSymbolBadge  style={{ top: '50%', left: 0, margin: 'auto' }} type={this.props.attackData.attackerType} classes='type-badge' /> 
                            </Col>
                            <Col xs={true} ><p style={{ margin: 'auto', textAlign: 'center'}}>attacks</p></Col>
                            <Col >
                                <XalianTypeSymbolBadge style={{ top: '50%', right: 0, margin: 'auto' }} type={this.props.attackData.defenderType} classes='type-badge' />
                            </Col>
                        </Row>
                        <Row style={{display: 'flex', justifyContent: 'center', alignContent: 'center', alignItems: 'center'}}>
                            <Col xs={true} ><p style={{ margin: 'auto', textAlign: 'center'}}>Effectiveness:</p></Col>
                            <Col xs={true} ><p style={{ margin: 'auto', textAlign: 'center'}}>{effectiveness}</p></Col>
                        </Row>
                        
                    </Modal.Body>
                    
                    </Modal>
                }

            </React.Fragment>
        );




    }

}

export default AttackActionModal;