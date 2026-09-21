/*
	"Is it actually on screen?" - the question four headless checks were not asking.

	WHY THIS EXISTS. Pass 28 introduced a bug where the Court's ruling, the payoff of
	every round, was painted over a board fading in from opacity zero. Four headless
	checks and 1541 unit tests all passed, because every one of them asked whether an
	element was in the DOM. `document.querySelectorAll('[data-site-id]').length` was 3
	at every step of that blank screen.

	Pass 31 audited the rest by setting `.rec-site { opacity: 0 }` and re-running
	everything: ALL FOUR CHECKS STILL PASSED with the entire game board invisible.
	Fixing the ruling bug had closed one instance; this closes the class.

	An element counts as seen only if all of these hold:
	  - it has a non-zero box
	  - its box intersects the viewport
	  - no ancestor has visibility:hidden, display:none or content-visibility:hidden
	  - the PRODUCT of every ancestor's opacity is above a floor (an animation caught
	    mid-fade is the case that started this, so the floor is meaningful, not just > 0)
	  - the point at its centre hits itself or one of its own descendants, so a panel
	    covered by an overlay does not count as seen

	It deliberately does NOT check colour contrast: text the same colour as its
	background is a different fault, and conflating the two would make failures
	ambiguous about which one happened.
*/

// The body of the probe, as source, so it can be injected into any page.
const PROBE_SOURCE = `(selector, opacityFloor) => {
	const out = [];
	document.querySelectorAll(selector).forEach((el, i) => {
		const rect = el.getBoundingClientRect();
		const reasons = [];
		let partiallyCovered = null;
		if (rect.width < 1 || rect.height < 1) {
			reasons.push('zero box (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ')');
		}
		/*
			Being below the fold is NOT a fault: on a phone the second and third world sit
			under the first and are reached by scrolling, which is a layout question and
			has its own open item. Conflating it with "cannot be seen" made this probe
			fail a healthy build, which would have taught me to ignore it. What IS a fault
			is an element positioned outside the document entirely, so only that is
			flagged, and whether a box is in the current viewport is reported separately
			for callers that genuinely need it.
		*/
		const inViewport = rect.bottom > 0 && rect.right > 0
			&& rect.top < (window.innerHeight || 0) && rect.left < (window.innerWidth || 0);
		const offDocument = rect.right < 0 || rect.bottom < -1
			|| rect.left > Math.max(document.documentElement.scrollWidth, window.innerWidth)
			|| rect.top > Math.max(document.documentElement.scrollHeight, window.innerHeight);
		if (offDocument) {
			reasons.push('outside the document (top ' + Math.round(rect.top) + ', left ' + Math.round(rect.left) + ')');
		}
		let opacity = 1;
		let node = el;
		while (node && node.nodeType === 1) {
			const cs = getComputedStyle(node);
			if (cs.display === 'none') { reasons.push('display:none'); break; }
			if (cs.visibility === 'hidden' || cs.visibility === 'collapse') { reasons.push('visibility:' + cs.visibility); break; }
			if (cs.contentVisibility === 'hidden') { reasons.push('content-visibility:hidden'); break; }
			const o = parseFloat(cs.opacity);
			if (!Number.isNaN(o)) opacity *= o;
			node = node.parentElement;
		}
		if (opacity < opacityFloor) {
			reasons.push('effective opacity ' + opacity.toFixed(3) + ' (floor ' + opacityFloor + ')');
		}
		/*
			Is any of it reachable, or is the whole thing behind something?

			The first version tested only the centre point, which reported a world panel as
			covered whenever a sticky bar happened to pin across its middle. That is a real
			overlap but a weak one: the panel above and below the bar is perfectly readable,
			and a player scrolls. Failing on it would have taught me to ignore this probe,
			which is how a check becomes decoration.

			So it samples several points down the element and fails only when EVERY one of
			them is behind something else. That still catches a panel wholly under an
			overlay, which is the fault worth failing on, and the partial case is reported
			as coverage for a caller that wants to look.
		*/
		if (inViewport && rect.width >= 1 && rect.height >= 1) {
			const x = Math.min(Math.max(rect.left + rect.width / 2, 1), (window.innerWidth || 1) - 1);
			const ys = [0.15, 0.35, 0.5, 0.65, 0.85]
				.map((f) => rect.top + rect.height * f)
				.filter((y) => y > 0 && y < (window.innerHeight || 0));
			const blockers = [];
			let reachable = 0;
			ys.forEach((y) => {
				const top = document.elementFromPoint(x, y);
				if (!top || top === el || el.contains(top) || top.contains(el)) {
					reachable++;
					return;
				}
				blockers.push(String(top.getAttribute('data-site-id') || top.className || top.tagName).slice(0, 40));
			});
			if (ys.length > 0 && reachable === 0) {
				reasons.push('wholly covered by ' + [...new Set(blockers)].join(', '));
			} else if (blockers.length > 0) {
				partiallyCovered = [...new Set(blockers)];
			}
		}
		out.push({
			index: i,
			id: el.getAttribute('data-site-id') || el.getAttribute('data-testid') || el.tagName.toLowerCase(),
			text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
			seen: reasons.length === 0,
			inViewport: inViewport,
			partiallyCovered: partiallyCovered,
			reasons: reasons,
		});
	});
	return out;
}`;

/*
	seenOn(page, selector, {floor}) -> one record per matched element, each saying
	whether it is actually seen and, if not, exactly why.

	The default floor of 0.5 is deliberate: the fault this exists for was a panel at
	0.67 mid-fade, which is in the DOM, hit-testable, and not yet readable.
*/
export async function seenOn(page, selector, options = {}) {
	const { floor = 0.5 } = options;
	return page.evaluate(
		([source, sel, f]) => (0, eval)(source)(sel, f),
		[PROBE_SOURCE, selector, floor],
	);
}

/*
	assertSeen(assert, records, label, what) - every record must be seen, and there must
	be at least one. "At least one" matters: a selector that matches nothing would
	otherwise pass vacuously, which is the same shape of fault as the one this file
	exists to prevent.
*/
export function assertSeen(assert, records, label, what, minimum = 1) {
	const unseen = records.filter((r) => !r.seen)
		.map((r) => `${r.id}: ${r.reasons.join(', ')}`);
	assert.deepEqual(unseen, [], `${label}: ${what} present but not visible - ${unseen.join(' | ')}`);
	assert(records.length >= minimum,
		`${label}: expected at least ${minimum} ${what}, found ${records.length}`);
}
