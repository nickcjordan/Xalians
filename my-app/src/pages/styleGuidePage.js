// Terminal: relay. The styleguide is a developer tool; you reach it, like every
// other area, patched through the Zolto relay, and it is the one page whose
// whole job is to render every terminal side by side.
import React from 'react';
import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';
import tokens from '../constants/designTokens';
import HelixMark from '../components/brand/helixMark';
import HelixSpinner from '../components/brand/helixSpinner';
import BrandLockup from '../components/brand/brandLockup';

/**
 * GENERATOR CONSOLE — the design system reference.
 *
 * Rendered from the same tokens and classes the site uses, so it cannot drift
 * from reality. If something here looks wrong, the system is wrong.
 */

const ELEMENTS = Object.keys(tokens.themeColors);

const SECTIONS = [
    { id: 'v4', index: 'V4', name: 'Version 4' },
    { id: 'terminals', index: '00', name: 'Terminals' },
    { id: 'foundation', index: '01', name: 'Foundation' },
    { id: 'elements', index: '02', name: 'Element Energy' },
    { id: 'surfaces', index: '03', name: 'Panels' },
    { id: 'readouts', index: '04', name: 'Readouts' },
    { id: 'controls', index: '05', name: 'Controls' },
    { id: 'specimen', index: '06', name: 'Specimen' },
];

/* A stat has three zones: what it is now, how far it could still grow, and the
   ceiling it can never reach. The meter shows all three at once. */
const STAT_CEILING = 1000;
const STATS = [
    { name: 'Std Attack', value: 741, potential: 890 },
    { name: 'Spc Attack', value: 236, potential: 610 },
    { name: 'Std Defense', value: 503, potential: 780 },
    { name: 'Spc Defense', value: 414, potential: 690 },
    { name: 'Speed', value: 611, potential: 950 },
    { name: 'Evasion', value: 531, potential: 720 },
];

/* The sample record every terminal in section 00 renders: Hypnopet of
   Telypso, the same creature used across docs/design/terminal-mockups.html,
   so this section can be checked against the ratified mockup panel by panel. */
const HYPNOPET_SPC_ATTACK = { name: 'Spc Attack', value: 741, pct: 78 };
const HYPNOPET_SPC_DEFENSE = { name: 'Spc Defense', value: 503, pct: 52 };
const HYPNOPET_SPEED = { name: 'Speed', value: 651, pct: 66 };

class StyleGuidePage extends React.Component {

    state = { channel: 'grid', power: 50 };

    renderSectionHead(index, name, note) {
        return (
            <header className="sg-section-head">
                <span className="sg-section-index g-mono">{index}</span>
                <h2 className="g-h2">{name}</h2>
                {note && <p className="g-body sg-section-note">{note}</p>}
            </header>
        );
    }

    renderMeter(stat) {
        const pct = Math.round((stat.value / STAT_CEILING) * 100);
        const potentialPct = Math.round((stat.potential / STAT_CEILING) * 100);
        return (
            <div className="g-meter-row" key={stat.name}>
                <span className="g-meter-name">{stat.name}</span>
                <div className="g-meter">
                    <div className="g-meter-ghost" style={{ width: `${potentialPct}%` }} />
                    <div className="g-meter-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="g-meter-value">{stat.value}</span>
            </div>
        );
    }

