// Immersive play tier: an instrument diagram, not a literal floor plan or animation.
import React from 'react';
import { MISSION } from './longReturnData';
import { MAP_ROUTES } from './expeditionPosition';
import { visibleWorldFlags } from './routeVisuals';

const positions = { entry: [74, 98], survey: [225, 98], crossing: [304, 48], exit: [526, 98] };

export default function ExpeditionSchematic({ scene, crew = [], scout, position = { crew: 'entry' }, routeId, native, nativeState, companion, runFlags = [], compact = false, preview = false }) {
  const sceneIndex = Math.max(0, MISSION.scenes.findIndex(item => item.id === scene.id));
  const routeIndex = scene.routes.findIndex(route => route.id === routeId);
  const currentLane = routeIndex === 1 ? 148 : 48;
  const flags = visibleWorldFlags(scene, runFlags);
  const ally = nativeState === 'ally' ? native : companion?.creature || companion;
  const contact = nativeState === 'ally' ? null : native;
  const contactLane = scene.encounter?.routeId === scene.routes[1]?.id ? 148 : 48;
  const location = position.crew === 'exit' ? 'Crew across' : position.scout === 'survey' ? 'Scout ahead · crew waiting' : position.crew === 'crossing' ? 'Crew on the crossing' : 'Crew at the entrance';
  const tokens = crew.map((member, i) => {
    const place = member.id === scout?.id && position.scout ? position.scout : position.crew;
    const point = [...(positions[place] || positions.entry)];
    if (place === 'crossing') point[1] = currentLane;
    if (place === 'survey' && contact) { point[0] = 320; point[1] = contactLane; }
    point[0] += (i - 1) * 23;
    return { member, number: i + 1, point, place };
  });
  const signalFrom = tokens.find(token => token.member.id === scout?.id)?.point || positions.survey;
  return <figure data-tier="immersive" data-expedition-map data-crew-position={position.crew} className="m-0 min-w-0 border-y border-edge bg-s0 text-ink">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-small font-body"><strong>{location}</strong><span className="text-ink-2">{preview ? 'Route preview · crew has not moved' : 'Site schematic'}</span></figcaption>
    <div className="flex items-center gap-1 px-4 pt-3" aria-label={`Site position: ${scene.trackLabel}, sector ${sceneIndex + 1} of ${MISSION.scenes.length}`}>
      {MISSION.scenes.map((item, i) => <React.Fragment key={item.id}>
        {i > 0 && <span aria-hidden="true" className={`h-px flex-1 ${i <= sceneIndex ? 'bg-viable' : 'bg-edge-strong'}`} />}
        <span title={`${item.trackLabel}${item.objective ? ' · mission objective' : item.optional ? ' · optional depth' : ''}`} aria-current={i === sceneIndex ? 'location' : undefined} className={`flex h-7 w-7 shrink-0 items-center justify-center border text-small ${i === sceneIndex ? 'border-viable bg-viable-tint text-viable' : 'border-edge-strong text-ink-2'} ${item.optional ? 'rounded-full' : ''}`}>{i < sceneIndex ? '✓' : item.objective ? '◎' : i + 1}</span>
      </React.Fragment>)}
    </div>
    <div className="flex justify-between px-4 pt-1 text-small text-ink-2"><span>{scene.trackLabel}</span><span>{sceneIndex < 4 || (sceneIndex === 4 && position.crew !== 'exit') ? '◎ Recover the Index' : '◎ Index reached'}</span></div>
    <svg viewBox="0 0 600 200" style={{ width: '100%', height: 'auto', maxHeight: compact ? 160 : 240 }} className="block [&_text]:text-heading!" role="img" aria-label={`${location}. ${tokens.map(token => `${token.member.species}: ${token.place === 'survey' ? 'scouting ahead' : token.place === 'exit' ? 'far side' : token.place}`).join('. ')}. ${scene.routes.map(route => MAP_ROUTES[route.id] || route.title).join(' or ')} lead to the far side.`}>
      <rect x="18" y="64" width="112" height="68" rx="6" fill="var(--color-s1)" stroke="var(--color-edge-strong)" />
      <rect x="470" y="64" width="112" height="68" rx="6" fill="var(--color-s1)" stroke="var(--color-edge-strong)" />
      <text x="74" y="156" textAnchor="middle" fill="var(--color-ink-2)" className="text-small">Entrance</text>
      <text x="526" y="156" textAnchor="middle" fill="var(--color-ink-2)" className="text-small">Far side</text>
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
        <title>{member.species}: {place === 'survey' ? 'scouting ahead' : place === 'exit' ? 'across with the crew' : place}</title>
        <circle r="12" fill="var(--color-viable)" stroke="var(--color-s0)" strokeWidth="2" />
        <text textAnchor="middle" y="5" fill="var(--color-viable-ink)" className="text-small">{number}</text>
      </g>)}
      {contact && <g transform={`translate(370 ${scene.encounter?.routeId === scene.routes[1]?.id ? 148 : 48})`}><title>{contact.species}: contact</title><path d="M0 -11 L11 0 L0 11 L-11 0 Z" fill="var(--color-s0)" stroke="var(--color-caution)" strokeWidth="2" /><text x="18" y="5" fill="var(--color-ink)" className="text-small">Contact</text></g>}
      {ally && <g data-map-ally transform={`translate(${position.crew === 'exit' ? 526 : position.scout === 'survey' ? 225 : position.crew === 'crossing' ? 304 : 74} ${position.crew === 'crossing' ? currentLane + 27 : 123})`}><title>{ally.species}: field ally</title><path d="M0 -8 L8 0 L0 8 L-8 0 Z" fill="var(--color-viable)" /></g>}
    </svg>
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-small text-ink-2">{tokens.map(({member, number}) => <span key={member.id}><b className="text-viable">{number}</b> {member.species}</span>)}{contact && <span>◇ {contact.species}</span>}{ally && <span>◆ {ally.species} · Ally</span>}<span className="ml-auto">→ {MISSION.scenes[sceneIndex + 1]?.trackLabel || 'Extraction'}</span></div>
    {flags.length > 0 && <div className="flex flex-wrap gap-3 border-t border-edge px-4 py-2 text-small text-ink-2" aria-label="Lasting site changes">{flags.map(flag => <span key={flag.id}>↳ {flag.label}</span>)}</div>}
  </figure>;
}
