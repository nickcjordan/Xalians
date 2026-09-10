import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import LongReturnGame from './longReturnGame';
import { readCheckpoint } from './expeditionSave';

vi.mock('../../xalianImage', () => ({ default: function MockXalianImage() { return <div data-testid="creature-portrait" />; } }));

function findButton(container, label) {
  return Array.from(container.querySelectorAll('button')).find((button) => label.test(button.textContent));
}

function click(container, label) {
  const button = findButton(container, label);
  expect(button).toBeTruthy();
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
  click(container, /take this action/i);
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
  expect(container.textContent).toContain('Scout result');
  if (findButton(container, /wait for .* to return/i)) { click(container, /wait for .* to return/i); finishScoutTransition(container); }
  click(container, /choose a route/i);
  expect(container.querySelectorAll('.lr-simple-routes > article')).toHaveLength(2);
}

function choosePreferredRoute(container) {
  const recommended = container.querySelector('.lr-simple-routes > article.is-recommended .lr-route-choice-main');
  const lowestRisk = container.querySelector('.lr-simple-routes > article[data-lowest-risk="true"] .lr-route-choice-main');
  clickElement(recommended || lowestRisk || container.querySelector('.lr-simple-routes .lr-route-choice-main'));
  click(container, /next: review crew/i);
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
  click(container, /choose a route/i);
  choosePreferredRoute(container);
  click(container, /cross now/i);
  expect(container.textContent).toContain('Crossing complete');
}

