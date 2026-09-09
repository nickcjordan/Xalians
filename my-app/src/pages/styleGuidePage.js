import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';
import tokens from '../constants/designTokens';
import HelixMark from '../components/brand/helixMark';
import HelixSpinner from '../components/brand/helixSpinner';
import BrandLockup from '../components/brand/brandLockup';

/**
 * The design system reference, version 4 only (docs/DESIGN_SYSTEM.md
 * sections 3-8). Rendered from the same tokens and classes the site uses,
 * so it cannot drift from reality. If something here looks wrong, the
 * system is wrong.
 */

const ELEMENTS = Object.keys(tokens.themeColors);

const TABS = [
    { id: 'brand', name: 'Brand' },
    { id: 'color', name: 'Color' },
    { id: 'type', name: 'Type' },
    { id: 'depth', name: 'Depth and corners' },
    { id: 'controls', name: 'Controls' },
    { id: 'inputs', name: 'Inputs' },
    { id: 'chips-badges', name: 'Chips and badges' },
    { id: 'meters', name: 'Meters' },
    { id: 'tabs', name: 'Tabs' },
    { id: 'loading', name: 'Loading' },
    { id: 'empty', name: 'Empty state' },
    { id: 'toasts', name: 'Toasts' },
    { id: 'record', name: 'Record' },
    { id: 'move-set', name: 'Move set' },
    { id: 'cards', name: 'Cards' },
];

const MOVES = [
    { name: 'Glacial Slash', rating: 12, description: 'A cutting strike drawn from the coolant lines, biting deep into anything warm-blooded.' },
    { name: 'Corrosive Impact', rating: 7, description: 'A slower blow that leaves a chemical residue eating at the wound after contact.' },
    { name: 'Mighty Pinch', rating: 8, description: 'A basic close-quarters grip attack, no element behind it.' },
];

class StyleGuidePage extends React.Component {

    renderMeter(stat, key) {
        return (
            <div className="g-meter-row" key={key || stat.name}>
                <span className="g-meter-name">{stat.name}</span>
                <div className="g-meter">
                    <div className="g-meter-fill" style={{ width: `${stat.pct}%` }} />
                </div>
                <span className="g-meter-value">{stat.value}</span>
            </div>
        );
    }

