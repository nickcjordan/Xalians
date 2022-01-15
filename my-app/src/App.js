import './App.css';
import Home from './pages/home';
import ExplorePage from './pages/explore';
import ProjectPage from './pages/projectPage';
import FAQPage from './pages/faqPage';
import PlanetPage from './pages/planetPage';
import SpeciesPage from './pages/speciesPage';
import SpeciesDetailPage from './pages/speciesDetailPage';
import DesignerPage from './pages/designerPage';
import React from "react";
import XalianNavbar from './components/navbar';
import Container from 'react-bootstrap/Container';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

class App extends React.Component {

  render() {

    return (
      <React.Fragment>


        <Router>
          <div>
            <Switch>
              <Route exact path="/"><Home /></Route>
              <Route exact path="/engine"><ExplorePage /></Route>
              <Route exact path="/project"><ProjectPage /></Route>
              <Route exact path="/faq"><FAQPage /></Route>
              <Route exact path="/species"><SpeciesPage /></Route>
                <Route exact path="/species/:id"
                  render={({ match }) => <SpeciesDetailPage id={match.params.id} />}
                />
              <Route exact path="/planets"><PlanetPage /></Route>
              <Route exact path="/designer"><DesignerPage /></Route>
            </Switch>
          </div>
        </Router>
      </React.Fragment>
    );
  }

}

export default App;
