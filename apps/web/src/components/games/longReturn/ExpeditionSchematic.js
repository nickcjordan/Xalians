// Immersive play tier: an instrument diagram, not a literal floor plan or animation.
import React from 'react';
import { MISSION } from './longReturnData';
import { MAP_ROUTES } from './expeditionPosition';
import { visibleWorldFlags } from './routeVisuals';
import { MAP_PLACES } from './mapPlaces';
import MapLandmark from './MapLandmark';
import ExpeditionReserves from './ExpeditionReserves';

const positions = { entry: [74, 98], survey: [225, 98], crossing: [304, 48], exit: [526, 98] };

export default function ExpeditionSchematic({ scene, crew = [], scout, helperId, position = { crew: 'entry' }, routeId, native, nativeState, companion, allyWithScout = false, runFlags = [], compact = false, preview = false, reserves }) {
  const sceneIndex = Math.max(0, MISSION.scenes.findIndex(item => item.id === scene.id));
  const routeIndex = scene.routes.findIndex(route => route.id === routeId);
  const flags = visibleWorldFlags(scene, runFlags);
  const place = MAP_PLACES[scene.id] || { entry: ['Entrance'], exit: ['Far side'], description: '' };
  const ally = nativeState === 'ally' ? native : companion?.creature || companion;
  const contact = nativeState === 'ally' ? null : native;
  const contactLabel = nativeState === 'bypassed' ? 'Still trapped' : 'Contact';
  const contactLane = scene.encounter?.routeId === scene.routes[1]?.id ? 148 : 48;
  const currentLane = position.encounter ? contactLane : routeIndex === 1 ? 148 : 48;
  const location = position.crew === 'exit' ? `Crew at ${place.exit.join(' ')}` : position.scout === 'survey' ? 'Scout ahead · crew waiting' : position.crew === 'crossing' ? 'Crew on the crossing' : `Crew at ${place.entry.join(' ')}`;
  const tokens = crew.map((member, i) => {
    const accompaniesScout = member.id === scout?.id || member.id === helperId;
    const place = accompaniesScout && position.scout ? position.scout : position.crew;
    const point = [...(positions[place] || positions.entry)];
    if (place === 'crossing') point[1] = currentLane;
    if (place === 'survey' && (contact || position.encounter)) { point[0] = 320; point[1] = contactLane; }
    point[0] += (i - 1) * 23;
    return { member, number: i + 1, point, place };
  });
  const signalFrom = tokens.find(token => token.member.id === scout?.id)?.point || positions.survey;
  const allyPlace = allyWithScout && position.scout ? position.scout : position.crew;
  const allyPoint = allyPlace === 'survey' && (contact || position.encounter) ? [320, contactLane] : positions[allyPlace] || positions.entry;
  return <figure data-tier="immersive" data-expedition-map data-map-scene={scene.id} data-crew-position={position.crew} className="m-0 min-w-0 border-y border-edge bg-s0 text-ink">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-small font-body"><strong>{location}</strong><span className="text-ink-2">{preview ? 'Route preview · crew has not moved' : 'Site schematic'}</span></figcaption>
    <div data-site-overview className="flex items-center gap-1 px-4 pt-3" aria-label={`Site position: ${scene.trackLabel}, sector ${sceneIndex + 1} of ${MISSION.scenes.length}`}>
      {MISSION.scenes.map((item, i) => <React.Fragment key={item.id}>
        {i > 0 && <span aria-hidden="true" className={`h-px flex-1 ${i <= sceneIndex ? 'bg-viable' : 'bg-edge-strong'}`} />}
        <span title={`${item.trackLabel}${item.objective ? ' · mission objective' : item.optional ? ' · optional depth' : ''}`} aria-current={i === sceneIndex ? 'location' : undefined} className={`flex h-7 w-7 shrink-0 items-center justify-center border text-small ${i === sceneIndex ? 'border-viable bg-viable-tint text-viable' : 'border-edge-strong text-ink-2'} ${item.optional ? 'rounded-full' : ''}`}>{i < sceneIndex ? '✓' : item.objective ? '◎' : i + 1}</span>
      </React.Fragment>)}
    </div>
    <div data-site-overview className="flex justify-between px-4 pt-1 text-small text-ink-2"><span>{scene.trackLabel}</span><span>{sceneIndex < 4 || (sceneIndex === 4 && position.crew !== 'exit') ? '◎ Recover the Index' : '◎ Index reached'}</span></div>
    <svg viewBox="0 0 600 200" style={{ width: '100%', height: 'auto', maxHeight: compact ? 160 : 240 }} className="block [&_text]:text-heading!" role="img" aria-label={`${location}. ${place.description} ${tokens.map(token => `${token.member.species}: ${token.place === 'survey' ? 'scouting ahead' : token.place === 'exit' ? place.exit.join(' ') : token.place === 'entry' ? place.entry.join(' ') : token.place}`).join('. ')}. ${scene.routes.map(route => MAP_ROUTES[route.id] || route.title).join(' or ')} lead to ${place.exit.join(' ')}.`}>
      <rect x="18" y="64" width="112" height="68" rx="6" fill="var(--color-s1)" stroke="var(--color-edge-strong)" />
      <rect x="470" y="64" width="112" height="68" rx="6" fill="var(--color-s1)" stroke="var(--color-edge-strong)" />
      {[['entry', 74], ['exit', 526]].map(([side, x]) => <text key={side} data-map-threshold={side} x={x} y="158" textAnchor="middle" fill="var(--color-ink-2)" className="text-small">{place[side].map((line, index) => <tspan key={line} x={x} dy={index ? 25 : 0}>{line}</tspan>)}</text>)}
      <MapLandmark kind={place.landmark} />
      {scene.routes.map((route, i) => {
        const y = i === 0 ? 48 : 148;
        const selected = route.id === routeId;
        return <g key={route.id} data-map-route={route.id}>
          <path d={`M130 98 H164 V${y} H438 V98 H470`} fill="none" stroke={selected ? 'var(--color-viable)' : 'var(--color-edge-strong)'} strokeWidth={selected ? 3 : 2} strokeDasharray={selected && preview ? '5 5' : undefined} />
          <text x="300" y={i === 0 ? 26 : 179} textAnchor="middle" fill={selected ? 'var(--color-ink)' : 'var(--color-ink-2)'} className="text-small">{MAP_ROUTES[route.id] || route.title}</text>
        </g>;
      })}
      {position.scout === 'survey' && <path d="M130 98 H222" fill="none" stroke="var(--color-edge-strong)" strokeDasharray="3 5" />}
      {position.signal && <g><path d={`M${signalFrom[0]} ${signalFrom[1] - 15} Q160 40 94 76`} fill="none" stroke="var(--color-viable)" strokeDasharray="4 4" /><text x="164" y="65" textAnchor="middle" fill="var(--color-viable)" className="text-small">Report ↙</text></g>}
      {tokens.map(({ member, number, point, place }) => <g key={member.id} data-map-creature={member.id} data-location={place} style={{ transform: `translate(${point[0]}px, ${point[1]}px)` }} className="transition-transform duration-200 motion-reduce:transition-none">
        <title>{`${member.species}: ${place === 'survey' ? 'scouting ahead' : place === 'exit' ? 'across with the crew' : place}`}</title>
        <circle r="12" fill="var(--color-viable)" stroke="var(--color-s0)" strokeWidth="2" />
        <text textAnchor="middle" y="5" fill="var(--color-viable-ink)" className="text-small">{number}</text>
      </g>)}
      {contact && <g data-map-native data-state={nativeState || 'contact'} transform={`translate(370 ${scene.encounter?.routeId === scene.routes[1]?.id ? 148 : 48})`}><title>{`${contact.species}: ${contactLabel.toLowerCase()}`}</title><path d="M0 -11 L11 0 L0 11 L-11 0 Z" fill="var(--color-s0)" stroke={nativeState === 'bypassed' ? 'var(--color-ink-2)' : 'var(--color-caution)'} strokeWidth="2" /></g>}
      {ally && <g data-map-ally data-location={allyPlace} transform={`translate(${allyPoint[0]} ${allyPlace === 'crossing' ? currentLane + 27 : allyPoint[1] + 25})`}><title>{`${ally.species}: ${allyPlace === 'survey' ? 'beside the scout' : 'with the crew'}`}</title><path d="M0 -8 L8 0 L0 8 L-8 0 Z" fill="var(--color-viable)" /></g>}
    </svg>
    {reserves && <ExpeditionReserves crew={crew} strain={reserves.strain} pressure={reserves.pressure} />}
    {(!reserves || contact || ally) && <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-small text-ink-2">{!reserves && tokens.map(({member, number}) => <span key={member.id}><b className="text-viable">{number}</b> {member.species}</span>)}{contact && <span>◇ {contact.species}{nativeState === 'bypassed' ? ' · Still trapped' : ''}</span>}{ally && <span>◆ {ally.species} · Ally</span>}{!reserves && <span data-site-next className="ml-auto">→ {MISSION.scenes[sceneIndex + 1]?.trackLabel || 'Extraction'}</span>}</div>}
    {flags.length > 0 && <div data-site-overview className="flex flex-wrap gap-3 border-t border-edge px-4 py-2 text-small text-ink-2" aria-label="Lasting site changes">{flags.map(flag => <span key={flag.id}>↳ {flag.label}</span>)}</div>}
  </figure>;
}
