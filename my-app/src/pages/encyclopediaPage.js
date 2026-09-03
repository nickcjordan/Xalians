import React, { useEffect, useRef } from 'react';
import { Switch, Route, useRouteMatch, useLocation } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import EncyclopediaShell from '../components/encyclopedia/EncyclopediaShell';
import ReadingRoom from '../components/encyclopedia/ReadingRoom';
import Chronicle from '../components/encyclopedia/Chronicle';
import EraView from '../components/encyclopedia/EraView';
import Reader from '../components/encyclopedia/Reader';
import Worlds from '../components/encyclopedia/Worlds';
import WorldView from '../components/encyclopedia/WorldView';
import Bestiary from '../components/encyclopedia/Bestiary';
import SpeciesView from '../components/encyclopedia/SpeciesView';
import Powers from '../components/encyclopedia/Powers';
import Index from '../components/encyclopedia/Index';
import EntryView from '../components/encyclopedia/EntryView';
import Tour from '../components/encyclopedia/Tour';

/**
 * ENCYCLOPEDIA XALIA — the Generator's archive.
 *
 * Route shell only. Every section is its own component under
 * components/encyclopedia/, and every one of them reads data through
 * src/lore (never the JSON). Contract: docs/design/xalian-encyclopedia-page.md
 */
export default function EncyclopediaPage() {
    const { path } = useRouteMatch();
    const location = useLocation();
    // null until the first effect runs, so a cold load with a hash still
    // scrolls to its anchor (a bookmark or a shared chapter link).
    const prevPathname = useRef(null);

    // React Router v5 does not reset scroll on navigation. Reset to the top
    // on a route change (a different pathname), unless the new location
    // carries a hash: then let the target element's scrollIntoView win.
    // A search-only change (same pathname, different query string) leaves
    // scroll position alone.
    useEffect(() => {
        const firstRun = prevPathname.current === null;
        const pathnameChanged = prevPathname.current !== location.pathname;
        prevPathname.current = location.pathname;
        if (!pathnameChanged) return;
        // On a cold load without a hash the browser is already at the top.
        if (firstRun && !location.hash) return;

        // Bootstrap reboot sets `scroll-behavior: smooth` on :root (unless
        // the visitor prefers reduced motion). Suspending it via inline
        // style only takes effect once the browser has recalculated style,
        // so force a reflow before scrolling or the smooth animation still
        // plays from whatever it last cascaded from.
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        // eslint-disable-next-line no-unused-expressions
        root.offsetHeight;

        if (location.hash) {
            const id = location.hash.slice(1);
            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({ block: 'start' });
                root.style.scrollBehavior = previousScrollBehavior;
                return;
            }
        }
        window.scrollTo(0, 0);
        root.style.scrollBehavior = previousScrollBehavior;
    }, [location.pathname, location.hash]);

    return (
        <div className="g-console enc-console">
            <XalianNavbar />
            <EncyclopediaShell>
                <Switch>
                    <Route exact path={`${path}`}><ReadingRoom /></Route>
                    <Route exact path={`${path}/chronicle`}><Chronicle /></Route>
                    <Route exact path={`${path}/chronicle/:era`}><EraView /></Route>
                    <Route exact path={`${path}/read`}><Reader /></Route>
                    <Route exact path={`${path}/read/:era`}><Reader /></Route>
                    <Route exact path={`${path}/worlds`}><Worlds /></Route>
                    <Route exact path={`${path}/worlds/:key`}><WorldView /></Route>
                    <Route exact path={`${path}/species`}><Bestiary /></Route>
                    <Route exact path={`${path}/species/:key`}><SpeciesView /></Route>
                    <Route exact path={`${path}/powers`}><Powers /></Route>
                    <Route exact path={`${path}/index`}><Index /></Route>
                    <Route exact path={`${path}/index/:key`}><EntryView /></Route>
                    <Route exact path={`${path}/tour`}><Tour /></Route>
                    <Route exact path={`${path}/tour/:beat`}><Tour /></Route>
                    <Route><p className="g-empty">No record at this address.</p></Route>
                </Switch>
            </EncyclopediaShell>
        </div>
    );
}
