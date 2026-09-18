import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EncounterSituation from './EncounterSituation';

const scout = { species: 'Chromocat' };
const native = { species: 'Xylum' };

test('a scout encounter connects who saw whom with reporting, using player language', () => {
  const html = renderToStaticMarkup(<EncounterSituation mode="scout" scout={scout} native={native} outlook={{ posture: 'scout-first', channel: 'display' }} />);
  expect(html).toContain('Chromocat spots Xylum first');
  expect(html).toContain('Visual signals reach the crew');
  expect(html).not.toContain('through display');
  expect(html).not.toContain('Likely to notice it first');
});

test('surprise and lack of a relay are visible beside the decision', () => {
  const html = renderToStaticMarkup(<EncounterSituation mode="scout" scout={scout} native={native} outlook={{ posture: 'native-first', channel: null }} />);
  expect(html).toContain('Xylum spots Chromocat first · +1 energy to respond');
  expect(html).toContain('Chromocat must return—or be retrieved');
  expect(html).toContain('up to 1 energy spent, 1 stability lost');
});

test('whole-crew contact distinguishes an advance warning from surprise', () => {
  expect(renderToStaticMarkup(<EncounterSituation mode="group" informed />)).toContain('Crew warned before contact');
  expect(renderToStaticMarkup(<EncounterSituation mode="group" informed priorResponseId="mark" />)).toContain('Controls marked · crew avoids surprise');
  expect(renderToStaticMarkup(<EncounterSituation mode="group" informed={false} />)).toContain('Crew caught unaware · +1 energy to respond');
});
