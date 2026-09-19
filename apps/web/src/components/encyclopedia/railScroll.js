/**
 * Center an element inside a horizontally scrolling rail without ever
 * touching the page's vertical scroll position. `Element.scrollIntoView`
 * (even with `block: 'nearest'`) can walk up to the document and scroll the
 * whole page when the rail sits below the fold, which is not what a
 * mount-time "keep the active station visible" effect should ever do.
 *
 * Does nothing when the rail has no horizontal overflow (nothing to center).
 */
export function centerInRail(rail, el) {
	if (!rail || !el) return;
	if (rail.scrollWidth <= rail.clientWidth) return;
	const target = el.offsetLeft - (rail.clientWidth - el.offsetWidth) / 2;
	rail.scrollLeft = Math.max(0, target);
}
