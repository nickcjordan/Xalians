import * as React from 'react';
import type { CreatureRecord as XalianRecord } from '@xalians/content/creature';
import { gradeCreature } from '@xalians/rules/generator/creatureGrade';

import XalianImage from '../xalianImage';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
	ATTRIBUTE_ORDER,
	CAPABILITY_ORDER,
	TEMPERAMENT_ORDER,
	attributeTerm,
	capabilityTerm,
	dimensions,
	elementTerm,
	physiologyTerm,
	temperamentTerm,
	capitalize,
	massBoth,
	signatureAbility,
	speciesName,
	strongest,
} from './vocabulary';

type RecordSummary = {
	record: XalianRecord;
	name: string;
	bodyPlan: string;
	strongestAttributes: Array<{ name: string; value: number }>;
	strongestCapability: { name: string; value: number } | undefined;
	leadingTemperament: { name: string; value: number } | undefined;
	signature: string | undefined;
	percentile: number | null;
};

function percentileOf(record: XalianRecord): number | null {
	try {
		return gradeCreature(record).percentile;
	} catch {
		return null;
	}
}

function summarize(record: XalianRecord): RecordSummary {
	const [capability] = strongest(CAPABILITY_ORDER, record.physiology.capabilities as Record<string, number>, 1);
	const [temperament] = strongest(TEMPERAMENT_ORDER, record.temperament as Record<string, number>, 1);
	return {
		record,
		name: speciesName(record.species),
		bodyPlan: physiologyTerm('bodyPlan', record.physiology.bodyPlan).name,
		strongestAttributes: strongest(ATTRIBUTE_ORDER, record.attributes as Record<string, number>, 2)
			.map(({ key, value }) => ({ name: attributeTerm(key).name, value })),
		strongestCapability: capability ? { name: capabilityTerm(capability.key).name, value: capability.value } : undefined,
		leadingTemperament: temperament ? { name: temperamentTerm(temperament.key).name, value: temperament.value } : undefined,
		signature: signatureAbility(record)?.name,
		percentile: percentileOf(record),
	};
}

function CompareRow({ label, left, right }: { label: string; left: React.ReactNode; right: React.ReactNode }) {
	return (
		<section className="border-t border-edge py-4">
			<h3 className="type-legend mt-0 mb-3">{label}</h3>
			<div className="grid grid-cols-2 gap-3">
				<div className="min-w-0 font-body text-small text-ink">{left}</div>
				<div className="min-w-0 font-body text-small text-ink">{right}</div>
			</div>
		</section>
	);
}

function Element({ summary }: { summary: RecordSummary }) {
	const element = summary.record.element;
	return (
		<span className={`el-${element}`}><Badge variant="chip">{elementTerm(element).name}</Badge></span>
	);
}

function body(summary: RecordSummary): string {
	const physiology = summary.record.physiology;
	const [first] = dimensions(physiology);
	return [summary.bodyPlan, massBoth(physiology.massKg), first ? `${first.label.toLowerCase()} ${first.value}` : null].filter(Boolean).join(' · ');
}

function RecordCompare({ records }: { records: [XalianRecord, XalianRecord] }) {
	const [left, right] = records.map(summarize) as [RecordSummary, RecordSummary];
	return (
		<div data-slot="record-compare">
			<p className="measure mt-0 mb-5 font-body text-small text-ink-2">
				Compare what these creatures are. The registry does not declare a winner, and games derive their own rules.
				Ratings compare creatures: 50 is standard, and a rating can pass 100.
			</p>

			<div className="mb-5 grid grid-cols-2 gap-3">
				{[left, right].map((summary) => (
					<Card key={summary.record.id} variant="recessed" className={`el-${summary.record.element} min-w-0 gap-3 p-3 sm:p-4`}>
						<XalianImage
							colored
							speciesName={summary.record.species}
							primaryType={summary.record.element}
							moreClasses="mx-auto w-full max-w-[180px]"
						/>
						<div>
							<p className="type-subhead m-0 truncate">{summary.name}</p>
							<p className="mt-1 mb-0 font-body text-small text-ink-2">{summary.bodyPlan}</p>
						</div>
					</Card>
				))}
			</div>

			<CompareRow label="Element" left={<Element summary={left} />} right={<Element summary={right} />} />
			<CompareRow
				label="Natural strengths"
				left={left.strongestAttributes.map((item) => `${item.name} ${item.value}`).join(' · ')}
				right={right.strongestAttributes.map((item) => `${item.name} ${item.value}`).join(' · ')}
			/>
			<CompareRow
				label="Strongest aptitude"
				left={left.strongestCapability ? `${left.strongestCapability.name} ${left.strongestCapability.value}` : 'None recorded'}
				right={right.strongestCapability ? `${right.strongestCapability.name} ${right.strongestCapability.value}` : 'None recorded'}
			/>
			<CompareRow label="Signature" left={left.signature ?? 'None recorded'} right={right.signature ?? 'None recorded'} />
			<CompareRow label="Body" left={body(left)} right={body(right)} />
			<CompareRow
				label="Leading temperament"
				left={left.leadingTemperament ? `${left.leadingTemperament.name} ${left.leadingTemperament.value} of 100` : 'None recorded'}
				right={right.leadingTemperament ? `${right.leadingTemperament.name} ${right.leadingTemperament.value} of 100` : 'None recorded'}
			/>
			<CompareRow
				label="Finish and distinction"
				left={`${capitalize(left.record.appearance.finish)} · ${left.percentile == null ? 'Uncalibrated' : `Percentile ${Math.round(left.percentile)}`}`}
				right={`${capitalize(right.record.appearance.finish)} · ${right.percentile == null ? 'Uncalibrated' : `Percentile ${Math.round(right.percentile)}`}`}
			/>
		</div>
	);
}

export default RecordCompare;
