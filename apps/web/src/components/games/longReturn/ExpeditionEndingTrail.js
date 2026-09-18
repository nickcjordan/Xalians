// Tier: immersive. The mission's route is a record of visited places, not a creature performance.
import React from 'react';
import { MISSION } from './longReturnData';

export function lastPassageMemory(entries = []) {
  const last = entries.at(-1);
  if (!last) return null;
  const arrival = last.story?.split(/\n\s*\n/).filter(Boolean).at(-1) || last.story || '';
  const memory = arrival.match(/[^.!?]+[.!?](?:\s+|$)/g)?.slice(0, 2).map(sentence => sentence.trim()).join(' ') || arrival;
  return { scene: last.scene, route: last.route, lead: last.lead, memory };
}

export default function ExpeditionEndingTrail({ entries = [], objectiveReached }) {
  const completed = Math.min(entries.length, MISSION.scenes.length);
  const last = lastPassageMemory(entries);
  return <section data-tier="immersive" data-ending-trail className="my-5 border-y border-edge py-4 text-left" aria-label={`Expedition route: ${completed} of ${MISSION.scenes.length} crossings completed; Index ${objectiveReached ? 'secured' : 'not secured'}`}>
    <div className="mb-3 flex items-center justify-between gap-3 text-small text-ink-2"><strong className="font-legend font-medium uppercase tracking-legend">The route taken</strong><span className="font-data tabular-nums">{completed} / {MISSION.scenes.length}</span></div>
    <ol className="m-0 flex list-none items-center p-0" aria-label="Sectors visited">
      {MISSION.scenes.map((scene, index) => <li key={scene.id} className={`flex min-w-0 items-center ${index ? 'flex-1' : ''}`}>
        {index > 0 && <span aria-hidden="true" className={`h-px min-w-1 flex-1 ${index < completed ? 'bg-viable' : 'bg-edge-strong'}`} />}
        <span data-ending-sector={scene.id} data-visited={index < completed ? 'true' : 'false'} title={`${index + 1}. ${scene.title}${index < completed ? ' crossed' : ' not visited'}`} aria-label={`${index + 1}. ${scene.title}: ${index < completed ? 'crossed' : 'not visited'}${scene.objective ? objectiveReached ? ', Index secured' : ', Index not secured' : ''}`} className={`flex size-8 shrink-0 items-center justify-center border font-data text-small tabular-nums ${index < completed ? 'border-viable bg-viable-tint text-viable' : 'border-edge-strong text-ink-2'} ${scene.optional ? 'rounded-full' : ''}`}>
          {scene.objective ? '◎' : index < completed ? '✓' : index + 1}
        </span>
      </li>)}
    </ol>
    {last && <div data-ending-memory className="mt-5 max-w-[62ch]">
      <p className="mb-2 font-legend text-small uppercase tracking-legend text-ink-2">Last crossing · {last.scene}</p>
      <p className="mb-1 font-body text-body text-ink">{last.memory}</p>
      <p className="m-0 font-body text-small text-ink-2">{last.lead} led · {last.route}</p>
    </div>}
  </section>;
}
