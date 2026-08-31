import './App.css';
import Home from './pages/home';
// import ProjectPage from './pages/projectPage';
// import FAQPage from './pages/faqPage';
// import PlanetPage from './pages/planetPage';
// import SpeciesPage from './pages/speciesPage';
// import SpeciesDetailPage from './pages/speciesDetailPage';
// import DesignerPage from './pages/designerPage';
// import GlossaryPage from './pages/glossaryPage';
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
  Link
} from "react-router-dom";

import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';

import { Provider } from 'react-redux'
import store from './store/store';


// const Home = lazy(() => import('./pages/home'));
const PlanetPage = lazy(() => import('./pages/planetPage'));
const SpeciesPage = lazy(() => import('./pages/speciesPage'));
const SpeciesDetailPage = lazy(() => import('./pages/speciesDetailPage'));
const GlossaryPage = lazy(() => import('./pages/glossaryPage'));
const StyleGuidePage = lazy(() => import('./pages/styleGuidePage'));
const GeneratorPage = lazy(() => import('./pages/generatorPage'));
const UserAccountPage = lazy(() => import('./pages/userAccountPage'));
const UserDetailsPage = lazy(() => import('./pages/userDetailsPage'));
const MatchCardGamePage = lazy(() => import('./pages/games/matchCardGamePage'));
const PhysicsGamePage = lazy(() => import('./pages/games/physicsGamePage'));
const TrainingGroundsPage = lazy(() => import('./pages/trainingGroundsPage'));
const DuelPage = lazy(() => import('./pages/games/duelPage'));
const DuelStartPage = lazy(() => import('./pages/games/duelStartPage'));
const DuelPlaygroundPage = lazy(() => import('./pages/games/duelPlaygroundPage'));


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
              <Route exact path="/species"><SpeciesPage /></Route>
                <Route exact path="/species/:id"
                  render={({ match }) => <SpeciesDetailPage id={match.params.id} />}
                />
                <Route exact path="/user/:id"
                  render={({ match }) => <UserDetailsPage id={match.params.id} />}
                />
              <Route exact path="/planets"><PlanetPage /></Route>
              <Route exact path="/glossary"><GlossaryPage /></Route>
              {/* the design system reference - unlinked from the navbar, it is a
                  developer tool rather than a page for players */}
              <Route exact path="/styleguide"><StyleGuidePage /></Route>
              {/* the duel's own affordance reference - also a developer tool,
                  also deliberately unlinked */}
              <Route exact path="/duel/reference"><DuelPlaygroundPage /></Route>
              <Route exact path="/duel"><DuelStartPage/></Route>
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
