// Immersive play tier: crew reserves double as the schematic's numbered key.
import React from 'react';
import BiIcon from './BiIcon';
import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';
import { readinessState } from './longReturnEngine';

export default function ExpeditionReserves({ crew, strain, pressure }) {
  const stability = MAX_INSTABILITY - pressure;
  return <div data-tier="immersive" data-expedition-reserves className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 pb-3 font-body text-small text-ink-2" aria-label="Expedition resources and map key">
    <span data-reserve-stability className={`flex flex-wrap items-center gap-1 ${stability <= 1 ? 'text-caution' : ''}`} role="group" aria-label={`Annex stability: ${stability} of ${MAX_INSTABILITY}`}>
      <BiIcon cls="bi-building" className="size-3.5" /><small className="text-small">Stability</small><b className="text-body tabular-nums">{stability}</b><span>/{MAX_INSTABILITY}</span>
      {stability <= 1 && <em data-reserve-warning className="basis-full text-small not-italic">{stability === 0 ? 'Forced exit' : 'Collapse near'}</em>}
    </span>
    {crew.map((member, index) => {
      const load = strain[member.id] || 0;
      const state = readinessState(load);
      const warning = state.id === 'spent' ? "Can't act" : state.id === 'critical' ? "Can't scout" : state.id === 'worn' ? 'Weakened' : null;
      return <span key={member.id} data-reserve-creature={member.id} className={`flex flex-wrap items-center gap-1 ${state.id === 'spent' || state.id === 'critical' ? 'text-caution' : ''}`} title={state.detail} role="group" aria-label={`${member.species}: ${MAX_STRAIN - load} of ${MAX_STRAIN} energy${warning ? `, ${warning}` : ''}`}>
        <span className="text-viable" aria-hidden="true">{index + 1}</span><small className="whitespace-nowrap text-small">{member.species}</small><BiIcon cls="bi-lightning-charge-fill" className="size-3.5" /><b className="text-body tabular-nums">{MAX_STRAIN - load}</b>{warning && <em data-reserve-warning className="basis-full text-small not-italic">{warning}</em>}
      </span>;
    })}
  </div>;
}
