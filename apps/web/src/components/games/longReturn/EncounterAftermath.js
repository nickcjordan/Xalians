import React from 'react';
import BiIcon from './BiIcon';
import { CapacityChange } from './FieldExchange';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';

export default function EncounterAftermath({ result, native }) {
  const { energy, stability } = result.resources;
  const energyChanged = energy && energy.before !== energy.after;
  const stabilityChanged = stability.before !== stability.after;
  return <div className="lr-encounter-aftermath">
    {(energyChanged || stabilityChanged) && <div className="lr-encounter-reserves" aria-label="Encounter resource changes">
      {energyChanged && <CapacityChange label={`${result.affected.species} energy`} {...energy} max={MAX_STRAIN} kind="energy" settled />}
      {stabilityChanged && <CapacityChange label="Annex stability" {...stability} max={MAX_INSTABILITY} kind="stability" settled />}
    </div>}
    {result.companion && <div className="lr-companion-promise">
      <span className="lr-companion-charge"><BiIcon cls="bi-shield-check" /><b>1</b><small>assist ready</small></span>
      <div><strong>{native.species} will cover the lead</strong><span><BiIcon cls="bi-lightning-charge-fill" /> Prevents the lead’s next 1 energy loss while crossing</span><small>Automatic · once this expedition</small></div>
    </div>}
    {!energyChanged && !stabilityChanged && <p className="lr-encounter-no-loss"><BiIcon cls="bi-check-circle" /> Energy and stability preserved</p>}
  </div>;
}
