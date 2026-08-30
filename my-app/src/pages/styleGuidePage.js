import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import XalianNavbar from '../components/navbar';
import tokens from '../constants/designTokens';

/**
 * A living reference for the design system.
 *
 * This page is rendered from the same tokens and primitives the rest of the site
 * uses, so it cannot drift: change a token and this page changes with it. Use it
 * to check that a new colour or component actually fits before scattering it
 * across pages.
 */

const SPACE_STEPS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const RADIUS_STEPS = ['sm', 'md', 'lg', 'xl', 'pill'];
const ELEMENT_TYPES = Object.keys(tokens.themeColors);

class StyleGuidePage extends React.Component {

    renderSwatches(title, entries, note) {
        return (
            <section className="styleguide-section">
                <h2 className="styleguide-heading">{title}</h2>
                {note && <p className="styleguide-note">{note}</p>}
                <div className="styleguide-swatch-grid">
                    {entries.map(([name, value]) => (
                        <div className="styleguide-swatch" key={name}>
                            <div className="styleguide-swatch-chip" style={{ backgroundColor: value }} />
                            <code className="styleguide-swatch-name">{name}</code>
                            <code className="styleguide-swatch-value">{value}</code>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    render() {
        return (
            <React.Fragment>
                <Container fluid className="content-background-container">
                    <XalianNavbar />

                    <Container className="styleguide-container">
                        <h1 className="x-page-title">Design System</h1>
                        <p className="x-page-subtitle">
                            Every colour, space and component the site is built from. Rendered from the same
                            tokens the pages use, so it stays honest.
                        </p>

                        {this.renderSwatches('Brand', Object.entries(tokens.brand))}
                        {this.renderSwatches('Surfaces', Object.entries(tokens.surface),
                            'Backgrounds and borders, darkest first. The page sits on bg; panels lift off it.')}
                        {this.renderSwatches('Text', Object.entries(tokens.text),
                            'dim is the faintest step that still clears 4.5:1 on the page background. Anything fainter is decorative and must not carry meaning.')}
                        {this.renderSwatches('Feedback', Object.entries(tokens.feedback))}
                        {this.renderSwatches('Stats', Object.entries(tokens.stat),
                            'Semantic: attack is red, defense blue, speed yellow-green, stamina and recovery green. Each special variant is a darker shade of its standard pair.')}
                        {this.renderSwatches('Elements', Object.entries(tokens.themeColors),
                            'One per element type. Mirrored as --x-type-* in CSS and enforced identical by designTokens.test.js.')}

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Spacing</h2>
                            <p className="styleguide-note">A 4px-based scale. Use these rather than arbitrary pixel values.</p>
                            {SPACE_STEPS.map((step) => (
                                <div className="styleguide-space-row" key={step}>
                                    <code className="styleguide-space-name">--x-space-{step}</code>
                                    <div className="styleguide-space-bar" style={{ width: `var(--x-space-${step})` }} />
                                </div>
                            ))}
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Radius</h2>
                            <div className="styleguide-radius-grid">
                                {RADIUS_STEPS.map((step) => (
                                    <div className="styleguide-radius-item" key={step}>
                                        <div className="styleguide-radius-box" style={{ borderRadius: `var(--x-radius-${step})` }} />
                                        <code className="styleguide-swatch-name">--x-radius-{step}</code>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Panels</h2>
                            <p className="styleguide-note">
                                The core surface, lifted from the planets page. A tinted, inset-glowing card keyed to an
                                element colour. Set the tint with an <code>.x-panel--type-*</code> class.
                            </p>
                            <Row>
                                <Col md={4} className="styleguide-panel-col">
                                    <div className="x-panel">
                                        <h5 className="x-section-title">Default</h5>
                                        <p className="styleguide-note">Falls back to the brand green.</p>
                                    </div>
                                </Col>
                                <Col md={4} className="styleguide-panel-col">
                                    <div className="x-panel x-panel--type-fire">
                                        <h5 className="x-section-title">Fire tint</h5>
                                        <p className="styleguide-note">Keyed with <code>.x-panel--type-fire</code>.</p>
                                    </div>
                                </Col>
                                <Col md={4} className="styleguide-panel-col">
                                    <div className="x-panel x-panel--flat">
                                        <h5 className="x-section-title">Flat</h5>
                                        <p className="styleguide-note">For dense content, where a glow is noise.</p>
                                    </div>
                                </Col>
                            </Row>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Element tints</h2>
                            <div className="styleguide-tint-grid">
                                {ELEMENT_TYPES.map((type) => (
                                    <div className={`x-panel x-panel--type-${type} styleguide-tint`} key={type}>
                                        {type}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Buttons</h2>
                            <p className="styleguide-note">
                                xalianGreen is the primary action, xalianGray the secondary. Both show a green focus
                                ring for keyboard users.
                            </p>
                            <div className="styleguide-button-row">
                                <Button variant="xalianGreen">Primary</Button>
                                <Button variant="xalianGray">Secondary</Button>
                                <Button variant="xalianGreen" disabled>Disabled</Button>
                                <Button variant="xalianGray" disabled>Disabled</Button>
                            </div>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Form controls</h2>
                            <Row>
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroup.Text className="x-input-addon"><i className="bi bi-search" /></InputGroup.Text>
                                        <Form.Control className="x-input" placeholder="With an addon..." />
                                    </InputGroup>
                                </Col>
                                <Col md={6}>
                                    <Form.Control className="x-input" placeholder="On its own..." />
                                </Col>
                            </Row>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Label / value rows</h2>
                            <p className="styleguide-note">
                                The value is the information and gets the emphasis; the label is chrome and stays dim.
                            </p>
                            <Row className="x-detail-row">
                                <Col className="x-detail-label">Origin Planet:</Col>
                                <Col className="x-detail-value">Grimedes</Col>
                            </Row>
                            <Row className="x-detail-row">
                                <Col className="x-detail-label">Avg Height:</Col>
                                <Col className="x-detail-value">30 in / 76 cm</Col>
                            </Row>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Measure</h2>
                            <p className="styleguide-note">
                                Body copy is capped at <code>--x-measure</code> so it stays readable on wide screens.
                                The lore sections used to run the full viewport, roughly 200 characters per line.
                            </p>
                            <div className="x-measure styleguide-measure-demo">
                                For thousands of years, the ancient race known as the Vallerii dominated the galaxy of
                                Xalia. With their god-like mastery of biotechnology, they birthed the first Xalians —
                                bioengineered organisms designed to thrive in Xalia's most extreme environments.
                            </div>
                        </section>

                        <section className="styleguide-section">
                            <h2 className="styleguide-heading">Empty state</h2>
                            <p className="x-empty-state">Nothing here yet.</p>
                        </section>
                    </Container>
                </Container>
            </React.Fragment>
        );
    }
}

export default StyleGuidePage;
