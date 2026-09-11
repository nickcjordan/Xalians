// Terminal: field. Long Return is survey work on the salvaged ECHELON unit.
import React from 'react';
import '../../styles/legacy/immersive.css';
import XalianNavbar from '../../components/navbar';
import LongReturnGame from '../../components/games/longReturn/longReturnGame';

function LongReturnPage() {
  return (
    <div className="g-console lr-console" data-terminal="field">
      <XalianNavbar />
      <div className="g-shell">
        <header className="g-masthead">
          <div className="g-masthead-heading">
            <p className="g-kicker">Field terminal</p>
            <h1 className="g-title">Long Return</h1>
          </div>
        </header>
      </div>
      <LongReturnGame />
    </div>
  );
}

export default LongReturnPage;
