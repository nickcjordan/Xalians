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

    // Height of whatever is actually pinned to the viewport top (a sticky or
    // fixed header/rail), plus a token gap, so an anchor target doesn't land
    // flush under it or underneath it. Only elements that are actually
    // position: sticky/fixed count -- the masthead scrolls with the page, so
    // it must not be subtracted as if it always covered the top of the
    // viewport. Read live (not memoized) since this can vary by breakpoint
    // and by which sticky rail (if any) is present on the current route.
    function headerOffset() {
        const styles = getComputedStyle(document.documentElement);
        const gap = parseFloat(styles.getPropertyValue('--g-8')) || 0;
        let pinnedHeight = 0;
        document.querySelectorAll('.enc-header, .g-header, header').forEach((el) => {
            const position = getComputedStyle(el).position;
            if (position !== 'sticky' && position !== 'fixed') return;
            const rect = el.getBoundingClientRect();
            // Only counts while actually pinned at (or above) the top edge.
            if (rect.top <= 0 && rect.bottom > 0) {
                pinnedHeight = Math.max(pinnedHeight, rect.bottom);
            }
        });
        return pinnedHeight + gap;
    }

    function scrollToHash(hash) {
        const id = hash.slice(1);
        const target = document.getElementById(id);
        if (!target) return false;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
        window.scrollTo(0, Math.max(0, top));
        return true;
    }

    // React Router v5 does not reset scroll on navigation. Reset to the top
    // on a route change (a different pathname), unless the new location
    // carries a hash: then let the target element's scrollIntoView win. A
    // hash-only change on the *same* pathname (e.g. a Connections sample
    // link to another chapter on the page already open) also scrolls to the
    // new target -- it just skips the top-reset fallback, since there is
    // nothing to reset to. A search-only change (hash unchanged) leaves
    // scroll position alone.
    const prevHash = useRef(location.hash);
    useEffect(() => {
        const firstRun = prevPathname.current === null;
        const pathnameChanged = prevPathname.current !== location.pathname;
        const hashChanged = prevHash.current !== location.hash;
        prevPathname.current = location.pathname;
        prevHash.current = location.hash;
        if (!pathnameChanged && !hashChanged) return;
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
            if (scrollToHash(location.hash)) {
                root.style.scrollBehavior = previousScrollBehavior;
                return;
            }
        }
        if (pathnameChanged) window.scrollTo(0, 0);
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
