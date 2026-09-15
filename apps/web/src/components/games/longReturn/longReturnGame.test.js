import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LongReturnGame, { encounterNarrative, missionOutcomePresentation, recommendationFor, routeAdvantage, supportRoleForPlan } from './longReturnGame';
import { readCheckpoint, writeCheckpoint } from './expeditionSave';

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
  click(container, /skip to outcome/i);
  click(container, /review scout report|check scout status|respond to encounter/i);
}

function selectRecommendedScout(container) {
  clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
  click(container, /^send /i);
  finishScoutTransition(container);
}

function chooseRecommendedEncounterResponse(container) {
  clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
  clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
  expect(container.querySelector('[aria-label="Encounter response in progress"]')).toBeTruthy();
  const skip = findButton(container, /skip to outcome/i);
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
  expect(container.querySelectorAll('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis)')).toHaveLength(2);
}

function choosePreferredRoute(container) {
  const recommended = container.querySelector('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis).is-recommended .lr-board-pick');
  const lowestRisk = container.querySelector('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis)[data-lowest-risk="true"] .lr-board-pick');
  clickElement(recommended || lowestRisk || container.querySelector('.lr-board-pick'));
}

function playRecommendedScene(container) {
  const enterButton = findButton(container, /^enter /i);
  if (enterButton) clickElement(enterButton);
  const recommendedScout = container.querySelector('.lr-simple-scouts .is-recommended');
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
  expect(container.textContent).toContain('Crossing complete');
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
    expect(depleted.label).toContain('Index retained');
    const collapsed = missionOutcomePresentation('failed', false, 0, 'Annex stability reached zero.');
    expect(collapsed.copy).toContain('Annex stability reached zero.');
    expect(collapsed.label).toContain('Objective lost');
  });
  let container;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
      root = null;
    }
    container.remove();
  });

  function renderGame() {
    if (!root) root = createRoot(container);
    act(() => {
      root.render(<LongReturnGame />);
    });
  }

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
    expect(container.querySelector('.lr-action-curtain')).toBeNull();
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
    expect(container.querySelector('.lr-action-curtain')).toBeNull();
    expect(container.querySelector('.lr-lead-options button[aria-pressed="true"] strong').textContent).toBe(species);
    click(container, /cross now/i);
    expect(container.querySelector('[aria-label="Crossing in progress"]').textContent).toContain(species);
    click(container, /skip to outcome/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-arrival-story').textContent).toContain(species);
  });

  test('aborting before the Index banks no salvage, matching the ending story', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    choosePreferredRoute(container);
    click(container, /cross now/i);
    click(container, /skip to outcome/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-result-salvage').textContent).toMatch(/\+[1-9]/);
    clickElement(container.querySelector('button[aria-label="Abort mission"]'));
    const banked = Array.from(container.querySelectorAll('.lr-end-stats > div')).find(el => el.textContent.includes('Salvage banked'));
    expect(banked.textContent).toContain('0 · None');
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
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/All three cross together/i);
    expect(container.querySelector('.lr-simple-plan-crew').textContent).toMatch(/Lead acts.*Hippochamp.*Support changes the attempt.*Reserve still crosses/is);
    expect(findButton(container, /use this plan/i)).toBeUndefined();
    click(container, /cross now/i);
    expect(container.querySelector('[role="dialog"][aria-label="Crossing in progress"]')).toBeTruthy();
    expect(container.querySelector('.lr-action-resources').textContent).toMatch(/Crew energy.*Stability.*Salvage/i);
    click(container, /skip to outcome/i);
    expect(container.querySelector('.lr-sequence-story').textContent).toMatch(/What happened/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-action-curtain')).toBeNull();
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelectorAll('.lr-result-changes .lr-projection-track').length).toBeGreaterThan(0);
    expect(container.querySelector('.lr-arrival-grid .lr-arrival-story')).toBeTruthy();
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
    clickElement(container.querySelector('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis):not(.is-recommended) .lr-board-pick'));
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
    expect(container.querySelectorAll('.lr-crossing-prose p')).toHaveLength(4);
    expect(container.querySelector('.lr-crossing-prose').textContent).toContain('a side channel built to carry cooling water');
    expect(readCheckpoint().strain).toEqual(saved.strain);
    expect(readCheckpoint().pressure).toBe(saved.pressure);
    expect(readCheckpoint().salvage).toBe(saved.salvage);
  });

  test('reload during a crossing restores the preceding checkpoint without duplicating costs', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /^send /i);
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeTruthy();
    expect(readCheckpoint().phase).toBe('scout');
    unmountGame();
    renderGame();
    click(container, /resume expedition/i);
    expect(container.querySelector('.lr-simple-scouts')).toBeTruthy();
    expect(readCheckpoint().strain['graviclaw-213']).toBe(0);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
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
    expect(container.querySelectorAll('.lr-crossing-prose p')).toHaveLength(4);
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
        const choice = brace || available[0];
        if (choice) {
          clickElement(choice);
          click(workshop, /spend \d salvage/i);
          fieldActions += 1;
        }
      }
      if (scene < 6) clickElement(container.querySelector('.lr-depth-option.is-deeper, .lr-result-actions .g-btn--primary'));
    }
    expect(fieldActions).toBeGreaterThan(0);
    expect(findButton(container, /leave with full salvage/i)).toBeTruthy();
    click(container, /leave with full salvage/i);
    expect(container.textContent).toContain('Deep Retrieval Complete');
    expect(container.textContent).toMatch(/Deep retrieval.*exhausted its last opportunity/i);
    expect(container.textContent).toContain('ObjectiveSECURED');
    expect(container.querySelector('.lr-mission-journal').textContent).toContain('7 crossings');
  });

  test('resolves a manually customized Simple plan and returns to the clean result view', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis):not(.is-recommended) .lr-board-pick'));
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
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Index secured either way.*Bank the haul—or venture deeper/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Index secured either way.*salvage banked/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toContain('+19more salvage possible');
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/\d+ of your \d+ carried salvage at risk/);
    click(container, /extract now/i);
    expect(container.textContent).toContain('Crew Extracted');
    expect(container.textContent).toContain('ObjectiveSECURED');
    expect(container.textContent).toMatch(/Voluntary extraction.*unopened depths remain/i);
  });

  test('moves from the recommended scout to the simplified report', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeNull();
    expect(findButton(container, /^send /i).disabled).toBe(false);
    click(container, /^send /i);
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeTruthy();
    expect(container.querySelector('.lr-scout-meter.is-energy').getAttribute('aria-label')).toContain('5 of 6');
    click(container, /skip to outcome/i);
    expect(container.querySelector('.lr-scout-meter.is-energy').getAttribute('aria-label')).toContain('5 of 6');
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
    expect(container.textContent).toMatch(/crew contact|physical return/i);
    expect(container.querySelectorAll('.lr-encounter-choice-board .lr-response-outcome')).toHaveLength(3);
    expect(container.querySelector('.lr-encounter-options .is-recommended').textContent).toMatch(/call Hippochamp.*1 stability.*possible ally/i);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
    expect(container.textContent).toContain('Selected response');
    expect(container.textContent).not.toContain('The native chooses to follow');
    clickElement(container.querySelector('.lr-encounter-commit-bar button.g-btn--primary'));
    expect(container.querySelector('[aria-label="Encounter response in progress"]')).toBeTruthy();
    const skip = findButton(container, /skip to outcome/i);
    expect(document.activeElement).toBe(skip);
    if (skip) clickElement(skip);
    click(container, /see encounter result/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    expect(container.querySelector('.lr-companion-promise').textContent).toContain('1assist ready');
    expect(container.querySelector('.lr-companion-promise').textContent).toContain('Prevents the lead’s next 1 energy loss while crossing');
    expect(container.textContent).toContain('The native chooses to follow');
    expect(container.querySelector('.lr-scene-stage__companion')).toBeTruthy();
    click(container, /review scout report/i);
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(container.querySelector('.lr-route-map__encounter').textContent).toMatch(/xylum joined the crew/i);
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
    expect(container.querySelector('.lr-action-curtain').textContent).toMatch(/emerges from the annex.*response next/i);
    click(container, /skip to outcome/i);
    expect(container.querySelector('.lr-sequence-story').textContent).toMatch(/The next move belongs to the crew/i);
    click(container, /choose response/i);
    expect(container.textContent).toContain('Unexpected crew encounter');
    expect(container.textContent).toContain('The native acts before the crew can organize');
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
    click(container, /skip to outcome/i);
    click(container, /choose response/i);
    clickElement(Array.from(container.querySelectorAll('.lr-encounter-options > button')).find(button => /back out/i.test(button.textContent)));
    clickElement(container.querySelector('.lr-encounter-commit-bar button'));
    click(container, /skip to outcome/i);
    click(container, /see encounter result/i);
    click(container, /compare routes again/i);
    selectUnderdeck();
    expect(container.querySelector('.lr-lead-uncertainty').textContent).toContain('Unscouted danger');
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
    const recommendedOrFirst = container.querySelector('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis).is-recommended .lr-board-pick') || container.querySelector('.lr-board-pick');
    clickElement(recommendedOrFirst);
    expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('.lr-lead-options')).toBeTruthy();
    expect(findButton(container, /next: review crew/i)).toBeUndefined();
    expect(findButton(container, /cross now/i)).toBeTruthy();
      expect(container.querySelector('.lr-route-board')).toBeNull();
    expect(container.querySelector('.lr-route-confirmed')).toBeNull();
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/All three cross together/i);
    expect(container.querySelectorAll('.lr-lead-options button')).toHaveLength(3);
    click(container, /change route/i);
    expect(container.querySelectorAll('.lr-board-head > div[role="columnheader"]:not(.lr-board-axis)')).toHaveLength(2);
  });

  test('moves keyboard focus through each Simple wizard stage and enacted action', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /^send /i);
    expect(document.activeElement).toBe(findButton(container, /skip to outcome/i));
    act(() => container.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(container.querySelector('.lr-sequence-story-scroll'));
    click(container, /skip to outcome/i);
    expect(document.activeElement).toBe(container.querySelector('.lr-sequence-story-scroll'));
    click(container, /review scout report/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    if (findButton(container, /choose a route/i)) click(container, /choose a route/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('.lr-board-pick'));
      expect(container.querySelector('.lr-lead-options button[aria-pressed="true"]')).toBeTruthy();
    click(container, /cross now/i);
    expect(document.activeElement).toBe(findButton(container, /skip to outcome/i));
    click(container, /skip to outcome/i);
    click(container, /continue to result/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
  });

  test('compares known costs with unknown costs in matching resource lanes', () => {
    renderGame();
    expect(container.querySelectorAll('.lr-element-mark svg')).toHaveLength(6);
    expect(container.querySelector('.lr-element-mark').textContent).toBe('');
    click(container, /seal crew/i);
    expect(container.textContent).toMatch(/GraviclawReady · 6\/6 energy/i);
    expect(container.textContent).toMatch(/Annex stabilityStable · 10\/10/i);
    expect(container.querySelectorAll('.lr-simple-scouts > button')).toHaveLength(3);
    expect(container.querySelectorAll('.lr-signal-gauge')).toHaveLength(3);
    expect(container.querySelectorAll('.lr-signal-gauge .is-filled').length).toBeGreaterThan(0);
    expect(container.querySelector('.lr-scout-visuals')).toBeNull();
    expect(container.querySelector('.lr-projection-legend')).toBeNull();
    expect(container.querySelector('.lr-scout-impact')).toBeNull();
    expect(container.querySelectorAll('.lr-scout-storyline')).toHaveLength(3);
    expect(container.querySelector('.lr-simple-scouts .is-recommended .lr-scout-storyline').textContent).toMatch(/Scout for danger.*Strong awareness.*Uses 1 energy.*Vibration connects.*Report reaches crew.*No return needed/i);
    expect(container.querySelectorAll('.lr-scout-relay')).toHaveLength(3);
    expect(container.querySelector('.lr-simple-scouts .is-recommended .lr-scout-relay').getAttribute('aria-label')).toMatch(/strong awareness.*spends 1 energy.*vibration communication reaches the crew.*without a return trip/i);
    expect(container.querySelectorAll('.lr-scout-relay.is-warning')).toHaveLength(2);
    expect(container.querySelector('.lr-scout-relay.is-warning').textContent).toMatch(/No compatible relay.*Returns to crew.*Uses 1 more energy.*Loses 1 stability/i);
    expect(container.querySelectorAll('.lr-simple-scouts .lr-projection-track')).toHaveLength(0);
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
    expect(container.querySelector('.lr-transition-beat').textContent).toMatch(/Your earlier route matters here/i);
    expect(container.querySelector('.lr-memory-effects')).toBeNull();
    expect(container.querySelector('.lr-memory-card')).toBeTruthy();
    click(container, /^enter /i);
    expect(container.querySelector('.lr-simple-scouts')).toBeTruthy();
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

  test('pinning the rig permits passage but does not claim a rescue or security intrusion', () => {
    const story = encounterNarrative({ archetype: 'trapped', option: { id: 'pin-rig', resolution: 'cleared' }, nativeName: 'Hypnopet', actorName: 'Graviclaw' });
    expect(story).toContain('Hypnopet is still caught');
    expect(story).toContain('without freeing the creature');
    expect(story).not.toMatch(/escapes|recorded the intrusion|signal fades/);
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
