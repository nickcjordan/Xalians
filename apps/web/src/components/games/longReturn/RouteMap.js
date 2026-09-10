import React from 'react';
import { routeVisualFor, visibleWorldFlags } from './routeVisuals';
import { sceneArtFor } from './sceneArt';
import BiIcon from './BiIcon';
import './routeMap.css';

export default function RouteMap({ scene, activeRouteId, runFlags = [], encounterStatus = null }) {
  const art = sceneArtFor(scene);
  const flags = visibleWorldFlags(scene, runFlags);
  return <figure className={`lr-route-map is-${art.tone}${activeRouteId ? ' has-focus' : ''}`} style={{ '--route-map-art': `url(${art.src})`, '--route-map-accent': art.accent }} aria-label="Route preview">
    <div className="lr-route-map__plate" aria-hidden="true" />
    <div className="lr-route-map__origin"><BiIcon cls="bi bi-people-fill" /><span>Crew</span></div>
    {scene.routes.map((route) => {
      const visual = routeVisualFor(route);
      const active = route.id === activeRouteId;
      const unknown = route.hazardIds?.some((id) => !scene.hazards.find((hazard) => hazard.id === id)?.revealed);
      return <div key={route.id} className={`lr-route-map__path is-${visual.lane}${active ? ' is-active' : ''}${unknown ? ' has-unknown' : ''}`} data-route={route.id} aria-hidden={!active}>
        <i className="lr-route-map__line" />
        <span><BiIcon cls={`bi ${visual.icon}`} /><b>{active ? visual.verb : route.title}</b>{unknown && <em><BiIcon cls="bi bi-question-diamond-fill" /> Unknown danger</em>}</span>
      </div>;
    })}
    <div className="lr-route-map__destination"><BiIcon cls="bi bi-geo-alt-fill" /><span>{scene.destination}</span></div>
    {encounterStatus && <div className={`lr-route-map__encounter is-${encounterStatus.resolution}`} aria-label={`Native encounter: ${encounterStatus.label}`}><BiIcon cls={`bi ${encounterStatus.companion ? 'bi-person-check-fill' : encounterStatus.resolution === 'unresolved' ? 'bi-exclamation-diamond-fill' : encounterStatus.resolution === 'detour' ? 'bi-signpost-split-fill' : 'bi-unlock-fill'}`} /><span>{encounterStatus.label}</span></div>}
    {flags.length > 0 && <div className="lr-route-map__memory" aria-label="World changes affecting this scene">{flags.map((flag) => <span key={flag.id} className={flag.className}><BiIcon cls={`bi ${flag.icon}`} />{flag.label}</span>)}</div>}
    <figcaption>{activeRouteId ? 'Live route preview · selection is still reversible' : 'Point to a route to trace it through the scene'}</figcaption>
  </figure>;
}
