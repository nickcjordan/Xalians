import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PowerworksPage from './powerworksPage';

beforeEach(() => {
  cleanup(); localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});
const mount = () => render(<MemoryRouter><PowerworksPage /></MemoryRouter>);
describe('Powerworks player flow', () => {
  it('requires the whole squad, resolves a round, and restores it after remount', () => {
    const ui = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Enter the facility' }));
    expect(screen.getByRole('button', { name: 'Commit round' })).toBeDisabled();
    for (const move of ['Hydrostatic Lance', 'Coronet of the Twin Suns', 'Blossoming Ambuscade', 'Claw compression']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(move) }));
      fireEvent.click(screen.getByRole('button', { name: 'Target Maintenance crawler M1' }));
    }
    expect(screen.getByRole('button', { name: 'Commit round' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Commit round' }));
    expect(screen.getByText('SECTOR 01 · ROUND 2')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('redirects');
    ui.unmount(); mount();
    expect(screen.getByText('SECTOR 01 · ROUND 2')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('Hydrostatic Lance');
  });
  it('recovers from an invalid save and explains the temporary exhaustion rule', () => {
    localStorage.setItem('xalians.powerworks.v1', '{broken'); mount();
    expect(screen.getByRole('button', { name: 'Enter the facility' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Field guide' }));
    expect(screen.getByText(/Desperate strike deals 3/)).toBeInTheDocument();
  });
});
