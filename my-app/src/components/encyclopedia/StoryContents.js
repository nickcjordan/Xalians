import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import { Card } from '@/components/ui/card';

// Counts paragraphs read for one part from the shared read-mark store
// (guarded like trail.js: a blocked or empty store reads as zero).
function countRead(part) {
	try {
		const raw = window.localStorage.getItem('enc.read.v1');
		const read = raw ? JSON.parse(raw) : {};
		let count = 0;
		for (const section of part.sections) {
			for (const paragraph of section.paragraphs) {
				if (read[`chapter:${paragraph.world.key}:${paragraph.index}`]) count += 1;
			}
		}
		return count;
	} catch (e) {
		return 0;
	}
}

function partParagraphCount(part) {
	return part.sections.reduce((sum, section) => sum + section.paragraphs.length, 0);
}

function useReadCounts(parts) {
	const [counts, setCounts] = useState(() => parts.map(() => 0));
	useEffect(() => {
		function recompute() {
			setCounts(parts.map((part) => countRead(part)));
		}
		recompute();
		window.addEventListener('enc-trail-change', recompute);
		window.addEventListener('storage', recompute);
		return () => {
			window.removeEventListener('enc-trail-change', recompute);
			window.removeEventListener('storage', recompute);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [parts]);
	return counts;
}

/**
 * Contents: the seven parts of The Story, each with a one-sentence teaser
 * (part.opening), a "n chapters . n worlds" line, and a read-progress
 * fraction. Used by both the Reading Room and the Story contents page
 * (/encyclopedia/story). Contract: docs/design/xalian-encyclopedia-story-pass.md
 * "Story section, room and shell (agent A2)".
 */
export default function StoryContents({ story }) {
	const readCounts = useReadCounts(story.parts);

	return (
		<Card variant="panel" className="p-0">
			<ol className="m-0 flex flex-col">
				{story.parts.map((part, i) => {
					const total = partParagraphCount(part);
					const read = readCounts[i] || 0;
					const meta = `${total} chapter${total === 1 ? '' : 's'}, ${part.worlds.length} world${part.worlds.length === 1 ? '' : 's'}${total > 0 ? `, ${read} read` : ''}`;
					return (
						<li
							key={part.era.key}
							className="grid grid-cols-[20rem_1fr_auto] items-baseline gap-x-6 gap-y-2 border-b border-edge px-6 py-4 last:border-b-0 max-sm:grid-cols-1"
						>
							<h3 className="m-0 flex items-baseline gap-3">
								<span className="type-data text-small text-ink-3">{String(part.order).padStart(2, '0')}</span>
								<Link
									to={lore.routeFor('era', part.era.key)}
									className="type-legend text-body text-ink no-underline hover:text-ink"
								>
									{part.title}
								</Link>
							</h3>
							<p className="m-0 font-body text-body text-ink-2">{part.era.definition}</p>
							<p className="type-data m-0 whitespace-nowrap text-small text-ink-3 max-sm:whitespace-normal">{meta}</p>
						</li>
					);
				})}
			</ol>
		</Card>
	);
}
