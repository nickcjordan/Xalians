import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';
import { comparisonCosts } from './RouteComparison';

// Only known costs belong in a preview; concealed hazards are never inspected.
export function planStakes(plan, crew, strain, pressure, companion) {
  if (!plan) return null;
  const cost = comparisonCosts(plan, companion);
  if (pressure + cost.stability >= MAX_INSTABILITY) return { kind: 'stability', label: 'This crossing uses the last stability', detail: 'Forced extraction follows this crossing.' };
  const remaining = crew.filter(member => {
    const spent = member.id === plan.lead.id ? Math.max(0, plan.knownLeadStrain - (companion?.ready ? 1 : 0)) : member.id === plan.support.id ? plan.baseSupportStrain : 0;
    return (strain[member.id] || 0) + spent < MAX_STRAIN;
  });
  if (remaining.length < 2) return { kind: 'energy', label: 'Too little crew energy to continue afterward', detail: 'Forced extraction follows this crossing.' };
  return null;
}
