import React from 'react';
import BiIcon from './BiIcon';
import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';
import { readinessState } from './longReturnEngine';

export default function ExpeditionReserves({ crew, strain, pressure }) {
  const stability = MAX_INSTABILITY - pressure;
  return <div className="lr-wizard-resources" aria-label="Expedition resources">
    <span className={`is-stability${stability <= 1 ? ' is-critical' : ''}`} role="group" aria-label={`Annex stability: ${stability} of ${MAX_INSTABILITY}`}>
      <BiIcon cls="bi-building" /><b>{stability}</b><small>Stability</small>
      {stability <= 1 && <em className="lr-reserve-warning">{stability === 0 ? 'Forced exit' : 'Collapse near'}</em>}
    </span>
    {crew.map(member => {
      const load = strain[member.id] || 0;
      const state = readinessState(load);
      const warning = state.id === 'spent' ? "Can't act" : state.id === 'critical' ? "Can't scout" : state.id === 'worn' ? 'Weakened' : null;
      return <span key={member.id} className={`is-${state.id}`} title={state.detail} role="group" aria-label={`${member.species}: ${MAX_STRAIN - load} of ${MAX_STRAIN} energy${warning ? `, ${warning}` : ''}`}>
        <BiIcon cls="bi-lightning-charge-fill" /><b>{MAX_STRAIN - load}</b><small>{member.species}</small>{warning && <em className="lr-reserve-warning">{warning}</em>}
      </span>;
    })}
  </div>;
}
