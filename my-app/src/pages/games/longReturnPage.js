// Terminal: panel (baseline). Target: field. Long Return is survey work on the salvaged ECHELON unit.
import React from 'react';
import XalianNavbar from '../../components/navbar';
import LongReturnGame from '../../components/games/longReturn/longReturnGame';

function LongReturnPage() {
  return (
    <div className="g-console lr-console" data-terminal="panel">
      <XalianNavbar />
      <LongReturnGame />
    </div>
  );
}

export default LongReturnPage;
