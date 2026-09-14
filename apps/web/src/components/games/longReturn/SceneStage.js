import React from 'react';
import XalianImage from '../../xalianImage';
import { PHASE_PRESENTATION, sceneArtFor } from './sceneArt';
import { visibleWorldFlags } from './routeVisuals';
import BiIcon from './BiIcon';
import './sceneStage.css';

export default function SceneStage({ scene, phase, crew = [], scout = null, encounter = null, companion = null, compact = false, runFlags = [] }) {
  const art = sceneArtFor(scene);
  const presentation = PHASE_PRESENTATION[phase] || PHASE_PRESENTATION.route;
  const visibleCrew = scout && ['scout', 'scan-result'].includes(phase) ? [scout] : crew.slice(0, 3);
  const worldFlags = visibleWorldFlags(scene, runFlags);
  const worldClasses = worldFlags.map((flag) => flag.className).join(' ');

  return (
    <div className={`lr-scene-stage is-${phase}${compact ? ' is-compact' : ''} ${worldClasses}`} style={{ '--scene-art': `url(${art.src})`, '--scene-accent': art.accent }} data-scene={scene.id}>
      <div className="lr-scene-stage__plate" aria-hidden="true" />
      <div className="lr-scene-stage__scan" aria-hidden="true" />
      <div className="lr-scene-stage__signals" aria-hidden="true"><i /><i /><i /></div>
      <div className="lr-scene-stage__crew" aria-hidden="true">
        {visibleCrew.map((member, index) => <span key={member.id} style={{ '--crew-index': index }}>
          <XalianImage variant="token" speciesName={member.species} primaryType={member.element.primary} fill="#050705" stroke="#c9efe0" strokeWidth="1" unPadded moreClasses="lr-stage-silhouette" />
        </span>)}
      </div>
      {encounter && <div className="lr-scene-stage__contact" aria-hidden="true"><XalianImage variant="token" speciesName={encounter.species} primaryType={encounter.element.primary} fill="#030403" stroke="#f0c94e" strokeWidth="1.2" unPadded moreClasses="lr-stage-silhouette" /></div>}
      {companion && <div className={`lr-scene-stage__companion${companion.ready ? ' is-ready' : ' is-spent'}`} aria-label={`${companion.creature.species} field companion; ${companion.ready ? 'ready to intervene' : 'intervention used'}`}><XalianImage variant="token" speciesName={companion.creature.species} primaryType={companion.creature.element.primary} fill="#030403" stroke="#74ffb0" strokeWidth="1.2" unPadded moreClasses="lr-stage-silhouette" /><span><BiIcon cls="bi bi-person-check-fill" /> Field ally</span></div>}
      <div className="lr-scene-stage__hud">
        <span><BiIcon cls={`bi ${presentation.icon}`} /> {presentation.label}</span>
        <strong>{scene.deck}</strong>
      </div>
      {worldFlags.length > 0 && <div className="lr-scene-stage__memory" aria-label="Lasting changes in this sector">{worldFlags.map((flag) => <span key={flag.id}><BiIcon cls={`bi ${flag.icon}`} />{flag.label}</span>)}</div>}
      <div className="lr-scene-stage__caption">
        <small>{phase === 'scout' ? `Searching ${scene.surveyFocus}` : phase === 'scan-result' ? 'Scout telemetry marked on route map' : phase === 'encounter' ? 'Movement interrupts the expedition' : phase === 'result' ? 'The crew has reached the far threshold' : scene.destination}</small>
      </div>
    </div>
  );
}
