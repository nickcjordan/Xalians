import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LongReturnGame, { encounterNarrative, missionOutcomePresentation, recommendationFor, routeAdvantage, supportRoleForPlan, safestPlanForRoute } from './longReturnGame';
import { readCheckpoint, writeCheckpoint } from './expeditionSave';
import { CREATURES, MISSION } from './longReturnData';

test('equal-effort techniques preserve authored order without changing the selected crew pair', () => {
  const args = [MISSION.scenes[0].routes[0], CREATURES.slice(0, 3), {}, [], { revealedIds: [] }, null, null];
  const scoreChoice = safestPlanForRoute(...args);
  const storyChoice = safestPlanForRoute(...args, true);
  expect(scoreChoice.method.key).toBe('leap');
  expect(storyChoice.method.key).toBe('climb');
  expect(storyChoice.lead.id).toBe(scoreChoice.lead.id);
  expect(storyChoice.support.id).toBe(scoreChoice.support.id);
  expect(storyChoice.risk).toBe(scoreChoice.risk);
});

vi.mock('../../xalianImage', () => ({ default: function MockXalianImage() { return <div data-testid="creature-portrait" />; } }));

function findButton(container, label) {
  return Array.from(container.querySelectorAll('button')).find((button) => label.test(button.textContent));
}

test('breaking contact does not claim an undelivered report already reached the crew', () => {
  const encounter = { option: { resolution: 'unresolved' }, nativeName: 'Xylum', scoutName: 'Chromocat', mode: 'scout' };
  expect(encounterNarrative({ ...encounter, reportDelivered: false })).toContain('scout still has to make the journey back');
  expect(encounterNarrative({ ...encounter, reportDelivered: false })).not.toContain('crew now knows');
  expect(encounterNarrative({ ...encounter, reportDelivered: true })).toContain('crew now knows');
});

test('marking the rig visibly earns the crew a prepared approach after the scout returns', () => {
  const scout = { archetype: 'trapped', option: { id: 'mark', resolution: 'unresolved' }, nativeName: 'Hypnopet', scoutName: 'Graviclaw', mode: 'scout' };
  const beforeReturn = encounterNarrative({ ...scout, reportDelivered: false });
  expect(beforeReturn).toContain('marks a safe approach');
  expect(beforeReturn).toContain('must make the journey back');
  expect(beforeReturn).not.toContain('crew receives');
  const relayed = encounterNarrative({ ...scout, reportDelivered: true });
  expect(relayed).toContain('marks reach the crew');
  expect(relayed).toContain('must still decide what to do with Hypnopet');
  const group = { archetype: 'trapped', option: { id: 'free-native', resolution: 'cleared' }, nativeName: 'Hypnopet', actorName: 'Hippochamp', mode: 'group' };
  expect(encounterNarrative({ ...group, priorResponseId: 'mark' })).toContain('scout’s marks guide the crew');
  expect(encounterNarrative(group)).not.toContain('scout’s marks');
});

