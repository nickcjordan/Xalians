import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import LongReturnGame from './longReturnGame';

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

function enterSimpleRouteChoice(container, { scan = true } = {}) {
  click(container, /seal crew/i);
  if (scan) clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
  else click(container, /keep the crew together/i);
  if (container.querySelector('.lr-field-encounter')) {
    clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
    click(container, /review scout report/i);
  }
  expect(container.textContent).toContain('Scout result');
  if (findButton(container, /wait for .* to return/i)) click(container, /wait for .* to return/i);
  click(container, /choose a route/i);
  expect(container.querySelectorAll('.lr-simple-routes > article')).toHaveLength(2);
}

function choosePreferredRoute(container) {
  const recommended = container.querySelector('.lr-simple-routes > article.is-recommended .lr-route-choice-main');
  const lowestRisk = container.querySelector('.lr-simple-routes > article[data-lowest-risk="true"] .lr-route-choice-main');
  clickElement(recommended || lowestRisk || container.querySelector('.lr-simple-routes .lr-route-choice-main'));
  click(container, /proceed with/i);
}

function playRecommendedScene(container) {
  const enterButton = findButton(container, /^enter /i);
  if (enterButton) clickElement(enterButton);
  const recommendedScout = container.querySelector('.lr-simple-scouts .is-recommended');
  if (recommendedScout) clickElement(recommendedScout);
  else click(container, /keep the crew together/i);
  if (container.querySelector('.lr-field-encounter')) {
    clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
    click(container, /review scout report/i);
  }
  if (findButton(container, /wait for .* to return/i)) click(container, /wait for .* to return/i);
  click(container, /choose a route/i);
  choosePreferredRoute(container);
  click(container, /use this plan/i);
  click(container, /cross with this plan/i);
  expect(container.textContent).toContain('Crossing complete');
}

