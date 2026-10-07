import * as React from 'react';
import { Link } from 'react-router';
import type { CreatureRecord } from '@xalians/content/creature';
import { gradeCreature } from '@xalians/rules/generator/creatureGrade';

import XalianImage from '../xalianImage';
import AbilityCard from '../encyclopedia/AbilityCard';
import * as lore from '../../lore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SpecPlate, RecordRow, Meter } from '@/components/system/record';
import { Term } from '@/components/system/term';
import {
	ATTRIBUTE_ORDER, CAPABILITY_ORDER, GRADED_SENSES, TEMPERAMENT_ORDER, TERM_DEFS,
	attributeTerm, capabilityTerm, elementTerm, instrumentTerm, physiologyTerm, senseTerm, temperamentTerm,
	capitalize, dimensions, generatedOn, massBoth, ratingScale, recordAbilities, signatureAbility,
	speciesName, speciesTemplate, strongest,
} from './vocabulary';

/**
 * One v5 creature record, read as a document about a creature.
 *
 * Tier: chrome (docs/DESIGN_SYSTEM.md section 1) - this reads a record, so it
 * is built from the house components and carries no surface of its own beyond
 * the cards it uses; the page decides the frame around it.
 *
 * The record describes nature, never mechanics: no HP here, no damage, no
 * stat total, nothing a game would derive. The layers appear most permanent
 * first - physiology, attributes, capabilities and senses, appearance,
 * abilities, temperament. Attributes, capabilities and senses are open-ended
 * ratings (50 is the standard reference, values above 100 are allowed), so
 * their meters are drawn against 100 unless a value passes it; temperament is
 * five axes from 0 to 100.
 *
 * The element in scope is the record's element, so every meter, chip and
 * plate inside takes that hue without naming a color.
 */

type RecordViewProps = {
	record: CreatureRecord;
	/** A legend above the designation: what this record is on this page. */
	kicker?: React.ReactNode;
	/** Direct registry route when this persisted record can be shared. */
	recordLink?: string;
};

const PROFILE_LABEL: Record<CreatureRecord['provenance']['profile'], string> = {
	full: 'Full spectrum',
	showroom: 'Commoner',
};

