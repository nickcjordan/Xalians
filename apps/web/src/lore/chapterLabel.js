// chapterLabel(index) -> "Ch. 01" style display string for a world chapter or
// chronicle paragraph. Chapter indexes are zero-based everywhere in the data
// (see worlds.js buildChapters, story.js fixedPoints anchors, chronicle.js),
// so every display site adds one here rather than re-deriving the offset.
// Anchor ids and hrefs stay zero-based -- this only formats the number shown
// to a reader, never a route or DOM id.

export function chapterLabel(index) {
	return `Ch. ${String(index + 1).padStart(2, '0')}`;
}
