import React from 'react';

export default function FieldReserve({ kind, label, max, before, after, active }) {
  const value = active ? after : before;
  const color = kind === 'energy' ? 'text-neutral' : 'text-viable';
  return <div data-field-reserve={kind} className="min-w-0 flex-1 basis-48 border-b border-edge py-3" aria-label={`${label}: ${value} of ${max}`}>
    <div className="mb-2 flex justify-between gap-3 text-body"><span>{label}</span><strong className={color}>{value}/{max}</strong></div>
    <div className="flex gap-1" aria-hidden="true">{Array.from({ length: max }, (_, i) => <span key={i} className={`h-2 flex-1 transition-opacity duration-200 motion-reduce:transition-none ${kind === 'energy' ? 'bg-neutral' : 'bg-viable'} ${i < value ? 'opacity-100' : 'opacity-15'}`} />)}</div>
  </div>;
}