function Layer({ title, children, className }: { title: React.ReactNode; children: React.ReactNode; className?: string }) {
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

function BriefCard({ label, value, caption }: { label: React.ReactNode; value: React.ReactNode; caption: React.ReactNode }) {
	return (
		<Card variant="recessed" className="gap-2 p-4">
			<p className="type-legend m-0">{label}</p>
			<p className="type-subhead m-0 text-ink">{value}</p>
			<p className="m-0 font-body text-small text-ink-2">{caption}</p>
		</Card>
	);
}

function Ratings({ rows }: { rows: Array<{ key: string; name: string; nature: string; value: number }> }) {
	const scale = ratingScale(rows.map((row) => row.value));
	return (
		<React.Fragment>
			{rows.map((row) => (
				<div key={row.key} title={row.nature}>
					<Meter name={row.name} value={row.value} max={scale} />
				</div>
			))}
		</React.Fragment>
	);
}

function RecordView({ record, kicker = 'Record', recordLink }: RecordViewProps) {
	const isUnownedPreview = kicker === 'Unowned preview';
	const template = speciesTemplate(record.species);
	const name = speciesName(record.species);
	const element = record.element;
	const physiology = record.physiology;
	const finish = record.appearance.finish;
	const appearance = template ? template.lore.appearance : [];
	const abilities = recordAbilities(record);
	const passives = abilities.filter((a) => a.kind === 'passive');
	const actions = abilities.filter((a) => a.kind === 'action');
	const signature = signatureAbility(record);

	const strongestAttributes = strongest(ATTRIBUTE_ORDER, record.attributes as Record<string, number>, 2);
	const [strongestCapability] = strongest(CAPABILITY_ORDER, physiology.capabilities as Record<string, number>, 1);
	const [leadingTemperament] = strongest(TEMPERAMENT_ORDER, record.temperament as Record<string, number>, 1);
	const distinction = React.useMemo(() => {
		try {
			return gradeCreature(record).percentile;
		} catch {
			// A species missing from this build's catalog: no calibrated grade to show.
			return null;
		}
	}, [record]);
	const roundedDistinction = distinction == null ? null : Math.round(distinction);

	const speciesRoute = lore.getSpecies(record.species) ? lore.routeFor('species', record.species) : null;
	const originKey = record.provenance.origin;
	const originWorld = lore.getWorld(originKey);
	const originName = originWorld ? originWorld.name : capitalize(originKey);
	const originRoute = originWorld ? lore.routeFor('world', originKey) : null;

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
	const protections = physiology.protections.map((p) => lore.describeProtection(p));
	const traversal = physiology.traversal.map((key) => lore.term('traversal', key).name);

	return (
		<article className={`el-${element} flex flex-col gap-8`} data-slot="record-view">
			<header className="grid gap-6 md:grid-cols-[minmax(200px,280px)_minmax(0,1fr)]">
				<div className="mx-auto w-full max-w-[280px] md:mx-0">
					<XalianImage colored speciesName={record.species} primaryType={element} moreClasses="w-full" />
				</div>

				<div className="flex min-w-0 flex-col gap-3">
					<p className="type-legend m-0">{kicker}</p>
					<h2 className="type-title m-0">{name}</h2>

					<div className="flex flex-wrap items-center gap-2">
						<span className={`el-${element}`}><Badge variant="chip">{elementTerm(element).name}</Badge></span>
						{finish !== 'standard' ? (
							<Badge variant="warn">
								{capitalize(finish)} <Term definition={TERM_DEFS.finish}>finish</Term>
							</Badge>
						) : null}
						{speciesRoute ? (
							<Link
								to={speciesRoute}
								className="ml-auto whitespace-nowrap font-body text-small text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
								Species record
							</Link>
						) : null}
					</div>

					<Separator className="my-1" />

					<SpecPlate
						columns={2}
						entries={[
							{ key: 'Identifier', value: <span className="break-all">{record.id}</span> },
							{
								key: 'Origin',
								value: originRoute
									? <Link to={originRoute} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">{originName}</Link>
									: originName,
							},
							...(isUnownedPreview ? [] : [{ key: 'Serial', value: `No. ${record.provenance.serial.toLocaleString()}` }]),
							{ key: 'Generated', value: generatedOn(record.provenance.generatedAt) },
							{ key: 'Range', value: PROFILE_LABEL[record.provenance.profile] },
						]} />

					<dl className="m-0 grid grid-cols-[minmax(7rem,max-content)_minmax(0,1fr)] items-baseline gap-x-6 gap-y-2 lg:grid-cols-[minmax(9rem,max-content)_minmax(0,1fr)_minmax(9rem,max-content)_minmax(0,1fr)]">
						<dt className="type-legend">Seed</dt>
						<dd
							className="col-span-1 m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap type-data text-small text-ink lg:col-span-3"
							title={record.provenance.seed}
						>
							{record.provenance.seed}
						</dd>
					</dl>

					{recordLink ? (
						<div className="mt-1">
							<Button variant="secondary" asChild>
								<Link to={recordLink}>Open shareable record</Link>
							</Button>
						</div>
					) : null}
				</div>
			</header>

			<section aria-labelledby="creature-brief-title" className="border-y border-edge py-6">
				<p className="type-legend m-0">Creature brief</p>
				<p id="creature-brief-title" className="type-heading mt-2 mb-2 text-[19px]">
					Read this one at a glance
				</p>
				<p className="measure mt-0 mb-5 font-body text-body text-ink-2">
					This {name} is led by{' '}
					{strongestAttributes.map(({ key }) => attributeTerm(key).name.toLowerCase()).join(' and ')}.
					{strongestCapability ? ` Its highest capability rating is ${capabilityTerm(strongestCapability.key).name} (${strongestCapability.value}).` : ''}
					{signature ? ` ${signature.name} is its signature ${record.signature.type === 'passive' ? 'passive' : 'ability'}.` : ''}
				</p>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<BriefCard
						label="Strongest aptitude"
						value={strongestCapability ? capabilityTerm(strongestCapability.key).name : 'Not recorded'}
						caption={strongestCapability ? `Rated ${strongestCapability.value}, where 50 is standard.` : 'No capability reading.'}
					/>
					<BriefCard
						label="Signature"
						value={signature ? signature.name : 'Not recorded'}
						caption={signature
							? `Through its ${instrumentTerm(signature.instrument).name.toLowerCase()}${signature.element ? `, in ${elementTerm(signature.element).name.toLowerCase()}` : ''}.`
							: 'No signature ability recorded.'}
					/>
					<BriefCard
						label={<Term definition={TERM_DEFS.temperament}>Leading temperament</Term>}
						value={leadingTemperament ? temperamentTerm(leadingTemperament.key).name : 'Not recorded'}
						caption={leadingTemperament ? `${leadingTemperament.value} of 100. ${temperamentTerm(leadingTemperament.key).nature}` : 'No temperament reading.'}
					/>
					<BriefCard
						label={<Term definition={TERM_DEFS.registryDistinction}>Registry distinction</Term>}
						value={roundedDistinction == null ? 'Uncalibrated' : `More distinctive than ${roundedDistinction}% of records`}
						caption={roundedDistinction == null
							? 'Not yet measured against calibrated records.'
							: 'Distinction is how far this record sits from a typical print. It is not combat power.'}
					/>
				</div>
			</section>

			<Layer title="Physiology">
				<SpecPlate
					columns={2}
					entries={[
						{ key: <Term definition={TERM_DEFS.composition}>Composition</Term>, value: bodyValue(composition) },
						{ key: <Term definition={TERM_DEFS.bodyPlan}>Body plan</Term>, value: bodyValue(physiologyTerm('bodyPlan', physiology.bodyPlan).name) },
						{ key: <Term definition={TERM_DEFS.covering}>Covering</Term>, value: bodyValue(physiologyTerm('covering', physiology.covering).name) },
						{ key: 'Anatomy', value: bodyValue(physiology.anatomy.map((key) => instrumentTerm(key).name).join(', ')) },
						{ key: 'Mass', value: massBoth(physiology.massKg) },
						...dimensions(physiology).map((d) => ({ key: d.label, value: d.value })),
						{ key: 'Diet', value: bodyValue(physiologyTerm('diet', physiology.diet).name) },
						{ key: <Term definition={TERM_DEFS.lifespan}>Lifespan</Term>, value: bodyValue(physiologyTerm('lifespan', physiology.lifespan).name) },
						{ key: <Term definition={TERM_DEFS.chirality}>Chirality</Term>, value: bodyValue(physiologyTerm('chirality', physiology.genome.chirality).name) },
						{ key: <Term definition={TERM_DEFS.communication}>Communication</Term>, value: bodyValue(communication) },
						{ key: 'Breathes', value: bodyValue(breathes) },
						{ key: <Term definition={TERM_DEFS.ambientMedia}>Ambient media</Term>, value: bodyValue(tolerance.ambientMedia.map((key) => physiologyTerm('media', key).name).join(', ')) },
						{ key: 'Temperature', value: `${tolerance.temperatureC.min} to ${tolerance.temperatureC.max} °C` },
						...(protections.length > 0 ? [{ key: <Term definition={TERM_DEFS.protections}>Protections</Term>, value: bodyValue(protections.join(', ')) }] : []),
						...(traversal.length > 0 ? [{ key: <Term definition={TERM_DEFS.traversal}>Traversal</Term>, value: bodyValue(traversal.join(', ')) }] : []),
					]} />
			</Layer>

			<p className="m-0 max-w-[62ch] font-body text-small text-ink-2">
				Attributes, capabilities and senses are <Term definition={TERM_DEFS.rating}>ratings</Term>: 50 is a standard reference, and
				a rating can pass 100.
			</p>

			<div className="grid gap-8 lg:grid-cols-2">
				<Layer title="Attributes">
					<Card variant="panel" className="p-4 md:p-6">
						<Ratings
							rows={ATTRIBUTE_ORDER
								.filter((key) => typeof (record.attributes as Record<string, number>)[key] === 'number')
								.map((key) => ({ ...attributeTerm(key), value: (record.attributes as Record<string, number>)[key] }))} />
					</Card>
				</Layer>

				<div className="flex flex-col gap-8">
					<Layer title="Capabilities">
						<Card variant="panel" className="p-4 md:p-6">
							<Ratings
								rows={CAPABILITY_ORDER
									.filter((key) => typeof (physiology.capabilities as Record<string, number>)[key] === 'number')
									.map((key) => ({ ...capabilityTerm(key), value: (physiology.capabilities as Record<string, number>)[key] }))} />
						</Card>
					</Layer>

					<Layer title="Senses">
						<Card variant="panel" className="p-4 md:p-6">
							<Ratings rows={GRADED_SENSES.map((key) => ({ ...senseTerm(key), value: physiology.senses[key] }))} />
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

			<Layer title="Appearance">
				{appearance.length > 0 ? (
					<ul className="m-0 flex max-w-[62ch] list-none flex-col gap-1 p-0 font-body text-body text-ink-2">
						{appearance.map((quality) => <li key={quality}>{quality}</li>)}
					</ul>
				) : null}
				{finish !== 'standard' ? (
					<p className="mt-3 mb-0 max-w-[62ch] font-body text-body text-ink">
						{capitalize(finish)} <Term definition={TERM_DEFS.finish}>finish</Term>: this one came out of the Generator wearing it.
					</p>
				) : null}
			</Layer>

			<Layer title="Actions">
				<p className="mt-0 mb-4 max-w-[62ch] font-body text-small text-ink-2">
					Four actions. Its species always has the guaranteed ones; the drawn ones are this creature&apos;s own. Intensity is this
					creature&apos;s rolled strength for each effect: 50 is a standard reference, and values above 100 are allowed.
				</p>
				<div className="grid gap-4 lg:grid-cols-2">
					{actions.map((ability) => <AbilityCard key={ability.key} ability={ability} />)}
				</div>
			</Layer>

			{passives.length > 0 ? (
				<Layer title="Passives">
					<div className="grid gap-4 lg:grid-cols-2">
						{passives.map((ability) => <AbilityCard key={ability.key} ability={ability} />)}
					</div>
				</Layer>
			) : null}

			<Layer title="Temperament">
				<Card variant="panel" className="p-4 md:p-6">
					<div className="grid gap-x-8 md:grid-cols-2">
						{TEMPERAMENT_ORDER.map((key) => {
							const term = temperamentTerm(key);
							return (
								<div key={key} title={term.nature}>
									<Meter name={term.name} value={(record.temperament as Record<string, number>)[key]} max={100} />
								</div>
							);
						})}
					</div>
				</Card>
			</Layer>

			<RecordRow term="Use it">
				{isUnownedPreview ? (
					<React.Fragment>
						Sign in to keep this Xalian, then field it in{' '}
						<Link to="/duel" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Duel</Link>,{' '}
						<Link to="/reclamation" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Reclamation</Link> and{' '}
						<Link to="/long-return" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Expedition</Link>. Every game reads
						the same record.
					</React.Fragment>
				) : (
					<React.Fragment>
						Field it in{' '}
						<Link to="/duel" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Duel</Link>,{' '}
						<Link to="/reclamation" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Reclamation</Link> and{' '}
						<Link to="/long-return" className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Expedition</Link>. Every game reads
						the same record.
					</React.Fragment>
				)}
			</RecordRow>
		</article>
	);
}

export default RecordView;