describe('Long Return Simple mode', () => {
  let container;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
  });

  function renderGame() {
    act(() => {
      ReactDOM.render(<LongReturnGame />, container);
    });
  }

  test('plays the recommended Simple plan through a complete crossing', () => {
    renderGame();
    enterSimpleRouteChoice(container);
    choosePreferredRoute(container);
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/Hippochamp.*leads with/i);
    expect(findButton(container, /use this plan/i)).toBeUndefined();
    click(container, /cross now/i);
    expect(container.querySelector('[role="dialog"][aria-label="Crossing in progress"]')).toBeTruthy();
    expect(container.querySelector('.lr-action-resources').textContent).toMatch(/Crew energy.*Stability.*Salvage/i);
    click(container, /skip to outcome/i);
    expect(container.querySelector('.lr-sequence-caption').textContent).toMatch(/crossing complete/i);
    click(container, /continue to result/i);
    expect(container.querySelector('.lr-action-curtain')).toBeNull();
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelectorAll('.lr-result-changes .lr-projection-track').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable|No strain added/);
    expect(findButton(container, /continue mission/i)).toBeTruthy();
  });

  test('supports skipping the scan and opening the detailed plan builder', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-simple-routes > article:not(.is-recommended) .lr-route-choice-main'));
    click(container, /next: review crew/i);
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
    expect(container.querySelector('.lr-field-receipt').textContent).toMatch(/Graviclaw.*regain 1 energy.*2 salvage spent.*0 still carried/i);
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
    act(() => ReactDOM.unmountComponentAtNode(container));
    renderGame();
    expect(container.textContent).toContain('Your expedition is waiting');
    click(container, /resume expedition/i);
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelector('.lr-field-receipt').textContent).toContain('0 still carried');
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

  test('reload during a crossing restores the preceding checkpoint without duplicating costs', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /^send /i);
    expect(container.querySelector('[aria-label="Scouting in progress"]')).toBeTruthy();
    expect(readCheckpoint().phase).toBe('scout');
    act(() => ReactDOM.unmountComponentAtNode(container));
    renderGame();
    click(container, /resume expedition/i);
    expect(container.querySelector('.lr-simple-scouts')).toBeTruthy();
    expect(readCheckpoint().strain['graviclaw-213']).toBe(0);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /^send /i);
    expect(container.querySelector('.lr-simple-status-crew').textContent).toContain('5/6 energy');
  });

  test('can reach the deepest extraction by reinvesting salvage between crossings', () => {
    renderGame();
    click(container, /seal crew/i);
    let fieldActions = 0;
    for (let scene = 0; scene < 7; scene += 1) {
      playRecommendedScene(container);
      const workshop = container.querySelector('.lr-workshop');
      if (workshop) {
        const available = Array.from(workshop.querySelectorAll('button')).filter(button => !button.disabled);
        const brace = available.find(button => /Brace the annex/.test(button.textContent));
        const choice = brace || available[0];
        if (choice) {
          clickElement(choice);
          click(workshop, /spend \d salvage/i);
          fieldActions += 1;
        }
      }
      if (scene < 6) clickElement(container.querySelector('.lr-result-actions .g-btn--primary'));
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
    clickElement(container.querySelector('.lr-simple-routes > article:not(.is-recommended) .lr-route-choice-main'));
    click(container, /next: review crew/i);
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
      if (scene < 6) clickElement(container.querySelector('.lr-result-actions .g-btn--primary'));
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
    click(container, /abort mission/i);
    expect(container.textContent).toContain('Mission Aborted');
    expect(container.textContent).toMatch(/Voluntary withdrawal.*Index remains below the ice/i);

    click(container, /run contract again/i);
    for (let scene = 0; scene < 5; scene += 1) {
      playRecommendedScene(container);
      if (scene < 4) clickElement(container.querySelector('.lr-result-actions .g-btn--primary'));
    }
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Leave with the Index.*optional depths/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/salvage banked.*Index secured/i);
    expect(container.querySelector('.lr-depth-decision').textContent).toMatch(/Up to \+19 more salvage.*2 sectors/i);
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
    expect(container.querySelector('.lr-scout-meter.is-energy').getAttribute('aria-label')).toContain('6 of 6');
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
    expect(container.querySelectorAll('.lr-encounter-choice-path')).toHaveLength(3);
    expect(container.textContent).toMatch(/assist.*annex stability.*possible ally/i);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
    expect(container.textContent).toContain('Selected response');
    expect(container.textContent).not.toContain('The native chooses to follow');
    click(container, /take this action/i);
    expect(container.querySelector('[aria-label="Encounter response in progress"]')).toBeTruthy();
    const skip = findButton(container, /skip to outcome/i);
    expect(document.activeElement).toBe(skip);
    if (skip) clickElement(skip);
    click(container, /see encounter result/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    expect(container.textContent).toContain('Field companion');
    expect(container.textContent).toContain('The native chooses to follow');
    expect(container.querySelector('.lr-scene-stage__companion')).toBeTruthy();
    click(container, /review scout report/i);
    click(container, /choose a route/i);
    expect(container.querySelector('.lr-route-map__encounter').textContent).toMatch(/xylum joined the crew/i);
  });

  test('route review is reversible and native contact only starts when crossing is committed', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    click(container, /stay together|keep the crew together/i);
    click(container, /choose a route/i);
    const nativeRoute = Array.from(container.querySelectorAll('.lr-simple-routes .lr-route-choice-main')).find((button) => /maintenance underdeck/i.test(button.textContent));
    clickElement(nativeRoute);
    click(container, /next: review crew/i);
    expect(container.querySelector('.lr-field-encounter')).toBeNull();
    expect(container.querySelector('.lr-simple-plan')).toBeTruthy();
    click(container, /back to routes/i);
    expect(container.querySelector('.lr-simple-routes > article.is-selected').textContent).toMatch(/maintenance underdeck/i);
    click(container, /next: review crew/i);
    expect(container.querySelector('.lr-field-encounter')).toBeNull();
    click(container, /cross now/i);
    expect(container.querySelector('[role="dialog"][aria-label="Encounter discovered"]')).toBeTruthy();
    expect(container.querySelector('.lr-action-curtain').textContent).toMatch(/emerges from the annex.*response next/i);
    click(container, /skip to outcome/i);
    expect(container.querySelector('.lr-sequence-caption').textContent).toMatch(/contact established/i);
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

  test('makes the current action and route-selection state explicit', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(container.querySelector('.lr-current-action').textContent).toMatch(/Step 1 of 3.*Choose a scout/i);
    expect(document.activeElement).toBe(container.querySelector('.lr-current-action'));
    expect(container.querySelectorAll('.lr-simple-status .lr-projection-track')).toHaveLength(4);
    selectRecommendedScout(container);
    click(container, /choose a route/i);
    expect(container.querySelector('.lr-current-action').textContent).toMatch(/Step 2 of 3.*Choose one route/i);
    expect(document.activeElement).toBe(container.querySelector('.lr-current-action'));
    const recommendedOrFirst = container.querySelector('.lr-simple-routes > article.is-recommended .lr-route-choice-main') || container.querySelector('.lr-simple-routes .lr-route-choice-main');
    clickElement(recommendedOrFirst);
    expect(container.querySelector('.lr-simple-routes')).toBeTruthy();
    expect(container.querySelector('.lr-simple-routes > article.is-selected')).toBeTruthy();
    expect(findButton(container, /next: review crew/i)).toBeTruthy();
    click(container, /next: review crew/i);
    expect(container.querySelector('.lr-simple-routes')).toBeFalsy();
    expect(document.activeElement).toBe(container.querySelector('.lr-current-action'));
    expect(container.querySelector('.lr-route-confirmed')).toBeNull();
    expect(container.querySelector('.lr-simple-plan-head').textContent).toMatch(/leads with/i);
    expect(findButton(container, /back to routes/i)).toBeTruthy();
    click(container, /back to routes/i);
    expect(container.querySelectorAll('.lr-simple-routes > article')).toHaveLength(2);
  });

  test('moves keyboard focus through each Simple wizard stage and enacted action', () => {
    renderGame();
    click(container, /seal crew/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /^send /i);
    expect(document.activeElement).toBe(findButton(container, /skip to outcome/i));
    act(() => container.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(findButton(container, /skip to outcome/i));
    click(container, /skip to outcome/i);
    expect(document.activeElement).toBe(findButton(container, /review scout report/i));
    click(container, /review scout report/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    click(container, /choose a route/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
    clickElement(container.querySelector('.lr-simple-routes .lr-route-choice-main'));
    click(container, /next: review crew/i);
    expect(document.activeElement).toBe(container.querySelector('[data-wizard-focus]'));
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
    click(container, /choose a route/i);
    expect(container.querySelector('.lr-route-guidance')).toBeNull();
    expect(container.querySelector('.lr-salvage-explainer')).toBeNull();
    expect(container.querySelectorAll('.lr-route-tradeoff .lr-hud-salvage')).toHaveLength(2);
    expect(container.querySelectorAll('.lr-route-tradeoff .lr-hud-salvage .bi-box-seam')).toHaveLength(3);
    const comparisons = container.querySelectorAll('.lr-route-tradeoff');
    expect(comparisons[0].querySelectorAll('.lr-hud-meter')).toHaveLength(2);
    expect(comparisons[1].querySelectorAll('.lr-hud-meter.is-unknown')).toHaveLength(2);
    expect(comparisons[1].textContent).toMatch(/route beyond sensor range.*outcome unknown/i);
    expect(comparisons[1].textContent).not.toContain('0 known');
    expect(container.querySelectorAll('.lr-simple-route-head')[1].textContent).not.toContain('Easier on the crew');
    expect(container.querySelectorAll('.lr-projection-track').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    expect(container.querySelectorAll('.lr-route-analysis')).toHaveLength(2);
    choosePreferredRoute(container);
    expect(container.querySelector('.lr-simple-plan-projections')).toBeTruthy();
    expect(container.querySelectorAll('.lr-simple-plan-projections .lr-hud-meter.is-unknown')).toHaveLength(2);
    expect(container.textContent).not.toMatch(/No strain expected|No change expected/);
    expect(container.querySelector('.lr-plan-analysis')).toBeTruthy();
  });

  test('shows the previous route consequence before entering the next scene', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    expect(container.textContent).toContain('This choice carries forward');
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
