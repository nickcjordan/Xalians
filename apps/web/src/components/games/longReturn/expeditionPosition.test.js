import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expeditionPosition, MAP_ROUTES } from './expeditionPosition';
import ExpeditionSchematic from './ExpeditionSchematic';
import { MISSION } from './longReturnData';
import { MAP_PLACES } from './mapPlaces';

describe('expedition location, not creature performance', () => {
  const scout = { id: 'scout' };
  it('route and lead selection never move the crew', () => {
    expect(expeditionPosition({ phase: 'assign' }).crew).toBe('entry');
  });
  it('sending a report is not physical return', () => {
    expect(expeditionPosition({ phase: 'scan-result', scout, scan: { mode: 'scan', relay: true, returned: true } })).toEqual({ crew: 'entry', scout: 'survey', signal: true });
    expect(expeditionPosition({ phase: 'assign', scout, scan: { mode: 'debrief', returned: true } }).scout).toBe(null);
  });
  it('physical return reunites markers only at its final beat', () => {
    expect(expeditionPosition({ actionType: 'scout-return', beat: 'return' }).scout).toBe('survey');
    expect(expeditionPosition({ actionType: 'scout-return', beat: 'complete' }).scout).toBe('entry');
  });
  it('all crew arrive together, including the reserve', () => {
    expect(expeditionPosition({ actionType: 'crossing', beat: 'move' }).crew).toBe('crossing');
    expect(expeditionPosition({ actionType: 'crossing', beat: 'complete' }).crew).toBe('exit');
    expect(expeditionPosition({ phase: 'result' }).crew).toBe('exit');
  });
  it('scout and whole-crew encounters use distinct positions', () => {
    expect(expeditionPosition({ phase: 'encounter', encounterMode: 'scout' })).toMatchObject({ crew: 'entry', scout: 'survey' });
    expect(expeditionPosition({ phase: 'encounter', encounterMode: 'crew' })).toMatchObject({ crew: 'crossing', scout: null });
    expect(expeditionPosition({ actionType: 'encounter-response', encounterMode: 'crew', resolution: 'detour' }).crew).toBe('entry');
  });
  it('every route has an everyday spatial label', () => {
    MISSION.scenes.flatMap(scene => scene.routes).forEach(route => expect(MAP_ROUTES[route.id]).toBeTruthy());
  });
  it('each arrival threshold becomes the next scene entrance', () => {
    MISSION.scenes.forEach((scene, index) => {
      const place = MAP_PLACES[scene.id];
      expect(place.description).toBeTruthy();
      expect(place.landmark).toBeTruthy();
      if (index) expect(place.entry).toEqual(MAP_PLACES[MISSION.scenes[index - 1].id].exit);
    });
    expect(MAP_PLACES[MISSION.scenes.at(-1).id].exit.join(' ')).toBe('Surface lift');
  });
  it('renders recognizable stationary terrain and named destinations in every room', () => {
    MISSION.scenes.forEach(scene => {
      const place = MAP_PLACES[scene.id];
      const html = renderToStaticMarkup(<ExpeditionSchematic scene={scene} crew={[{id:'lead',species:'Lead'}]} position={{crew:'exit'}} />);
      expect(html).toContain(`data-map-landmark="${place.landmark}"`);
      expect(html).toContain(`Crew at ${place.exit.join(' ')}`);
      expect(html).toContain(place.description);
      expect(html).toContain('data-map-threshold="entry"');
      expect(html).toContain('data-map-threshold="exit"');
      expect(html).not.toContain('animateTransform');
      scene.hazards.forEach(hazard => expect(html).not.toContain(hazard.label));
    });
  });
  it('places a called helper beside the scout, without moving the reserve', () => {
    const crew = [{ id: 'scout', species: 'Scout' }, { id: 'helper', species: 'Helper' }, { id: 'reserve', species: 'Reserve' }];
    const html = renderToStaticMarkup(<ExpeditionSchematic scene={MISSION.scenes[1]} crew={crew} scout={crew[0]} helperId="helper" position={{ crew: 'entry', scout: 'survey' }} />);
    expect(html).toContain('data-map-creature="helper" data-location="survey"');
    expect(html).toContain('data-map-creature="reserve" data-location="entry"');
    const returned = renderToStaticMarkup(<ExpeditionSchematic scene={MISSION.scenes[1]} crew={crew} scout={crew[0]} helperId="helper" position={{ crew: 'entry', scout: 'entry' }} />);
    expect(returned).toContain('data-map-creature="helper" data-location="entry"');
  });
  it('does not leak undiscovered contacts or hazard names', () => {
    const scene = MISSION.scenes[1];
    const html = renderToStaticMarkup(<ExpeditionSchematic scene={scene} crew={[]} />);
    expect(html).not.toContain('Contact');
    expect(html).not.toContain(scene.encounter.title);
    scene.hazards.forEach(hazard => expect(html).not.toContain(hazard.label));
    expect(html).not.toContain('lr-scout-performer');
  });
  it('can combine the numbered crew key with actual reserves without repeating names', () => {
    const crew = [{id:'lead',species:'Hippochamp'}, {id:'support',species:'Graviclaw'}];
    const html = renderToStaticMarkup(<ExpeditionSchematic scene={MISSION.scenes[0]} crew={crew} reserves={{strain:{lead:5,support:6},pressure:9}} />);
    expect(html).toContain('data-expedition-reserves');
    expect(html).toContain('Hippochamp: 1 of 6 energy');
    expect(html).toContain('Graviclaw: 0 of 6 energy');
    expect(html).toContain('Collapse near');
    expect(html.match(/>Hippochamp</g)).toHaveLength(1);
    expect(html.match(/>Graviclaw</g)).toHaveLength(1);
  });
  it('an existing ally does not silently accompany a solo scout', () => {
    const props = {scene:MISSION.scenes[3], companion:{species:'Xylum'}, position:{crew:'entry',scout:'survey'}};
    expect(renderToStaticMarkup(<ExpeditionSchematic {...props} />)).toContain('data-map-ally="true" data-location="entry"');
    const joined = renderToStaticMarkup(<ExpeditionSchematic {...props} allyWithScout />);
    expect(joined).toContain('data-map-ally="true" data-location="survey"');
    expect(joined).toContain('Xylum: beside the scout');
    const returned = renderToStaticMarkup(<ExpeditionSchematic {...props} allyWithScout position={{crew:'entry',scout:'entry'}} />);
    expect(returned).toContain('data-map-ally="true" data-location="entry"');
    const arrived = renderToStaticMarkup(<ExpeditionSchematic {...props} allyWithScout position={{crew:'exit',scout:null}} />);
    expect(arrived).toContain('data-map-ally="true" data-location="exit"');
  });
});
