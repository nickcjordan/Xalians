import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';
import { comparisonCosts } from './RouteComparison';

// Only known costs belong in a preview; concealed hazards are never inspected.
export function planStakes(plan, crew, strain, pressure, companion) {
  if (!plan) return null;
  const cost = comparisonCosts(plan, companion);
  if (pressure + cost.stability >= MAX_INSTABILITY) return { kind: 'stability', label: 'This crossing uses the last stability', detail: 'Forced extraction follows this crossing.' };
  // On an unresolved route the display cannot promise ally help, but the
  // warning cannot claim a forced ending if that help could still save one.
  const leastLeadCost = companion?.ready && cost.uncertain
    ? Math.min(plan.leadEnergy ?? Infinity, Math.max(0, plan.knownLeadStrain - 1))
    : cost.lead;
  const remaining = crew.filter(member => {
    const spent = member.id === plan.lead.id ? leastLeadCost : member.id === plan.support.id ? cost.support : 0;
    return (strain[member.id] || 0) + spent < MAX_STRAIN;
  });
  if (remaining.length < 2) return { kind: 'energy', label: 'Too little crew energy to continue afterward', detail: 'Forced extraction follows this crossing.' };
  return null;
}
