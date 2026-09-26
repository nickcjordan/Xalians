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
	['sweep', 'Sweep', 'hits every enemy creature at its world, for less than a strike.'],
	['bolster', 'Bolster', 'gives your creatures beside it back half of what the fight took, between exchanges and at the Ruling.'],
	['shield', 'Shield', 'stops the biggest attack against your side at its world, every exchange.'],
];

export function HelpPanel({ match, clinch, onClose }) {
	const frames = (match && match.frames) || [];
	return (
		<Panel title="How to play" kind="help" onClose={onClose}>
			<section className="rec-help-section">
				<h3 className="rec-help-head">The aim</h3>
				<p>Each round puts three worlds on the table. Each world is fought until one side has nobody left standing, and that side takes it. The first to {clinch} worlds wins the game.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Your turn</h3>
				<ol className="rec-help-steps">
					<li>Pick a creature from your squad at the bottom. Pointing at one stands it on every world as it would be there, and each world&apos;s two bars show what each side would hold after the Clash.</li>
					<li>Pick a world.</li>
					<li>Or pass. A pass lasts the rest of the round, so pass when you want to keep creatures for later.</li>
				</ol>
				<p>You have {SENDABLE} sends for the whole game, across {FRAMES_PER_MATCH} rounds, so not every creature in your squad will be sent: choose which. When both sides have passed, the worlds clash one at a time. At each, every creature still standing acts, fastest first, exchange after exchange, until one side has nobody standing (if nobody standing can attack, the side holding more takes it). Each blow is told on the world it lands on, and the whole account is in the history (&equiv;). Then the round is ruled.</p>
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
				<p>The rival is always above and you are always below: on every world, in the score and on the round track, with your squad at the foot of the table. A color is a world&apos;s (or, on the badge at a creature&apos;s foot, its element&apos;s), red is what the Clash would take from you, and everything else is plain. Every number belongs to one side, and no number adds the two sides together.</p>
				<ul className="rec-help-marks">
					<li><b>The two bars across a world</b> are what each side would hold there after the Clash if the round ended now, the rival&apos;s above and yours below, in the world&apos;s color and on one scale for all three worlds, with each total at the end of its bar. The longer bar takes the world. A hatched end is what the Clash takes off that side, red on yours. The rival&apos;s hidden creatures are not in them.</li>
					<li><b>The bar by a creature</b> is its hold, with its number. A hatched end is what the Clash would take from it; a cross means it would fall. In the Clash, the line on the world names your creatures &ldquo;your&rdquo; and the rival&apos;s bare.</li>
					<li><b>The three columns on each card in your squad</b> are the three worlds, in the same order and colors as above. A column&apos;s number and height are what that creature would hold there if you sent it now: what it would still hold after the Clash, a lighter part for what it adds to your creatures already there, and hatched red on top what the Clash would take off it. A tag hanging from the top of a column is the rival&apos;s total at that world now and after that send (12&rarr;0: its 12 there would be driven to nothing). A small pointer on a column&apos;s edge is what the rival would still lead by: a column that passes it would put you ahead, and is lit. Point at a world to light its column on every card.</li>
					<li><b>The dashed box on each column</b> is what the creature holds at a world that neither helps nor hurts it, so a creature with no mark stands the same at every world. The mark under a column says what changed it and by how much: a house &times;1&frac12; on its home world; a flame or a snowflake &times;&frac12; where the world is too hot or too cold (&times;&frac14; when it is far off); the world&apos;s air or water struck out &times;&frac12; or &times;&frac14; where it cannot breathe; two figures where the creatures already there add or take; a bolster&apos;s own mark where it steadies itself. A cross means it would fall.</li>
					<li><b>Under a creature you point at or lift</b>, each world says in words what changes its number there and why: its home world, a temperature it is not made for (with the world&apos;s range and its own), air or water it cannot take, the creatures beside it, and who in the Clash would strike it or fall to it.</li>
					<li><b>The top bar</b>: the round track (the game&apos;s nine worlds, three rounds of three; a world won fills its top half for the rival and its bottom half for you), then the score, a pennant for each world won, the rival&apos;s row (with the rival&apos;s emblem) above yours (with a piece). First to {clinch} wins; a side one world from winning has its last pennant burning. The piece, the ticks and the number after each row are that side&apos;s sends left.</li>
					<li>The small symbol by a creature&apos;s name is its role. The colored badge on its piece is its element.</li>
					<li>&equiv; opens the history, &#9881; the settings.</li>
				</ul>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Hold</h3>
				<p>A creature&apos;s hold is how firmly it holds a world, and a world goes to the side with more hold after the Clash. A creature holds half again on its home world, and half or a quarter where the world&apos;s heat, cold or air strains it. Each world&apos;s temperature band is on its head; pointing at a creature lays its own band over it, and the same mark as on its card (a flame, a snowflake, the air struck out) says which.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Advanced mode</h3>
				<p>Adds the arithmetic. On each squad card: its speed (faster attacks land first) and the small marks for what its attributes do (hover one for its meaning). On each world: the site&apos;s name. The log runs down the side. On a phone the log sits behind &equiv; and the attribute marks in each creature&apos;s reading (its &#9432;).</p>
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
