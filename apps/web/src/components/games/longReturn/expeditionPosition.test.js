import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expeditionPosition, MAP_ROUTES, nativeMapState } from './expeditionPosition';
import ExpeditionSchematic from './ExpeditionSchematic';
import { MISSION } from './longReturnData';
import { MAP_PLACES, SHARED_PASSAGES } from './mapPlaces';
import { applyMissionMemory } from './longReturnEngine';

describe('expedition location, not creature performance', () => {
  it('shows intervention choices at the same obstacle, not fictional bypass corridors', () => {
    for (const scene of MISSION.scenes) {
      for (const route of scene.routes) {
        const root = document.createElement('div');
        root.innerHTML = renderToStaticMarkup(<ExpeditionSchematic scene={scene} routeId={route.id} preview crew={[{id:'lead',species:'Lead'}]} position={{crew:'crossing'}} />);
        if (SHARED_PASSAGES[scene.id]) {
          expect(root.querySelector('[data-map-shared-passage]')).not.toBeNull();
          expect(root.querySelectorAll('[data-map-connection="intervention"]')).toHaveLength(2);
          expect(root.querySelectorAll('[data-map-connection="route"]')).toHaveLength(0);
          expect(root.querySelectorAll('[data-map-target]')).toHaveLength(1);
          expect(root.querySelector('[data-map-target]').getAttribute('data-map-target')).toBe(route.id);
          expect(root.querySelector('[data-map-creature]').style.transform).toBe('translate(281px, 98px)');
        } else {
          expect(root.querySelector('[data-map-shared-passage]')).toBeNull();
          expect(root.querySelectorAll('[data-map-connection="route"]')).toHaveLength(2);
          expect(root.querySelector('[data-map-target]')).toBeNull();
        }
      }
    }
  });
  it('attaches earned changes to the affected path rather than a second status strip', () => {
    for (const [index, flag, route, label] of [[1,'quiet-entry','catwalk','Quiet upper walkway'], [1,'coolant-bypass','underdeck','Drained lower passage'], [2,'security-pulse','breach','Tightened door seam'], [2,'maintenance-codes','decode','Controls with a code']]) {
      const scene = applyMissionMemory(MISSION.scenes[index], [flag]);
      const root = document.createElement('div');
      root.innerHTML = renderToStaticMarkup(<ExpeditionSchematic scene={scene} runFlags={[flag]} />);
      expect(root.querySelector(`[data-map-route="${route}"] [data-map-effect="${flag}"]`)).not.toBeNull();
      expect(root.querySelector(`[data-map-route="${route}"] > text`).textContent).toBe(label);
      expect(root.querySelector('[aria-label="Lasting site changes"]')).toBeNull();
      root.innerHTML = renderToStaticMarkup(<ExpeditionSchematic scene={scene} runFlags={[]} />);
      expect(root.querySelector('[data-map-effect]')).toBeNull();
      expect(root.innerHTML).not.toContain(label);
    }
  });
  it('distinguishes passing a trapped native from freeing it or gaining an ally', () => {
    expect(nativeMapState(null)).toBe('contact');
    expect(nativeMapState({resolution:'unresolved'})).toBe('contact');
    expect(nativeMapState({resolution:'detour'})).toBe('contact');
    expect(nativeMapState({id:'pin-rig',resolution:'cleared'})).toBe('bypassed');
    expect(nativeMapState({id:'release',resolution:'cleared'})).toBeNull();
    expect(nativeMapState({companion:true,resolution:'befriended'})).toBeNull();
    const html = renderToStaticMarkup(<ExpeditionSchematic scene={MISSION.scenes[2]} native={{species:'Hypnopet'}} nativeState="bypassed" position={{crew:'exit'}} />);
    expect(html).toContain('data-map-native="true" data-state="bypassed"');
    expect(html).toContain('Hypnopet: still trapped');
    expect(html).toContain('Hypnopet · Still trapped');
    expect(html).not.toContain('>Contact</text>');
  });
  const scout = { id: 'scout' };
  it('route and lead selection never move the crew', () => {
    expect(expeditionPosition({ phase: 'assign' }).crew).toBe('entry');
    expect(expeditionPosition({ phase: 'assign', encounterMode: 'group', resolution: 'cleared' })).toMatchObject({crew:'crossing', encounter:false});
    expect(expeditionPosition({ phase: 'assign', encounterMode: 'group', resolution: 'detour' }).crew).toBe('entry');
  });
  it('sending a report is not physical return', () => {
    expect(expeditionPosition({ phase: 'scan-result', scout, scan: { mode: 'scan', relay: true, returned: true } })).toEqual({ crew: 'entry', scout: 'survey', signal: true, encounter: false });
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
    expect(expeditionPosition({ actionType: 'scout', beat: 'encounter', scan: { relay: true } })).toMatchObject({ crew: 'entry', scout: 'survey', signal: true, encounter: true });
    expect(expeditionPosition({ phase: 'encounter', encounterMode: 'scout', resolution: 'befriended' })).toMatchObject({ crew: 'entry', scout: 'survey', encounter: false });
    expect(expeditionPosition({ phase: 'encounter', encounterMode: 'scout', resolution: 'unresolved' }).encounter).toBe(true);
    expect(expeditionPosition({ actionType: 'scout-return', encounterMode: 'scout', beat: 'complete' }).encounter).toBe(false);
  });
  it('every route has an everyday spatial label', () => {
    MISSION.scenes.flatMap(scene => scene.routes).forEach(route => expect(MAP_ROUTES[route.id]).toBeTruthy());
    for (const scene of MISSION.scenes) for (const route of scene.routes) {
      const html = renderToStaticMarkup(<ExpeditionSchematic scene={scene} routeId={route.id} preview />);
      expect(html).toContain(`Preview: ${MAP_ROUTES[route.id]}`);
      expect(html).toContain(`data-map-direction="${route.id}"`);
      expect(html).toContain('stroke-dasharray="5 5"');
      expect(html).toContain('data-crew-position="entry"');
    }
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
    const reunited = renderToStaticMarkup(<ExpeditionSchematic scene={MISSION.scenes[1]} crew={crew} scout={crew[0]} helperId="helper" companion={{species:'Xylum'}} allyWithScout position={{crew:'entry',scout:'survey',encounter:true}} />);
    expect(reunited).toContain('translate(297px, 148px)');
    expect(reunited).toContain('data-map-ally="true" data-location="survey" transform="translate(320 123)"');
  });
  it('previewing a different route does not relocate the crew from a resolved encounter', () => {
    const props = {scene:MISSION.scenes[2], crew:[{id:'lead',species:'Graviclaw'}], position:{crew:'crossing',encounter:true}};
    for (const routeId of ['decode','breach']) {
      expect(renderToStaticMarkup(<ExpeditionSchematic {...props} routeId={routeId} preview />)).toContain('translate(281px, 98px)');
    }
  });
  it('does not leak undiscovered contacts or hazard names', () => {
    const scene = MISSION.scenes[1];
    const html = renderToStaticMarkup(<ExpeditionSchematic scene={scene} crew={[]} />);
    expect(html).not.toContain('Contact');
    expect(html).not.toContain(scene.encounter.title);
    scene.hazards.forEach(hazard => expect(html).not.toContain(hazard.label));
    expect(html).not.toContain('lr-scout-performer');
  });
  it('marks only reported danger on its physical route', () => {
    const scene = MISSION.scenes[0];
    const hidden = renderToStaticMarkup(<ExpeditionSchematic scene={scene} revealedIds={[]} />);
    expect(hidden).not.toContain('data-map-known-hazard');
    const reported = renderToStaticMarkup(<ExpeditionSchematic scene={scene} revealedIds={['conductive-brine']} />);
    expect(reported).toContain('data-map-known-hazard="conductive-brine" data-map-hazard-route="intake"');
    expect(reported).toContain('! Known danger');
    expect(reported).toContain(scene.hazards[0].detail);
    expect(reported).not.toContain('data-map-hazard-route="gantry"');
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
