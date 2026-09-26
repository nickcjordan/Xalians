export const encounterChoicePresentation = (option) => {
  const id = option.id || '';
  const assist = option.companion || /aid|medic|free|release/.test(id);
  const signal = /signal|beacon/.test(id);
  const retreat = /withdraw|mark/.test(id);
  const detour = /detour|yield|leave/.test(id);
  if (id === 'isolate-coolant') return { identity: { label: 'Operate', icon: 'bi-tools', tone: 'signal' }, outcome: { label: 'Pressure line isolated', icon: 'bi-unlock-fill', tone: 'clear' } };
  const identity = assist
    ? { label: 'Assist', icon: 'bi-bandaid', tone: 'assist' }
    : signal
      ? { label: 'Communicate', icon: 'bi-broadcast-pin', tone: 'signal' }
      : retreat
        ? { label: 'Report', icon: 'bi-arrow-return-left', tone: 'retreat' }
        : detour
          ? { label: 'Avoid', icon: 'bi-sign-turn-right-fill', tone: 'retreat' }
          : { label: 'Confront', icon: 'bi-shield-fill-exclamation', tone: 'confront' };
  const outcome = option.companion
    ? { label: 'Possible ally', icon: 'bi-person-plus-fill', tone: 'reward' }
    : id === 'mark'
      ? { label: 'Crew gains safe approach', icon: 'bi-eye-fill', tone: 'clear' }
    : option.resolution === 'unresolved'
      ? { label: 'Route still occupied', icon: 'bi-exclamation-diamond-fill', tone: 'warning' }
      : option.resolution === 'detour'
        ? { label: 'Choose another route', icon: 'bi-signpost-split-fill', tone: 'warning' }
        : { label: 'Passage opens', icon: 'bi-unlock-fill', tone: 'clear' };
  return { identity, outcome };
};