function click(container, label) {
  const button = findButton(container, label);
  expect(button, `Missing ${label}; available: ${[...container.querySelectorAll('button')].map(b => b.textContent).join(' / ')}`).toBeTruthy();
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function clickElement(element) {
  expect(element).toBeTruthy();
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function finishScoutTransition(container) {
  if (!container.querySelector('[aria-label="Scouting in progress"], [aria-label="Scout returning"]')) return;
  click(container, /skip to outcome|reveal full account/i);
  click(container, /review scout report|check scout status|respond to encounter|choose an approach/i);
}

function selectRecommendedScout(container) {
  clickElement(container.querySelector('[data-scout-options] [data-recommended]'));
  click(container, /^send /i);
  finishScoutTransition(container);
}

function chooseRecommendedEncounterResponse(container) {
  clickElement(container.querySelector('.lr-encounter-options .is-recommended') || findButton(container, /treats the injury/i));
  clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
  expect(container.querySelector('[aria-label="Encounter response in progress"]')).toBeTruthy();
  const skip = findButton(container, /skip to outcome|reveal full account/i);
  if (skip) clickElement(skip);
  click(container, /see encounter result/i);
}

function enterSimpleRouteChoice(container, { scan = true } = {}) {
  click(container, /seal crew/i);
  if (scan) selectRecommendedScout(container);
  else click(container, /stay together|keep the crew together/i);
  if (container.querySelector('.lr-field-encounter')) {
    chooseRecommendedEncounterResponse(container);
    click(container, /review scout report/i);
  }
  if (scan) expect(container.textContent).toContain('Scout result');
  if (findButton(container, /wait for .* to return/i)) { click(container, /wait for .* to return/i); finishScoutTransition(container); }
  if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
  expect(container.querySelectorAll('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis)')).toHaveLength(2);
}

function choosePreferredRoute(container) {
  const recommended = container.querySelector('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis).is-recommended .lr-board-pick');
  const lowestRisk = container.querySelector('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis)[data-lowest-risk="true"] .lr-board-pick');
  clickElement(recommended || lowestRisk || container.querySelector('.lr-board-pick'));
}

function playRecommendedScene(container) {
  const enterButton = findButton(container, /^enter /i);
  if (enterButton) clickElement(enterButton);
  const recommendedScout = container.querySelector('[data-scout-options] [data-recommended]');
  if (recommendedScout) { clickElement(recommendedScout); click(container, /^send /i); finishScoutTransition(container); }
  else click(container, /stay together|keep the crew together/i);
  if (container.querySelector('.lr-field-encounter')) {
    chooseRecommendedEncounterResponse(container);
    click(container, /review scout report/i);
  }
  if (findButton(container, /wait for .* to return/i)) { click(container, /wait for .* to return/i); finishScoutTransition(container); }
  if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
  choosePreferredRoute(container);
  click(container, /cross now/i);
  if (findButton(container, /skip to outcome|reveal full account/i)) click(container, /skip to outcome|reveal full account/i);
  if (findButton(container, /continue to result/i)) click(container, /continue to result/i);
  expect(container.querySelector('.lr-simple-result-head').textContent).toMatch(/Crossing complete|evacuate now/i);
}

describe('Long Return Simple mode', () => {
  test('a full crew can preview, cancel and commit a replacement without removing someone first', () => {
    renderGame();
    const selectedIds = () => [...container.querySelectorAll('.lr-crew-choice--selected')].map(el => el.dataset.creatureId);
    const original = selectedIds();
    const incoming = container.querySelector('[data-creature-id="ectoghoul-117"]');
    expect(incoming.disabled).toBe(false);
    clickElement(incoming);
    expect(container.querySelector('[data-swap-heading]').textContent).toContain('Ectoghoul');
    expect(container.querySelector('.lr-selection-count strong').textContent).toBe('3');
    expect(container.querySelector('.lr-launch').disabled).toBe(true);
    click(container, /cancel swap/i);
    expect(selectedIds()).toEqual(original);
    clickElement(container.querySelector('[data-creature-id="ectoghoul-117"]'));
    click(container, /replace graviclaw/i);
    expect(selectedIds()).toHaveLength(3);
    expect(selectedIds()).toContain('ectoghoul-117');
    expect(selectedIds()).not.toContain('graviclaw-213');
    click(container, /seal crew/i);
    expect(readCheckpoint().selectedCrew).toContain('ectoghoul-117');
    expect(readCheckpoint().selectedCrew).not.toContain('graviclaw-213');
  });

  test('forced extraction names the actual failure cause while preserving objective rules', () => {
    const depleted = missionOutcomePresentation('failed', true, 4, 'Crew energy is depleted.');
    expect(depleted.copy).toContain('Crew energy is depleted.');
    expect(depleted.copy).toContain('half of the carried salvage');
    expect(depleted.copy).toContain('retraces the passages it opened');
    expect(depleted.copy).not.toContain('Emergency systems pull');
    expect(depleted.label).toContain('Index retained');
    const collapsed = missionOutcomePresentation('failed', false, 0, 'Annex stability reached zero.');
    expect(collapsed.copy).toContain('Annex stability reached zero.');
    expect(collapsed.copy).toContain('Index remains beyond their reach');
    expect(collapsed.copy).toContain('all carried salvage is left behind');
    expect(collapsed.label).toContain('Objective lost');
    const finalCrossing = missionOutcomePresentation('failed', true, 9, 'Annex stability reached zero.', 'generator-spine');
    expect(finalCrossing.copy).toContain('reaches the extraction lift');
    expect(finalCrossing.copy).not.toContain('route ahead');
  });

  test('voluntary extraction follows the return route from the place actually reached', () => {
    const indexExit = missionOutcomePresentation('extracted', true, 5, undefined, 'nemesis-index');
    expect(indexExit.copy).toContain('At the extraction fork');
    expect(indexExit.copy).toContain('stair into the lower annex falls behind them');
    expect(indexExit.copy).toContain('5 salvage intact');
    const reservoirExit = missionOutcomePresentation('extracted', true, 9, undefined, 'core-reservoir');
    expect(reservoirExit.copy).toContain('junction beyond the reservoir');
    expect(reservoirExit.copy).toContain('Generator Spine untouched');
    expect(reservoirExit.copy).toContain('9 salvage intact');
    expect(reservoirExit.copy).not.toContain('unopened depths');
  });
  let container;
  let root;

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (root) {
      act(() => root.unmount());
      root = null;
    }
    container.remove();
  });

  function renderGame(experiments = false) {
    if (!root) root = createRoot(container);
    act(() => {
      root.render(<LongReturnGame initialExperiments={experiments} />);
    });
  }

  test('creature actions keep selection in place, preserve preview, and carry the intake consequence forward', () => {
    renderGame(true);
    click(container, /seal crew/i);
    click(container, /stay together/i);
    const before = container.querySelector('[aria-label="Choose a creature action"]');
    expect(before).toBeTruthy();
    expect(container.querySelectorAll('[data-map-scene]')).toHaveLength(1);
    expect(findButton(container, /^go with/i)).toBeUndefined();
    click(container, /ride the intake current/i);
    expect(container.querySelector('[aria-label="Choose a creature action"]')).toBe(before);
    expect(container.querySelectorAll('[data-map-scene]')).toHaveLength(1);
    expect(container.querySelector('.lr-lead-options')).toBeNull();
    expect(container.textContent).toContain('unresolved dangers');
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(readCheckpoint().runFlags).toContain('coolant-bypass');
    click(container, /continue mission/i);
    expect(container.textContent).toContain('draining');
  });

  test('comparing another route preserves the player’s creature and technique for each approach', () => {
    renderGame(true);
    click(container, /seal crew/i);
    click(container, /stay together/i);
    click(container, /cross the hanging gantry/i);
    clickElement(container.querySelector('[aria-label="Choose Hippochamp for Cross the hanging gantry"]'));
    const gantryMethod = container.querySelector('[data-route-preview="gantry"] .lr-technique-action[aria-pressed="true"]').textContent;
    clickElement(container.querySelector('[data-route-preview="gantry"] input[type="checkbox"]'));
    click(container, /ride the intake current/i);
    clickElement(container.querySelector('[aria-label="Choose Graviclaw for Ride the intake current"]'));
    const intakeMethod = container.querySelector('[data-route-preview="intake"] .lr-technique-action[aria-pressed="true"]').textContent;
    click(container, /cross the hanging gantry/i);
    expect(container.querySelector('[data-route-preview="gantry"] .lr-action-creatures [aria-pressed="true"]').textContent).toContain('Hippochamp');
    expect(container.querySelector('[data-route-preview="gantry"] .lr-technique-action[aria-pressed="true"]').textContent).toBe(gantryMethod);
    expect(container.querySelector('[data-route-preview="gantry"] input[type="checkbox"]').checked).toBe(true);
    click(container, /ride the intake current/i);
    expect(container.querySelector('[data-route-preview="intake"] .lr-action-creatures [aria-pressed="true"]').textContent).toContain('Graviclaw');
    expect(container.querySelector('[data-route-preview="intake"] .lr-technique-action[aria-pressed="true"]').textContent).toBe(intakeMethod);
    click(container, /^go with Graviclaw/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(readCheckpoint().leadId).toBe('graviclaw-213');
    expect(readCheckpoint().commands).toBe(2);
  });

  test('a delivered remote report leads straight to actions without inventing a discovered warning', () => {
    renderGame(true);
    click(container, /seal crew/i);
    clickElement(container.querySelector('[data-scout-choice="graviclaw-213"]'));
    click(container, /^send /i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /choose an approach/i);
    expect(container.querySelector('[aria-label="Choose a creature action"]')).toBeTruthy();
    expect(container.querySelector('.lr-simple-report')).toBeNull();
    expect(container.textContent).toContain('unresolved dangers');
    expect(container.textContent).not.toContain('Known danger:');
  });

  test('a scout out of contact must still return before using its findings', () => {
    renderGame(true);
    click(container, /seal crew/i);
    clickElement(container.querySelector('[data-scout-choice="hippochamp-041"]'));
    click(container, /^send /i);
    click(container, /skip to outcome|reveal full account/i);
    expect(findButton(container, /choose an approach/i)).toBeUndefined();
    click(container, /check scout status/i);
    expect(container.querySelector('[aria-label="Choose a creature action"]')).toBeNull();
    click(container, /wait for .* to return/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /choose an approach/i);
    expect(container.querySelector('[aria-label="Choose a creature action"]')).toBeTruthy();
    expect(container.textContent).toContain('Known danger:');
  });

  test('a discovered signal survives resume and informs an unscouted next room', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      renderGame(true);
      click(container, /seal crew/i);
      click(container, /stay together/i);
      click(container, /ride the intake current/i);
      click(container, /^go with/i);
      click(container, /skip to outcome|reveal full account/i);
      click(container, /continue to result/i);
      const before = readCheckpoint().pressure;
      click(container, /wait and read the signal/i);
      expect(readCheckpoint().pressure).toBe(before + 1);
      expect(readCheckpoint().runFlags).toContain('field-signal-read');
      expect(findButton(container, /wait and read the signal/i)).toBeUndefined();
      unmountGame();
      random.mockReturnValue(0.9);
      renderGame(true);
      click(container, /resume expedition/i);
      expect(readCheckpoint().runFlags).toContain('field-signal-read');
      click(container, /continue mission/i);
      expect(container.textContent).toContain('one turbine turns every forty seconds');
      expect(findButton(container, /^enter /i)).toBeUndefined();
      click(container, /stay together/i);
      const catwalk = container.querySelector('[data-route-preview="catwalk"]');
      expect(catwalk.textContent).toContain('Known');
      expect(catwalk.textContent).not.toContain('unresolved dangers');
    } finally { random.mockRestore(); }
  });

  test('a resolved crew encounter continues directly into crossing without choosing a lead again', () => {
    renderGame(true);
    click(container, /seal crew/i);
    click(container, /stay together/i);
    click(container, /ride the intake current/i);
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    click(container, /continue mission/i);
    expect(findButton(container, /^enter /i)).toBeUndefined();
    click(container, /stay together/i);
    clickElement(container.querySelector('[data-route-preview="underdeck"] .lr-intention'));
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    if (findButton(container, /respond to encounter/i)) click(container, /respond to encounter/i);
    expect(container.querySelector('[aria-label="Choose how to respond"]').textContent).not.toContain('Recommended');
    chooseRecommendedEncounterResponse(container);
    expect(container.querySelector('.lr-companion-story').textContent).toContain('is coming with you');
    expect(findButton(container, /continue through with/i)).toBeTruthy();
    expect(findButton(container, /change the crossing plan/i)).toBeTruthy();
    click(container, /continue through with/i);
    expect(container.querySelector('[aria-label="Crossing in progress"]')).toBeTruthy();
    expect(container.textContent).toContain('Picking up where we stopped');
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(readCheckpoint().runFlags).toContain('maintenance-codes');
  });

  test('a depleted but viable crew can stay together without a dead scout-selection gate', () => {
    renderGame();
    click(container, /seal crew/i);
    const saved = readCheckpoint();
    saved.strain = Object.fromEntries(saved.selectedCrew.map(id => [id, 5]));
    unmountGame();
    expect(writeCheckpoint(saved)).toBe(true);
    renderGame();
    click(container, /resume expedition/i);
    expect(container.textContent).toContain('No scout available');
    expect(container.querySelector('[data-scout-unavailable]').textContent).toContain('2 energy needed to scout');
    expect(findButton(container, /select a scout/i)).toBeUndefined();
    const stay = findButton(container, /stay together/i);
    expect(stay.disabled).toBe(false);
    expect(stay.classList.contains('g-btn--primary')).toBe(true);
    const reserves = container.querySelector('[data-expedition-reserves]').textContent;
    expect(reserves).not.toContain("Can't scout");
    clickElement(stay);
    expect(container.querySelector('.lr-route-board')).toBeTruthy();
    expect(container.querySelector('[data-expedition-reserves]').textContent).toBe(reserves);
    choosePreferredRoute(container);
    expect(container.querySelectorAll('[data-lead-readiness]')).toHaveLength(3);
  });

  test('scout choices explain senses and delivery without ranking or revealing hidden hazards', () => {
    renderGame(true);
    click(container, /seal crew/i);
    const choices = container.querySelector('[data-scout-options]');
    expect(choices.textContent).not.toMatch(/Recommended|Excellent|Strong awareness|Conductive brine/);
    expect(choices.querySelector('[data-scout-choice="graviclaw-213"]').textContent).toContain('vibrations through the structure');
    expect(choices.querySelector('[data-scout-choice="hippochamp-041"]').textContent).toContain('Must return');
    expect(choices.querySelector('[data-scout-choice="hippochamp-041"]').textContent).toContain('electrical fields');
    expect(choices.querySelector('[data-scout-choice="hippochamp-041"]').textContent).toContain('scents and chemical traces');
  });

  test('changing the creature keeps its techniques separate and updates the committed actor', () => {
    renderGame(true);
    click(container, /seal crew/i);
    click(container, /stay together/i);
    click(container, /cross the hanging gantry/i);
    const choice = container.querySelector('[aria-label="Choose Hippochamp for Cross the hanging gantry"]');
    clickElement(choice);
    const card = container.querySelector('[data-route-preview="gantry"]');
    expect(card.querySelector('.lr-action-creatures button[aria-pressed="true"]').textContent).toContain('Hippochamp');
    expect(card.querySelector(`[aria-label="Hippochamp's technique"]`)).toBeTruthy();
    expect([...card.querySelectorAll('.lr-technique-action')].map(button => button.textContent).join(' ')).not.toContain('Chromocat');
    click(container, /^go with Hippochamp/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(readCheckpoint().leadId).toBe('hippochamp-041');
  });

  function playCreatureAction(routeId, responseId, technique) {
    if (findButton(container, /^enter /i)) click(container, /^enter /i);
    if (findButton(container, /stay together/i)) click(container, /stay together/i);
    expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('[aria-label="Choose a creature action"]').textContent).not.toContain('Someone occupies this passage');
    clickElement(container.querySelector(`[data-route-preview="${routeId}"] .lr-intention`));
    if (technique) clickElement([...container.querySelectorAll(`[data-route-preview="${routeId}"] .lr-technique-action`)].find(button => technique.test(button.textContent)));
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    if (findButton(container, /respond to encounter|choose response/i)) {
      click(container, /respond to encounter|choose response/i);
      if (responseId) click(container, responseId);
      else clickElement(container.querySelector('.lr-story-responses button'));
      clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
      if (findButton(container, /skip to outcome|reveal full account/i)) click(container, /skip to outcome|reveal full account/i);
      click(container, /see encounter result/i);
      click(container, /continue through with/i);
      click(container, /skip to outcome|reveal full account/i);
    }
    click(container, /continue to result/i);
    return readCheckpoint();
  }

  test.each([0.1, 0.9])('a climbed cable survives resume and becomes a consumed encounter tool (%s)', sample => {
    vi.spyOn(Math, 'random').mockReturnValue(sample);
    renderGame(true);
    click(container, /seal crew/i);
    click(container, /stay together/i);
    click(container, /cross the hanging gantry/i);
    clickElement([...container.querySelectorAll('[data-route-preview="gantry"] .lr-technique-action')].find(button => /climb/i.test(button.textContent)));
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(container.querySelector('[aria-label="A cable from the frame"]')).toBeTruthy();
    expect(readCheckpoint().runFlags).toContain('gantry-service-line');
    expect(readCheckpoint().journal[0].findId).toBe('gantry-service-line');
    if (findButton(container, /wait and read the signal/i)) {
      click(container, /wait and read the signal/i);
      expect(readCheckpoint().journal[0].discovery).toContain('service cable');
    }
    unmountGame();
    renderGame(true);
    click(container, /resume expedition/i);
    click(container, /continue mission/i);
    const saved = playCreatureAction('underdeck', /with the recovered cable/i);
    expect(saved.runFlags).not.toContain('gantry-service-line');
    expect(saved.spentAbilities).toEqual([]);
    expect(saved.journal[1].encounterId).toBe(sample < 0.5 ? 'lash-sleeve' : 'lift-bearing');
    expect(saved.runFlags).toContain(sample < 0.5 ? 'underdeck-sleeve-secured' : 'underdeck-bearing-lifted');
    if (sample < 0.5) expect(saved.companion.creature.species).toBe('Xylum');
    else expect(saved.companion).toBeNull();
    unmountGame();
    renderGame(true);
    click(container, /resume expedition/i);
    expect(readCheckpoint().runFlags).not.toContain('gantry-service-line');
  });

  test('two recovered clues unlock a different archive rescue after checkpoint resume', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.35);
    try {
      renderGame(true);
      click(container, /seal crew/i);
      playCreatureAction('intake');
      click(container, /wait and read the signal/i);
      expect(container.textContent).toContain('emergency release instruction');
      click(container, /continue mission/i);
      playCreatureAction('underdeck');
      unmountGame();
      random.mockReturnValue(0.8);
      renderGame(true);
      click(container, /resume expedition/i);
      click(container, /continue mission/i);
      expect(container.textContent).toContain('underdeck code completes the release instruction');
      playCreatureAction('decode', /Use the maintenance release/);
      expect(readCheckpoint().sceneIndex).toBe(2);
      expect(readCheckpoint().journal[2].encounter).toContain('two discoveries have come together');
    } finally { random.mockRestore(); }
  });

  test('a coolant rescue spends the chosen helper ability and saves the companion outcome', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      renderGame(true);
      click(container, /seal crew/i);
      playCreatureAction('gantry');
      click(container, /continue mission/i);
      const saved = playCreatureAction('underdeck', /Hippochamp screens the jet with Pressure Screen/);
      expect(saved.runFlags).toContain('underdeck-sleeve-secured');
      expect(saved.spentAbilities).toContain('hippo-ward');
      expect(saved.companion.creature.species).toBe('Xylum');
      expect(saved.journal[1].encounter).toContain('Hippochamp screens the coolant jet');
      expect(saved.journal[1].encounter).not.toContain('injury');
      unmountGame();
      renderGame(true);
      click(container, /resume expedition/i);
      expect(readCheckpoint().spentAbilities).toContain('hippo-ward');
      expect(readCheckpoint().companion.creature.species).toBe('Xylum');
    } finally { random.mockRestore(); }
  });

  test('exhausting the chosen lead in an encounter keeps the route open and asks for a new action', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    renderGame(true);
    click(container, /seal crew/i);
    const saved = playCreatureAction('gantry');
    saved.strain['graviclaw-213'] = 4;
    unmountGame();
    expect(writeCheckpoint(saved)).toBe(true);
    renderGame(true);
    click(container, /resume expedition/i);
    click(container, /continue mission/i);
    expect(findButton(container, /^enter /i)).toBeUndefined();
    click(container, /stay together/i);
    click(container, /enter the maintenance underdeck/i);
    clickElement(container.querySelector('[aria-label="Choose Graviclaw for Enter the maintenance underdeck"]'));
    click(container, /^go with/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /respond to encounter|choose response/i);
    click(container, /Graviclaw braces the coolant sleeve/i);
    clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
    click(container, /skip to outcome|reveal full account/i);
    click(container, /see encounter result/i);
    expect(container.textContent).toContain('Graviclaw has no energy left to lead');
    expect(findButton(container, /continue through with/i)).toBeUndefined();
    click(container, /choose another crossing action/i);
    expect(container.querySelectorAll('[data-route-preview]')).toHaveLength(2);
    expect(container.querySelector('[aria-label="Choose Graviclaw for Enter the maintenance underdeck"]')).toBeNull();
    clickElement(container.querySelector('[aria-label="Choose Hippochamp for Enter the maintenance underdeck"]'));
    click(container, /^go with Hippochamp/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(readCheckpoint().journal[1].lead).toBe('Hippochamp');
    expect(readCheckpoint().companion.creature.species).toBe('Xylum');
  });

  test('isolating the coolant line carries a new door intervention through checkpoint resume', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      renderGame(true);
      click(container, /seal crew/i);
      playCreatureAction('gantry');
      click(container, /continue mission/i);
      const saved = playCreatureAction('underdeck', /Close the upstream valve/);
      expect(saved.runFlags).toContain('underdeck-flow-isolated');
      expect(saved.companion).toBeNull();
      unmountGame();
      renderGame(true);
      click(container, /resume expedition/i);
      click(container, /continue mission/i);
      expect(findButton(container, /^enter /i)).toBeUndefined();
      click(container, /stay together/i);
      clickElement(container.querySelector('[data-route-preview="breach"] .lr-intention'));
      click(container, /From an earlier discoveryWork the depressurized service release/);
      click(container, /^go with/i);
      click(container, /skip to outcome|reveal full account/i);
      click(container, /continue to result/i);
      expect(readCheckpoint().journal[2].methodMemoryId).toBe('depressurized-release');
      expect(readCheckpoint().journal[2].story).toContain('underdeck line isolated');
    } finally { random.mockRestore(); }
  });

  test('the saved gallery circumstance survives resume and resolves as a different encounter', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      renderGame(true);
      click(container, /seal crew/i);
      playCreatureAction('gantry');
      click(container, /continue mission/i);
      playCreatureAction('underdeck');
      click(container, /continue mission/i);
      playCreatureAction('decode');
      expect(readCheckpoint().runFlags).toContain('gallery-beacon-loop');
      unmountGame();
      random.mockReturnValue(0.9);
      renderGame(true);
      click(container, /resume expedition/i);
      click(container, /continue mission/i);
      playCreatureAction('conduit', /Turn the beacon toward the empty hull/);
      expect(readCheckpoint().journal[3].encounter).toContain('turns the beacon');
      expect(readCheckpoint().runFlags).toContain('gallery-beacon-redirected');
    } finally { random.mockRestore(); }
  });

  test('an unscouted expedition carries a rescued native warning through resume and reaches all seven scenes', () => {
    renderGame(true);
    click(container, /seal crew/i);
    const routes = ['gantry', 'underdeck', 'decode', 'conduit', 'stabilize', 'harvest', 'closure'];
    const pacing = [];
    for (let i = 0; i < routes.length; i++) {
      const saved = playCreatureAction(routes[i], i === 1 ? /treats the injury/i : null, i === 0 ? /Leap between/i : null);
      if (i === 2) expect(saved.runFlags).toContain('archive-native-rescued');
      if (i === 3) {
        unmountGame();
        renderGame(true);
        click(container, /resume expedition/i);
      }
      if (i === 4) expect(saved.lastResult.unseenHazards.map(hazard => hazard.id)).not.toContain('plague-dust');
      if (i === 5) {
        expect(saved.runFlags).toContain('reservoir-timing-diagram');
        expect(saved.journal[5].story).toContain('service diagram');
        unmountGame();
        renderGame(true);
        click(container, /resume expedition/i);
        expect(readCheckpoint().runFlags).toContain('reservoir-timing-diagram');
      }
      if (i === 6) expect(saved.lastResult.unseenHazards.map(hazard => hazard.id)).not.toContain('ring-closure');
      pacing.push({ scene: saved.sceneIndex, pressure: saved.pressure, strain: saved.strain, salvage: saved.salvage });
      expect(saved.sceneIndex).toBe(i);
      if (i < routes.length - 1) expect(findButton(container, /view mission report/i), JSON.stringify(pacing)).toBeUndefined();
      if (i < routes.length - 1) {
        const brace = [...container.querySelectorAll('button')].find(button => /Brace the annex with/.test(button.textContent) && !button.disabled);
        if (saved.pressure >= 4 && brace) {
          clickElement(brace);
          click(container, /spend \d salvage/i);
        }
        click(container, /continue mission|go deeper/i);
        if (i === 3) {
          expect(container.querySelector('.lr-native-reunion').textContent).toContain('Hypnopet you freed');
          const energyBeforeEntry = { ...readCheckpoint().strain };
          expect(findButton(container, /^enter /i)).toBeUndefined();
          expect(container.querySelector('[aria-label="Scouting decision"]')).toBeNull();
          expect(container.querySelector('[aria-label="Choose a creature action"]')).toBeTruthy();
          expect(container.textContent).toContain('Known danger: Opening the field');
          expect(readCheckpoint().strain).toEqual(energyBeforeEntry);
        }
      }
    }
    expect(readCheckpoint().objectiveReached).toBe(true);
    expect(readCheckpoint().pressure).toBe(7);
    click(container, /leave with full salvage/i);
    expect(container.textContent).toContain('Deep Retrieval Complete');
    expect(container.textContent).toContain('Its warning revealed the contaminant layer');
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('7 crossings');
  });

  test.each(['keep', 'brace', 'balance'])('controlled recovery comparison: %s', policy => {
    renderGame(true);
    click(container, /seal crew/i);
    const routes = ['gantry', 'underdeck', 'decode', 'conduit', 'stabilize', 'harvest', 'closure'];
    let repairs = 0, saved;
    for (let i = 0; i < routes.length; i++) {
      saved = playCreatureAction(routes[i], i === 1 ? /treats the injury/i : null, i === 0 ? /Leap between/i : null);
      expect(saved.journal).toHaveLength(i + 1);
      if (findButton(container, /view mission report/i) || i === routes.length - 1) break;
      const available = [...container.querySelectorAll('.lr-workshop-options button')].filter(button => !button.disabled);
      const brace = available.find(button => /Brace the annex/.test(button.textContent));
      const tired = CREATURES.filter(member => (saved.strain[member.id] || 0) >= 3).sort((a, b) => saved.strain[b.id] - saved.strain[a.id]);
      const resupply = tired.map(member => available.find(button => button.textContent.includes(`Resupply ${member.species}`))).find(Boolean);
      const repair = policy === 'brace' ? brace : policy === 'balance' ? (saved.pressure >= 5 && brace) || resupply || (saved.pressure >= 3 && brace) : null;
      if (repair) { clickElement(repair); click(container, /spend \d salvage/i); repairs++; }
      click(container, /continue mission|go deeper/i);
    }
    const result = { policy, crossed: saved.journal.length, objective: saved.objectiveReached, forced: !!findButton(container, /view mission report/i), repairs, salvage: saved.salvage, stability: 10 - saved.pressure, energy: Object.fromEntries(CREATURES.slice(0, 3).map(member => [member.species, 6 - (saved.strain[member.id] || 0)])) };
    process.stdout.write('RECOVERY COMPARISON ' + JSON.stringify(result) + '\n');
    expect(result.objective).toBe(true);
    expect(result.forced).toBe(policy === 'keep');
    expect(result.crossed).toBe(policy === 'keep' ? 6 : 7);
  });

  test.each([
    ...[0.1, 0.35, 0.9].flatMap(sample => ['original', 'alternative'].map(crew => ({ sample, crew, scouting: 'none' }))),
    ...['every-room', 'remote-only', 'chromocat-first'].map(scouting => ({ sample: 0.35, crew: 'original', scouting }))
  ])('repeat experience comparison: $crew / $sample / $scouting', ({ sample, crew: roster, scouting }) => {
    vi.spyOn(Math, 'random').mockReturnValue(sample);
    renderGame(true);
    const members = roster === 'original' ? CREATURES.slice(0, 3) : CREATURES.slice(3, 6);
    if (roster === 'alternative') {
      CREATURES.slice(0, 3).forEach(member => clickElement(container.querySelector(`[data-creature-id="${member.id}"]`)));
      members.forEach(member => clickElement(container.querySelector(`[data-creature-id="${member.id}"]`)));
    }
    click(container, /seal crew/i);
    const routes = ['gantry', 'underdeck', 'decode', 'conduit', 'stabilize', 'harvest', 'closure'];
    let saved, repairs = 0, scouts = 0, returns = 0;
    for (let i = 0; i < routes.length; i++) {
      const scoutButtons = [...container.querySelectorAll('.lr-scout-intentions [data-scout-choice]')];
      const remote = scoutButtons.find(button => /Reports remotely/.test(button.textContent));
      const scout = scouting === 'chromocat-first' ? scoutButtons.find(button => /Chromocat/.test(button.textContent)) || remote || scoutButtons[0]
        : scouting === 'every-room' ? remote || scoutButtons[0] : scouting === 'remote-only' ? remote : null;
      if (scout) {
        clickElement(scout);
        click(container, /^send /i);
        scouts++;
        finishScoutTransition(container);
        if (container.querySelector('.lr-field-encounter')) {
          clickElement(container.querySelector('.lr-story-responses button'));
          clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
          if (findButton(container, /skip to outcome|reveal full account/i)) click(container, /skip to outcome|reveal full account/i);
          click(container, /see encounter result/i);
          click(container, /review scout report|choose an approach/i);
        }
        if (findButton(container, /wait for .* to return/i)) {
          click(container, /wait for .* to return/i);
          finishScoutTransition(container);
          returns++;
        }
        if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
      }
      saved = playCreatureAction(routes[i]);
      expect(saved.journal).toHaveLength(i + 1);
      if (findButton(container, /view mission report/i) || i === routes.length - 1) break;
      if (findButton(container, /wait and read the signal/i)) click(container, /wait and read the signal/i);
      saved = readCheckpoint();
      if (findButton(container, /view mission report/i)) break;
      const available = [...container.querySelectorAll('.lr-workshop-options button')].filter(button => !button.disabled);
      const brace = available.find(button => /Brace the annex/.test(button.textContent));
      const tired = members.filter(member => (saved.strain[member.id] || 0) >= 3).sort((a, b) => saved.strain[b.id] - saved.strain[a.id]);
      const resupply = tired.map(member => available.find(button => button.textContent.includes(`Resupply ${member.species}`))).find(Boolean);
      const repair = (saved.pressure >= 5 && brace) || resupply || (saved.pressure >= 3 && brace);
      if (repair) { clickElement(repair); click(container, /spend \d salvage/i); repairs++; }
      if (i === 1) {
        const flags = [...readCheckpoint().runFlags];
        unmountGame();
        renderGame(true);
        click(container, /resume expedition/i);
        expect(readCheckpoint().runFlags).toEqual(flags);
      }
      click(container, /continue mission|go deeper/i);
    }
    const result = { roster, sample, scouting, scouts, returns, crossed: saved.journal.length, objective: saved.objectiveReached, repairs, stability: 10 - saved.pressure,
      events: saved.journal.map(entry => ({ scene: entry.id, lead: entry.lead, encounter: entry.encounterId, discovery: entry.discovery || null })) };
    process.stdout.write('REPEAT COMPARISON ' + JSON.stringify(result) + '\n');
    expect(saved.journal.length).toBeGreaterThanOrEqual(1);
    expect(findButton(container, /view mission report|leave with full salvage/i)).toBeTruthy();
  });

  test('keeps route selection in place and commits without a second approval screen', () => {
    renderGame();
    click(container, /seal crew/i);
    click(container, /stay together/i);
    const board = container.querySelector('.lr-route-board');
    expect(board).toBeTruthy();
    expect(container.querySelector('.lr-simple-report-result')).toBeNull();
    const pick = board.querySelector('.lr-board-pick');
    pick.focus();
    clickElement(pick);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(findButton(container, /next: review crew/i)).toBeUndefined();
    expect(container.querySelector('[data-field-record]')).toBeNull();
    expect(container.querySelector('.lr-plan-roles').open).toBe(false);
    click(container, /cross now/i);
    expect(container.querySelector('[aria-label="Crossing in progress"]')).toBeTruthy();
  });

  test('changes the Simple lead in place without spending resources, then commits that lead', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    choosePreferredRoute(container);
    const board = container.querySelector('.lr-route-board');
    const alternative = container.querySelector('.lr-lead-options button[aria-pressed="false"]');
    const species = alternative.querySelector('strong').textContent;
    clickElement(alternative);
    expect(container.querySelector('.lr-route-board')).toBe(board);
    expect(container.querySelector('.lr-commit-identity').textContent).toContain(`${species} leads`);
    expect(container.querySelector('[data-field-record]')).toBeNull();
    expect(container.querySelector('.lr-lead-options button[aria-pressed="true"] strong').textContent).toBe(species);
    click(container, /cross now/i);
    expect(container.querySelector('[aria-label="Crossing in progress"]').textContent).toContain(species);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-arrival-story').textContent).toContain(species);
  });

  test('aborting before the Index banks no salvage, matching the ending story', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    choosePreferredRoute(container);
    click(container, /cross now/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-result-salvage').textContent).toMatch(/\+[1-9]/);
    clickElement(container.querySelector('button[aria-label="Abort mission"]'));
    const banked = Array.from(container.querySelectorAll('.lr-end-stats > div')).find(el => el.textContent.includes('Salvage banked'));
    expect(banked.querySelector('strong').textContent).toBe('0');
    expect(container.querySelector('.lr-end-copy').textContent).toContain('no salvage is banked');
  });

  function unmountGame() {
    act(() => root.unmount());
    root = null;
  }

  test('plays the recommended Simple plan through a complete crossing', () => {
    renderGame();
    enterSimpleRouteChoice(container);
    choosePreferredRoute(container);
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/All three cross/i);
    expect(container.querySelector('.lr-simple-plan-crew').textContent).toMatch(/Lead acts.*Hippochamp.*Support changes the attempt.*Reserve still crosses/is);
    expect(findButton(container, /use this plan/i)).toBeUndefined();
    click(container, /cross now/i);
    expect(container.querySelector('[role="dialog"][aria-label="Crossing in progress"]')).toBeTruthy();
    expect(container.querySelector('[data-field-record] [data-expedition-map][data-crew-position="approach"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-field-record] [data-map-creature][data-location="approach"]')).toHaveLength(3);
    click(container, /skip to outcome|reveal full account/i);
    expect(container.querySelector('.lr-sequence-story').textContent).toMatch(/What happened/i);
    expect(container.querySelectorAll('[data-field-record] [data-map-creature][data-location="exit"]')).toHaveLength(3);
    click(container, /continue to result/i);
    expect(container.querySelector('[data-field-record]')).toBeNull();
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelectorAll('.lr-result-changes .lr-projection-track').length).toBeGreaterThan(0);
    expect(container.querySelector('.lr-arrival-grid .lr-arrival-story')).toBeTruthy();
    expect(container.querySelector('[data-arrival-trace]').getAttribute('aria-label')).toContain('from Outer seal to Turbine hall');
    expect(container.querySelector('.lr-arrival-grid .lr-result-changes')).toBeTruthy();
    expect(container.querySelector('.lr-simple-result .lr-simple-surprise')).toBeNull();
    expect(container.querySelector('.lr-result-changes .lr-projection-track').getAttribute('aria-label')).toContain('remaining');
    expect(container.querySelector('.lr-result-changes .is-projected')).toBeNull();
    expect(container.querySelector('.lr-result-changes .lr-cost-sources')).toBeNull();
    expect(container.querySelector('.lr-result-explanation').open).toBe(false);
    expect(container.querySelector('.lr-result-explanation .lr-cost-sources')).toBeTruthy();
    expect(container.querySelector('.lr-result-salvage .lr-salvage-gauge')).toBeNull();
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable|No strain added/);
    expect(findButton(container, /continue mission/i)).toBeTruthy();
  });

  test('supports skipping the scan and opening the detailed plan builder', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis):not(.is-recommended) .lr-board-pick'));
      click(container, /customize crew plan/i);
    expect(container.textContent).toContain('Crew assignment');
    expect(container.textContent).toContain('Pick a lead, support, and method');
    expect(container.querySelector('main').classList.contains('lr-is-customizing')).toBe(true);
  });

  test('previews field recovery, spends salvage only on confirmation, and records it once', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    const workshop = container.querySelector('.lr-workshop');
    expect(workshop).toBeTruthy();
    const carried = workshop.querySelector('summary > b').textContent;
    click(workshop, /resupply graviclaw/i);
    expect(workshop.querySelector('summary > b').textContent).toBe(carried);
    expect(container.querySelector('.lr-field-receipt')).toBeNull();
    click(workshop, /spend 2 salvage/i);
    expect(container.querySelector('.lr-field-receipt').textContent).toContain('2 salvage spent');
    expect(container.querySelector('.lr-field-receipt [aria-label="Graviclaw energy: 5 to 6 of 6"]')).toBeTruthy();
    expect(container.querySelector('.lr-result-changes > span').textContent).toContain('before repair');
    expect(document.activeElement).toBe(container.querySelector('.lr-field-receipt h4'));
    expect(container.querySelector('.lr-action-feedback')).toBeNull();
    expect(container.querySelector('.lr-mission-journal').textContent).toMatch(/Graviclaw.*regain 1 energy/i);
    expect(container.querySelector('.lr-workshop')).toBeNull();
    click(container, /continue mission/i);
    expect(container.querySelector('.lr-field-receipt')).toBeNull();
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('1 crossing');
  });

  test('resumes a completed crossing with field work and resources intact', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container.querySelector('.lr-workshop'), /resupply graviclaw/i);
    click(container.querySelector('.lr-workshop'), /spend 2 salvage/i);
    const saved = readCheckpoint();
    expect(saved.salvage).toBe(0);
    expect(saved.fieldReceipt).toBeTruthy();
    unmountGame();
    renderGame();
    expect(container.textContent).toContain('Your expedition is waiting');
    click(container, /resume expedition/i);
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelector('.lr-field-receipt .lr-field-payment small').textContent).toBe('2 → 0 carried');
    expect(container.querySelector('.lr-workshop')).toBeNull();
    expect(readCheckpoint().strain).toEqual(saved.strain);
    expect(readCheckpoint().spentAbilities).toEqual(saved.spentAbilities);
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('1 crossing');
    click(container, /continue mission/i);
    playRecommendedScene(container);
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('2 crossings');
    click(container, /abort mission/i);
    expect(readCheckpoint()).toBeNull();
  });

  test('an older result checkpoint gains narrative presentation without replaying costs', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    const saved = readCheckpoint();
    delete saved.lastResult.paragraphs;
    saved.lastResult.story = 'Old brief crossing account.';
    unmountGame();
    expect(writeCheckpoint(saved)).toBe(true);
    renderGame();
    click(container, /resume expedition/i);
    expect(container.querySelectorAll('.lr-crossing-prose > p')).toHaveLength(1);
    expect(container.querySelectorAll('.lr-crossing-account p')).toHaveLength(4);
    expect(container.querySelector('.lr-crossing-account').open).toBe(false);
    expect(container.querySelector('.lr-crossing-prose').textContent).toContain('a side channel built to carry cooling water');
    expect(readCheckpoint().strain).toEqual(saved.strain);
    expect(readCheckpoint().pressure).toBe(saved.pressure);
    expect(readCheckpoint().salvage).toBe(saved.salvage);
  });

  test('reload during a crossing restores the preceding checkpoint without duplicating costs', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('[data-scout-options] [data-recommended]'));
    click(container, /^send /i);
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeTruthy();
    expect(readCheckpoint().phase).toBe('scout');
    unmountGame();
    renderGame();
    click(container, /resume expedition/i);
    expect(container.querySelector('[data-scout-options]')).toBeTruthy();
    expect(readCheckpoint().strain['graviclaw-213']).toBe(0);
    clickElement(container.querySelector('[data-scout-options] [data-recommended]'));
    click(container, /^send /i);
    expect(container.querySelector('.lr-simple-status-crew').textContent).toContain('5/6 energy');
  });

  test('old one-use ability results recover the historical method without refunding the ability', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-board-pick'));
    clickElement(Array.from(container.querySelectorAll('.lr-method-alternatives button')).find(button => /Spends this ability/.test(button.textContent)));
    click(container, /cross now/i);
    const saved = readCheckpoint();
    expect(saved.lastResult.abilityId).toBeTruthy();
    expect(saved.spentAbilities).toContain(saved.lastResult.abilityId);
    delete saved.lastResult.paragraphs;
    delete saved.lastResult.resolvedMethod;
    saved.lastResult.story = 'Old ability account.';
    unmountGame();
    expect(writeCheckpoint(saved)).toBe(true);
    renderGame();
    click(container, /resume expedition/i);
    expect(container.querySelectorAll('.lr-crossing-prose > p')).toHaveLength(1);
    expect(container.querySelectorAll('.lr-crossing-account p')).toHaveLength(4);
    expect(container.querySelector('.lr-crossing-prose').textContent).toContain('beam');
    expect(container.querySelector('.lr-result-ability')).toBeTruthy();
    expect(readCheckpoint().spentAbilities).toEqual(saved.spentAbilities);
    expect(readCheckpoint().strain).toEqual(saved.strain);
  });

  test('can reach the deepest extraction by reinvesting salvage between crossings', () => {
    renderGame();
    click(container, /seal crew/i);
    let fieldActions = 0;
    for (let scene = 0; scene < 7; scene += 1) {
      playRecommendedScene(container);
      if (findButton(container, /view mission report/i)) break;
      const workshop = container.querySelector('.lr-workshop');
      if (workshop) {
        const available = Array.from(workshop.querySelectorAll('.lr-workshop-options button')).filter(button => !button.disabled);
        const brace = available.find(button => /Brace the annex/.test(button.textContent));
        const saved = readCheckpoint();
        const tired = CREATURES.filter(member => (saved.strain[member.id] || 0) >= 3).sort((a, b) => saved.strain[b.id] - saved.strain[a.id]);
        const resupply = tired.map(member => available.find(button => button.textContent.includes(`Resupply ${member.species}`))).find(Boolean);
        const choice = (saved.pressure >= 5 && brace) || resupply || brace || available[0];
        if (choice) {
          clickElement(choice);
          click(workshop, /spend \d salvage/i);
          fieldActions += 1;
        }
      }
      if (scene < 6) clickElement(container.querySelector('.lr-depth-option.is-deeper, .lr-result-actions .g-btn--primary'));
    }
    expect(fieldActions).toBeGreaterThan(0);
    expect(findButton(container, /leave with full salvage/i), JSON.stringify(readCheckpoint())).toBeTruthy();
    click(container, /leave with full salvage/i);
    expect(container.textContent).toContain('Deep Retrieval Complete');
    expect(container.textContent).toMatch(/Deep retrieval.*extraction lift carries the crew clear/i);
    expect(container.textContent).toContain('ObjectiveSECURED');
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('7 crossings');
  });

  test('resolves a manually customized Simple plan and returns to the clean result view', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis):not(.is-recommended) .lr-board-pick'));
      click(container, /customize crew plan/i);
    clickElement(Array.from(container.querySelectorAll('.lr-crew-member')).find((button) => /Hippochamp/.test(button.textContent)));
    clickElement(Array.from(container.querySelectorAll('button')).find((button) => /Assign Chromocat as support/.test(button.getAttribute('aria-label') || '')));
    clickElement(Array.from(container.querySelectorAll('.lr-method-select')).find((button) => /Climb the suspension frame/.test(button.textContent)));
    expect(container.textContent).toContain('Known energy cost−4');
    click(container, /cross now/i);
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelector('main').classList.contains('lr-is-customizing')).toBe(false);
  });

  test('shows every crossing result before a terminal mission report', () => {
    renderGame();
    click(container, /seal crew/i);

    for (let scene = 0; scene < 7; scene += 1) {
      playRecommendedScene(container);
      if (findButton(container, /view mission report/i)) break;
      if (scene < 6) clickElement(container.querySelector('.lr-depth-option.is-deeper, .lr-result-actions .g-btn--primary'));
    }

    expect(findButton(container, /view mission report/i)).toBeTruthy();
    expect(container.querySelector('.lr-simple-result-head').textContent).toMatch(/evacuate now/i);
    click(container, /view mission report/i);
    expect(container.textContent).toContain('Forced Extraction');
    expect(container.textContent).toContain('ObjectiveSECURED');
    expect(container.textContent).toMatch(/Emergency extraction.*half of the carried salvage/i);
  });

  test('supports aborting early and extracting after the objective', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    expect(container.querySelector('#lr-abort-cost').textContent).toMatch(/Leave \d+ salvage behind/);
    expect(findButton(container, /abort mission/i).getAttribute('aria-describedby')).toBe('lr-abort-cost');
    click(container, /abort mission/i);
    expect(container.textContent).toContain('Mission Aborted');
    expect(container.textContent).toMatch(/Voluntary withdrawal.*Index remains below the ice/i);

    click(container, /run contract again/i);
    for (let scene = 0; scene < 5; scene += 1) {
      playRecommendedScene(container);
      if (scene < 4) clickElement(container.querySelector('.lr-result-actions .g-btn--primary'));
    }
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Index secured either way.*Leave now or explore deeper/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Index secured either way.*salvage banked/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toContain('Up to +19 more salvage');
    expect(container.querySelector('.lr-depth-decision [aria-label="Recovered objects"]').textContent).toMatch(/Nemesis Index (plates|blackbox)/);
    expect(container.querySelector('[data-depth-distance]').textContent).toContain('Across 2 optional crossings');
    expect(container.querySelector('.lr-haul-risk').textContent).toMatch(/keep \d+ · lose \d+/);
    click(container, /extract now/i);
    expect(container.textContent).toContain('Crew Extracted');
    expect(container.textContent).toContain('ObjectiveSECURED');
    expect(container.textContent).toMatch(/Voluntary extraction.*At the extraction fork.*stair into the lower annex falls behind them/i);
  });

  test('moves from the recommended scout to the simplified report', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('[data-scout-options] [data-recommended]'));
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeNull();
    expect(findButton(container, /^send /i).disabled).toBe(false);
    click(container, /^send /i);
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeTruthy();
    expect(container.querySelector('[data-field-reserve="energy"]').getAttribute('aria-label')).toContain('5 of 6');
    click(container, /skip to outcome|reveal full account/i);
    expect(container.querySelector('[data-field-reserve="energy"]').getAttribute('aria-label')).toContain('5 of 6');
    click(container, /review scout report/i);
    expect(container.textContent).toContain('Scout result');
    expect(container.querySelector('.lr-action-feedback')).toBeNull();
    expect(container.querySelector('.lr-simple-status-crew .is-changing')).toBeTruthy();
    expect(findButton(container, /choose a route/i)).toBeTruthy();
  });

  test('turns the second-scene scout signal into an explained native encounter and field companion', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    selectRecommendedScout(container);
    expect(container.textContent).toContain('Stranded Xylum');
    expect(container.querySelector('.lr-encounter-situation').textContent).toMatch(/visual signals reach the crew|must return to tell the crew/i);
    expect(container.querySelectorAll('.lr-encounter-choice-board .lr-response-outcome')).toHaveLength(3);
    expect(container.querySelector('.lr-encounter-options .is-recommended').textContent).toMatch(/call Hippochamp.*1 stability.*possible ally/i);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    clickElement(container.querySelector('.lr-encounter-options .is-recommended') || findButton(container, /treats the injury/i));
    expect(container.textContent).toContain('Selected response');
    expect(container.textContent).not.toContain('The native chooses to follow');
    clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
    expect(container.querySelector('[aria-label="Encounter response in progress"]')).toBeTruthy();
    const skip = findButton(container, /skip to outcome|reveal full account/i);
    expect(document.activeElement).toBe(skip);
    if (skip) clickElement(skip);
    click(container, /see encounter result/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    expect(container.querySelector('.lr-companion-promise').textContent).toContain('1assist ready');
    expect(container.querySelector('.lr-companion-promise').textContent).toContain('Prevents the lead’s next 1 energy loss while crossing');
    expect(container.textContent).toContain('The native chooses to follow');
    expect(container.querySelector('[data-map-ally]').getAttribute('data-location')).toBe('survey');
    click(container, /review scout report/i);
    expect(container.querySelector('[data-map-ally]').getAttribute('data-location')).toBe('survey');
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(container.querySelector('[data-expedition-map] [data-map-ally]')).toBeTruthy();
    expect(container.querySelector('[data-map-ally]').getAttribute('data-location')).toBe('survey');
    expect(container.querySelector('[data-expedition-map]').textContent).toMatch(/Xylum: beside the scout/i);
  });

  test('route review is reversible and native contact only starts when crossing is committed', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    click(container, /stay together|keep the crew together/i);
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    const nativeRoute = Array.from(container.querySelectorAll('.lr-board-pick')).find((button) => /maintenance underdeck/i.test(button.textContent));
    clickElement(nativeRoute);
      expect(container.querySelector('.lr-field-encounter')).toBeNull();
    expect(container.querySelector('.lr-simple-plan')).toBeTruthy();
    click(container, /change route/i);
    clickElement(Array.from(container.querySelectorAll('.lr-board-pick')).find(button => /maintenance underdeck/i.test(button.textContent)));
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/maintenance underdeck/i);
      expect(container.querySelector('.lr-field-encounter')).toBeNull();
    click(container, /cross now/i);
    expect(container.querySelector('[role="dialog"][aria-label="Encounter discovered"]')).toBeTruthy();
    expect(container.querySelector('[data-field-record] [data-expedition-map][data-crew-position="approach"]')).toBeTruthy();
    click(container, /skip to outcome|reveal full account/i);
    expect(container.querySelector('.lr-sequence-story').textContent).toMatch(/Choose how the crew responds before continuing/i);
    click(container, /choose response/i);
    expect(container.textContent).toContain('Unexpected crew encounter');
    expect(container.querySelector('.lr-encounter-situation').textContent).toContain('Crew caught unaware · +1 energy to respond');
    clickElement(container.querySelector('.lr-encounter-options .is-recommended') || findButton(container, /treats the injury/i));
    clickElement(container.querySelector('.lr-encounter-commit-bar button'));
    click(container, /skip to outcome|reveal full account/i);
    click(container, /see encounter result/i);
    click(container, /plan the crossing/i);
    expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/maintenance underdeck/i);
    expect(findButton(container, /cross now/i)).toBeTruthy();
    expect(container.querySelector('[data-expedition-map]').getAttribute('data-crew-position')).toBe('crossing');
  });

  test('preserves the advanced scouting interface in Expert mode', () => {
    renderGame();
    click(container, /^expert/i);
    click(container, /seal crew/i);
    expect(container.textContent).toContain('Read the scene');
    expect(findButton(container, /select scout to enable scan/i)).toBeTruthy();
    expect(container.querySelector('.lr-crew-rail')).toBeTruthy();
  });

  test('backing away does not silently clear a native when the crew returns', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    click(container, /stay together/i);
    const selectUnderdeck = () => clickElement(Array.from(container.querySelectorAll('.lr-board-pick')).find(button => /maintenance underdeck/i.test(button.textContent)));
    selectUnderdeck();
    click(container, /cross now/i);
    click(container, /skip to outcome|reveal full account/i);
    click(container, /choose response/i);
    clickElement(Array.from(container.querySelectorAll('.lr-encounter-options > button')).find(button => /back out/i.test(button.textContent)));
    clickElement(container.querySelector('.lr-encounter-commit-bar button'));
    click(container, /skip to outcome|reveal full account/i);
    click(container, /see encounter result/i);
    click(container, /compare routes again/i);
    selectUnderdeck();
    expect(container.querySelector('.lr-lead-uncertainty').textContent).toContain('Unscouted route');
    click(container, /cross now/i);
    expect(container.querySelector('[aria-label="Encounter discovered"]')).toBeTruthy();
  });

  test('makes the current action and route-selection state explicit', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(container.querySelector('.lr-current-action').textContent).toMatch(/Step 1 of 3.*Choose a scout/i);
    expect(document.activeElement).toBe(container.querySelector('.lr-wizard-chrome'));
    expect(container.querySelectorAll('.lr-simple-status .lr-projection-track')).toHaveLength(4);
    selectRecommendedScout(container);
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(container.querySelector('.lr-current-action').textContent).toMatch(/Step 2 of 3.*Choose one route/i);
    expect(document.activeElement).toBe(container.querySelector('.lr-wizard-chrome'));
    const recommendedOrFirst = container.querySelector('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis).is-recommended .lr-board-pick') || container.querySelector('.lr-board-pick');
    clickElement(recommendedOrFirst);
    expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('.lr-lead-options')).toBeTruthy();
    expect(findButton(container, /next: review crew/i)).toBeUndefined();
    expect(findButton(container, /cross now/i)).toBeTruthy();
      expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('.lr-route-confirmed')).toBeNull();
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/All three cross/i);
    expect(container.querySelectorAll('.lr-lead-options button')).toHaveLength(3);
    click(container, /change route/i);
    expect(container.querySelectorAll('.lr-board-head > th[role="columnheader"]:not(.lr-board-axis)')).toHaveLength(2);
  });

  test('opening-room map and scout choices share the same stage without sending a creature', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(findButton(container, /scout choices/i)).toBeUndefined();
    expect(container.querySelector('.lr-wizard-phase-scout')).toBeTruthy();
    expect(container.querySelector('[data-scout-options]')).toBeTruthy();
    expect(container.querySelector('[data-expedition-map]')).toBeTruthy();
    expect(container.querySelector('[data-field-record]')).toBeNull();
  });

  test('moves keyboard focus through each Simple wizard stage and enacted action', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('[data-scout-options] [data-recommended]'));
    click(container, /^send /i);
    expect(document.activeElement).toBe(findButton(container, /skip to outcome|reveal full account/i));
    act(() => container.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(container.querySelector('.lr-story-account'));
    click(container, /skip to outcome|reveal full account/i);
    expect(document.activeElement).toBe(findButton(container, /review scout report/i));
    click(container, /review scout report/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('.lr-board-pick'));
      expect(container.querySelector('.lr-lead-options button[aria-pressed="true"]')).toBeTruthy();
    click(container, /cross now/i);
    expect(document.activeElement).toBe(findButton(container, /skip to outcome|reveal full account/i));
    click(container, /skip to outcome|reveal full account/i);
    click(container, /continue to result/i);
    expect(document.activeElement).toBe(container.querySelector('[data-arrival-focus]'));
  });

  test('reviewing the other route after changing back previews it without moving or spending', () => {
    renderGame();
    click(container, /seal crew/i);
    click(container, /stay together/i);
    clickElement(container.querySelector('.lr-board-pick'));
    click(container, /change route/i);
    const before = container.querySelector('[data-expedition-reserves]').textContent;
    const other = container.querySelector('.is-energy [data-route-preview="intake"]');
    act(() => other.dispatchEvent(new MouseEvent('pointermove', {bubbles:true})));
    const map = container.querySelector('[data-expedition-map]');
    expect(map.getAttribute('data-preview-route')).toBe('intake');
    expect(map.textContent).toContain('Preview: Flooded passage');
    expect(map.querySelector('[data-map-direction="intake"]')).toBeTruthy();
    expect(map.querySelectorAll('[data-map-creature][data-location="entry"]')).toHaveLength(3);
    expect(container.querySelector('[data-expedition-reserves]').textContent).toBe(before);
    expect(container.querySelector('.lr-route-board')).toBeTruthy();
    expect(container.querySelector('.lr-board-pick[aria-pressed="true"]').textContent).toMatch(/hanging gantry/i);
  });

  test('compares known costs with unknown costs in matching resource lanes', () => {
    renderGame();
    expect(container.querySelectorAll('.lr-element-mark svg')).toHaveLength(6);
    expect(container.querySelector('.lr-element-mark').textContent).toBe('');
    click(container, /seal crew/i);
    expect(container.textContent).toMatch(/GraviclawReady · 6\/6 energy/i);
    expect(container.textContent).toMatch(/Annex stabilityStable · 10\/10/i);
    expect(container.querySelectorAll('[data-scout-options] > button')).toHaveLength(3);
    expect(container.querySelector('.lr-signal-gauge')).toBeNull();
    expect(container.querySelector('.lr-scout-visuals')).toBeNull();
    expect(container.querySelector('.lr-projection-legend')).toBeNull();
    expect(container.querySelector('.lr-scout-impact')).toBeNull();
    expect(container.querySelector('.lr-scout-storyline')).toBeNull();
    expect(container.querySelector('.lr-scout-relay')).toBeNull();
    expect(container.querySelectorAll('[data-scout-summary]')).toHaveLength(3);
    expect(container.querySelector('[data-scout-options] [data-recommended] [data-scout-summary]').textContent).toMatch(/Strong awareness.*Reports remotely.*1 energy/i);
    const returningScouts = [...container.querySelectorAll('[data-scout-summary]')].filter((summary) => summary.textContent.includes('Must return'));
    expect(returningScouts).toHaveLength(2);
    expect(returningScouts.every((summary) => summary.textContent.includes('2 energy · 1 stability'))).toBe(true);
    expect(container.textContent).toContain('How scouting costs work');
    expect(container.querySelectorAll('[data-scout-options] .lr-projection-track')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/The scan costs|Ready 0\/6 → Ready/);
    selectRecommendedScout(container);
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(container.querySelector('.lr-route-guidance')).toBeNull();
    expect(container.querySelector('.lr-salvage-explainer')).toBeNull();
    const board = container.querySelector('[role="table"][aria-label="Compare route costs and rewards"]');
    expect(board).toBeTruthy();
    const energy = board.querySelectorAll('.is-energy [role="cell"]');
    expect(energy).toHaveLength(2);
    expect(energy[0].getAttribute('aria-label')).toContain('1 energy');
    expect(energy[1].getAttribute('aria-label')).toContain('0 energy known, plus unknown extra cost');
    expect(board.querySelectorAll('.lr-board-unknown')).toHaveLength(2);
    expect(board.querySelectorAll('.is-salvage [role="cell"]')[1].textContent).toContain('2');
    expect(board.querySelectorAll('.lr-board-analysis')).toHaveLength(2);
    expect(board.querySelector('details[open]')).toBeNull();
    choosePreferredRoute(container);
    expect(container.querySelector('.lr-simple-plan-projections')).toBeNull();
    expect(container.querySelectorAll('.lr-board-unknown')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/No strain expected|No change expected/);
    expect(container.querySelector('.lr-plan-roles').textContent).toContain('team score');
    expect(container.querySelector('.lr-plan-roles').open).toBe(false);
  });

  test('shows the previous route consequence before entering the next scene', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    expect(container.querySelector('.lr-crossing-prose').textContent).toContain('a side channel built to carry cooling water');
    expect(container.querySelector('.lr-crossing-prose').textContent).toContain('maintenance passage ahead');
    expect(container.querySelector('.lr-consequence-preview')).toBeNull();
    click(container, /continue mission/i);
    expect(container.querySelector('.lr-transition-beat').textContent).toMatch(/side channel your crossing cleared/i);
    expect(container.querySelector('.lr-transition-beat .lr-memory-card')).toBeNull();
    expect(container.querySelector('.lr-memory-effects')).toBeNull();
    expect(container.querySelector('.lr-memory-card')).toBeNull();
    click(container, /^enter /i);
    expect(container.querySelector('[data-scout-options]')).toBeTruthy();
  });

  test('keeps prior choices available in an optional compact expedition log', () => {
    renderGame();
    click(container, /seal crew/i);
    click(container, /^log/i);
    const emptyLog = container.querySelector('[role="dialog"][aria-labelledby="lr-memory-title"]');
    expect(emptyLog).toBeTruthy();
    expect(container.textContent).toContain('The first crossing will appear here');
    const lastDialogButton = findButton(emptyLog, /return to current decision/i);
    lastDialogButton.focus();
    act(() => { lastDialogButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect(document.activeElement).toBe(emptyLog.querySelector('[aria-label="Close expedition log"]'));
    click(container, /return to current decision/i);
    playRecommendedScene(container);
    click(container, /^log/i);
    const memory = container.querySelector('.lr-memory-modal');
    expect(memory.textContent).toMatch(/1Crossings/i);
    expect(memory.querySelectorAll('.lr-memory-timeline > li')).toHaveLength(1);
    expect(memory.textContent).toMatch(/energy|stability/i);
    expect(memory.textContent).toContain('Still affecting the mission');
  });

  test('presents the trapped vestibule native as a distinct field decision', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    selectRecommendedScout(container);
    expect(container.textContent).toContain('Trapped Signal-Mimic');
    expect(container.textContent).toMatch(/Release it from the arms|Mark the safe controls/i);
  });
});

