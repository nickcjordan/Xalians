import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import ScoutTransition, { scoutBeats } from './ScoutTransition';
import { CREATURES, MISSION } from './longReturnData';
import { scanScene, scanReport } from './longReturnEngine';

test('scouting waits for the reader and retains the full account through the final handoff', () => {
  vi.useFakeTimers();
  const scout = CREATURES[0], scene = MISSION.scenes[0];
  const action = { type: 'scout', scene, scout, crew: CREATURES.slice(0, 3), result: scanScene(scene, scout), profile: { channel: 'vibration' }, energyBefore: 6, energyAfter: 5 };
  const onComplete = vi.fn();
  try {
    const { container, getByRole } = render(<ScoutTransition action={action} onComplete={onComplete} soundEnabled={false} />);
    act(() => vi.advanceTimersByTime(60000));
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(1);
    const first = container.querySelector('[data-story-event="0"]');
    fireEvent.click(getByRole('button', { name: 'Next event →' }));
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(2);
    expect(container.querySelector('[data-story-event="0"]')).toBe(first);
    fireEvent.click(getByRole('button', { name: 'Reveal full account' }));
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(3);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(getByRole('button', { name: 'Review scout report' }));
    expect(onComplete).toHaveBeenCalledOnce();
  } finally { cleanup(); vi.useRealTimers(); }
});

test('an earlier discovery is not announced as a new scouting find', () => {
  const base = MISSION.scenes[1];
  const scene = { ...base, knownHazardIds: [base.hazards[0].id] };
  const scout = CREATURES[0];
  const result = scanScene(scene, scout);
  const beats = scoutBeats({ type: 'scout', scene, scout, result, profile: { channel: 'vibration' }, energyBefore: 6, energyAfter: 5 });
  expect(beats[1].title).toBe('Following an earlier warning');
  expect(beats[1].text).toContain('no additional hazard warning');
  expect(beats[1].text).not.toContain('waiting crew has not heard');
});

test('return narration agrees with actual energy and stability changes', () => {
  const action = { type: 'scout-return', scout: { species: 'Chromocat' }, energyBefore: 5, energyAfter: 4, stabilityBefore: 10, stabilityAfter: 9 };
  expect(scoutBeats(action).map(beat => beat.text).join(' ')).toContain('consumes another energy');
  const exhausted = scoutBeats({ ...action, energyBefore: 0, energyAfter: 0, stabilityBefore: 0, stabilityAfter: 0 }).map(beat => beat.text).join(' ');
  expect(exhausted).toContain('scout is spent');
  expect(exhausted).toContain('crew follows Chromocat');
  expect(exhausted).not.toContain('Chromocat retraces the route');
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
  expect(beats[1].title).toBe('The scout finds a clue');
  expect(beats[1].text).toContain(hazard.detail);
  expect(beats[2].text).not.toContain(hazard.detail);
  expect(beats[2].text).toContain('ride the intake current');
  const isolated = scoutBeats({ ...action, result: { ...result, relay: false, revealedIds: [] } });
  expect(JSON.stringify(isolated)).not.toContain(hazard.detail);
  const returned = scoutBeats({ ...action, type: 'scout-return', result: { ...result, relay: false }, stabilityBefore: 10, stabilityAfter: 9 });
  expect(returned[0].text).not.toContain(hazard.detail);
  expect(returned[1].text).toContain(hazard.detail);
});

test('a relayed warning reads as a connected account and names the relevant choices naturally', () => {
  const scene = MISSION.scenes[1];
  const hazard = scene.hazards[0];
  const action = { type: 'scout', scene, scout: { species: 'Chromocat' }, result: { relay: true, hazards: [{ ...hazard, sensed: true }], revealedIds: [hazard.id] }, profile: { channel: 'display' }, energyBefore: 6, energyAfter: 5 };
  const beats = scoutBeats(action);
  const report = beats[2].text;
  expect(beats[1].text).toBe(hazard.detail);
  expect(report).toContain('from the entrance. That warning matters');
  expect(report).not.toContain(hazard.detail);
  expect(report).toContain('chooses to race the upper catwalk.');
  expect(report).not.toContain('concerns race');

  const archive = MISSION.scenes[4];
  const archiveHazard = archive.hazards[0];
  const archiveReport = scoutBeats({ ...action, scene: archive, result: { ...action.result, hazards: [{ ...archiveHazard, sensed: true }] } })[2].text;
  expect(archiveReport).toContain('chooses to stabilize the archive or pull the archive blackbox.');
  const noHazardReport = scoutBeats({ ...action, result: { ...action.result, hazards: [] } })[2].text;
  expect(noHazardReport).toContain('There is no specific warning to pass back.');
  expect(noHazardReport).toContain('has the findings without waiting for the scout to return.');
});

test('every room gives the scout a physical task instead of a generic crossing search', () => {
  for (const scene of MISSION.scenes) {
    const beats = scoutBeats({ type: 'scout', scene, scout: { species: 'Chromocat' }, result: { hazards: [], revealedIds: [], relay: true }, profile: { channel: 'display' }, energyBefore: 6, energyAfter: 5 });
    expect(scene.surveyOpening).toBeTruthy();
    expect(beats[0].text).toBe(`Chromocat ${scene.surveyOpening}.`);
    expect(beats[0].costs).toEqual([{ kind: 'energy', text: '−1 energy · 5 left' }]);
    expect(beats[1].text).toContain('The way may still hold danger.');
    expect(beats[1].text).not.toContain('studies the crossing');
  }
});

test('each scout encounter opens with its physical situation instead of implying an attack', () => {
  const clues = { 'underdeck-xylum': 'hurt Xylum', 'vestibule-hypnopet': 'between the lock’s moving arms', 'gallery-ectoghoul': 'shielded conduit' };
  for (const scene of MISSION.scenes.filter(entry => entry.encounter)) {
    const native = CREATURES.find(entry => entry.id === scene.encounter.creatureId);
    const beats = scoutBeats({
      type: 'scout', scene, scout: { species: 'Chromocat' }, encounter: native,
      result: { hazards: [], revealedIds: [], relay: true }, profile: { channel: 'display' }, energyBefore: 6, energyAfter: 5
    });
    const contact = beats.at(-1);
    expect(contact.kind).toBe('encounter');
    expect(contact.text).toBe(scene.encounter.firstContact);
    expect(contact.text).toContain(clues[scene.encounter.id]);
    expect(contact.text).not.toContain('intercepts the scout');
  }
});
