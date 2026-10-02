import React from 'react';
import { SIGNAL_AVAILABLE, SIGNAL_READ } from './fieldDiscovery';
import { SERVICE_LINE } from './crossingFinds';

// A presentation of the existing room. Only reported or encountered danger is visible.
export default function FloodedCorridorScene({ crew, scout, position, routeId, beat, brineKnown, flags = [], actor, find }) {
  const completed = position.crew === 'exit';
  const swimming = routeId === 'intake';
  const returning = beat === 'return';
  const lane = swimming ? 340 : 155;
  const location = completed ? 'Crew at the turbine hall'
    : returning ? 'Scout returning to the crew'
    : position.crew === 'crossing' ? swimming ? 'Moving through the intake' : 'Crossing the suspended gantry'
      : position.crew === 'approach' ? swimming ? 'Crew entering the intake' : 'Crew at the gantry'
        : position.scout === 'survey' ? position.signal ? 'A report reaches the crew' : 'Scout ahead, crew at the seal' : 'Crew at the outer seal';
  const tokens = crew.map((member, index) => {
    const ahead = member.id === scout?.id && position.scout === 'survey';
    const crossing = position.crew === 'crossing' || position.crew === 'approach';
    const x = completed ? 790 : ahead && !returning ? 360 : crossing ? (beat === 'move' ? 225 : 525) : 110;
    const y = completed ? 250 : ahead && !returning ? member.element.primary === 'water' ? 340 : 190 : crossing ? lane : 250;
    return { member, index, x: x + (index - 1) * 42, y, place: ahead ? returning ? 'returning' : 'survey' : position.crew };
  });
  const cableTaken = flags.includes(SERVICE_LINE) || find?.id === SERVICE_LINE;
  const cableBroken = flags.includes('gantry-line-broken') || find?.id === 'gantry-line-broken';
  const bypass = flags.includes('coolant-bypass');
  return <figure data-expedition-map data-map-scene="service-throat" className="lr-corridor-map">
    <figcaption><strong>{location}</strong><span>Flooded corridor</span></figcaption>
    <svg viewBox="0 70 900 430" role="img" aria-label={`${location}. Suspended gantry above the flood; intake passage below. ${crew.map((c, i) => `${i + 1}: ${c.species}`).join('. ')}.${brineKnown ? ' Electric charge in the intake water.' : ''}${bypass ? ' The lower bypass is draining.' : ''}${cableTaken ? ' Recovered cable at the far landing.' : ''}`}>
      <defs><linearGradient id="lr-corridor-water" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#254846" stopOpacity=".55" /><stop offset="1" stopColor="#102329" stopOpacity=".9" /></linearGradient></defs>
      <path className="lr-corridor-wall" d="M35 90 H865 V425 H35 Z" />
      <path className="lr-corridor-water" d="M185 290 Q215 282 245 290 T365 290 T485 290 T605 290 T725 290 V420 H185 Z" fill="url(#lr-corridor-water)" />
      <path className="lr-corridor-current" d="M205 335 Q350 375 510 345 T715 340 M215 370 Q360 410 520 380 T700 370" />
      <path className="lr-corridor-current" d="M490 336 l20 9 -18 13 M650 359 l20 9 -18 13" />
      <path className={`lr-corridor-route ${routeId === 'gantry' ? 'is-selected' : ''}`} d="M155 245 L225 155 H340 M380 155 H520 M560 155 H665 L745 245" />
      <path className="lr-corridor-support" d="M230 90 V155 M330 90 V155 M525 90 V155 M660 90 V155" />
      <path className="lr-corridor-break" d="M338 155 l8 12 16 -20 18 8 M518 155 l12 13 14 -22 16 9" />
      <path className={`lr-corridor-swim ${swimming ? 'is-selected' : ''}`} d="M155 270 Q210 360 350 350 T665 340 Q740 320 755 270" />
      {!cableTaken && <path data-corridor-cable className="lr-corridor-cable" strokeDasharray={cableBroken ? '5 9' : undefined} d="M530 105 Q585 105 585 205 Q585 240 550 235 Q530 230 555 215" />}
      <path className="lr-corridor-landing" d="M45 185 H175 V310 H45 Z M725 185 H855 V310 H725 Z" />
      <text x="110" y="355">Outer seal</text><text x="790" y="355">Turbine hall</text>
      <text x="420" y="122">Suspended gantry</text><text x="440" y="445">Flooded intake</text>
      {brineKnown && <g data-visible-brine className="lr-corridor-charge"><path d="M420 285 l-16 34 h27 l-14 35 M560 295 l-14 30 h23 l-12 30" /><text x="505" y="400">Electric charge</text></g>}
      {bypass && <g data-corridor-consequence="coolant-bypass"><path className="lr-corridor-bypass" d="M665 370 V435 H805" /><path className="lr-corridor-current" d="M745 429 l12 6 -12 6" /><text x="765" y="474">Bypass draining</text></g>}
      {completed && flags.includes('quiet-entry') && <g data-corridor-consequence="quiet-entry"><path className="lr-corridor-support" d="M790 140 a20 20 0 1 0 1 0 M790 120 V160 M770 140 H810" /><text x="790" y="105">Turbines quiet</text></g>}
      {completed && cableTaken && <g data-corridor-find={SERVICE_LINE}><path className="lr-corridor-cable" d="M810 285 a16 10 0 1 0 1 0 M800 298 l-12 15" /><text x="780" y="388">Cable recovered</text></g>}
      {completed && cableBroken && <text data-corridor-find="gantry-line-broken" x="600" y="210">Cable snapped</text>}
      {completed && flags.includes(SIGNAL_AVAILABLE) && <g data-corridor-signal={flags.includes(SIGNAL_READ) ? 'read' : 'unread'}><rect x="827" y="203" width="12" height="15" rx="2" /><circle cx="833" cy="210" r="4" className={flags.includes(SIGNAL_READ) ? '' : 'lr-corridor-lamp'} /><text x="805" y="170">Service signal</text></g>}
      {position.signal && <path data-map-signal className="lr-corridor-report" d="M340 185 Q240 100 120 220" />}
      {tokens.map(({ member, index, x, y, place }) => <g key={member.id} data-map-creature={member.id} data-location={place} className="lr-corridor-creature" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <title>{member.species}: {place === 'survey' ? 'scouting ahead' : place === 'exit' ? 'at the far landing' : place}</title>
        {member.id === scout?.id && beat === 'observe' && <circle className="lr-corridor-sensing" r="27" />}
        <circle r={member.id === actor?.id ? 20 : 16} /><text y="5">{index + 1}</text>
      </g>)}
    </svg>
    <div className="lr-corridor-key">{crew.map((member, index) => <span key={member.id}><b>{index + 1}</b> {member.species}</span>)}</div>
  </figure>;
}
