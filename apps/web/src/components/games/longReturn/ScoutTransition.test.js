import { scoutBeats } from './ScoutTransition';
import { CREATURES, MISSION } from './longReturnData';
import { scanScene, scanReport } from './longReturnEngine';

test('return narration agrees with actual energy and stability changes', () => {
  const action = { type: 'scout-return', scout: { species: 'Chromocat' }, energyBefore: 5, energyAfter: 4, stabilityBefore: 10, stabilityAfter: 9 };
  expect(scoutBeats(action).map(beat => beat.text).join(' ')).toContain('consumes another energy');
  const exhausted = scoutBeats({ ...action, energyBefore: 0, energyAfter: 0, stabilityBefore: 0, stabilityAfter: 0 }).map(beat => beat.text).join(' ');
  expect(exhausted).toContain('already spent');
  expect(exhausted).not.toContain('consumes another energy');
  expect(exhausted).not.toContain('loses stability');
});

test('sensed but unreported danger is not narrated as a fruitless search', () => {
  const scene = MISSION.scenes[1];
  const scout = CREATURES.find(member => member.species === 'Ectoghoul');
  const result = scanScene(scene, scout);
  expect(result.relay).toBe(false);
  expect(result.revealedIds).toEqual([]);
  expect(result.trappedCount).toBeGreaterThan(0);
  const beats = scoutBeats({type:'scout',scout,result,profile:{channel:null},energyBefore:6,energyAfter:5});
  expect(beats[1].title).toBe('Something ahead');
  expect(beats[1].text).not.toContain('uncovers no hidden dangers');
  expect(beats[2].kind).toBe('silence');
  expect(scanReport(scene,scout,result).outcome).toBe('trapped');
  const account = JSON.stringify(beats);
  scene.hazards.forEach(hazard => {
    expect(account).not.toContain(hazard.label);
    expect(account).not.toContain(hazard.detail);
  });
});

test('scouting binds expenditure to departure and delivery to communication', () => {
  const action = { type: 'scout', scout: { species: 'Graviclaw' }, energyBefore: 6, energyAfter: 5, result: { revealedIds: [], relay: true }, profile: { channel: 'vibration' } };
  const beats = scoutBeats(action);
  expect(beats).toHaveLength(3);
  expect(beats[0].costs).toEqual([{ kind: 'energy', text: '−1 energy · 5 left' }]);
  expect(beats[2].text).toContain('through the structure');
  expect(beats.some(beat => beat.kind === 'energy')).toBe(false);
  const isolated = scoutBeats({ ...action, result: { revealedIds: ['danger'], relay: false }, encounter: { species: 'Native' } });
  expect(isolated[2].text).toContain('until it returns');
  expect(isolated[3].kind).toBe('encounter');
});

test('the reported warning names its cause and the affected route, but silence never leaks it', () => {
  const scene = MISSION.scenes[0];
  const hazard = scene.hazards[0];
  const scout = { species: 'Chromocat' };
  const result = { relay: true, hazards: [{ ...hazard, sensed: true, revealed: true }], revealedIds: [hazard.id] };
  const action = { type: 'scout', scene, scout, result, profile: { channel: 'vibration' }, energyBefore: 6, energyAfter: 5 };
  const beats = scoutBeats(action);
  expect(beats[1].text).not.toContain(hazard.detail);
  expect(beats[2].text).toContain(hazard.detail);
  expect(beats[2].text).toContain('ride the intake current');
  const isolated = scoutBeats({ ...action, result: { ...result, relay: false, revealedIds: [] } });
  expect(JSON.stringify(isolated)).not.toContain(hazard.detail);
  const returned = scoutBeats({ ...action, type: 'scout-return', result: { ...result, relay: false }, stabilityBefore: 10, stabilityAfter: 9 });
  expect(returned[0].text).not.toContain(hazard.detail);
  expect(returned[1].text).toContain(hazard.detail);
});
