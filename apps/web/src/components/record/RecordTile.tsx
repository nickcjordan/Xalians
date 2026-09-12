import * as React from 'react';
import type { XalianRecord } from '@xalians/content/schema';
import { speciesDisplayName } from '@xalians/rules/generator';
import { Check, Plus } from 'lucide-react';

import XalianImage from '../xalianImage';
import { archetypeTerm, elementTerm, generatedOnShort, capitalize } from './vocabulary';
import { Tile, TileArt, TileMeta } from '@/components/system/record';
import { Badge } from '@/components/ui/badge';

/**
 * One ratified record as a catalog tile: the species art on its element wash,
 * the designation, the element chips, and the date it was generated. The whole
 * tile is one target; the caller decides what opening it does.
 */

type RecordTileProps = {
	record: XalianRecord;
	onOpen: (record: XalianRecord) => void;
	/** Rendered over the art, top right: a release key, or nothing. */
	action?: React.ReactNode;
	comparison?: {
		selected: boolean;
		disabled?: boolean;
		onToggle: (record: XalianRecord) => void;
	};
};

function RecordTile({ record, onOpen, action, comparison }: RecordTileProps) {
	const element = record.element.primary;
	const affinities = record.element.affinities as Record<string, number>;
	const secondary = Object.keys(affinities).find((key) => key !== element) || null;
	const name = speciesDisplayName(record.species);
	const finish = record.appearance.finish;
	const archetype = archetypeTerm(record.archetype.key).name;
	const signatureAbility = record.abilities.find((ability) => ability.signature) || record.abilities[0];

	return (
		<div className={`el-${element} relative`}>
			<Tile
				as="button"
				type="button"
				onClick={() => onOpen(record)}
				className="w-full text-left"
				aria-label={`Open the record for ${name}, generated ${generatedOnShort(record.provenance.generatedAt)}`}
			>
				<TileArt className="p-0">
					<XalianImage
						colored
						speciesName={record.species}
						primaryType={element}
						secondaryType={secondary || undefined}
						moreClasses="w-full"
					/>
				</TileArt>
				<TileMeta className="flex flex-col gap-2">
					<span className="type-legend text-ink">{name}</span>
					<span className="truncate font-body text-small text-ink-2" title={`${archetype}${signatureAbility ? ` · ${signatureAbility.name}` : ''}`}>
						{archetype}{signatureAbility ? ` · ${signatureAbility.name}` : ''}
					</span>
					<div className="flex flex-wrap gap-2">
						<span className={`el-${element}`}><Badge variant="chip">{elementTerm(element).name}</Badge></span>
						{secondary ? (
							<span className={`el-${secondary}`}><Badge variant="chip-outline">{elementTerm(secondary).name}</Badge></span>
						) : null}
						{finish !== 'standard' ? <Badge variant="warn">{capitalize(finish)}</Badge> : null}
					</div>
					<span className="type-data text-small text-ink-3 whitespace-nowrap">{generatedOnShort(record.provenance.generatedAt)}</span>
				</TileMeta>
			</Tile>
			{comparison ? (
				<div className="absolute top-2 left-2">
					<button
						type="button"
						className="inline-flex size-10 items-center justify-center border border-edge-strong bg-s0 text-ink transition-colors hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
						aria-label={`${comparison.selected ? 'Remove' : 'Add'} ${name} ${comparison.selected ? 'from' : 'to'} comparison`}
						aria-pressed={comparison.selected}
						disabled={comparison.disabled}
						onClick={() => comparison.onToggle(record)}
					>
						{comparison.selected ? <Check className="size-4 text-viable-hi" /> : <Plus className="size-4" />}
					</button>
				</div>
			) : null}
			{action ? <div className="absolute top-2 right-2">{action}</div> : null}
		</div>
	);
}

export default RecordTile;
