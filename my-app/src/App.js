import './App.css';
import Home from './pages/home';
import species from './json/species.json';
// import ProjectPage from './pages/projectPage';
// import FAQPage from './pages/faqPage';
// import DesignerPage from './pages/designerPage';
// import GeneratorPage from './pages/generatorPage';
// import UserAccountPage from './pages/userAccountPage';
// import UserDetailsPage from './pages/userDetailsPage';
// import CommunityPage from './pages/communityPage';
// import Sandbox from './pages/sandbox';
// import TestPage from './pages/testPage';
// import Sandboxtwo from './pages/sandboxtwo';
// import Sandboxthree from './pages/sandboxthree';
// import MatchCardGamePage from './pages/games/matchCardGamePage';
// import PhysicsGamePage from './pages/games/physicsGamePage';
// import TrainingGroundsPage from './pages/trainingGroundsPage';
// import DuelPage from './pages/games/duelPage';
// import DuelStartPage from './pages/games/duelStartPage';


import XalianNavbar from './components/navbar';
import Container from 'react-bootstrap/Container';
import React, { Suspense, lazy } from 'react';
// import React, { lazy } from 'react';


import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
  Link
} from "react-router-dom";

import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';

import { Provider } from 'react-redux'
import store from './store/store';


// const Home = lazy(() => import('./pages/home'));
const StyleGuidePage = lazy(() => import('./pages/styleGuidePage'));
const GeneratorPage = lazy(() => import('./pages/generatorPage'));
const UserAccountPage = lazy(() => import('./pages/userAccountPage'));
const UserDetailsPage = lazy(() => import('./pages/userDetailsPage'));
const MatchCardGamePage = lazy(() => import('./pages/games/matchCardGamePage'));
const PhysicsGamePage = lazy(() => import('./pages/games/physicsGamePage'));
const TrainingGroundsPage = lazy(() => import('./pages/trainingGroundsPage'));
const DuelPage = lazy(() => import('./pages/games/duelPage'));
const DuelStartPage = lazy(() => import('./pages/games/duelStartPage'));
const ReclamationPage = lazy(() => import('./pages/games/reclamationPage'));
const DuelPlaygroundPage = lazy(() => import('./pages/games/duelPlaygroundPage'));
const EncyclopediaPage = lazy(() => import('./pages/encyclopediaPage'));


// The legacy species detail route accepted either a zero-padded numeric id
// (e.g. "00001") or, per SpeciesDetailPage's own comment, a shorter numeric
// string it pads itself. The encyclopedia's species key is the lowercase
// species name instead, so this redirect resolves the incoming id against
// species.json and hands the result to the new route. An id that matches
// nothing lands on the Bestiary grid rather than a broken page.
function RedirectSpecies({ match }) {
  let inboundId = match.params.id ? match.params.id.toString() : '';
  if (inboundId && inboundId.length < 5 && /^\d+$/.test(inboundId)) {
    inboundId = inboundId.padStart(5, '0');
  }
  let xal = species.find((x) =>
    x.id === inboundId || x.name.toLowerCase() === match.params.id.toLowerCase()
  );
  return <Redirect to={xal ? `/encyclopedia/species/${xal.name.toLowerCase()}` : '/encyclopedia/species'} />;
}

class App extends React.Component {

  render() {
    Amplify.configure(awsconfig);

    return (
      <Provider store={store}>

      
      <React.Fragment>
        <Router>
         <Suspense fallback={<div>Loading...</div>}>
            <Switch>
              <Route exact path="/"><Home /></Route>
              <Route exact path="/generator"><GeneratorPage /></Route>
              {/* legacy lore pages retired in favor of the Encyclopedia (docs/design/xalian-encyclopedia-page.md) */}
              <Route exact path="/species"><Redirect to="/encyclopedia/species" /></Route>
                <Route exact path="/species/:id" component={RedirectSpecies} />
                <Route exact path="/user/:id"
                  render={({ match }) => <UserDetailsPage id={match.params.id} />}
                />
              <Route exact path="/planets"><Redirect to="/encyclopedia/worlds" /></Route>
              <Route exact path="/glossary"><Redirect to="/encyclopedia/index" /></Route>
              <Route path="/encyclopedia"><EncyclopediaPage /></Route>
              {/* the design system reference - unlinked from the navbar, it is a
                  developer tool rather than a page for players */}
              <Route exact path="/styleguide"><StyleGuidePage /></Route>
              {/* the duel's own affordance reference - also a developer tool,
                  also deliberately unlinked */}
              <Route exact path="/duel/reference"><DuelPlaygroundPage /></Route>
              <Route exact path="/duel"><DuelStartPage/></Route>
              <Route exact path="/reclamation"><ReclamationPage/></Route>
              <Route exact path="/account"><UserAccountPage /></Route>
              <Route exact path="/train"><TrainingGroundsPage /></Route>
                <Route exact path="/train/match"><MatchCardGamePage /></Route>
                <Route exact path="/train/physics"><PhysicsGamePage /></Route>
            </Switch>
      </Suspense>
        </Router>
      </React.Fragment>
      </Provider>
    );
  }
  
}

export default App;