describe('Long Return Simple mode', () => {
  let container;

  beforeEach(() => {
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
    expect(container.textContent).toContain('Recommended crew plan for this route');
    click(container, /use this plan/i);
    click(container, /cross with this plan/i);
    expect(container.textContent).toContain('Crossing complete');
    expect(container.querySelectorAll('.lr-result-changes .lr-projection-track').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable|No strain added/);
    expect(findButton(container, /continue mission/i)).toBeTruthy();
  });

  test('supports skipping the scan and opening the detailed plan builder', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-simple-routes > article:not(.is-recommended) .lr-route-choice-main'));
    click(container, /proceed with/i);
    click(container, /customize crew plan/i);
    expect(container.textContent).toContain('Crew assignment');
    expect(container.textContent).toContain('Pick a lead, support, and method');
    expect(container.querySelector('main').classList.contains('lr-is-customizing')).toBe(true);
  });

  test('resolves a manually customized Simple plan and returns to the clean result view', () => {
    renderGame();
    enterSimpleRouteChoice(container, { scan: false });
    clickElement(container.querySelector('.lr-simple-routes > article:not(.is-recommended) .lr-route-choice-main'));
    click(container, /proceed with/i);
    click(container, /customize crew plan/i);
    clickElement(Array.from(container.querySelectorAll('.lr-crew-member')).find((button) => /Hippochamp/.test(button.textContent)));
    clickElement(Array.from(container.querySelectorAll('button')).find((button) => /Assign Chromocat as support/.test(button.getAttribute('aria-label') || '')));
    clickElement(Array.from(container.querySelectorAll('.lr-method-select')).find((button) => /Climb the suspension frame/.test(button.textContent)));
    expect(container.textContent).toContain('Known energy cost−4');
    click(container, /commit crew & resolve route/i);
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
  });

  test('supports aborting early and extracting after the objective', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /abort mission/i);
    expect(container.textContent).toContain('Mission Aborted');

    click(container, /run contract again/i);
    for (let scene = 0; scene < 5; scene += 1) {
      playRecommendedScene(container);
      if (scene < 4) clickElement(container.querySelector('.lr-result-actions .g-btn--primary'));
    }
    click(container, /extract now/i);
    expect(container.textContent).toContain('Crew Extracted');
    expect(container.textContent).toContain('ObjectiveSECURED');
  });

  test('moves from the recommended scout to the simplified report', () => {
    renderGame();
    click(container, /seal crew/i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    expect(container.textContent).toContain('Scout result');
    expect(container.querySelector('.lr-action-feedback').textContent).toMatch(/Just changed.*Graviclaw −1 energy/i);
    expect(container.querySelector('.lr-simple-status-crew .is-changing')).toBeTruthy();
    expect(findButton(container, /choose a route/i)).toBeTruthy();
  });

  test('turns the second-scene scout signal into an explained native encounter and field companion', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    expect(container.textContent).toContain('Stranded Xylum');
    expect(container.textContent).toMatch(/crew contact|physical return/i);
    expect(container.querySelectorAll('.lr-encounter-choice-signals .lr-projection-track').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    clickElement(container.querySelector('.lr-encounter-options .is-recommended'));
    expect(container.textContent).toContain('Field companion');
    expect(container.textContent).toContain('The native chooses to follow');
  });

  test('keeping the crew together makes native contact a group encounter when its route is chosen', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    click(container, /keep the crew together/i);
    click(container, /choose a route/i);
    const nativeRoute = Array.from(container.querySelectorAll('.lr-simple-routes .lr-route-choice-main')).find((button) => /maintenance underdeck/i.test(button.textContent));
    clickElement(nativeRoute);
    click(container, /proceed with .*maintenance underdeck/i);
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
    expect(container.querySelectorAll('.lr-simple-status .lr-projection-track')).toHaveLength(4);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /choose a route/i);
    expect(container.querySelector('.lr-current-action').textContent).toMatch(/Step 2 of 3.*Choose one route/i);
    const recommendedOrFirst = container.querySelector('.lr-simple-routes > article.is-recommended .lr-route-choice-main') || container.querySelector('.lr-simple-routes .lr-route-choice-main');
    clickElement(recommendedOrFirst);
    expect(container.querySelector('.lr-simple-routes')).toBeTruthy();
    expect(container.querySelector('.lr-simple-routes > article.is-selected')).toBeTruthy();
    expect(findButton(container, /proceed with/i)).toBeTruthy();
    click(container, /proceed with/i);
    expect(container.querySelector('.lr-simple-routes')).toBeFalsy();
    expect(container.querySelector('.lr-route-confirmed').textContent).toMatch(/Route selected/i);
    expect(findButton(container, /change route/i)).toBeTruthy();
    click(container, /change route/i);
    expect(container.querySelectorAll('.lr-simple-routes > article')).toHaveLength(2);
  });

  test('shows visual projections, hides zero costs, and avoids false certainty', () => {
    renderGame();
    expect(container.querySelectorAll('.lr-element-mark svg')).toHaveLength(6);
    expect(container.querySelector('.lr-element-mark').textContent).toBe('');
    click(container, /seal crew/i);
    expect(container.textContent).toMatch(/GraviclawReady · 6\/6 energy/i);
    expect(container.textContent).toMatch(/Annex stabilityStable · 10\/10/i);
    expect(container.querySelectorAll('.lr-simple-scouts > button')).toHaveLength(3);
    expect(container.querySelectorAll('.lr-signal-gauge')).toHaveLength(3);
    expect(container.querySelectorAll('.lr-signal-gauge .bi-eye-fill').length).toBeGreaterThan(0);
    expect(container.querySelector('.lr-scout-visuals')).toBeNull();
    expect(container.querySelector('.lr-projection-legend')).toBeNull();
    expect(container.querySelector('.lr-scout-impact')).toBeNull();
    expect(container.querySelectorAll('.lr-scout-storyline')).toHaveLength(3);
    expect(container.querySelector('.lr-simple-scouts .is-recommended .lr-scout-storyline').textContent).toMatch(/Scout for danger.*Strong chance.*Uses 1 energy.*Vibration connects.*Report reaches crew.*No return needed/i);
    expect(container.querySelectorAll('.lr-scout-relay')).toHaveLength(3);
    expect(container.querySelector('.lr-simple-scouts .is-recommended .lr-scout-relay').getAttribute('aria-label')).toMatch(/strong chance.*spends 1 energy.*vibration communication reaches the crew.*without a return trip/i);
    expect(container.querySelectorAll('.lr-scout-relay.is-warning')).toHaveLength(2);
    expect(container.querySelector('.lr-scout-relay.is-warning').textContent).toMatch(/No compatible relay.*Returns to crew.*Uses 1 more energy.*Loses 1 stability/i);
    expect(container.querySelectorAll('.lr-simple-scouts .lr-projection-track')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/The scan costs|Ready 0\/6 → Ready/);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    click(container, /choose a route/i);
    expect(container.querySelector('.lr-route-guidance').textContent).toMatch(/No clear best route/i);
    expect(container.querySelector('.lr-salvage-explainer').textContent).toMatch(/optional mission loot.*bank/i);
    expect(container.querySelectorAll('.lr-salvage-gauge')).toHaveLength(2);
    expect(container.querySelectorAll('.lr-salvage-gauge .is-filled')).toHaveLength(3);
    expect(container.querySelectorAll('.lr-projection-track').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Ready → Ready|Stable → Stable/);
    expect(container.querySelectorAll('.lr-route-analysis')).toHaveLength(2);
    choosePreferredRoute(container);
    expect(container.querySelector('.lr-simple-plan-projections')).toBeTruthy();
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
    expect(container.querySelector('.lr-memory-effects').textContent).toMatch(/easier by/i);
    click(container, /^enter /i);
    expect(container.querySelector('.lr-simple-scouts')).toBeTruthy();
  });

  test('presents the trapped vestibule native as a distinct field decision', () => {
    renderGame();
    click(container, /seal crew/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    playRecommendedScene(container);
    click(container, /continue mission/i);
    click(container, /^enter /i);
    clickElement(container.querySelector('.lr-simple-scouts .is-recommended'));
    expect(container.textContent).toContain('Trapped Signal-Mimic');
    expect(container.textContent).toMatch(/Release it from the arms|Mark the safe controls/i);
  });
});
