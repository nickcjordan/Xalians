import { z } from 'zod';
import { STATUS_CATALOG, ElementKeySchema, Removal, type StatusKey } from './catalog.ts';
import type { Effect, Protection } from './ability.ts';

export function statusIntensity(effect: Extract<Effect, { type: 'status' }>): number {
  return effect.intensity ?? STATUS_CATALOG[effect.status].intensity;
}
export type ProtectionScope =
  | { type: 'status'; status: StatusKey }
  | { type: 'harm'; mechanism: 'impact' | 'cutting' | 'piercing' | 'compression' }
  | { type: 'harm'; mechanism: 'elemental'; element: z.infer<typeof ElementKeySchema> }
  | { type: 'displace' };

/** Pass only currently active contributions. This query never erases applications. */
export function effectiveProtection(active: readonly Protection[], scope: ProtectionScope): 'immune' | 'resistant' | undefined {
  const matching = active.filter(protection => {
    if (protection.type !== scope.type) return false;
    if (protection.type === 'status' && scope.type === 'status') return protection.status === scope.status;
    if (protection.type === 'harm' && scope.type === 'harm') return protection.mechanism === scope.mechanism &&
      (scope.mechanism !== 'elemental' || protection.element === scope.element);
    return protection.type === 'displace';
  });
  return matching.some(p => p.degree === 'immune') ? 'immune' : matching.length ? 'resistant' : undefined;
}

/** Eligibility only; a game decides how many eligible applications to remove. */
export function removableApplications<T extends { removable: readonly z.infer<typeof Removal>[] }>(applications: readonly T[], methods: readonly z.infer<typeof Removal>[]): T[] {
  return applications.filter(application => application.removable.some(method => methods.includes(method)));
}
