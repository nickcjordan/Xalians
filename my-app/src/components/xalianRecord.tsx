import * as React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { SpecPlate } from '@/components/system/record';
import XalianImage from './xalianImage';
import * as lore from '../lore';

/**
 * A specimen record: plate, chips, id, description and the spec grid.
 *
 * Content only, no surface of its own (docs/DESIGN_SYSTEM.md) — the page
 * decides the medium (glass, for a live record) and this component just
 * fills it. Three columns from `lg` (280px / 1fr / 260-300px), stacked
 * under `md`, the plate centered at 220px on phones.
 */

type Subject = {
	name: string;
	id: string | number | null;
	description: string | null;
	primaryType: string;
	secondaryType: string | null;
	planet: string | null;
	generation: number;
	height: string | null;
	weight: string | null;
	statScore: number | null;
	potentialScore: number | null;
};

function getSubject(xalian: any, species: any): Subject | null {
	if (xalian) {
		return {
			name: xalian.species.name,
			id: xalian.speciesId,
			description: xalian.species.description,
			primaryType: xalian.elements.primaryType,
			secondaryType: xalian.elements.secondaryType,
			planet: xalian.species.planet,
			generation: xalian.species.generation || 0,
			height: xalian.species.height,
			weight: xalian.species.weight,
			statScore: xalian.meta ? xalian.meta.statScore : null,
			potentialScore: xalian.meta ? xalian.meta.potentialStatScore : null,
		};
	}
	if (species) {
		return {
			name: species.name,
			id: species.id,
			description: species.description,
			primaryType: species.type,
			secondaryType: null,
			planet: species.planet,
			generation: species.generation || 0,
			height: species.height,
			weight: species.weight,
			statScore: null,
			potentialScore: null,
		};
	}
	return null;
}

function XalianRecord({ xalian, species, hideId }: { xalian?: any; species?: any; hideId?: boolean }) {
	const subject = getSubject(xalian, species);
	if (!subject) {
		return null;
	}

	const element = subject.primaryType.toLowerCase();
	const secondaryElement = subject.secondaryType ? subject.secondaryType.toLowerCase() : null;
	const plateStyle: React.CSSProperties | undefined = secondaryElement
		? { background: `linear-gradient(160deg, color-mix(in srgb, var(--color-el) 78%, black), color-mix(in srgb, var(--color-el-${secondaryElement}) 78%, black))` }
		: { background: 'color-mix(in srgb, var(--color-el) 78%, black)' };

	// Links into the encyclopedia, only where the record exists there.
	const speciesKey = subject.name ? subject.name.toLowerCase() : null;
	const worldKey = subject.planet ? subject.planet.toLowerCase() : null;
	const speciesRoute = speciesKey && lore.getSpecies(speciesKey) ? lore.routeFor('species', speciesKey) : null;
	const worldRoute = worldKey && lore.getWorld(worldKey) ? lore.routeFor('world', worldKey) : null;

	return (
		<div className={`el-${element} grid gap-5 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr_minmax(260px,300px)]`}>
			<div className="mx-auto w-[220px] aspect-square overflow-hidden p-[4%] md:mx-0 md:w-full lg:col-start-1" style={plateStyle}>
				<XalianImage
					speciesName={subject.name}
					primaryType={subject.primaryType}
					secondaryType={subject.secondaryType}
					moreClasses="w-full" />
			</div>

			<div className="flex min-w-0 flex-col gap-3 lg:col-start-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className={`el-${element}`}><Badge variant="chip">{subject.primaryType}</Badge></span>
					{secondaryElement &&
						<span className={`el-${secondaryElement}`}><Badge variant="chip">{subject.secondaryType}</Badge></span>
					}
					{subject.id != null && !hideId &&
						<span className="type-data text-small text-ink-3">#{subject.id}</span>
					}
					{speciesRoute &&
						<Link to={speciesRoute} className="ml-auto whitespace-nowrap font-body text-small text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink">Species record</Link>
					}
				</div>

				{subject.description &&
					<p className="m-0 font-body text-body text-ink">{subject.description}</p>
				}

				<div className="mt-auto flex items-baseline gap-2 border-t border-edge pt-3">
					<span className="type-legend">Origin</span>
					{worldRoute
						? <Link to={worldRoute} className="type-data text-small text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">{subject.planet}</Link>
						: <span className="type-data text-small text-ink">{subject.planet}</span>
					}
				</div>
			</div>

			<div className="lg:col-start-3">
				<SpecPlate
					entries={[
						{ key: 'Generation', value: subject.generation },
						{ key: 'Height', value: subject.height },
						{ key: 'Weight', value: subject.weight },
						...(subject.statScore != null ? [{ key: 'Stat score', value: subject.statScore.toLocaleString() }] : []),
						...(subject.potentialScore != null ? [{ key: 'Potential', value: subject.potentialScore.toLocaleString() }] : []),
					]}
				/>
			</div>
		</div>
	);
}

export default XalianRecord;