describe('Long Return decision language', () => {
  const plan = (overrides = {}) => ({
    route: { id: 'route', salvage: 2, activeEffects: [] },
    knownLeadStrain: 1,
    baseSupportStrain: 0,
    knownPressure: 1,
    unresolvedHazards: [],
    nativeRisk: false,
    risk: 20,
    margin: 8,
    rawMethodScore: 70,
    difficulty: 68,
    ...overrides
  });

  test('does not recommend a safer route when it gives up a visible resource', () => {
    const safer = plan({ route: { id: 'safer', salvage: 1, activeEffects: [] }, risk: 5 });
    const richer = plan({ route: { id: 'richer', salvage: 3, activeEffects: [] }, risk: 30, unresolvedHazards: [{ id: 'hidden' }] });
    expect(recommendationFor([safer, richer])).toBeNull();
  });

  test('recommends only a route that clearly dominates the alternative', () => {
    const best = plan({ route: { id: 'best', salvage: 3, activeEffects: [] }, knownLeadStrain: 0, knownPressure: 0, risk: 2, margin: 18 });
    const worse = plan({ route: { id: 'worse', salvage: 2, activeEffects: [] }, knownLeadStrain: 1, knownPressure: 1, risk: 24, unresolvedHazards: [{ id: 'hidden' }] });
    const recommendation = recommendationFor([best, worse]);
    expect(recommendation.plan).toBe(best);
    expect(recommendation.reason).toMatch(/1 less projected energy use.*1 less stability loss.*1 more salvage/i);
  });

  test('gives same-risk routes distinct player-facing trade-off labels', () => {
    const largerHaul = plan({ route: { id: 'stabilize', salvage: 5, activeEffects: [] }, knownLeadStrain: 1, knownPressure: 1, unresolvedHazards: [{ id: 'dust' }] });
    const lowerEnergy = plan({ route: { id: 'blackbox', salvage: 3, activeEffects: [] }, knownLeadStrain: 0, knownPressure: 3, unresolvedHazards: [{ id: 'dust' }] });
    expect(routeAdvantage(largerHaul, [largerHaul, lowerEnergy])).toBe('Protects annex · more salvage');
    expect(routeAdvantage(lowerEnergy, [largerHaul, lowerEnergy])).toBe('Easier on the crew');
  });

  test('does not rank away a one-use tool, future opportunity, or unknown outcome', () => {
    const best = plan({ route:{id:'best',salvage:3},knownLeadStrain:0,knownPressure:0,risk:1,margin:18 });
    const other = plan({ route:{id:'other',salvage:2},knownLeadStrain:1,knownPressure:1,risk:24 });
    expect(recommendationFor([{...best,method:{abilityId:'unique-tool'}},other])).toBeNull();
    expect(recommendationFor([{...best,route:{...best.route,consequence:{id:'quiet-entry'}}},other])).toBeNull();
    expect(recommendationFor([{...best,unresolvedHazards:['a']},{...other,unresolvedHazards:['b']}])).toBeNull();
  });

  test('states when support is projected to spend energy', () => {
    expect(supportRoleForPlan(plan({ baseSupportStrain: 1 }))).toBe('Intervenes · spends 1 energy');
    expect(supportRoleForPlan(plan())).toBe('Backup role · no energy projected');
  });

  test('gives territorial responses distinct outcome stories', () => {
    const signal = encounterNarrative({ archetype: 'territorial', option: { id: 'signal-space', resolution: 'cleared' }, nativeName: 'Ectoghoul', actorName: 'Graviclaw' });
    const distract = encounterNarrative({ archetype: 'territorial', option: { id: 'distract', resolution: 'cleared' }, nativeName: 'Ectoghoul', actorName: 'Graviclaw' });
    expect(signal).toMatch(/boundary/i);
    expect(distract).toMatch(/moves out to investigate/i);
    expect(distract).not.toBe(signal);
  });

  test('a territorial challenge is a confrontation, not a decoy', () => {
    const story = encounterNarrative({ archetype: 'territorial', option: { id: 'challenge', resolution: 'cleared' }, nativeName: 'Ectoghoul', actorName: 'Graviclaw' });
    expect(story).toContain('answers the challenge');
    expect(story).not.toMatch(/decoy|investigate|diversion/);
  });

  test('native assistance tells the relevant rescue rather than promising ownership', () => {
    const injured = encounterNarrative({ archetype: 'injured', option: { companion: true }, nativeName: 'Xylum' });
    const trapped = encounterNarrative({ archetype: 'trapped', option: { companion: true }, nativeName: 'Hypnopet' });
    expect(injured).toContain('cracked bearing');
    expect(trapped).toContain('authentication arms');
    expect(trapped).toContain('It has chosen their company.');
    expect(encounterNarrative({ archetype: 'injured', option: { companion: true, instability: 1 }, nativeName: 'Xylum' })).toContain('old machinery continues straining its failing supports');
    expect(trapped).not.toMatch(/injury|roots/);
    for (const text of [injured, trapped]) {
      expect(text.split('\n\n')).toHaveLength(2);
      expect(text).not.toMatch(/intervene once|1 energy|owned|captured/);
    }
  });

  test('withdrawal and detour leave the native present rather than claiming clearance', () => {
    const base = { archetype: 'injured', nativeName: 'Xylum', scoutName: 'Chromocat' };
    expect(encounterNarrative({ ...base, option: { resolution: 'unresolved' } })).toContain('route has not been cleared');
    expect(encounterNarrative({ ...base, option: { resolution: 'detour' } })).toContain('remains where they found it');
  });

  test('pinning the rig gives access to the door without claiming a crossing or rescue', () => {
    const story = encounterNarrative({ archetype: 'trapped', option: { id: 'pin-rig', resolution: 'cleared' }, nativeName: 'Hypnopet', actorName: 'Graviclaw' });
    expect(story).toContain('Hypnopet is still caught');
    expect(story).toContain('door itself still stands shut');
    expect(story).not.toMatch(/They have passed|escapes|recorded the intrusion|signal fades/);
  });

  test('solo aid, calling help and fetching help have distinct journeys', () => {
    const context = { archetype: 'injured', nativeName: 'Xylum', scoutName: 'Chromocat', helperName: 'Hippochamp', mode: 'scout' };
    const tell = id => encounterNarrative({ ...context, option: { id, companion: true } });
    expect(tell('aid')).toContain('Chromocat approaches the cracked bearing alone');
    expect(tell('aid')).not.toContain('Hippochamp');
    expect(tell('call-medic')).toContain('Hippochamp follows the call');
    expect(tell('call-medic')).not.toContain('second time');
    expect(tell('return-for-medic')).toContain('goes back for Hippochamp');
    expect(tell('return-for-medic')).toContain('second time');
    const surprised = encounterNarrative({ ...context, option: { id: 'call-medic', companion: true, scoutStrain: 1 } });
    expect(surprised).toContain('strength from Chromocat before the treatment begins');
    expect(surprised).not.toContain('work leaves Hippochamp');
    const fetched = encounterNarrative({ ...context, option: { id: 'return-for-medic', companion: true, scoutStrain: 1 } });
    expect(fetched).toContain('extra trip leaves Chromocat');
    expect(tell('call-medic')).not.toContain('taken strength');
  });
});
