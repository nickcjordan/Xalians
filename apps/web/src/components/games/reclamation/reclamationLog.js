import React, { useLayoutEffect, useRef } from 'react';

/*
	ReclamationLog. PASS 38: in the order things happened, the present at the bottom, and
	the panel keeps itself scrolled there. Newest-first put a round's Ruling above the
	Clash that caused it, and a blind critic read the story upside down.
*/
function ReclamationLog({ lines }) {
	const ref = useRef(null);
	useLayoutEffect(() => {
		if (ref.current) {
			ref.current.scrollTop = ref.current.scrollHeight;
		}
	}, [lines.length]);
	return (
		<div className="g-screen rec-log" aria-label="Proving log" ref={ref}>
			<div className="g-readout-unit">Log</div>
			{lines.length === 0 && <div className="g-screen-line--dim">Nothing has happened yet. The first send opens the record.</div>}
			{lines.map((line, i) => (
				<div className={`g-screen-line${i === lines.length - 1 ? '' : ' g-screen-line--dim'}${/^Round \d+:/.test(line) ? ' rec-log-round' : ''}`} key={i}>{line}</div>
			))}
		</div>
	);
}

export default ReclamationLog;
