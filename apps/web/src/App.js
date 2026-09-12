import species from '@xalians/content/species.json';
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
import React, { Suspense, lazy } from 'react';
// import React, { lazy } from 'react';


import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router";

import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/system/status';

Amplify.configure(awsconfig);

const Home = lazy(() => import('./pages/home'));
// The style guide imports every design-system primitive and exists only as a
// developer reference. Vite replaces import.meta.env.DEV at build time, so a
// production build drops both this import and the /styleguide route rather
// than emitting a large player-inaccessible chunk.
const includeStyleGuide = import.meta.env.DEV || import.meta.env.MODE === 'styleguide';
const StyleGuidePage = includeStyleGuide
  ? lazy(() => import('./pages/styleGuidePage'))
  : null;
const GeneratorPage = lazy(() => import('./pages/generatorPage'));
const UserAccountPage = lazy(() => import('./pages/userAccountPage'));
const UserDetailsPage = lazy(() => import('./pages/userDetailsPage'));
const RecordPage = lazy(() => import('./pages/recordPage'));
const TradeBuilderPage = lazy(() => import('./pages/tradeBuilderPage'));
const TradePage = lazy(() => import('./pages/tradePage'));
const MatchCardGamePage = lazy(() => import('./pages/games/matchCardGamePage'));
const PhysicsGamePage = lazy(() => import('./pages/games/physicsGamePage'));
const TrainingGroundsPage = lazy(() => import('./pages/trainingGroundsPage'));
const DuelStartPage = lazy(() => import('./pages/games/duelStartPage'));
const ReclamationPage = lazy(() => import('./pages/games/reclamationPage'));
const DuelPlaygroundPage = lazy(() => import('./pages/games/duelPlaygroundPage'));
const EncyclopediaPage = lazy(() => import('./pages/encyclopediaPage'));
const LongReturnPage = lazy(() => import('./pages/games/longReturnPage'));
const NotFoundPage = lazy(() => import('./pages/system/notFoundPage'));
const DevErrorPage = lazy(() => import('./pages/system/devErrorPage'));


// The legacy species detail route accepted either a zero-padded numeric id
// (e.g. "00001") or, per SpeciesDetailPage's own comment, a shorter numeric
// string it pads itself. The encyclopedia's species key is the lowercase
// species name instead, so this redirect resolves the incoming id against
// species.json and hands the result to the new route. An id that matches
// nothing lands on the Bestiary grid rather than a broken page.
function PreserveLocationRedirect({ to }) {
  const location = useLocation();
  return <Navigate replace to={{ pathname: to, search: location.search, hash: location.hash }} />;
}

function RedirectSpecies() {
  const { id = '' } = useParams();
  const location = useLocation();
  let inboundId = id.toString();
  if (inboundId && inboundId.length < 5 && /^\d+$/.test(inboundId)) {
    inboundId = inboundId.padStart(5, '0');
  }
  let xal = species.find((x) =>
    x.id === inboundId || x.name.toLowerCase() === id.toLowerCase()
  );
  const pathname = xal ? `/encyclopedia/species/${xal.name.toLowerCase()}` : '/encyclopedia/species';
  return <Navigate replace to={{ pathname, search: location.search, hash: location.hash }} />;
}

function UserDetailsRoute() {
  const { id } = useParams();
  return <UserDetailsPage id={id} />;
}

function RecordRoute() {
  const { id } = useParams();
  return <RecordPage id={id} />;
}

function TradeRoute() {
  const { id } = useParams();
  return <TradePage id={id} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generator" element={<GeneratorPage />} />
          {/* legacy lore pages retired in favor of the Encyclopedia (docs/design/xalian-encyclopedia-page.md) */}
          <Route path="/species" element={<PreserveLocationRedirect to="/encyclopedia/species" />} />
          <Route path="/species/:id" element={<RedirectSpecies />} />
          <Route path="/user/:id" element={<UserDetailsRoute />} />
          <Route path="/xalian/:id" element={<RecordRoute />} />
          <Route path="/trade/new" element={<TradeBuilderPage />} />
          <Route path="/trade/:id" element={<TradeRoute />} />
          <Route path="/planets" element={<PreserveLocationRedirect to="/encyclopedia/worlds" />} />
          <Route path="/glossary" element={<PreserveLocationRedirect to="/encyclopedia/index" />} />
          <Route path="/encyclopedia/*" element={<EncyclopediaPage />} />
          {/* the design system reference - unlinked from the navbar, it is a
              developer tool rather than a page for players */}
          {StyleGuidePage && <Route path="/styleguide" element={<StyleGuidePage />} />}
          {/* throws on render, to exercise ErrorBoundary/ErrorPage - a developer
              route, unlinked like /styleguide */}
          <Route path="/dev/error" element={<DevErrorPage />} />
          {/* the duel's own affordance reference - also a developer tool,
              also deliberately unlinked */}
          <Route path="/duel/reference" element={<DuelPlaygroundPage />} />
          <Route path="/duel" element={<DuelStartPage />} />
          <Route path="/reclamation" element={<ReclamationPage />} />
          <Route path="/long-return" element={<LongReturnPage />} />
          <Route path="/account" element={<UserAccountPage />} />
          <Route path="/train" element={<TrainingGroundsPage />} />
          <Route path="/train/match" element={<MatchCardGamePage />} />
          <Route path="/train/physics" element={<PhysicsGamePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}

class App extends React.Component {

  render() {
    return (
      <TooltipProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </TooltipProvider>
    );
  }
  
}

export default App;
