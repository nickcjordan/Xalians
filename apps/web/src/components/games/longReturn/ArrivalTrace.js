import React from 'react';
import { MAP_PLACES } from './mapPlaces';

// A resolved station diagram, not a replay of creature motion.
export default function ArrivalTrace({ scene, route, crew = [], companion }) {
  const place = MAP_PLACES[scene.id];
  if (!place) return null;
  const origin = place.entry.join(' ');
  const destination = place.exit.join(' ');
  const ally = companion?.creature || companion;
  return <figure className="lr-arrival-trace" data-arrival-trace role="img" aria-label={`After ${route.title}, the crew has traveled from ${origin} to ${destination}.${ally ? ` ${ally.species} is with them.` : ''}`}>
    <figcaption>{route.title}</figcaption>
    <div aria-hidden="true" className="lr-arrival-trace-line">
      <span>{origin}</span>
      <i />
      <span className="lr-arrival-trace-destination"><span className="lr-arrival-trace-party">{crew.map((member, index) => <b key={member.id} title={member.species}>{index + 1}</b>)}{ally && <b className="is-ally" title={ally.species}>◆</b>}</span><strong>{destination}</strong></span>
    </div>
  </figure>;
}
