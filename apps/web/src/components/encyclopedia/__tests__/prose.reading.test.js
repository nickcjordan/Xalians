import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import Prose from '../Prose';

describe('chapter prose links', () => {
    it('keeps the text intact while linking a term only in its first passage', () => {
        const first = 'The Vallerii created APEX.';
        const second = 'APEX turned on the Vallerii.';
        const { container } = render(<MemoryRouter>
            <Prose text={first} linkOnce />
            <Prose text={second} linkOnce precedingText={first} />
        </MemoryRouter>);
        expect([...container.querySelectorAll('p')].map((p) => p.textContent)).toEqual([first, second]);
        expect(screen.getAllByRole('link', { name: 'APEX' })).toHaveLength(1);
        expect(screen.getAllByRole('link', { name: 'Vallerii' })).toHaveLength(1);
    });

    it('starts linking again in a new chapter and retains ordinary reference behavior', () => {
        render(<MemoryRouter>
            <Prose text="The Vallerii created APEX." linkOnce />
            <Prose text="APEX turned on the Vallerii." linkOnce />
            <Prose text="APEX regulated the Generators." />
        </MemoryRouter>);
        expect(screen.getAllByRole('link', { name: 'APEX' })).toHaveLength(3);
    });
});
