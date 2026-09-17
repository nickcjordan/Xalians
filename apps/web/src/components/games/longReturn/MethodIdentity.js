import React from 'react';
import { ArrowRight } from 'lucide-react';
import BiIcon from './BiIcon';
import { methodIdentity } from './methodProvenance';
import { methodPerformance } from './performanceVisuals';
import './methodIdentity.css';
export default function MethodIdentity({ method }) {
  const identity = methodIdentity(method);
  return <span className="lr-method-identity">
    <span className="lr-method-origin" title={identity.limited ? `${method.ability.name}: available once this expedition` : `${identity.strength}. This describes the method's source, not a guaranteed crossing outcome.`}>
      <BiIcon cls={methodPerformance(method).icon} /><span>{identity.source}<small>{identity.limited ? 'One-use ability' : identity.strength}</small></span>
    </span>
    <ArrowRight aria-hidden="true" /><strong>{identity.action}</strong>
  </span>;
}
