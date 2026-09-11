import * as React from 'react';
import { Link } from 'react-router';
import type { XalianRecord } from '@xalians/content/schema';
import { getSpeciesTemplate, speciesDisplayName } from '@xalians/rules/generator';

import XalianImage from '../xalianImage';
import * as lore from '../../lore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SpecPlate, Meter } from '@/components/system/record';
import {
	ATTRIBUTE_ORDER, CAPABILITY_ORDER, TEMPERAMENT_ORDER,
	attributeTerm, archetypeTerm, capabilityTerm, elementTerm, instrumentTerm,
	actionTerm, physiologyTerm, senseTerm, temperamentTerm, traitTerm,
	capitalize, generatedOn, heightBoth, intensityBand, weightBoth,
} from './vocabulary';

/**
 * One ratified Xalian record, read as a document about a creature.
 *
 * Tier: chrome (docs/DESIGN_SYSTEM.md section 1) - this reads a record, so it
 * is built from the house components and carries no surface of its own beyond
 * the cards it uses; the page decides the frame around it.
 *
 * The record describes nature, never mechanics
 * (docs/design/xalian-creature-data-structure.md section 1): no HP here, no
 * damage, no stat total, nothing a game would derive. The layers appear in the
 * record's own order, most permanent first - physiology, attributes,
 * capabilities and senses, affinity, traits, appearance, abilities,
 * temperament - and every graded value is the same 0 to 100 scale, so one
 * meter shape carries all of them.
 *
 * The element in scope is the record's primary element, so every meter, chip
 * and plate inside takes that hue without naming a color.
 */

type RecordViewProps = {
	record: XalianRecord;
	/** A legend above the designation: what this record is on this page. */
	kicker?: React.ReactNode;
};

function Layer({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={className}>
			<h3 className="type-heading mt-0 mb-4 text-[19px]">{title}</h3>
			{children}
		</section>
	);
}

function bodyValue(value: React.ReactNode) {
	return <span className="font-body normal-case tracking-normal text-ink">{value}</span>;
}

function Ability({ ability }: { ability: XalianRecord['abilities'][number] }) {
	const instrument = instrumentTerm(ability.instrument);
	const action = actionTerm(ability.action);
	const medium = elementTerm(ability.medium);
	return (
		<li className="border-b border-edge py-4 first:pt-0 last:border-b-0 last:pb-0">
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
				<h4 className="type-subhead m-0">{ability.name}</h4>
				{ability.signature && <Badge variant="ok">Signature</Badge>}
				<span className="type-data ml-auto text-small text-ink-2" title={`Intensity ${ability.intensity} of 100`}>
					{intensityBand(ability.intensity)} <span className="text-ink-3">{ability.intensity}</span>
				</span>
			</div>
			<p className="mt-2 mb-0 font-body text-small text-ink-2">
				<span title={action.nature}>{action.name}</span>
				{' with its '}
				<span title={instrument.nature}>{instrument.name.toLowerCase()}</span>
				{', through '}
				<span title={medium.nature}>{medium.name.toLowerCase()}</span>.
			</p>
			{ability.description ? <p className="measure mt-2 mb-0 font-body text-body text-ink">{ability.description}</p> : null}
		</li>
	);
}

