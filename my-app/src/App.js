import './App.css';
import Home from './pages/home';
import ProjectPage from './pages/projectPage';
import FAQPage from './pages/faqPage';
import PlanetPage from './pages/planetPage';
import SpeciesPage from './pages/speciesPage';
import SpeciesDetailPage from './pages/speciesDetailPage';
import DesignerPage from './pages/designerPage';
import GlossaryPage from './pages/glossaryPage';
import GeneratorPage from './pages/generatorPage';
import UserAccountPage from './pages/userAccountPage';
import UserDetailsPage from './pages/userDetailsPage';
import CommunityPage from './pages/communityPage';
import Sandbox from './pages/sandbox';
import TestPage from './pages/testPage';
import Sandboxtwo from './pages/sandboxtwo';
import React from "react";
import XalianNavbar from './components/navbar';
import Container from 'react-bootstrap/Container';
import MatchCardGamePage from './pages/games/matchCardGamePage';
import PhysicsGamePage from './pages/games/physicsGamePage';
import TrainingGroundsPage from './pages/trainingGroundsPage';

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';

Amplify.configure(awsconfig);



class App extends React.Component {

  render() {

    return (
      <React.Fragment>
        <Router>
          <div>
            <Switch>
              <Route exact path="/"><Home /></Route>
              <Route exact path="/generator"><GeneratorPage /></Route>
              <Route exact path="/project"><ProjectPage /></Route>
              <Route exact path="/faq"><FAQPage /></Route>
              <Route exact path="/species"><SpeciesPage /></Route>
                <Route exact path="/species/:id"
                  render={({ match }) => <SpeciesDetailPage id={match.params.id} />}
                />
                <Route exact path="/user/:id"
                  render={({ match }) => <UserDetailsPage id={match.params.id} />}
                />
              <Route exact path="/planets"><PlanetPage /></Route>
              <Route exact path="/designer"><DesignerPage /></Route>
              <Route exact path="/glossary"><GlossaryPage /></Route>
              <Route exact path="/account"><UserAccountPage /></Route>
              <Route exact path="/community"><CommunityPage /></Route>
              <Route exact path="/sandbox"><Sandbox /></Route>
              <Route exact path="/sandboxtwo"><Sandboxtwo /></Route>
              <Route exact path="/train"><TrainingGroundsPage /></Route>
                <Route exact path="/train/match"><MatchCardGamePage /></Route>
                <Route exact path="/train/physics"><PhysicsGamePage /></Route>
              <Route exact path="/test"><TestPage /></Route>
            </Switch>
          </div>
        </Router>
      </React.Fragment>
    );
  }

}

export default App;
