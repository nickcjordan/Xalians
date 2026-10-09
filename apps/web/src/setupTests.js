// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Lazy routes and species art load their chunks on first render. In the full suite, with every worker transforming at
// once, that first import can take longer than Testing Library's default 1 s wait, so findBy and waitFor failed at
// random (appRoutes' not-found page, xalianSvg's authored portrait). The wait is a ceiling, not a delay: passing
// tests are no slower.
configure({ asyncUtilTimeout: 5000 });
