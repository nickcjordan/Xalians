import React from 'react';

/*
	ReclamationLog — newest-first, so the last thing that happened is at the top and the
	log never has to be scrolled to read the present.
*/
function ReclamationLog({ lines }) {
	return (
		<div className="g-screen rec-log" aria-label="Expedition log">
			<div className="g-readout-unit">Log</div>
			{lines.length === 0 && <div className="g-screen-line--dim">The expedition has not begun.</div>}
			{lines.slice().reverse().map((line, i) => (
				<div className={`g-screen-line${i === 0 ? '' : ' g-screen-line--dim'}`} key={`${lines.length - i}`}>{line}</div>
			))}
		</div>
	);
}

export default ReclamationLog;
