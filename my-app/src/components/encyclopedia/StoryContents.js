import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';

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
		<ol className="enc-contents-list">
			{story.parts.map((part, i) => {
				const total = partParagraphCount(part);
				const read = readCounts[i] || 0;
				return (
					<li key={part.era.key} className="g-record enc-contents-row">
						<h3 className="g-record-term enc-contents-term">
							<span className="g-mono enc-contents-index">{String(part.order).padStart(2, '0')}</span>
							<Link to={lore.routeFor('era', part.era.key)} className="g-link">
								{part.title}
							</Link>
						</h3>
						<p className="g-record-body enc-contents-teaser">{part.era.definition}</p>
						<p className="g-mono enc-contents-meta">
							{total} chapter{total === 1 ? '' : 's'} &middot; {part.worlds.length} world
							{part.worlds.length === 1 ? '' : 's'}
							{total > 0 && (
								<>
									{' '}&middot; {read} / {total} read
								</>
							)}
						</p>
					</li>
				);
			})}
		</ol>
	);
}
