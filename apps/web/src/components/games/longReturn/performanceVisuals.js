const METHOD_MOTIONS = {
  swim: ['swim', 'bi-water'], flight: ['flight', 'bi-wind'], climb: ['climb', 'bi-ladder'], burrow: ['climb', 'bi-layers'],
  leap: ['burst', 'bi-arrow-up-right'], sprint: ['burst', 'bi-speedometer2'], ambush: ['burst', 'bi-eye-slash'], beam: ['beam', 'bi-brightness-high'],
  ward: ['ward', 'bi-shield'], snare: ['tow', 'bi-bezier2'], crush: ['brace', 'bi-hammer'], rake: ['cut', 'bi-slash-lg'],
  mend: ['mend', 'bi-bandaid'], phasing: ['phase', 'bi-transparency'], spray: ['spray', 'bi-droplet-fill'],
  intelligence: ['decode', 'bi-cpu'], manipulation: ['repair', 'bi-tools'], anchored: ['brace', 'bi-anchor'], resistant: ['ward', 'bi-shield-check']
};

export function methodPerformance(method) {
  const [id, icon] = METHOD_MOTIONS[method?.key] || ['advance', 'bi-arrow-right'];
  return { id, icon };
}

export function scoutPerformance(profile) {
  const role = (profile?.role || '').toLowerCase();
  if (role.includes('quiet')) return { id: 'quiet', icon: 'bi-eye-slash' };
  if (role.includes('defensive')) return { id: 'defensive', icon: 'bi-shield-fill-check' };
  if (role.includes('contact')) return { id: 'contact', icon: 'bi-chat-dots' };
  return { id: 'survey', icon: 'bi-binoculars' };
}
