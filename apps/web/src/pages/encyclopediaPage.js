// Tier: chrome. Reference reading -- browses and searches the archive, no play surface.
import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router';
import * as lore from '../lore';
import XalianNavbar from '../components/navbar';
import EncyclopediaShell from '../components/encyclopedia/EncyclopediaShell';
import ReadingRoom from '../components/encyclopedia/ReadingRoom';
import Story from '../components/encyclopedia/Story';
import Worlds from '../components/encyclopedia/Worlds';
import WorldView from '../components/encyclopedia/WorldView';
import Bestiary from '../components/encyclopedia/Bestiary';
import SpeciesView from '../components/encyclopedia/SpeciesView';
import Powers from '../components/encyclopedia/Powers';
import Index from '../components/encyclopedia/Index';
import EntryView from '../components/encyclopedia/EntryView';
import { EmptyState } from '@/components/system/record';

/**
 * Retired-route redirects: First Survey, Chronicle and Read collapsed into
 * one section, The Story (docs/design/xalian-encyclopedia-story-pass.md).
 * Each preserves the incoming hash (a chronicle event anchor, a read-part
 * anchor) onto the story address it now resolves to.
 */
function RedirectToEra() {
    const { era } = useParams();
    const location = useLocation();
    return <Navigate replace to={{ pathname: lore.routeFor('era', era), search: location.search, hash: location.hash }} />;
}

function RedirectToStory() {
    const location = useLocation();
    return <Navigate replace to={{ pathname: lore.routeFor('story'), search: location.search, hash: location.hash }} />;
}

function RedirectTourBeat() {
    const { beat } = useParams();
    const location = useLocation();
    const to = lore.getEraForBeat(beat) ? lore.routeFor('tour', beat) : lore.routeFor('story');
    const [pathname, routeHash] = to.split('#');
    return (
        <Navigate
            replace
            to={{ pathname, search: location.search, hash: location.hash || (routeHash ? `#${routeHash}` : '') }}
        />
    );
}

function RedirectTour() {
    const location = useLocation();
    return <Navigate replace to={{ pathname: lore.routeFor('story'), search: location.search, hash: location.hash }} />;
}

/**
 * ENCYCLOPEDIA XALIA - the Generator's archive.
 *
 * Route shell only. Every section is its own component under
 * components/encyclopedia/, and every one of them reads data through
 * src/lore (never the JSON). Contract: docs/design/xalian-encyclopedia-story-pass.md
 */
export default function EncyclopediaPage() {
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

    // React Router does not reset scroll on navigation. Reset to the top
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
        <main className="min-h-screen bg-room font-body text-ink" data-tier="chrome">
            <XalianNavbar />
            <EncyclopediaShell>
                <Routes>
                    <Route index element={<ReadingRoom />} />
                    <Route path="story" element={<Story />} />
                    <Route path="story/:era" element={<Story />} />
                    <Route path="worlds" element={<Worlds />} />
                    <Route path="worlds/:key" element={<WorldView />} />
                    <Route path="species" element={<Bestiary />} />
                    <Route path="species/:key" element={<SpeciesView />} />
                    <Route path="powers" element={<Powers />} />
                    <Route path="index" element={<Index />} />
                    <Route path="index/:key" element={<EntryView />} />
                    {/* Retired routes: First Survey, Chronicle and Read collapsed into
                        The Story (docs/design/xalian-encyclopedia-story-pass.md). */}
                    <Route path="tour" element={<RedirectTour />} />
                    <Route path="tour/:beat" element={<RedirectTourBeat />} />
                    <Route path="chronicle" element={<RedirectToStory />} />
                    <Route path="chronicle/:era" element={<RedirectToEra />} />
                    <Route path="read" element={<RedirectToStory />} />
                    <Route path="read/:era" element={<RedirectToEra />} />
                    <Route path="*" element={<EmptyState legend="Not found">No record at this address.</EmptyState>} />
                </Routes>
            </EncyclopediaShell>
        </main>
    );
}
