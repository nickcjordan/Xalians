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
	['bolster', 'Bolster', 'guards your creatures at its world (every blow on them lands a quarter lighter), keeps them from being weakened or held, and at its turn in each exchange mends the one closest to falling. At the Ruling they get half of what the fight took back.'],
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
				<p>The rival is always above and you are always below: on every world, and in the score, the rival&apos;s side in the top bar and yours at the foot of the table with your squad. A color is a world&apos;s (or, on the badge at a creature&apos;s foot, its element&apos;s), red is what the Clash takes from you, and everything else is plain. Every number belongs to one side, and no number adds the two sides together.</p>
				<ul className="rec-help-marks">
					<li><b>The two bars across a world</b> are what each side has sent there, stacked: every creature at the hold it goes into the Clash with, the rival&apos;s above and yours below, in the world&apos;s color and on one scale for all three worlds, with each total at the end of its bar. Nothing is fought until both sides have passed, so the bars do not guess at the Clash; while it plays they show what it takes, and the longer bar at its end takes the world. The rival&apos;s hidden creatures are not in them.</li>
					<li><b>The bar by a creature</b> is its hold, with its number. Where the creature you point at would change it by standing beside it, the number reads now and after (7&rarr;8). In the Clash, the line on the world names your creatures &ldquo;your&rdquo; and the rival&apos;s bare.</li>
					<li><b>Your squad</b> lists the creatures you can still send, a row each: its silhouette with its element&apos;s badge, its name, its role&apos;s mark with what one of its blows lands on a creature the element chart leaves even (a sweep&apos;s share on each creature, or what a bolster mends), then one cell per world, under that world&apos;s symbol and in its color. It is ordered by role, strikers first, strongest attack first; press a world&apos;s symbol at the head of the squad to order it by what each would add there, and again to go back. Creatures already sent, holding a world, fallen or spent leave the list and sit small beside your score.</li>
					<li><b>A world&apos;s cell</b> is what that creature would add to your side there if you sent it now, with a bar in the world&apos;s color on one scale for the whole squad. The white mark on the bar is what the rival holds there beyond you: a bar that passes it would give you more there than the rival, and glows. &#9650; means the world lifts its hold (its home world, or a bolster lifting itself); &#9660; means the world cuts it (the world&apos;s element, a temperature, air or water it is not made for). Once rival creatures stand there, the factor at the end of the bar is the element chart&apos;s best for its blows on them: &times;2 or &times;1&frac12; where it has the edge, &times;&frac12; or &times;&frac14; where they resist it. Hover a cell for the reasons, or point at the creature to read them on each world.</li>
					<li><b>What a world does to a hold</b>: &times;1.25 on its home world; &times;0.9 where the world&apos;s element is strong against the creature&apos;s; &times;0.9 where the world is too hot or too cold (&times;0.75 when it is far off); &times;&frac12; or &times;&frac14; where it cannot breathe the air or water. The creatures already there can add or take, and a bolster lifts itself.</li>
					<li><b>Under a creature you point at or lift</b>, each world says in words what changes its number there and why: its home world, a temperature it is not made for (with the world&apos;s range and its own), air or water it cannot take, the creatures beside it, and the element chart between it and each rival creature already there (&ldquo;psychic on metal &times;&frac12;: its blows land half as hard on Foromeer&rdquo;). They never say who would win the fight: that depends on everything both sides send, and plays out once both have passed. Press a creature already on a world and its dossier opens with the same words for it.</li>
					<li><b>The top bar</b>: the round track (the game&apos;s nine worlds in the order they come, three rounds of three, each with its world&apos;s symbol; the framed three are on the table now), then the rival&apos;s side: its emblem, a pennant for each world it has won in that world&apos;s color with the count against the {clinch} that win (2/{clinch}), and its sends left, a tick for each send the game allows with the count against them (6/{SENDABLE}). <b>Your side</b> is the same row at the foot of the table, with your squad, headed by a piece. A side one world from winning has its last pennant burning. The pointer at the head of a row is whose move it is.</li>
					<li>The small symbol by a creature&apos;s name on a world is its role. The colored badge on its piece is its element.</li>
					<li><b>A dashed number on a creature</b>, while you point at or lift one of yours, is one blow of yours on it at full strength, with the element chart&apos;s &times;2 or &times;&frac12; beside it when it is not even, and plates where it is armored. A strike could land on any rival there, a sweep lands on every creature there (red on your own), and a bolster or a shield strikes nothing. It is not a forecast: a creature already hurt lands less, a guard takes a quarter off, and the fight plays out only once both sides pass.</li>
					<li>&equiv; opens the history, &#9881; the settings.</li>
				</ul>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Hold</h3>
				<p>A creature&apos;s hold is how firmly it holds a world, and a world goes to the side with more hold after the Clash. A creature holds a quarter more on its home world, nine tenths where the world&apos;s element is strong against its own, nine tenths where the world is too hot or too cold (three quarters far off), and half or a quarter where its air or water does not suit it. Each world&apos;s temperature band is on its head; pointing at a creature lays its own band over it, and the same mark as on its card (a flame, a snowflake, the air struck out) says which.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Elements</h3>
				<p>When two creatures fight, the element chart decides how hard a blow lands: twice as hard against an element it beats, one and a half times against one it has the edge on, half against one that resists it, and a quarter against one it barely touches. The badge on each piece is its element. Every blow the chart changed says so where it lands (&ldquo;water on fire &times;2&rdquo;), and the words under a creature you lift say it for each fight it would be in.</p>
			</section>
			<section className="rec-help-section">
				<h3 className="rec-help-head">Advanced mode</h3>
				<p>Adds the arithmetic. In your squad: each creature&apos;s speed after its attack (&#8679;; faster attacks land first). On each world: the site&apos;s name. The log runs down the side. On a phone the log sits behind &equiv;, and what each creature&apos;s attributes do is in its reading (its &#9432;).</p>
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
