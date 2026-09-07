import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import LoreSearch from './LoreSearch';
import TrailStrip from './TrailStrip';
import BackToTop from './BackToTop';

const SECTIONS = [
    { to: '/encyclopedia', label: 'Reading Room', exact: true },
    { to: '/encyclopedia/story', label: 'The Story' },
    { to: '/encyclopedia/worlds', label: 'Worlds' },
    { to: '/encyclopedia/species', label: 'Bestiary' },
    { to: '/encyclopedia/powers', label: 'Powers' },
    { to: '/encyclopedia/index', label: 'Index' },
];

/**
 * Core frame (round3-coherence.md rule 3): navbar (rendered by the page),
 * .g-shell, .g-masthead, then the desk object at full shell width. The
 * masthead is fixed core content -- kicker and title do not change per
 * route; the object's own designation (the nameplate) sits in the aside.
 * The section key bank, the request slip and the outlet all live inside
 * the desk (.g-desk.g-object), which is lit by its own lamp pool the way
 * every other terminal's object is.
 */
export default function EncyclopediaShell({ children }) {
    const masthead = lore.getMasthead();
    const location = useLocation();
    const history = useHistory();
    const sectionsRef = useRef(null);

    function pullRecord() {
        const record = lore.getRandomRecord();
        history.push(lore.routeFor(record.kind, record.key));
    }

    const activeTo = (() => {
        const hit = SECTIONS.find((s) => (s.exact ? location.pathname === s.to : location.pathname.startsWith(s.to)));
        return hit ? hit.to : null;
    })();

    // Keep the active station in view when the bank scrolls horizontally at
    // phone widths, without scrolling the page itself.
    useEffect(() => {
        const nav = sectionsRef.current;
        if (!nav) return;
        const active = nav.querySelector('.g-segment[aria-pressed="true"]');
        if (active && active.scrollIntoView) {
            active.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
    }, [activeTo]);

    return (
        <div className="g-shell enc-shell">
            <header className="g-masthead">
                <div className="g-masthead-heading">
                    <p className="g-kicker">Archive</p>
                    <h1 className="g-title">{masthead.title}</h1>
                </div>
                <div className="g-masthead-aside">
                    <span className="g-nameplate">Poseidas Deep Archive</span>
                </div>
            </header>
            <div className="g-desk g-object enc-desk">
                <div className="enc-desk-tools">
                    <nav ref={sectionsRef} className="g-segmented enc-sections enc-scrollrow" aria-label="Encyclopedia sections">
                        {SECTIONS.map((s) => {
                            const active = s.to === activeTo;
                            return (
                                <NavLink key={s.to} to={s.to} className="g-segment" aria-pressed={active} aria-current={active ? 'page' : undefined}>
                                    {s.label}
                                </NavLink>
                            );
                        })}
                    </nav>
                    <div className="enc-desk-slip">
                        <LoreSearch key={location.pathname} />
                        <button type="button" className="g-btn enc-btn-small enc-pull-record" onClick={pullRecord}>
                            <span className="enc-btn-label-full">Pull a record</span>
                            <span className="enc-btn-label-short">Pull</span>
                        </button>
                    </div>
                </div>
                <p className="g-mono enc-version">canon rev. {masthead.version}</p>
                <div className="enc-body">{children}</div>
            </div>
            <TrailStrip />
            <BackToTop />
        </div>
    );
}
