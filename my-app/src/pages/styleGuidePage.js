import React from 'react';
import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';
import tokens from '../constants/designTokens';

/**
 * GENERATOR CONSOLE — the design system reference.
 *
 * Rendered from the same tokens and classes the site uses, so it cannot drift
 * from reality. If something here looks wrong, the system is wrong.
 */

const ELEMENTS = Object.keys(tokens.themeColors);

const SECTIONS = [
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

class StyleGuidePage extends React.Component {

    state = { channel: 'grid' };

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

    render() {
        return (
            <div className="g-console">
                <XalianNavbar />

                <div className="g-shell sg-page">

                    {/* ---- masthead ---- */}
                    <header className="sg-masthead">
                        <p className="g-label">Xalian Generator</p>
                        <h1 className="g-title">Console Design System</h1>
                        <p className="g-body">
                            The machine can bioengineer life on a dead world. The interface it does that
                            through is enamelled steel, brass and bakelite, because the empire that built it
                            was industrial rather than futuristic. Panels are matte objects and never glow.
                            The only light in the room comes from a small green CRT bolted into the hull, and
                            from the indicator lamps beside it.
                        </p>
                        <div className="sg-masthead-status">
                            <span className="g-lamp">Generator online</span>
                            <span className="g-lamp g-lamp--amber">Plague containment nominal</span>
                            <span className="g-lamp g-lamp--off">APEX link severed</span>
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

                    {/* ---- 01 foundation ---- */}
                    <section id="foundation" className="sg-section">
                        {this.renderSectionHead('01', 'Foundation',
                            'The hull is olive enamel, bone silkscreen and oxidised brass. Nothing structural is saturated, which is exactly why the element hues and the hazard livery read instantly when they turn up.')}

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
                                <span className="g-kicker">oswald · barlow · ibm plex mono</span>
                            </div>
                            <p className="g-kicker">Silkscreen label</p>
                            <h3 className="g-h3">Stencil — painted on the hull</h3>
                            <p className="g-body">
                                Body copy sits in Barlow at a comfortable measure. It carries the lore and the
                                explanations — the only place the interface speaks in sentences rather than
                                in values stamped onto metal.
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
                    </section>

                    {/* ---- 02 elements ---- */}
                    <section id="elements" className="sg-section">
                        {this.renderSectionHead('02', 'Element Energy',
                            'The fourteen element hues are the fixed point of the whole system — fire is red because fire is red. They get painted onto the hull as a colour band, printed onto labels, and lit in the bulbs of a meter. Key any container to an element and everything inside it retunes.')}

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
                            'Pressed steel under olive enamel, bolted to the frame. Depth is a bevel — light along the top edge, shadow underneath — plus rivets where a real panel would need them. No panel emits light, and that restraint is what makes the screens matter.')}

                        <div className="sg-grid-3">
                            <div className="g-panel">
                                <span className="g-label">Standard</span>
                                <p className="g-body sg-small-body">Olive enamel. Holds most content.</p>
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
                            <div className="g-panel g-panel--tagged g-el-psychic">
                                <div className="g-panel-head">
                                    <span className="g-label">Tagged panel</span>
                                    <span className="g-kicker">keyed to element</span>
                                </div>
                                <p className="g-body sg-small-body">
                                    A band of the element's colour painted along the top edge. Used when a
                                    panel belongs to a specific creature, planet or type.
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
                            'Everything the machine reports, in its own monospaced voice. Tabular throughout, so digits line up in columns and a value that ticks upward never shoves the layout sideways. Anything phosphor-green sits behind glass; anything bone-white is printed on metal.')}

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
                            'Moulded keys that sit proud of the panel and travel when you press them. The committing action wears hazard paint, and there is only ever one on screen. Disabled reads as unpowered rather than faded, so the legend stays legible.')}

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
                                    Key <span className="g-mono">{this.state.channel}</span> is thrown. Selector keys light in hazard
                                    paint rather than moving an underline.
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
