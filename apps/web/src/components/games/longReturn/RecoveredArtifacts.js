import React from 'react';
import { MISSION } from './longReturnData';

export function recoveredArtifacts(journal, status) {
  const routeAt = sceneId => {
    const entry = journal.find(item => item.id === sceneId);
    if (!entry) return null;
    return entry.routeId ?? MISSION.scenes.find(scene => scene.id === sceneId)?.routes.find(route => route.title === entry.route)?.id;
  };
  const artifacts = [];
  const index = routeAt('nemesis-index');
  if (index === 'stabilize') artifacts.push({ id: 'plates', name: 'Nemesis Index plates', detail: 'Readable plates recovered from the stasis field.' });
  if (index === 'blackbox') artifacts.push({ id: 'blackbox', name: 'Nemesis Index blackbox', detail: 'The essential record in its sealed backup.' });
  if (status === 'complete' || status === 'extracted') {
    const spine = routeAt('generator-spine');
    if (spine === 'align') artifacts.push({ id: 'core', name: 'Complete control core', detail: 'The whole assembly brought clear of the turning rings.' });
    if (spine === 'closure') artifacts.push({ id: 'spindle', name: 'Memory spindle', detail: 'The record-bearing spindle taken from the larger assembly.' });
  }
  return artifacts;
}

export default function RecoveredArtifacts({ journal, status }) {
  const artifacts = recoveredArtifacts(journal, status);
  if (!artifacts.length) return null;
  return <section className="lr-recovered-artifacts" aria-label="Recovered objects">
    {artifacts.map(artifact => <figure key={artifact.id}>
      <svg viewBox="0 0 96 80" role="img" aria-label={artifact.name} fill="none" stroke="currentColor" strokeWidth="2.5">
        {artifact.id === 'plates' && <g><path d="M20 23 L63 12 L78 48 L34 61 Z M20 33 L34 71 L78 58 M20 43 L34 79 L78 68" /><path d="M34 28 L58 22 M39 38 L65 31 M44 47 L65 41" opacity=".55" /></g>}
        {artifact.id === 'blackbox' && <g><path d="M19 25 L62 15 L78 30 V60 L35 72 L19 56 Z M19 25 L35 40 L78 30 M35 40 V72" /><path d="M47 44 L62 40 V53 L47 57 Z" /></g>}
        {artifact.id === 'core' && <g><circle cx="48" cy="40" r="31" /><ellipse cx="48" cy="40" rx="16" ry="31" /><ellipse cx="48" cy="40" rx="31" ry="13" /><rect x="43" y="22" width="10" height="36" rx="3" /></g>}
        {artifact.id === 'spindle' && <g><path d="M43 10 H53 V70 H43 Z M34 22 H62 M32 31 H64 M32 40 H64 M32 49 H64 M34 58 H62" /><path d="M38 15 H58 M38 65 H58" opacity=".55" /></g>}
      </svg>
      <figcaption><strong>{artifact.name}</strong><p>{artifact.detail}</p></figcaption>
    </figure>)}
  </section>;
}