    /* The same meter component in one of three media: lit bulbs behind glass
       (default), printed ink on paper (`ink`), or the Generator's own
       monochrome voice (`mono` — forces --g-el to the phosphor so the fill
       reads white-on-black instead of an element hue nothing lights on a
       readout). Used throughout section 00 so every terminal's stat block is
       drawn from the same real .g-meter markup the rest of the site uses. */
    renderStatMeter(stat, variant, key) {
        const trackClass = variant === 'ink' ? 'g-meter g-meter--ink' : 'g-meter';
        const style = variant === 'mono' ? { '--g-el': 'var(--g-phosphor)' } : undefined;
        return (
            <div className="g-meter-row" key={key || `${variant || 'lit'}-${stat.name}`}>
                <span className="g-meter-name">{stat.name}</span>
                <div className={trackClass} style={style}>
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

                <div className="g-shell sg-page">

                    {/* =================================================================
                        VERSION 4 — docs/DESIGN_SYSTEM.md sections 3-8.
                        Every v4 token and component in one place, rendered from the
                        real .g-* classes so this reference cannot drift from the CSS.
                        ================================================================= */}
                    <section id="v4" className="sg-section">
                        <header className="sg-section-head">
                            <span className="sg-section-index g-mono">V4</span>
                            <h2 className="g-heading-v4">Version 4</h2>
                            <p className="g-body-v4 sg-section-note">
                                One site, featured components, immersive experiences
                                (docs/DESIGN_SYSTEM.md). Quiet chrome, one accent — the
                                viable signal — square corners with the chamfer reserved
                                for glass and the one primary key, the helix spinner, no
                                terminal props.
                            </p>
                        </header>

                        {/* ---- brand ---- */}
                        {/* BrandLockup renders .g-brand / .g-brand--big (docs/DESIGN_SYSTEM.md
                            section 8); HelixSpinner below renders .g-spinner. */}
                        <h3 className="g-subhead-v4 sg4-sub">Brand</h3>
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

                        {/* ---- accent tiers, status, elements ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Accent, status, elements</h3>
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

                        {/* ---- type roles ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Type</h3>
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

                        {/* ---- depth ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Depth</h3>
                        <div className="sg4-depth-row">
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-0)' }}><span className="g-small-v4">s0</span></div>
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-1)' }}><span className="g-small-v4">s1</span></div>
                            <div className="sg4-depth-cell" style={{ background: 'var(--g-surface-2)' }}><span className="g-small-v4">s2</span></div>
                            <div className="g-glass sg4-depth-cell"><span className="g-small-v4">glass</span></div>
                            <div className="sg4-depth-cell sg4-depth-float"><span className="g-small-v4">floating</span></div>
                        </div>

                        {/* ---- buttons, every rank and state ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Controls</h3>
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

                        {/* ---- inputs ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Inputs</h3>
                        <div className="sg4-input-row">
                            <input className="g-input" placeholder="Search worlds, species, terms" />
                            <input className="g-input" defaultValue="Hypnopet" />
                            <input className="g-input g-input--error" defaultValue="hypno pet!" />
                            <input className="g-input" defaultValue="Hypnopet" disabled />
                        </div>
                        <p className="g-small-v4" style={{ color: 'var(--g-status-danger)' }}>Names use letters only. Remove the space and the exclamation mark.</p>

                        {/* ---- segmented, toggle, checkbox, range ---- */}
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

                        {/* ---- chips vs badges ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Chips are content, badges are state</h3>
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

                        {/* ---- meters ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Meters</h3>
                        <div className="g-panel sg4-meters g-el-psychic">
                            {this.renderStatMeter({ name: 'Std attack', value: 741, pct: 74 })}
                            {this.renderStatMeter({ name: 'Speed', value: 651, pct: 65 })}
                            {this.renderStatMeter({ name: 'Stamina', value: 582, pct: 58 })}
                        </div>

                        {/* ---- tabs ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Tabs</h3>
                        <div className="g-tabs">
                            <a className="g-tab-link">Reading room</a>
                            <a className="g-tab-link">Worlds</a>
                            <a className="g-tab-link on">Bestiary</a>
                            <a className="g-tab-link">Index</a>
                        </div>

                        {/* ---- spinner ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Loading: the helix spinner, never a skeleton</h3>
                        <div className="sg4-spinner-row">
                            <HelixSpinner size="sm" />
                            <HelixSpinner />
                            <HelixSpinner size="lg" />
                            <span className="g-small-v4">The helix reads its rungs while the page waits. No skeletons anywhere on the site.</span>
                        </div>

                        {/* ---- empty state ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Empty state</h3>
                        <div className="g-empty">
                            <b>No Xalians yet</b>
                            Generate one and keep it to see it here.
                        </div>

                        {/* ---- toasts ---- */}
                        <h3 className="g-subhead-v4 sg4-sub">Toasts</h3>
                        <div className="sg4-toast-col">
                            <div className="g-notice g-notice--ok">Hypnopet kept to your account.</div>
                            <div className="g-notice g-notice--alert">Could not reach the registry. Your Xalian is still on this page.</div>
                        </div>
                    </section>

                    <h2 className="g-heading-v4 sg4-v3-heading">Version 3 (retiring)</h2>

                    {/* ---- masthead ---- */}
                    {/* .g-masthead is core (round3-coherence.md "one frame"): kicker
                        over title on the left, an optional .g-masthead-aside slot on
                        the right holding one key or a .g-nameplate. Every page uses
                        this same wrapper; the styleguide is no exception. */}
                    <header className="g-masthead">
                        <div className="g-masthead-heading">
                            <p className="g-label">Xalian Generator</p>
                            <h1 className="g-title">Console Design System</h1>
                            <p className="g-body">
                                The site is a relay, patched through into a different terminal for every
                                area. This reference reads through the relay itself, which is why its own
                                hull and screen are the relay's — blue-black steel, a salvaged colour tube,
                                copper-yellow silkscreen. Panels are matte objects and never glow. The only
                                light in the room comes from a screen bolted into the hull, and from the
                                indicator lamps beside it.
                            </p>
                            <div className="sg-masthead-status">
                                <span className="g-lamp">Generator online</span>
                                <span className="g-lamp g-lamp--amber">Plague containment nominal</span>
                                <span className="g-lamp g-lamp--off">APEX link severed</span>
                            </div>
                        </div>
                        <div className="g-masthead-aside">
                            <span className="g-nameplate">Styleguide &middot; Dev Reference</span>
                        </div>
                    </header>

                    {/* ---- index ---- */}
                    <nav className="sg-index g-panel g-panel--recessed">
                        {SECTIONS.map((s) => (
                            <a className="sg-index-item" href={`#${s.id}`} key={s.id}>
                                <span className="sg-index-num g-mono">{s.index}</span>
                                <span className="sg-index-name">{s.name}</span>
                            </a>
                        ))}
                    </nav>

                    {/* ---- 00 terminals ---- */}
                    <section id="terminals" className="sg-section">
                        {this.renderSectionHead('00', 'Terminals',
                            'Six pieces of hardware from six factions and eras, each rendered here from the same real .g-* classes the pages that use them read. Every block is docs/design/terminal-mockups.html’s Hypnopet-of-Telypso record, reproduced on that terminal’s hull, paper and screen. Beside each: what the object is, its medium breakdown, and which area of the site the terminal map (docs/DESIGN_SYSTEM.md section 4) assigns it to.')}

                        <div className="sgt-demos">

                            {/* A. Panel — the migration baseline */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">A. Migration baseline</p>
                                    <h3 className="g-h3">Panel</h3>
                                    <p className="g-body sg-small-body">
                                        A slab of olive-enamelled steel bolted into a hangar wall, brass bezels,
                                        bakelite keys, a small CRT set into the hull. It is kept only so an
                                        unmigrated page keeps working: hull is everything you see, legends,
                                        the specimen record and both meters are all silkscreened onto the same
                                        plate, and the screen carries four status lines. That is the medium
                                        rule’s one violation, on purpose, as the thing version 3 fixes.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> not assigned to any area. It is the default when a
                                        page sets nothing, so an unmigrated page still renders instead of
                                        breaking.
                                    </p>
                                </div>
                                <div data-terminal="panel">
                                    <div className="g-panel g-panel--tagged g-el-psychic" data-tag="Psychic">
                                        <div className="g-panel-head">
                                            <span className="g-label">Xalian Generator</span>
                                            <span className="g-kicker g-mono">Telypso unit 04</span>
                                        </div>
                                        <span className="g-legend">Specimen record</span>
                                        <p className="g-record-term">Hypnopet</p>
                                        <div className="sg-chip-row sg-mb">
                                            <span className="g-chip g-el-psychic">Psychic</span>
                                            <span className="g-chip g-el-dark">Dark</span>
                                        </div>
                                        <div className="sgt-plate-row">
                                            <div className="g-specimen">
                                                <div className="g-specimen-inner">
                                                    <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" />
                                                </div>
                                            </div>
                                            <div className="g-spec">
                                                <span className="g-spec-key">Index</span>
                                                <span className="g-spec-val">#00015</span>
                                                <span className="g-spec-key">Origin</span>
                                                <span className="g-spec-val">Telypso</span>
                                                <span className="g-spec-key">Height</span>
                                                <span className="g-spec-val">93 in / 236 cm</span>
                                                <span className="g-spec-key">Mass</span>
                                                <span className="g-spec-val">830 lbs / 376 kg</span>
                                            </div>
                                        </div>
                                        <div className="g-screen sg-mt">
                                            <p className="g-screen-line">GENERATOR ONLINE</p>
                                            <p className="g-screen-line g-screen-line--dim">SPECIES ACCEPTED . . . HYPNOPET</p>
                                            <p className="g-screen-line g-screen-line--dim">PLAGUE IMMUNITY CONFIRMED</p>
                                            <p className="g-screen-line">READY TO PRINT_</p>
                                        </div>
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK)}
                                        {this.renderStatMeter(HYPNOPET_SPC_DEFENSE)}
                                        <div className="sg-btn-row sg-mt">
                                            <button className="g-btn g-btn--primary" type="button">Generate</button>
                                            <button className="g-btn" type="button">Release</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* B. Field */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">B. Salvaged ECHELON-era survey unit</p>
                                    <h3 className="g-h3">Field</h3>
                                    <p className="g-body sg-small-body">
                                        A portable survey unit the size of a suitcase: a gunmetal case, an
                                        off-white enamel face with a hinge and four screws, reconditioning
                                        tape, and a colour CRT under dark glass. Hull is the case, its screws,
                                        the tape and the asset plate. Paper is only the tape and the asset
                                        label. Screen is the colour CRT, which carries the whole record, plus
                                        a one-line amber VFD that carries only the unit’s own battery and
                                        link state.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> Generator, with readout as its print mode.
                                        Salvaged company hardware pointed at a Generator; the CRT goes to the
                                        machine’s own voice while it prints, then shows the record in colour.
                                        Reclamation reuses the same hardware for a different program.
                                    </p>
                                </div>
                                <div className="g-case g-el-psychic" data-terminal="field">
                                    <div className="g-case-hinge" />
                                    <span className="g-case-screw g-case-screw--tl" />
                                    <span className="g-case-screw g-case-screw--tr" />
                                    <span className="g-case-screw g-case-screw--bl" />
                                    <span className="g-case-screw g-case-screw--br" />
                                    <div className="g-panel-head">
                                        <span className="g-legend">Echelon Bioworks &middot; Portable Survey Unit</span>
                                        <span className="g-kicker g-mono">PSU-7 / Telypso</span>
                                    </div>
                                    <span className="g-tape">reconditioned &middot; do not return to depot</span>
                                    <div className="g-vfd sg-mt">
                                        <span>PSU-7 &nbsp;BATT 61%</span>
                                        <span>LINK RELAY/ZOLTON-3 <span className="dim">HELD</span></span>
                                    </div>
                                    <div className="g-crt sg-mt">
                                        <span className="g-legend">Specimen record &middot; genome chip read &middot; immune</span>
                                        <p className="g-record-term">Hypnopet</p>
                                        <div className="sg-chip-row">
                                            <span className="g-chip g-el-psychic">Psychic</span>
                                            <span className="g-chip g-el-dark">Dark</span>
                                        </div>
                                        <div className="sgt-plate-row">
                                            <div className="g-specimen">
                                                <div className="g-specimen-inner">
                                                    <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" />
                                                </div>
                                            </div>
                                            <div className="g-spec">
                                                <span className="g-spec-key">Index</span>
                                                <span className="g-spec-val">#00015</span>
                                                <span className="g-spec-key">Origin</span>
                                                <span className="g-spec-val">Telypso</span>
                                                <span className="g-spec-key">Height</span>
                                                <span className="g-spec-val">93 in / 236 cm</span>
                                                <span className="g-spec-key">Mass</span>
                                                <span className="g-spec-val">830 lbs / 376 kg</span>
                                            </div>
                                        </div>
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK)}
                                        {this.renderStatMeter(HYPNOPET_SPC_DEFENSE)}
                                    </div>
                                    <div className="g-keybank sg-mt">
                                        <span className="g-legend"><span className="g-lamp" />Generator link</span>
                                        <span className="g-key-socket">
                                            <button className="g-key g-key--primary" type="button">Generate</button>
                                        </span>
                                        <span className="g-key-socket">
                                            <button className="g-key" type="button">Release</button>
                                        </span>
                                    </div>
                                    <div className="g-asset-plate sg-mt">
                                        <span>Property of Echelon Bioworks</span>
                                        <span>Asset 0419-PSU &middot; Grimedes depot</span>
                                    </div>
                                </div>
                            </div>

                            {/* C. Registry */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">C. Kozrak&rsquo;s arena bureaucracy</p>
                                    <h3 className="g-h3">Registry</h3>
                                    <p className="g-body sg-small-body">
                                        A clerk&rsquo;s counter at the Valleron arena: black lacquer with a gold
                                        rule, a lit top edge and a dark front lip, an amber ledger set into a
                                        screwed bezel, two bakelite keys in sockets. Hull is the counter, its
                                        lip, the bezel and the keys. Paper is the docket, clipped to the
                                        counter, which carries the whole combatant record: typed fields, a
                                        photo plate, stamped element marks and ink-bar stats. Screen is the
                                        single amber ledger line: entry, fee, bracket.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> Duel. Kozrak runs the arenas; every duel is a
                                        ledger entry, every token a fee.
                                    </p>
                                </div>
                                <div className="g-counter g-el-psychic" data-terminal="registry">
                                    <div className="g-panel-head">
                                        <span className="g-legend">Valleron Arena Registry</span>
                                        <span className="g-kicker g-mono">Ledger IV &middot; Window 2</span>
                                    </div>
                                    <div className="g-clip-well">
                                        <div className="g-paper g-paper--docket">
                                            <span className="g-clip" />
                                            <span className="g-stamp">Admitted<small>bracket C &middot; fee paid</small></span>
                                            <span className="g-legend">Combatant of record</span>
                                            <p className="g-record-term">Hypnopet</p>
                                            <div className="sgt-plate-row">
                                                <div className="g-plate--photo sgt-plate-photo">
                                                    <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" />
                                                </div>
                                                <div>
                                                    <div className="g-spec">
                                                        <span className="g-spec-key">Registry no.</span>
                                                        <span className="g-spec-val">00015-T</span>
                                                        <span className="g-spec-key">Homeworld</span>
                                                        <span className="g-spec-val">Telypso</span>
                                                        <span className="g-spec-key">Sponsor</span>
                                                        <span className="g-spec-val">unaffiliated</span>
                                                        <span className="g-spec-key">Bouts</span>
                                                        <span className="g-spec-val">3 W &middot; 1 L</span>
                                                    </div>
                                                    <div className="sg-chip-row sg-mt">
                                                        <span className="g-chip g-el-psychic">Psychic</span>
                                                        <span className="g-chip g-el-dark">Dark</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {this.renderStatMeter(HYPNOPET_SPC_ATTACK, 'ink')}
                                            {this.renderStatMeter(HYPNOPET_SPC_DEFENSE, 'ink')}
                                        </div>
                                    </div>
                                    <div className="g-bezel sg-mt">
                                        <div className="g-ledger">
                                            <span><span className="g-lamp" />ENTRY 2,204 &nbsp;<span className="dim">BRACKET C</span></span>
                                            <span>FEE 2 TOKENS <span className="dim">CLEARED</span></span>
                                        </div>
                                    </div>
                                    <div className="g-keybank sg-mt">
                                        <span className="g-legend">Window 2</span>
                                        <span className="g-key-socket">
                                            <button className="g-key g-key--primary" type="button">Enter the bracket</button>
                                        </span>
                                        <span className="g-key-socket">
                                            <button className="g-key" type="button">Withdraw</button>
                                        </span>
                                    </div>
                                    <div className="g-counter-lip" />
                                </div>
                            </div>

                            {/* D. Archive */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">D. Poseidas, the neutral ground</p>
                                    <h3 className="g-h3">Archive</h3>
                                    <p className="g-body sg-small-body">
                                        A reading desk in the Poseidas Deep Archive: dark sea-slate under one
                                        warm lamp pool, two enamel request keys. Hull is the desk and its
                                        keys. Paper is the catalogue card, which carries the whole record:
                                        accession number, name, a one-line summary, a sepia plate on corner
                                        mounts, typed specs, ink-bar stats and a pencilled cross-reference.
                                        There is no screen; the archive is the one terminal with no live
                                        display.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> Encyclopedia. Poseidas is the neutral seat of
                                        science and arbitration; reading is calm, paper under a lamp, not
                                        screens.
                                    </p>
                                </div>
                                <div className="g-desk g-el-psychic" data-terminal="archive">
                                    <div className="g-panel-head">
                                        <span className="g-legend">Poseidas Deep Archive</span>
                                        <span className="g-kicker g-mono">Bestiary &middot; drawer 3</span>
                                    </div>
                                    <div className="g-paper g-paper--card">
                                        <div className="g-paper-tabs">
                                            <span className="g-tab g-el-psychic">Psychic</span>
                                            <span className="g-tab g-el-dark">Dark</span>
                                        </div>
                                        <span className="g-mono sgt-accession">PDA-0015 &middot; BESTIARY</span>
                                        <p className="g-record-term">Hypnopet</p>
                                        <p className="g-body sg-small-body sgt-italic">
                                            Therapy animal of the asylum world. Docile; reads intent.
                                        </p>
                                        <div className="sgt-plate-row">
                                            <div className="g-plate--photo sgt-plate-photo">
                                                <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" />
                                            </div>
                                            <div className="g-spec">
                                                <span className="g-spec-key">Origin</span>
                                                <span className="g-spec-val">Telypso</span>
                                                <span className="g-spec-key">Height</span>
                                                <span className="g-spec-val">236 cm</span>
                                                <span className="g-spec-key">Mass</span>
                                                <span className="g-spec-val">376 kg</span>
                                                <span className="g-spec-key">Filed</span>
                                                <span className="g-spec-val">tribute yr 41</span>
                                            </div>
                                        </div>
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK, 'ink')}
                                        {this.renderStatMeter(HYPNOPET_SPC_DEFENSE, 'ink')}
                                        <p className="g-pencil sg-mt">cross-ref. Telypso, dr. 9<br />plate refiled yr 38</p>
                                    </div>
                                    <div className="sg-btn-row sg-mt">
                                        <button className="g-key g-key--primary" type="button">Pull the full folio</button>
                                        <button className="g-key" type="button">See also: Telypso</button>
                                    </div>
                                    <div className="g-asset-plate sg-mt">
                                        <span>Arbitration status: neutral specimen</span>
                                        <span>rev. 3</span>
                                    </div>
                                </div>
                            </div>

                            {/* E. Relay */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">E. Zolto rebel signal station</p>
                                    <h3 className="g-h3">Relay</h3>
                                    <p className="g-body sg-small-body">
                                        A hand-built Zolto QED unit: a sheet-steel cover plate with screws and
                                        low louvred vents over the electronics, and a salvaged colour tube
                                        bolted to the plate on four standoffs, with one cable and a tape
                                        label. Hull is the cover plate, its screws and vents, the tube frame
                                        and standoffs, the cable and the tape. There is no paper; a rebel
                                        relay does not print. Screen is the CRT, which carries the record and
                                        the packet&rsquo;s entanglement state together.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> Shell &mdash; navbar, sign-in, account, home. The
                                        connection itself: the Zolto network is the only thing that reaches
                                        every other machine. Home is the relay patching you through.
                                    </p>
                                </div>
                                <div className="g-cover-plate g-el-psychic" data-terminal="relay">
                                    <span className="g-cover-screw" style={{ left: 9, top: 9 }} />
                                    <span className="g-cover-screw" style={{ right: 9, top: 9 }} />
                                    <span className="g-cover-screw" style={{ left: 9, bottom: 9 }} />
                                    <span className="g-cover-screw" style={{ right: 9, bottom: 9 }} />
                                    <div className="g-cover-vents" />
                                    <p className="g-cover-stencil sg-mt">
                                        Zolton-3 relay
                                        <small>rev C &middot; hand-built &middot; keep dry</small>
                                    </p>
                                    <span className="g-tape">trace 3 cut &mdash; do not open</span>
                                    <div className="g-panel-head sg-mt">
                                        <span className="g-legend">QED Relay &middot; Zolton-3</span>
                                        <span className="g-kicker g-mono">pair Grimedes-1</span>
                                    </div>
                                    <div className="g-tube sg-mt">
                                        <span className="g-standoff g-standoff--tl" />
                                        <span className="g-standoff g-standoff--tr" />
                                        <span className="g-standoff g-standoff--bl" />
                                        <span className="g-standoff g-standoff--br" />
                                        <div className="g-crt">
                                            <span className="g-legend"><span className="g-lamp" />Entangled &middot; packet 0x2F &middot; pair Grimedes-1</span>
                                            <p className="g-record-term">Hypnopet</p>
                                            <div className="sg-chip-row">
                                                <span className="g-chip g-el-psychic">Psychic</span>
                                                <span className="g-chip g-el-dark">Dark</span>
                                            </div>
                                            <div className="sgt-plate-row">
                                                <div className="g-specimen">
                                                    <div className="g-specimen-inner">
                                                        <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" />
                                                    </div>
                                                </div>
                                                <div className="g-spec">
                                                    <span className="g-spec-key">Index</span>
                                                    <span className="g-spec-val">#00015</span>
                                                    <span className="g-spec-key">Origin</span>
                                                    <span className="g-spec-val">Telypso</span>
                                                    <span className="g-spec-key">Owner</span>
                                                    <span className="g-spec-val">njordan</span>
                                                    <span className="g-spec-key">Last sync</span>
                                                    <span className="g-spec-val">4 s ago</span>
                                                </div>
                                            </div>
                                            {this.renderStatMeter(HYPNOPET_SPC_ATTACK)}
                                            {this.renderStatMeter(HYPNOPET_SPC_DEFENSE)}
                                        </div>
                                    </div>
                                    <div className="g-keybank sg-mt">
                                        <span className="g-key-socket">
                                            <button className="g-key g-key--primary" type="button">Transmit</button>
                                        </span>
                                        <span className="g-key-socket">
                                            <button className="g-key" type="button">Re-pair</button>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* F. Readout */}
                            <div className="sgt-demo">
                                <div className="sgt-demo-desc">
                                    <p className="g-kicker">F. The machine speaks for itself</p>
                                    <h3 className="g-h3">Readout</h3>
                                    <p className="g-body sg-small-body">
                                        Not a terminal you operate: the Generator&rsquo;s own voice, applied to
                                        another terminal&rsquo;s CRT while a creature prints. Paper-white text on
                                        dark glass, no legends, one key. Hull is a bare bezel, whatever
                                        terminal is hosting it. There is no paper. Screen is everything: the
                                        whole message, in the machine&rsquo;s monochrome voice, with no element
                                        colour until the host terminal takes the record back.
                                    </p>
                                    <p className="g-body sg-small-body sgt-mapping">
                                        <b>Terminal map:</b> not an area of its own. It is the field
                                        terminal&rsquo;s print mode: the Generator&rsquo;s CRT goes to the machine&rsquo;s
                                        own voice while it prints, then hands the record back in colour.
                                    </p>
                                </div>
                                <div data-terminal="readout">
                                    <span className="g-legend">Genesis-class generator &middot; Telypso &middot; autonomous</span>
                                    <div className="g-crt g-readout-mode sg-mt">
                                        <p className="g-screen-line g-screen-line--dim">TOKEN ACCEPTED &middot; GENOME DECRYPTED</p>
                                        <p className="g-screen-line g-screen-line--dim">ENVIRONMENT: TELYPSO &middot; PSYCHIC-REACTIVE</p>
                                        <p className="g-record-term">HYPNOPET</p>
                                        <p className="g-screen-line">PSYCHIC / DARK &nbsp;&nbsp;INDEX 00015</p>
                                        <p className="g-screen-line">236 CM &nbsp;376 KG</p>
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK, 'mono')}
                                        {this.renderStatMeter(HYPNOPET_SPC_DEFENSE, 'mono')}
                                        {this.renderStatMeter(HYPNOPET_SPEED, 'mono')}
                                        <p className="g-screen-line g-screen-line--dim">PLAGUE IMMUNITY: CONFIRMED</p>
                                        <p className="g-screen-line">PRINTING <span className="g-cursor" /></p>
                                        <div className="sg-btn-row sg-mt">
                                            <button className="g-key" type="button">Acknowledge</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ---- medium rule: the same meter, three media ---- */}
                        <div className="g-panel sg-mt">
                            <div className="g-panel-head">
                                <span className="g-label">Medium rule</span>
                                <span className="g-kicker">the same meter, three ways</span>
                            </div>
                            <p className="g-body sg-small-body">
                                A stat is never invented twice: it is drawn once, in whichever medium its
                                terminal uses. Lit bulbs behind glass, printed ink on paper, or the
                                Generator&rsquo;s own monochrome voice &mdash; the same <span className="g-mono">.g-meter</span> markup,
                                unable to be anywhere but exactly one of the three.
                            </p>
                            <div className="sgt-medium-grid">
                                <div className="sgt-medium-cell">
                                    <span className="g-kicker">Screen &middot; lit &middot; .g-meter in .g-crt</span>
                                    <div className="g-crt g-el-psychic sgt-medium-crt" data-terminal="field">
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK, undefined, 'medium-lit')}
                                    </div>
                                </div>
                                <div className="sgt-medium-cell">
                                    <span className="g-kicker">Paper &middot; ink &middot; .g-meter--ink in .g-paper</span>
                                    <div className="g-paper sgt-medium-paper" data-terminal="archive">
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK, 'ink', 'medium-ink')}
                                    </div>
                                </div>
                                <div className="sgt-medium-cell">
                                    <span className="g-kicker">Screen &middot; readout &middot; .g-meter in .g-crt.g-readout-mode</span>
                                    <div className="g-crt g-readout-mode sgt-medium-crt" data-terminal="readout">
                                        {this.renderStatMeter(HYPNOPET_SPC_ATTACK, 'mono', 'medium-readout')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ---- 01 foundation ---- */}
                    <section id="foundation" className="sg-section">
                        {this.renderSectionHead('01', 'Foundation',
                            'What is core, and never trades places per terminal: the spacing and type scale, the fourteen element hues, the contrast floor, and hull, paper and screen never trading jobs. Hull colour, ink, trim and the legend and output faces are material and retune with whichever terminal is in scope — the relay’s, here.')}

                        <div className="sg-grid-2">
                            <div className="g-panel">
                                <div className="g-panel-head">
                                    <span className="g-label">Hull</span>
                                    <span className="g-kicker">surfaces</span>
                                </div>
                                <div className="sg-swatch-row">
                                    {[
                                        ['--g-void', 'void', 'the room'],
                                        ['--g-hull-lo', 'recessed', 'wells'],
                                        ['--g-hull', 'hull', 'panels'],
                                        ['--g-hull-hi', 'raised', 'keys'],
                                        ['--g-brass', 'brass', 'bezels'],
                                        ['--g-ink', 'ink', 'legends'],
                                    ].map(([varName, label, use]) => (
                                        <div className="sg-swatch" key={varName}>
                                            <div className="sg-swatch-chip" style={{ background: `var(${varName})` }} />
                                            <span className="sg-swatch-name g-mono">{label}</span>
                                            <span className="sg-swatch-use">{use}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="g-panel">
                                <div className="g-panel-head">
                                    <span className="g-label">Phosphor &amp; hazard</span>
                                    <span className="g-kicker">light + warning</span>
                                </div>
                                <div className="sg-swatch-row">
                                    {[
                                        ['--g-phosphor', 'phosphor', 'the CRT'],
                                        ['--g-hazard', 'hazard', 'commit / warn'],
                                        ['--g-lamp-amber', 'amber', 'advisory lamp'],
                                        ['--g-lamp-red', 'red', 'failure lamp'],
                                        ['--g-lamp-off', 'unlit', 'no power'],
                                    ].map(([varName, label, use]) => (
                                        <div className="sg-swatch" key={varName}>
                                            <div className="sg-swatch-chip" style={{ background: `var(${varName})` }} />
                                            <span className="sg-swatch-name g-mono">{label}</span>
                                            <span className="sg-swatch-use">{use}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="g-panel sg-type-plate">
                            <div className="g-panel-head">
                                <span className="g-label">Voice</span>
                                <span className="g-kicker">legend &middot; body &middot; machine output</span>
                            </div>
                            <p className="g-kicker">Silkscreen label</p>
                            <h3 className="g-h3">Stencil — painted on the hull</h3>
                            <p className="g-body">
                                Body copy sits at a comfortable measure in the core body face. It carries
                                the lore and the explanations — the only place the interface speaks in
                                sentences rather than in values stamped onto metal. Legend and machine-output
                                faces are material, so this reads in the relay&rsquo;s Chakra Petch and Space
                                Mono here, and in a different pair on every other terminal.
                            </p>
                            <hr className="g-seam-rule" />
                            <div className="sg-readout-demo g-el-ice">
                                <div>
                                    <span className="g-readout">1,204</span>
                                    <span className="g-readout-unit"> stat score</span>
                                </div>
                                <p className="g-kicker">Machine readout — tabular, never reflows</p>
                            </div>
                        </div>

                        {/* ---- frame: .g-masthead, .g-nameplate, .g-object ---- */}
                        <div className="g-panel sg-mt">
                            <div className="g-panel-head">
                                <span className="g-label">Frame</span>
                                <span className="g-kicker">one shell &middot; one masthead &middot; one object width</span>
                            </div>
                            <p className="g-body sg-small-body">
                                Every page reads: navbar, <span className="g-mono">.g-shell</span>, then{' '}
                                <span className="g-mono">.g-masthead</span> (this section&rsquo;s own header,
                                above, is one), then the terminal object at full shell width via{' '}
                                <span className="g-mono">.g-object</span>. The nameplate stays each
                                terminal&rsquo;s own face &mdash; the one exception to the core type system.
                            </p>

                            <p className="g-kicker sg-mb">Nameplate &middot; one face per terminal</p>
                            <div className="sg-chip-row sg-mb">
                                <div data-terminal="panel"><span className="g-nameplate">Panel &middot; IBM Plex Mono</span></div>
                                <div data-terminal="field"><span className="g-nameplate">Field &middot; Michroma</span></div>
                                <div data-terminal="registry"><span className="g-nameplate">Registry &middot; Cinzel</span></div>
                                <div data-terminal="archive"><span className="g-nameplate">Archive &middot; Spectral</span></div>
                                <div data-terminal="relay"><span className="g-nameplate">Relay &middot; Chakra Petch</span></div>
                                <div data-terminal="readout"><span className="g-nameplate">Readout &middot; IBM Plex Mono</span></div>
                            </div>

                            <p className="g-kicker sg-mb">Object width</p>
                            <div data-terminal="field">
                                <div className="g-object g-case">
                                    <span className="g-legend">
                                        .g-object spans the shell at full width, with the same outer margin
                                        as .g-case / .g-counter / .g-desk / .g-cover-plate.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ---- 02 elements ---- */}
                    <section id="elements" className="sg-section">
                        {this.renderSectionHead('02', 'Element Energy',
                            'The fourteen element hues are the fixed point of the whole system — fire is red because fire is red, on every terminal. They get painted onto the hull as a colour band, printed onto labels, and lit in the bulbs of a meter. Key any container to an element and everything inside it retunes.')}

                        <div className="sg-element-grid">
                            {ELEMENTS.map((el) => (
                                <div className={`g-panel g-panel--tagged g-el-${el} sg-element-cell`} key={el}>
                                    <span className="g-label">{el}</span>
                                    <span className="g-mono sg-element-hex">{tokens.themeColors[el]}</span>
                                    <div className="g-meter sg-element-meter">
                                        <div className="g-meter-fill" style={{ width: '72%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sg-grid-2">
                            <div className="g-panel g-el-fire">
                                <div className="g-panel-head">
                                    <span className="g-label">Chips</span>
                                    <span className="g-kicker">printed labels</span>
                                </div>
                                <div className="sg-chip-row">
                                    <span className="g-chip">Fire</span>
                                    <span className="g-chip g-el-water">Water</span>
                                    <span className="g-chip g-el-psychic">Psychic</span>
                                    <span className="g-chip g-el-ghost">Ghost</span>
                                    <span className="g-chip g-el-electric">Electric</span>
                                </div>
                            </div>

                            <div className="g-panel g-el-electric">
                                <div className="g-panel-head">
                                    <span className="g-label">Meters</span>
                                    <span className="g-kicker">recessed bulb strip</span>
                                </div>
                                {STATS.slice(0, 3).map((s) => this.renderMeter(s))}
                            </div>
                        </div>
                    </section>

                    {/* ---- 03 plates ---- */}
                    <section id="surfaces" className="sg-section">
                        {this.renderSectionHead('03', 'Panels',
                            'Pressed steel bolted to the frame, painted in whichever terminal’s hull colour is in scope. Depth is a bevel — light along the top edge, shadow underneath — plus rivets where a real panel would need them. No panel emits light, and that restraint is what makes the screens matter.')}

                        <div className="sg-grid-3">
                            <div className="g-panel">
                                <span className="g-label">Standard</span>
                                <p className="g-body sg-small-body">The terminal&rsquo;s hull colour. Holds most content.</p>
                            </div>
                            <div className="g-panel g-panel--raised">
                                <span className="g-label">Raised</span>
                                <p className="g-body sg-small-body">A lighter pressing, for things you act on.</p>
                            </div>
                            <div className="g-panel g-panel--recessed">
                                <span className="g-label">Recessed</span>
                                <p className="g-body sg-small-body">A well pressed into the hull.</p>
                            </div>
                        </div>

                        <div className="sg-grid-2">
                            <div className="g-panel g-panel--tagged g-el-psychic" data-tag="Psychic">
                                <div className="g-panel-head">
                                    <span className="g-label">Tagged panel</span>
                                    <span className="g-kicker">keyed to element</span>
                                </div>
                                <p className="g-body sg-small-body">
                                    Livery: a corner flash sprayed onto the plate, optionally with the
                                    designation stencilled beside it. Used when a panel belongs to a
                                    specific creature, planet or type.
                                </p>
                            </div>

                            <div className="g-panel g-panel--bolted g-el-signal">
                                <span className="g-label">Bolted</span>
                                <p className="g-body sg-small-body">
                                    Four brass fasteners, one per corner. For panels that should read as
                                    structural rather than decorative.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ---- 04 readouts ---- */}
                    <section id="readouts" className="sg-section">
                        {this.renderSectionHead('04', 'Readouts',
                            'Everything the machine reports, in its own monospaced voice. Tabular throughout, so digits line up in columns and a value that ticks upward never shoves the layout sideways. Anything lit sits behind glass, in the terminal’s own phosphor; anything painted is matte and printed on the hull.')}

                        <div className="sg-grid-2">
                            <div className="g-panel g-el-plant">
                                <div className="g-panel-head">
                                    <span className="g-label">Specification</span>
                                    <span className="g-kicker">key / value</span>
                                </div>
                                <div className="g-spec">
                                    <span className="g-spec-key">Designation</span>
                                    <span className="g-spec-val">Kosanos</span>
                                    <span className="g-spec-key">Index</span>
                                    <span className="g-spec-val">#00015</span>
                                    <span className="g-spec-key">Origin</span>
                                    <span className="g-spec-val">Floria</span>
                                    <span className="g-spec-key">Height</span>
                                    <span className="g-spec-val">93 in / 236 cm</span>
                                    <span className="g-spec-key">Mass</span>
                                    <span className="g-spec-val">830 lbs / 376 kg</span>
                                </div>
                            </div>

                            <div className="g-panel g-el-water">
                                <div className="g-panel-head">
                                    <span className="g-label">Manifest</span>
                                    <span className="g-kicker">tabular data</span>
                                </div>
                                <table className="g-data">
                                    <thead>
                                        <tr><th>Move</th><th>Type</th><th>Rating</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>Glacial Slash</td><td>Ice</td><td>12</td></tr>
                                        <tr><td>Corrosive Impact</td><td>Chemical</td><td>7</td></tr>
                                        <tr><td>Mighty Pinch</td><td>—</td><td>8</td></tr>
                                        <tr><td>Poisonous Kick</td><td>Chemical</td><td>7</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="g-panel g-panel--bolted sg-mb-lg">
                            <div className="g-panel-head">
                                <span className="g-label">Cathode readout</span>
                                <span className="g-kicker">the only lit thing on the machine</span>
                            </div>
                            <div className="sg-screen-layout">
                                <div className="g-screen">
                                    <p className="g-screen-line">XALIAN GENERATOR / TELYPSO UNIT 04</p>
                                    <p className="g-screen-line g-screen-line--dim">SCRAMBLER TOKEN ACCEPTED</p>
                                    <p className="g-screen-line g-screen-line--dim">DECRYPTING GENOME . . . . . . OK</p>
                                    <p className="g-screen-line">SPECIES &nbsp; HYPNOPET</p>
                                    <p className="g-screen-line">ELEMENTS &nbsp;PSYCHIC / DARK</p>
                                    <p className="g-screen-line g-screen-line--dim">PLAGUE IMMUNITY CONFIRMED</p>
                                    <p className="g-screen-line">READY TO PRINT_</p>
                                </div>
                                <div className="g-screen g-el-ice sg-screen-figure">
                                    <span className="g-readout">1,204</span>
                                    <span className="g-readout-unit">stat score</span>
                                </div>
                            </div>
                        </div>

                        <div className="g-panel g-el-fire">
                            <div className="g-panel-head">
                                <span className="g-label">Stat block</span>
                                <span className="g-kicker">lit segments = current · dim = potential</span>
                            </div>
                            {STATS.map((s) => this.renderMeter(s))}
                        </div>
                    </section>

                    {/* ---- 05 controls ---- */}
                    <section id="controls" className="sg-section">
                        {this.renderSectionHead('05', 'Controls',
                            'Moulded keys that sit proud of the panel and travel when you press them. The committing action wears the terminal’s accent, and there is only ever one on screen. Disabled reads as unpowered rather than faded, so the legend stays legible.')}

                        <div className="sg-grid-2">
                            <div className="g-panel">
                                <div className="g-panel-head">
                                    <span className="g-label">Keys</span>
                                    <span className="g-kicker">press one</span>
                                </div>
                                <div className="sg-btn-row">
                                    <button className="g-btn g-btn--primary" type="button">Generate</button>
                                    <button className="g-btn" type="button">Secondary</button>
                                    <button className="g-btn g-btn--danger" type="button">Release</button>
                                    <button className="g-btn" type="button" disabled>Unpowered</button>
                                </div>

                                <hr className="g-seam-rule" />

                                <p className="g-kicker sg-mb">Input</p>
                                <input className="g-input" placeholder="SEARCH THE GALAXY'S TERMS" aria-label="Demo search" />
                            </div>

                            <div className="g-panel">
                                <div className="g-panel-head">
                                    <span className="g-label">Selector</span>
                                    <span className="g-kicker">key bank</span>
                                </div>
                                <div className="g-segmented" >
                                    {['grid', 'stats', 'size'].map((c) => (
                                        <button
                                            key={c}

                                            type="button"
                                            aria-pressed={this.state.channel === c}
                                            className="g-segment"
                                            onClick={() => this.setState({ channel: c })}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                                <p className="g-body sg-small-body sg-mt">
                                    Key <span className="g-mono">{this.state.channel}</span> is thrown. Selector keys light in the
                                    terminal&rsquo;s accent rather than moving an underline.
                                </p>

                                <hr className="g-seam-rule" />

                                <p className="g-kicker sg-mb">Slider</p>
                                <label className="sg-range-label" htmlFor="sg-range-demo">
                                    <span className="g-label">Power</span>
                                    <span className="g-mono">{this.state.power}</span>
                                </label>
                                <input
                                    id="sg-range-demo"
                                    className="g-range"
                                    type="range"
                                    max={100}
                                    value={this.state.power}
                                    onChange={(e) => this.setState({ power: e.target.value })} />
                                <p className="g-body sg-small-body sg-mt">
                                    A recessed channel with a moulded knob — the same two shadows every other
                                    control uses, so a slider reads as hardware rather than as a browser default.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ---- 06 specimen ---- */}
                    <section id="specimen" className="sg-section">
                        {this.renderSectionHead('06', 'Specimen',
                            'Everything above, assembled. This is the shape most of the site should take: a creature mounted behind glass in a brass bezel, with its identity, its energy signature and its numbers printed on the plate beside it.')}

                        <div className="g-panel g-panel--tagged g-el-psychic sg-specimen-card">
                            <div className="sg-specimen-mount">
                                <div className="g-specimen">
                                    <div className="g-specimen-inner">
                                        <XalianImage colored speciesName="Hypnopet" primaryType="Psychic" moreClasses="sg-specimen-img" />
                                    </div>
                                </div>
                            </div>

                            <div className="sg-specimen-body">
                                <div className="g-panel-head">
                                    <span className="g-label">Specimen record</span>
                                    <span className="g-lamp">Viable</span>
                                </div>

                                <h3 className="g-h2 sg-specimen-name">Hypnopet</h3>
                                <p className="g-mono sg-specimen-id">#00028</p>

                                <div className="sg-chip-row sg-mb">
                                    <span className="g-chip g-el-psychic">Psychic</span>
                                    <span className="g-chip g-el-dark">Dark</span>
                                </div>

                                <p className="g-body sg-small-body">
                                    Created by the Telypso Generator as a therapy animal for the insane Vallerii
                                    imprisoned on that world, where its empathic healing balanced the patients it
                                    was assigned to.
                                </p>

                                <hr className="g-seam-rule" />

                                {STATS.slice(0, 4).map((s) => this.renderMeter(s))}
                            </div>
                        </div>
                    </section>

                    <footer className="sg-footer">
                        <span className="g-kicker">End of reference · Xalian Generator console</span>
                    </footer>
                </div>
            </div>
        );
    }
}

export default StyleGuidePage;