function RecordView({ record, kicker = 'Record' }: RecordViewProps) {
	const template = getSpeciesTemplate(record.species);
	const name = speciesDisplayName(record.species);
	const element = record.element.primary;
	const affinities = record.element.affinities as Record<string, number>;
	const secondary = Object.keys(affinities).find((key) => key !== element) || null;
	const physiology = record.physiology;
	const archetype = archetypeTerm(record.archetype.key);
	const finish = record.appearance.finish;
	const appearance = template ? template.lore.appearance : [];

	const speciesRoute = lore.getSpecies(record.species) ? lore.routeFor('species', record.species) : null;
	const originKey = record.provenance.origin;
	const originRoute = lore.getWorld(originKey) ? lore.routeFor('world', originKey) : null;

	const specialSenses = physiology.senses.special || [];
	const composition = [physiology.composition.primary, physiology.composition.secondary]
		.filter(Boolean)
		.map((key) => physiologyTerm('composition', key as string).name)
		.join(' and ');
	const communication = physiology.communication.length > 0
		? physiology.communication.map((key) => physiologyTerm('communication', key).name).join(', ')
		: 'Mute';
	const breathes = physiology.breathes.length > 0
		? physiology.breathes.map((key) => physiologyTerm('media', key).name).join(', ')
		: 'Does not breathe';
	const tolerance = physiology.environmentalTolerance;

	return (
		<article className={`el-${element} flex flex-col gap-8`} data-slot="record-view">
			<header className="grid gap-6 md:grid-cols-[minmax(200px,280px)_minmax(0,1fr)]">
				<div className="mx-auto w-full max-w-[280px] md:mx-0">
					<XalianImage
						colored
						speciesName={record.species}
						primaryType={element}
						secondaryType={secondary || undefined}
						moreClasses="w-full" />
				</div>

				<div className="flex min-w-0 flex-col gap-3">
					<p className="type-legend m-0">{kicker}</p>
					<h2 className="type-title m-0">{name}</h2>

					<div className="flex flex-wrap items-center gap-2">
						<span className={`el-${element}`}><Badge variant="chip">{elementTerm(element).name}</Badge></span>
						{secondary ? (
							<span className={`el-${secondary}`}>
								<Badge variant="chip-outline">{elementTerm(secondary).name} {affinities[secondary]}</Badge>
							</span>
						) : null}
						{finish !== 'standard' ? <Badge variant="warn">{capitalize(finish)} finish</Badge> : null}
						{speciesRoute ? (
							<Link
								to={speciesRoute}
								className="ml-auto whitespace-nowrap font-body text-small text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
								Species record
							</Link>
						) : null}
					</div>

					<p className="m-0 max-w-[62ch] font-body text-body text-ink-2" title={archetype.nature}>
						{archetype.name}
						{record.archetype.favors.length > 0
							? `, shaped by ${record.archetype.favors.map((key) => attributeTerm(key).name.toLowerCase()).join(' and ')}`
							: ''}
						.
					</p>

					<Separator className="my-1" />

					<SpecPlate
						columns={2}
						entries={[
							{ key: 'Identifier', value: <span className="break-all">{record.id}</span> },
							{
								key: 'Origin',
								value: originRoute
									? <Link to={originRoute} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">{capitalize(originKey)}</Link>
									: capitalize(originKey),
							},
							{ key: 'Serial', value: `No. ${record.provenance.serial.toLocaleString()}` },
							{ key: 'Generated', value: generatedOn(record.provenance.generatedAt) },
							{ key: 'Seed', value: <span className="break-all">{record.provenance.seed}</span> },
							{ key: 'Generator', value: `v${record.provenance.generatorVersion}` },
						]} />
				</div>
			</header>

			<Layer title="Physiology">
				<SpecPlate
					columns={2}
					entries={[
						{ key: 'Corporeality', value: bodyValue(physiologyTerm('corporeality', physiology.corporeality).name) },
						{ key: 'Composition', value: bodyValue(composition) },
						{ key: 'Body plan', value: bodyValue(physiologyTerm('bodyPlan', physiology.bodyPlan).name) },
						{ key: 'Covering', value: bodyValue(physiologyTerm('covering', physiology.covering).name) },
						{ key: 'Anatomy', value: bodyValue(physiology.anatomy.map((key) => instrumentTerm(key).name).join(', ')) },
						{ key: 'Diet', value: bodyValue(physiologyTerm('diet', physiology.diet).name) },
						{ key: 'Height', value: heightBoth(physiology.heightCm) },
						{ key: 'Weight', value: weightBoth(physiology.weightKg) },
						{ key: 'Lifespan', value: bodyValue(physiologyTerm('lifespan', physiology.lifespan).name) },
						{ key: 'Chirality', value: bodyValue(physiologyTerm('chirality', physiology.genome.chirality).name) },
						{ key: 'Communication', value: bodyValue(communication) },
						{ key: 'Breathes', value: bodyValue(breathes) },
						{ key: 'Ambient media', value: bodyValue(tolerance.ambientMedia.map((key) => physiologyTerm('media', key).name).join(', ')) },
						{ key: 'Temperature', value: `${tolerance.temperatureC.min} to ${tolerance.temperatureC.max} °C` },
					]} />
			</Layer>

			<div className="grid gap-8 lg:grid-cols-2">
				<Layer title="Attributes">
					<Card variant="panel" className="p-4 md:p-6">
						{ATTRIBUTE_ORDER.map((key) => {
							const term = attributeTerm(key);
							return (
								<div key={key} title={term.nature}>
									<Meter name={term.name} value={record.attributes[key as keyof XalianRecord['attributes']]} max={100} />
								</div>
							);
						})}
					</Card>
				</Layer>

				<div className="flex flex-col gap-8">
					<Layer title="Capabilities">
						<Card variant="panel" className="p-4 md:p-6">
							{CAPABILITY_ORDER.map((key) => {
								const term = capabilityTerm(key);
								return (
									<div key={key} title={term.nature}>
										<Meter name={term.name} value={physiology.capabilities[key as keyof typeof physiology.capabilities]} max={100} />
									</div>
								);
							})}
						</Card>
					</Layer>

					<Layer title="Senses">
						<Card variant="panel" className="p-4 md:p-6">
							{(['sight', 'hearing', 'smell'] as const).map((key) => (
								<div key={key} title={senseTerm(key).nature}>
									<Meter name={senseTerm(key).name} value={physiology.senses[key]} max={100} />
								</div>
							))}
							{specialSenses.length > 0 ? (
								<div className="mt-3 flex flex-wrap gap-2 border-t border-edge pt-3">
									{specialSenses.map((key) => (
										<Badge key={key} variant="chip-outline" title={senseTerm(key).nature}>{senseTerm(key).name}</Badge>
									))}
								</div>
							) : null}
						</Card>
					</Layer>
				</div>
			</div>

			<Layer title="Affinity">
				<div className="flex flex-wrap items-center gap-3">
					<span className={`el-${element}`}><Badge variant="chip">{elementTerm(element).name} 100</Badge></span>
					{secondary ? (
						<span className={`el-${secondary}`}>
							<Badge variant="chip">{elementTerm(secondary).name} {affinities[secondary]}</Badge>
						</span>
					) : null}
				</div>
				<p className="mt-3 mb-0 max-w-[62ch] font-body text-small text-ink-2">
					{secondary
						? `Primarily ${elementTerm(element).name.toLowerCase()}, with ${elementTerm(secondary).name.toLowerCase()} running through it at ${affinities[secondary]}.`
						: `Wholly ${elementTerm(element).name.toLowerCase()}, with nothing else running through it.`}
				</p>
			</Layer>

			<Layer title="Traits">
				{record.traits.length === 0 ? (
					<p className="m-0 max-w-[62ch] font-body text-body text-ink-2">Nothing beyond its species landed for this one.</p>
				) : (
					<React.Fragment>
						<div className="flex flex-wrap gap-2">
							{record.traits.map((key) => (
								<Badge key={key} variant="chip-outline" title={traitTerm(key).nature}>{traitTerm(key).name}</Badge>
							))}
						</div>
						<Collapsible className="mt-4 max-w-3xl">
							<CollapsibleTrigger>What these mean</CollapsibleTrigger>
							<CollapsibleContent>
								<dl className="m-0 grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]">
									{record.traits.map((key) => (
										<React.Fragment key={key}>
											<dt className="type-legend">{traitTerm(key).name}</dt>
											<dd className="m-0 font-body text-small text-ink-2">{traitTerm(key).nature}</dd>
										</React.Fragment>
									))}
								</dl>
							</CollapsibleContent>
						</Collapsible>
					</React.Fragment>
				)}
			</Layer>

			<Layer title="Appearance">
				{appearance.length > 0 ? (
					<ul className="m-0 flex max-w-[62ch] list-none flex-col gap-1 p-0 font-body text-body text-ink-2">
						{appearance.map((quality) => <li key={quality}>{quality}</li>)}
					</ul>
				) : null}
				<p className="mt-3 mb-0 max-w-[62ch] font-body text-body text-ink">
					{finish === 'standard'
						? 'Standard finish.'
						: `${capitalize(finish)} finish: this one came out of the Generator wearing it.`}
				</p>
			</Layer>

			<Layer title="Abilities">
				<Card variant="panel">
					<ul className="m-0 flex list-none flex-col p-0">
						{record.abilities.map((ability) => <Ability key={ability.name} ability={ability} />)}
					</ul>
				</Card>
			</Layer>

			<Layer title="Temperament">
				<Card variant="panel" className="max-w-3xl p-4 md:p-6">
					{TEMPERAMENT_ORDER.map((key) => {
						const term = temperamentTerm(key);
						return (
							<div key={key} title={term.nature}>
								<Meter name={term.name} value={record.temperament[key as keyof XalianRecord['temperament']]} max={100} />
							</div>
						);
					})}
				</Card>
			</Layer>
		</article>
	);
}

export default RecordView;
