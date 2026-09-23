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
					<li>Pick a creature from your squad at the bottom.</li>
					<li>Pick a world. Each world shows what that creature would hold there before you commit.</li>
					<li>Or pass. A pass lasts the rest of the round, so pass when you want to keep creatures for later.</li>
				</ol>
				<p>You have {SENDABLE} sends for the whole game, across {FRAMES_PER_MATCH} rounds, so not every creature in your squad will be sent: choose which. When both sides have passed, the worlds clash and the round is ruled.</p>
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
				<ul className="rec-help-marks">
					<li>A number with an arrow, <b>12 &rarr;6</b>, is what that creature (or world) would stand at after the Clash, from what is on the board now. Hidden sends are not in it.</li>
					<li><b>You lose it</b> over one of yours, <b>you down it</b> over the rival&apos;s: that creature would fall.</li>
					<li><b>Own sweep</b>: your own sweep at that world would hit it.</li>
					<li>The small symbol in a creature&apos;s name plate is its role. The colored badge on its piece is its element.</li>
					<li><b>Pass</b> lights up when the game suggests passing; the reason is in the bar at the top.</li>
					<li>&equiv; opens the history, &#9881; the settings.</li>
				</ul>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Stake &times;2</h3>
				<p>Once a game, before your first send of a round, you may stake one of the round&apos;s worlds. It then counts two worlds for whoever holds it, and three if both sides staked it. The buttons go away once you send.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Hold</h3>
				<p>A creature&apos;s number is how firmly it holds a world. It holds half again on its home world, and less where its body strains. Under each creature in your squad is the world it holds best this round, in that world&apos;s color. Pick it up to see its hold on every world.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Advanced mode</h3>
				<p>Adds the arithmetic. On each squad card: its speed (the arrowed number; faster attacks land first), the small marks for what its attributes do (hover one for its meaning), and three dots, one per world of the round from left to right, brighter where it holds better, the ringed one its best. On each world: the temperature band, with the world&apos;s range shaded and the picked creature&apos;s own marked, and how many of your squad would be strained there. Under a preview, every hit a sweep would land. The log runs down the side.</p>
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

// newest first, the way the advanced rail reads, so the present is at the top
export function HistoryPanel({ lines, onClose }) {
	return (
		<Panel title="History" kind="history" onClose={onClose}>
			{lines.length === 0 && <p className="rec-help-quiet">Nothing has happened yet.</p>}
			<ol className="rec-history">
				{lines.slice().reverse().map((line, i) => (
					<li className={i === 0 ? 'rec-history-line rec-history-line--now' : 'rec-history-line'} key={`${lines.length - i}`}>{line}</li>
				))}
			</ol>
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
					<p className="rec-help-quiet">Leave keeps the game to resume later. Ending it does not.</p>
				</>
			)}
		</Panel>
	);
}
