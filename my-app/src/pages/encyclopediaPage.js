import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import EncyclopediaShell from '../components/encyclopedia/EncyclopediaShell';
import ReadingRoom from '../components/encyclopedia/ReadingRoom';
import Chronicle from '../components/encyclopedia/Chronicle';
import EraView from '../components/encyclopedia/EraView';
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
    return (
        <div className="g-console enc-console">
            <XalianNavbar />
            <EncyclopediaShell>
                <Switch>
                    <Route exact path={`${path}`}><ReadingRoom /></Route>
                    <Route exact path={`${path}/chronicle`}><Chronicle /></Route>
                    <Route exact path={`${path}/chronicle/:era`}><EraView /></Route>
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
