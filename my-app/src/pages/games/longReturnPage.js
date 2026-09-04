import React from 'react';
import XalianNavbar from '../../components/navbar';
import LongReturnGame from '../../components/games/longReturn/longReturnGame';

function LongReturnPage() {
  return (
    <div className="g-console lr-console">
      <XalianNavbar />
      <LongReturnGame />
    </div>
  );
}

export default LongReturnPage;
