import React from 'react';
import { RoleGlyph } from './reclamationGlyphs';
import { SENDABLE, FRAMES_PER_MATCH } from '@xalians/rules/expedition/expeditionInterpretation';

/*
	PASS 38, THE PANELS. What the table used to print all the time and a player needs only
	when they go looking for it: how to play, the full history, and the settings. Each opens
	over the table from a button in the top bar and closes with its own button or Escape, so
	the table under it keeps its place (docs/design/reclamation-declutter.md, "New panels").
*/
export function Panel({ title, onClose, children, kind }) {
	return (
		<div className="rec-panel-cover" data-panel={kind} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
			<div className="g-panel rec-panel" onClick={(e) => e.stopPropagation()}>
				<header className="rec-panel-head">
					<h2 className="rec-panel-title">{title}</h2>
					<button type="button" className="g-btn rec-panel-close" onClick={onClose} data-panel-close aria-label={`Close ${title.toLowerCase()}`}>Close</button>
				</header>
				<div className="rec-panel-body">{children}</div>
			</div>
		</div>
	);
}

const ROLES = [
	['strike', 'Strike', 'hits one enemy creature at its world.'],
	['sweep', 'Sweep', 'hits every other creature at its world, your own included.'],
	['bolster', 'Bolster', 'restores half of what the round took from your creatures beside it.'],
	['shield', 'Shield', 'blunts the biggest attack against your side at its world, and takes half of what it stops.'],
];

