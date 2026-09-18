import React from 'react';
import BiIcon from './BiIcon';
import { scoutCommunication } from './scoutCommunication';

export default function EncounterSituation({ mode, scout, native, outlook, informed, priorResponseId }) {
  if (mode !== 'scout') return <div className="lr-encounter-situation" aria-label="Encounter situation">
    <span><BiIcon cls={`bi ${informed ? 'bi-eye-fill' : 'bi-exclamation-diamond-fill'}`} />{priorResponseId === 'mark' ? 'Controls marked · crew avoids surprise' : informed ? 'Crew warned before contact' : 'Crew caught unaware · +1 energy to respond'}</span>
  </div>;

  const timing = outlook?.posture === 'scout-first'
    ? `${scout.species} spots ${native.species} first`
    : outlook?.posture === 'native-first'
      ? `${native.species} spots ${scout.species} first · +1 energy to respond`
      : 'Both notice each other';
  const signal = outlook?.channel
    ? `${scoutCommunication(outlook.channel).label} reach the crew`
    : `${scout.species} must return—or be retrieved · up to 1 energy spent, 1 stability lost`;
  return <div className="lr-encounter-situation" aria-label="Encounter situation">
    <span><BiIcon cls="bi bi-eye-fill" />{timing}</span>
    <span><BiIcon cls={`bi ${outlook?.channel ? 'bi-broadcast-pin' : 'bi-arrow-return-left'}`} />{signal}</span>
  </div>;
}