    render() {
        return (
            <div className="g-page" data-tier="chrome">
                <XalianNavbar />

                <div className="g-shell sg4-page">

                    <header className="g-masthead">
                        <div className="g-masthead-heading">
                            <p className="g-kicker">Design system</p>
                            <h1 className="g-title">Version 4</h1>
                            <p className="g-body-v4">Every token and component, rendered from the real classes.</p>
                        </div>
                    </header>

                    <nav className="g-tabs sg4-tabs" aria-label="Style guide sections">
                        {TABS.map((t) => (
                            <a className="g-tab-link" href={`#${t.id}`} key={t.id}>{t.name}</a>
                        ))}
                    </nav>

                    {/* ---- brand ---- */}
                    <section id="brand" className="sg4-section">
                        <h2 className="g-h2">Brand</h2>
                        <p className="g-body-v4">The mark, the lockup, and the wordmark in the two sizes the site uses.</p>
                        <div className="sg4-brand-row">
                            <div className="g-panel sg4-brand-cell">
                                <span className="g-legend-v4">Lockup &middot; .g-brand</span>
                                <BrandLockup />
                            </div>
                            <div className="g-panel sg4-brand-cell">
                                <span className="g-legend-v4">Lockup, big &middot; .g-brand--big</span>
                                <BrandLockup big />
                            </div>
                            <div className="g-panel sg4-brand-cell">
                                <span className="g-legend-v4">The mark alone</span>
                                <HelixMark className="sg4-mark" title="Xalians" />
                            </div>
                        </div>
                    </section>

                    {/* ---- accent tiers, status, elements ---- */}
                    <section id="color" className="sg4-section">
                        <h2 className="g-h2">Color</h2>
                        <p className="g-body-v4">The accent's three tiers, the four status colors, and the fourteen element hues.</p>
                        <div className="sg4-swatch-row">
                            <div className="sg4-swatch" style={{ background: 'var(--g-viable-hi)' }}><span className="g-small-v4">viable-hi</span></div>
                            <div className="sg4-swatch" style={{ background: 'var(--g-viable)' }}><span className="g-small-v4">viable</span></div>
                            <div className="sg4-swatch" style={{ background: 'var(--g-viable-lo)' }}><span className="g-small-v4">viable-lo</span></div>
                        </div>
                        <div className="sg4-swatch-row">
                            <div className="sg4-swatch" style={{ background: 'var(--g-status-ok)' }}><span className="g-small-v4">ok</span></div>
                            <div className="sg4-swatch" style={{ background: 'var(--g-status-danger)' }}><span className="g-small-v4">danger</span></div>
                            <div className="sg4-swatch" style={{ background: 'var(--g-status-warn)' }}><span className="g-small-v4">warn</span></div>
                            <div className="sg4-swatch" style={{ background: 'var(--g-status-info)' }}><span className="g-small-v4">info</span></div>
                        </div>
                        <div className="sg4-el-row">
                            {ELEMENTS.map((el) => (
                                <div className={`sg4-swatch g-el-${el}`} style={{ background: 'var(--g-el)' }} key={el}>
                                    <span className="g-small-v4">{el}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ---- type roles ---- */}
                    <section id="type" className="sg4-section">
                        <h2 className="g-h2">Type</h2>
                        <p className="g-body-v4">The three faces, chosen by role: legend and heading, body, and data.</p>
                        <div className="g-panel sg4-type">
                            <p className="g-display">Creatures grown for dying worlds</p>
                            <p className="g-title-v4">Hypnopet</p>
                            <p className="g-heading-v4">The Age of Unbirth</p>
                            <p className="g-subhead-v4">Stats, current and potential</p>
                            <p className="g-legend-v4">Species on file</p>
                            <p className="g-lead-v4">Xalians are bioengineered creatures the Vallerii Generators grow to survive the worst planets in the galaxy.</p>
                            <p className="g-body-v4">Created by the Telypso Generator as a therapy animal for the insane Vallerii imprisoned on that world.</p>
                            <p className="g-small-v4">Sign in to pick from your Xalians.</p>
                            <p className="g-data-v4">93 in / 236 cm &nbsp; 830 lbs / 376 kg &nbsp; #00015</p>
                            <p className="g-figure-v4">1,204</p>
                        </div>
                    </section>

                    {/* ---- depth ---- */}
                    <section id="depth" className="sg4-section">
                        <h2 className="g-h2">Depth and corners</h2>
                        <p className="g-body-v4">Surfaces step up in tone; the chamfer is reserved for glass and the one primary key.</p>
                        <div className="sg4-depth-row">
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-0)' }}><span className="g-small-v4">s0</span></div>
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-1)' }}><span className="g-small-v4">s1</span></div>
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-2)' }}><span className="g-small-v4">s2</span></div>
                            <div className="g-glass sg4-depth-cell"><span className="g-small-v4">glass</span></div>
                            <div className="sg4-depth-cell sg4-depth-float"><span className="g-small-v4">floating</span></div>
                        </div>
                    </section>

                    {/* ---- buttons, every rank and state ---- */}
                    <section id="controls" className="sg4-section">
                        <h2 className="g-h2">Controls</h2>
                        <p className="g-body-v4">Four ranks of button, five states each. Focus is always the emitter ring.</p>
                        <div className="sg4-ctl-grid">
                            <span className="g-legend-v4">Primary</span>
                            <button className="g-btn g-btn--primary" type="button">Generate</button>
                            <button className="g-btn g-btn--primary" type="button" style={{ outline: '2px solid var(--g-focus)', outlineOffset: '2px' }}>Focus</button>
                            <button className="g-btn g-btn--primary" type="button" disabled>Disabled</button>
                            <span className="g-small-v4">Hover/pressed are pseudo-classes; hover the live button to see them.</span>

                            <span className="g-legend-v4">Secondary</span>
                            <button className="g-btn" type="button">Read the story</button>
                            <button className="g-btn" type="button" style={{ outline: '2px solid var(--g-focus)', outlineOffset: '2px' }}>Focus</button>
                            <button className="g-btn" type="button" disabled>Disabled</button>
                            <span className="g-small-v4">&nbsp;</span>

                            <span className="g-legend-v4">Quiet</span>
                            <button className="g-btn g-btn--quiet" type="button">Sign in</button>
                            <button className="g-btn g-btn--quiet" type="button" style={{ outline: '2px solid var(--g-focus)', outlineOffset: '2px' }}>Focus</button>
                            <button className="g-btn g-btn--quiet" type="button" disabled>Disabled</button>
                            <span className="g-small-v4">&nbsp;</span>

                            <span className="g-legend-v4">Destructive</span>
                            <button className="g-btn g-btn--danger" type="button">Release</button>
                            <button className="g-btn g-btn--danger" type="button" style={{ outline: '2px solid var(--g-focus)', outlineOffset: '2px' }}>Focus</button>
                            <button className="g-btn g-btn--danger" type="button" disabled>Disabled</button>
                            <span className="g-small-v4">Outline at rest; fills only on hover/press.</span>
                        </div>

                        <h3 className="g-subhead-v4 sg4-sub">Segmented, toggle, checkbox, range</h3>
                        <div className="g-panel sg4-pieces">
                            <div className="g-segmented">
                                <button className="g-segment" type="button" aria-pressed="true">Bot</button>
                                <button className="g-segment" type="button" aria-pressed="false">Second player</button>
                            </div>
                            <div className="sg4-toggle-row">
                                <span className="g-toggle on" role="switch" aria-checked="true" /> <span className="g-small-v4">Randomize positions</span>
                                <span className="g-toggle" role="switch" aria-checked="false" /> <span className="g-small-v4">Sound</span>
                            </div>
                            <label className="g-check">
                                <input type="checkbox" defaultChecked />
                                <span className="g-check-box" />
                                Keep this Xalian
                            </label>
                            <input className="g-range" type="range" defaultValue="60" />
                        </div>
                    </section>

                    {/* ---- inputs ---- */}
                    <section id="inputs" className="sg4-section">
                        <h2 className="g-h2">Inputs</h2>
                        <p className="g-body-v4">Rest, hover, focus, error and disabled, all reading the same fills as a control.</p>
                        <div className="sg4-input-row">
                            <input className="g-input" placeholder="Search worlds, species, terms" />
                            <input className="g-input" defaultValue="Hypnopet" />
                            <input className="g-input g-input--error" defaultValue="hypno pet!" />
                            <input className="g-input" defaultValue="Hypnopet" disabled />
                        </div>
                        <p className="g-small-v4" style={{ color: 'var(--g-status-danger)' }}>Names use letters only. Remove the space and the exclamation mark.</p>
                    </section>

                    {/* ---- chips vs badges ---- */}
                    <section id="chips-badges" className="sg4-section">
                        <h2 className="g-h2">Chips are content, badges are state</h2>
                        <p className="g-body-v4">A chip carries an element hue and names an element. A badge carries a status color and names a state.</p>
                        <div className="sg4-chip-row">
                            <span className="g-chip g-el-psychic">Psychic</span>
                            <span className="g-chip g-el-dark">Dark</span>
                            <span className="g-chip g-el-fire">Fire</span>
                        </div>
                        <div className="sg4-chip-row">
                            <span className="g-badge g-badge--ok">Kept</span>
                            <span className="g-badge g-badge--danger">Unclaimed</span>
                            <span className="g-badge g-badge--warn">Expiring</span>
                            <span className="g-badge g-badge--info">Not set</span>
                        </div>
                    </section>

                    {/* ---- meters ---- */}
                    <section id="meters" className="sg4-section">
                        <h2 className="g-h2">Meters</h2>
                        <p className="g-body-v4">A stat meter, keyed to the element in scope.</p>
                        <div className="g-panel sg4-meters g-el-psychic">
                            {this.renderMeter({ name: 'Std attack', value: 741, pct: 74 })}
                            {this.renderMeter({ name: 'Speed', value: 651, pct: 65 })}
                            {this.renderMeter({ name: 'Stamina', value: 582, pct: 58 })}
                        </div>
                    </section>

                    {/* ---- tabs ---- */}
                    <section id="tabs" className="sg4-section">
                        <h2 className="g-h2">Tabs</h2>
                        <p className="g-body-v4">An underline marks the active tab, the same mark a pressed segment uses.</p>
                        <div className="g-tabs">
                            <a className="g-tab-link">Reading room</a>
                            <a className="g-tab-link">Worlds</a>
                            <a className="g-tab-link on">Bestiary</a>
                            <a className="g-tab-link">Index</a>
                        </div>
                    </section>

                    {/* ---- spinner ---- */}
                    <section id="loading" className="sg4-section">
                        <h2 className="g-h2">Loading: the helix spinner, never a skeleton</h2>
                        <p className="g-body-v4">The DNA mark with its rungs lighting in sequence, in three sizes. HelixSpinner renders .g-spinner.</p>
                        <div className="sg4-spinner-row">
                            <HelixSpinner size="sm" />
                            <HelixSpinner />
                            <HelixSpinner size="lg" />
                            <span className="g-small-v4">The helix reads its rungs while the page waits. No skeletons anywhere on the site.</span>
                        </div>
                    </section>

                    {/* ---- empty state ---- */}
                    <section id="empty" className="sg4-section">
                        <h2 className="g-h2">Empty state</h2>
                        <p className="g-body-v4">A solid hairline box with a legend line and one sentence that says what to do.</p>
                        <div className="g-empty">
                            <b>No Xalians yet</b>
                            Generate one and keep it to see it here.
                        </div>
                    </section>

                    {/* ---- toasts ---- */}
                    <section id="toasts" className="sg4-section">
                        <h2 className="g-h2">Toasts</h2>
                        <p className="g-body-v4">Level two, a strong edge, a status dot, and one sentence.</p>
                        <div className="sg4-toast-col">
                            <div className="g-notice g-notice--ok">Hypnopet kept to your account.</div>
                            <div className="g-notice g-notice--alert">Could not reach the registry. Your Xalian is still on this page.</div>
                        </div>
                    </section>

                    {/* ---- record ---- */}
                    <section id="record" className="sg4-section">
                        <h2 className="g-h2">Record</h2>
                        <p className="g-body-v4">A spec plate of key/value pairs, and a list of term/body rows on hairlines.</p>
                        <div className="g-panel sg4-record-panel">
                            <div className="g-spec">
                                <span className="g-spec-key">Designation</span>
                                <span className="g-spec-val">Hypnopet</span>
                                <span className="g-spec-key">Origin</span>
                                <span className="g-spec-val">Telypso</span>
                                <span className="g-spec-key">Height</span>
                                <span className="g-spec-val">93 in / 236 cm</span>
                                <span className="g-spec-key">Mass</span>
                                <span className="g-spec-val">830 lbs / 376 kg</span>
                            </div>
                            <div className="sg4-record-rows">
                                <div className="g-record g-el-psychic">
                                    <span className="g-record-term">Telypso</span>
                                    <span className="g-record-body">Possibly the oldest world in Xalia, where reality answers to thought.</span>
                                </div>
                                <div className="g-record g-el-dark">
                                    <span className="g-record-term">APEX</span>
                                    <span className="g-record-body">The automated protocol that turned on the Vallerii who built it.</span>
                                </div>
                                <div className="g-record">
                                    <span className="g-record-term">Scrambler Token</span>
                                    <span className="g-record-body">A chip carrying one randomly generated, plague-immune genome.</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ---- move set ---- */}
                    <section id="move-set" className="sg4-section">
                        <h2 className="g-h2">Move set</h2>
                        <p className="g-body-v4">A rated list: the rating in a stamped chip, the name in legend, the description as prose.</p>
                        <ul className="xalian-move-set">
                            {MOVES.map((move) => (
                                <li className="move-row" key={move.name}>
                                    <span className="move-rating" title="Move rating">{move.rating}</span>
                                    <div className="move-detail">
                                        <h3 className="move-name">{move.name}</h3>
                                        <p className="move-description">{move.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ---- cards ---- */}
                    <section id="cards" className="sg4-section">
                        <h2 className="g-h2">Cards</h2>
                        <p className="g-body-v4">A bestiary tile and a home-style species plate, both plain links keyed to their element.</p>
                        <div className="sg4-card-row">
                            <Link to="#" className="g-panel g-card-link g-el-psychic enc-tile" onClick={(e) => e.preventDefault()}>
                                <div className="enc-tile-bar" />
                                <div className="enc-tile-art">
                                    <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" moreClasses="enc-tile-art-img" />
                                </div>
                                <div className="enc-tile-meta">
                                    <span className="g-h3 enc-tile-name">Hypnopet</span>
                                    <span className="g-mono enc-tile-sub">Telypso</span>
                                </div>
                            </Link>
                            <Link to="#" className="g-panel g-card-link g-el-fire enc-tile" onClick={(e) => e.preventDefault()}>
                                <div className="enc-tile-bar" />
                                <div className="enc-tile-art">
                                    <XalianImage colored speciesName="Dromeus" primaryType="Fire" moreClasses="enc-tile-art-img" />
                                </div>
                                <div className="enc-tile-meta">
                                    <span className="g-h3 enc-tile-name">Dromeus</span>
                                    <span className="g-mono enc-tile-sub">Magmuth</span>
                                </div>
                            </Link>
                            <Link to="#" className={'g-card-link home-species-tile g-el-water'} onClick={(e) => e.preventDefault()}>
                                <div className="home-species-plate">
                                    <XalianImage colored speciesName="Hippochamp" primaryType="Water" moreClasses="home-species-plate-img" />
                                </div>
                                <span className="g-legend-v4 home-species-name">Hippochamp</span>
                            </Link>
                        </div>
                    </section>

                </div>
            </div>
        );
    }
}

export default StyleGuidePage;