export function HelpPanel({ match, clinch, onClose }) {
	const frames = (match && match.frames) || [];
	return (
		<Panel title="How to play" kind="help" onClose={onClose}>
			<section className="rec-help-section">
				<h3 className="rec-help-head">The aim</h3>
				<p>Each round puts three worlds on the table. Whoever holds more of a world when the round ends wins it. The first to {clinch} worlds wins the game.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Your turn</h3>
				<ol className="rec-help-steps">
					<li>Pick a creature from your squad at the bottom. Pointing at one shows, on every world, where that send would put the line.</li>
					<li>Pick a world.</li>
					<li>Or pass. A pass lasts the rest of the round, so pass when you want to keep creatures for later.</li>
				</ol>
				<p>You have {SENDABLE} sends for the whole game, across {FRAMES_PER_MATCH} rounds, so not every creature in your squad will be sent: choose which. When both sides have passed, the worlds clash one at a time, the fastest creatures acting first; each blow is told on the world it lands on, and the whole account is in the history (&equiv;). Then the round is ruled.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Stake &times;2</h3>
				<p>Once a game, before your first send of a round, you may press Stake &times;2 beside Pass and pick one of the round&apos;s worlds. That world then counts two worlds for whoever holds it (three if both sides staked it), so it is a gamble either way. The key goes away once you send, and does not come back once used.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">What creatures do</h3>
				<ul className="rec-help-roles">
					{ROLES.map(([role, word, text]) => (
						<li key={role}><RoleGlyph role={role} /> <b>{word}</b> {text}</li>
					))}
				</ul>
				<p>Attacks take away hold, fastest first. A creature driven to nothing falls and is out of the game. Fallen creatures stay greyed on the board until the next round, so you can see what the round cost. Where a creature can act in more than one way, you choose when you pick it.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Reading the board</h3>
				<p>The rival is always above and in brass; you are always below and in cyan.</p>
				<ul className="rec-help-marks">
					<li><b>The line across a world</b> divides the rival&apos;s ground from yours. It sits where the two sides&apos; totals put it: in the middle when level, pushed down toward you when the rival holds more, up toward the rival when you do. A world colored all brass goes to the rival as things stand. The two numbers on the line are the totals, the rival&apos;s above and yours below. They are what the Clash would leave if the round ended now; the rival&apos;s hidden creatures are not in them.</li>
					<li><b>The bar under a creature</b> is its hold, with its number. A striped red end is what the Clash would take from it; a red cross means it would fall.</li>
					<li><b>The three columns on each card in your squad</b> are the three worlds, in the same order as above and in their colors. A column&apos;s height is how far sending that creature there now would move that world your way. Where the rival leads a world, a brass tick on its column marks how far: a column that clears the tick is lit full, because that creature alone would take the lead there. A column with a brass foot is the creature&apos;s home world. Point at a world to light its column on every card.</li>
					<li>The pips at the top: the round track (the game&apos;s nine worlds, three rounds of three, filled in the winner&apos;s color), then the score, the rival&apos;s row above yours. First to {clinch} wins. The chevrons beside Pass are the sends you have left.</li>
					<li>The small symbol by a creature&apos;s name is its role. The colored badge on its piece is its element.</li>
					<li>&equiv; opens the history, &#9881; the settings.</li>
				</ul>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Hold</h3>
				<p>A creature&apos;s hold is how firmly it holds a world, and a world goes to the side with more hold after the Clash. A creature holds half again on its home world, and less where its body strains: pointing at it shows the lost part of its bar dimmed and a mark for why (cold, heat, or the wrong air or medium), with the reason in words on the mark.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Advanced mode</h3>
				<p>Adds the arithmetic. On each squad card: its speed (faster attacks land first), the small marks for what its attributes do (hover one for its meaning), and each fit column&apos;s number. On each world: the site&apos;s name and its temperature band, with the picked creature&apos;s own band marked. The log runs down the side. On a phone the log sits behind &equiv; and the attribute marks in each creature&apos;s reading (its &#9432;).</p>
			</section>
			{frames.length > 0 && (
				<section className="rec-help-section">
					<h3 className="rec-help-head">The rounds of this game</h3>
					<ol className="rec-help-rounds">
						{frames.map((frame, i) => (
							<li key={i} className={match.frameIndex === i ? 'rec-help-round--now' : ''}>
								<span className="rec-help-round-n">Round {i + 1}</span>
								{frame.sites.map((site) => (
									<span className={`g-chip g-chip--outline rec-status-element g-el-${site.world.element}`} key={site.id}>{site.world.planet}</span>
								))}
							</li>
						))}
					</ol>
				</section>
			)}
			<section className="rec-help-section">
				<h3 className="rec-help-head">Keys</h3>
				<p><kbd>Space</kbd> hurries the rival and skips the clash. <kbd>Esc</kbd> puts a creature back and closes panels.</p>
			</section>
		</Panel>
	);
}

// in order, the way the advanced rail reads, opened at the present (the bottom)
export function HistoryPanel({ lines, onClose }) {
	const endRef = React.useRef(null);
	React.useLayoutEffect(() => {
		if (endRef.current && endRef.current.scrollIntoView) {
			endRef.current.scrollIntoView({ block: 'end' });
		}
	}, []);
	return (
		<Panel title="History" kind="history" onClose={onClose}>
			{lines.length === 0 && <p className="rec-help-quiet">Nothing has happened yet.</p>}
			<ol className="rec-history">
				{lines.map((line, i) => (
					<li className={`rec-history-line${i === lines.length - 1 ? ' rec-history-line--now' : ''}${/^Round \d+:/.test(line) ? ' rec-log-round' : ''}`} key={i}>{line}</li>
				))}
			</ol>
			<span ref={endRef} />
		</Panel>
	);
}

export function SettingsPanel({ children, rivalName, seed, onAbandon, onClose }) {
	return (
		<Panel title="Settings" kind="settings" onClose={onClose}>
			<div className="rec-settings">{children}</div>
			<dl className="rec-settings-facts">
				{rivalName && (<><dt>Rival</dt><dd>{rivalName}</dd></>)}
				{seed != null && (<><dt>Seed</dt><dd className="g-mono">{seed}</dd></>)}
			</dl>
			{onAbandon && (
				<>
					<button type="button" className="g-btn rec-settings-abandon" onClick={onAbandon} data-abandon>End this game</button>
					<p className="rec-help-quiet">To stop for now, use Leave at the top left: the game waits for you. Ending it cannot be undone.</p>
				</>
			)}
		</Panel>
	);
}
