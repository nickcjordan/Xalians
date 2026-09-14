import * as React from 'react';
import type { XalianRecord } from '@xalians/content/schema';
import { getSpeciesTemplate, speciesDisplayName } from '@xalians/rules/generator';
import { gradeWithBundledCalibration } from '@xalians/rules/generator/grade';

import XalianImage from '../xalianImage';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
	ATTRIBUTE_ORDER,
	CAPABILITY_ORDER,
	TEMPERAMENT_ORDER,
	attributeTerm,
	archetypeTerm,
	capabilityTerm,
	elementTerm,
	physiologyTerm,
	temperamentTerm,
	traitTerm,
	capitalize,
	heightBoth,
	intensityBand,
	weightBoth,
} from './vocabulary';

type RecordSummary = {
	record: XalianRecord;
	name: string;
	secondary: string | null;
	archetype: string;
	strongestAttributes: Array<{ name: string; value: number }>;
	strongestCapability: { name: string; value: number };
	leadingTemperament: { name: string; value: number };
	signature: XalianRecord['abilities'][number] | undefined;
	percentile: number | null;
};

function summarize(record: XalianRecord): RecordSummary {
	const affinities = record.element.affinities as Record<string, number>;
	const secondary = Object.keys(affinities).find((key) => key !== record.element.primary) || null;
	const template = getSpeciesTemplate(record.species);
	return {
		record,
		name: speciesDisplayName(record.species),
		secondary,
		archetype: archetypeTerm(record.archetype.key).name,
		strongestAttributes: ATTRIBUTE_ORDER
			.map((key) => ({ name: attributeTerm(key).name, value: record.attributes[key as keyof XalianRecord['attributes']] }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 2),
		strongestCapability: CAPABILITY_ORDER
			.map((key) => ({ name: capabilityTerm(key).name, value: record.physiology.capabilities[key as keyof typeof record.physiology.capabilities] }))
			.sort((a, b) => b.value - a.value)[0],
		leadingTemperament: TEMPERAMENT_ORDER
			.map((key) => ({ name: temperamentTerm(key).name, value: record.temperament[key as keyof XalianRecord['temperament']] }))
			.sort((a, b) => b.value - a.value)[0],
		signature: record.abilities.find((ability) => ability.signature) || record.abilities[0],
		percentile: template ? gradeWithBundledCalibration(record, template).percentile : null,
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

function Affinity({ summary }: { summary: RecordSummary }) {
	const primary = summary.record.element.primary;
	return (
		<div className="flex flex-wrap gap-2">
			<span className={`el-${primary}`}><Badge variant="chip">{elementTerm(primary).name}</Badge></span>
			{summary.secondary ? (
				<span className={`el-${summary.secondary}`}><Badge variant="chip-outline">{elementTerm(summary.secondary).name}</Badge></span>
			) : null}
		</div>
	);
}

function RecordCompare({ records }: { records: [XalianRecord, XalianRecord] }) {
	const [left, right] = records.map(summarize) as [RecordSummary, RecordSummary];
	return (
		<div data-slot="record-compare">
			<p className="measure mt-0 mb-5 font-body text-small text-ink-2">
				Compare what these creatures are. The registry does not declare a winner, and games derive their own rules.
			</p>

			<div className="mb-5 grid grid-cols-2 gap-3">
				{[left, right].map((summary) => (
					<Card key={summary.record.id} variant="recessed" className={`el-${summary.record.element.primary} min-w-0 gap-3 p-3 sm:p-4`}>
						<XalianImage
							colored
							speciesName={summary.record.species}
							primaryType={summary.record.element.primary}
							secondaryType={summary.secondary || undefined}
							moreClasses="mx-auto w-full max-w-[180px]"
						/>
						<div>
							<p className="type-subhead m-0 truncate">{summary.name}</p>
							<p className="mt-1 mb-0 font-body text-small text-ink-2">{summary.archetype}</p>
						</div>
					</Card>
				))}
			</div>

			<CompareRow label="Affinity" left={<Affinity summary={left} />} right={<Affinity summary={right} />} />
			<CompareRow
				label="Natural strengths"
				left={left.strongestAttributes.map((item) => `${item.name} ${item.value}`).join(' · ')}
				right={right.strongestAttributes.map((item) => `${item.name} ${item.value}`).join(' · ')}
			/>
			<CompareRow
				label="Strongest aptitude"
				left={`${left.strongestCapability.name} ${left.strongestCapability.value}`}
				right={`${right.strongestCapability.name} ${right.strongestCapability.value}`}
			/>
			<CompareRow
				label="Signature ability"
				left={left.signature ? `${left.signature.name} · ${intensityBand(left.signature.intensity)}` : 'None recorded'}
				right={right.signature ? `${right.signature.name} · ${intensityBand(right.signature.intensity)}` : 'None recorded'}
			/>
			<CompareRow
				label="Traits"
				left={left.record.traits.length > 0 ? left.record.traits.map((key) => traitTerm(key).name).join(' · ') : 'No rolled traits'}
				right={right.record.traits.length > 0 ? right.record.traits.map((key) => traitTerm(key).name).join(' · ') : 'No rolled traits'}
			/>
			<CompareRow
				label="Physiology"
				left={`${physiologyTerm('bodyPlan', left.record.physiology.bodyPlan).name} · ${heightBoth(left.record.physiology.heightCm)} · ${weightBoth(left.record.physiology.weightKg)}`}
				right={`${physiologyTerm('bodyPlan', right.record.physiology.bodyPlan).name} · ${heightBoth(right.record.physiology.heightCm)} · ${weightBoth(right.record.physiology.weightKg)}`}
			/>
			<CompareRow
				label="Leading temperament"
				left={`${left.leadingTemperament.name} ${left.leadingTemperament.value}`}
				right={`${right.leadingTemperament.name} ${right.leadingTemperament.value}`}
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
