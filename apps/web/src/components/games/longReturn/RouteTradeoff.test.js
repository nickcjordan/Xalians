import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RouteTradeoff from './RouteTradeoff';

const plan = { route: { salvage: 2 }, lead: { species: 'Lead' }, support: { species: 'Support' }, knownLeadStrain: 0, baseSupportStrain: 0, knownPressure: 0, unresolvedHazards: [], nativeRisk: false };
function render(changes = {}, props = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteTradeoff plan={{ ...plan, ...changes }} {...props} />);
  return root;
}

test('confirmed zero stays visibly distinct from an unknown cost', () => {
  const known = render();
  expect(known.querySelector('.lr-hud-clean').textContent).toMatch(/No resources at risk/i);
  expect(known.querySelectorAll('.is-unknown')).toHaveLength(0);
  const unknown = render({ unresolvedHazards: [{ id: 'hidden' }] });
  expect(unknown.querySelectorAll('.lr-hud-meter.is-unknown')).toHaveLength(2);
  expect(unknown.querySelector('.is-energy .lr-hud-meter-label > b').textContent).toMatch(/outcome unknown/i);
  expect(unknown.querySelectorAll('.lr-hud-unknown-signal')).toHaveLength(2);
  expect(unknown.querySelectorAll('.lr-hud-pips > i.is-threatened')).toHaveLength(0);
});

test('keeps creature costs separate while marking uncertain lanes', () => {
  const root = render({ knownLeadStrain: 2, baseSupportStrain: 1, knownPressure: 2, nativeRisk: true });
  expect(root.querySelectorAll('.lr-hud-meter.is-energy')).toHaveLength(2);
  expect(root.querySelectorAll('.lr-hud-meter.is-unknown')).toHaveLength(2);
  expect(root.querySelector('.lr-hud-meter.is-stability').getAttribute('aria-label')).toContain('outcome unknown');
});

test('known losses dim the exact pips threatened by the choice', () => {
  const root = render({ knownLeadStrain: 2, knownPressure: 2 });
  expect(root.querySelectorAll('.lr-hud-meter.is-energy .is-threatened')).toHaveLength(2);
  expect(root.querySelectorAll('.lr-hud-meter.is-stability .is-threatened')).toHaveLength(2);
});

test('does not leak hidden damage amounts, identity, or which resource a hazard affects', () => {
  const a = render({ unresolvedHazards: [{ id: 'secret-a', strain: 99, pressure: 0 }] });
  const b = render({ unresolvedHazards: [{ id: 'secret-b', strain: 0, pressure: 45 }] });
  expect(a.innerHTML).toBe(b.innerHTML);
});

test('previews a ready field companion as the cause of one preserved energy', () => {
  const companion = { ready: true, creature: { species: 'Xylum' } };
  const root = render({ knownLeadStrain: 2 }, { companion });
  expect(root.querySelector('.lr-companion-preview').textContent).toMatch(/Xylum.*1 energy preserved/i);
  expect(root.querySelector('.lr-hud-meter.is-energy').getAttribute('aria-label')).toContain('1 spent');
  const spent = render({ knownLeadStrain: 2 }, { companion: { ...companion, ready: false } });
  expect(spent.querySelector('.lr-companion-preview')).toBeNull();
  expect(spent.querySelector('.lr-hud-meter.is-energy').getAttribute('aria-label')).toContain('2 spent');
});
