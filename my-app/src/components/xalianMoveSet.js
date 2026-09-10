import React from 'react';
import { MoveSet } from './system/record';

/**
 * Compatibility wrapper around the system `MoveSet` (src/components/system/record.tsx)
 * for callers still passing the old `showDescription` flag. New code should
 * reach for `MoveSet` directly (see generatorPage.tsx).
 */
function XalianMoveSet({ moves, showDescription, clamp, className }) {
	let list = showDescription ? moves : (moves || []).map((m) => ({ name: m.name, rating: m.rating }));
	return <MoveSet moves={list} clamp={clamp} className={className} />;
}

export default XalianMoveSet;
