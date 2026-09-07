// Terminal: relay. Home is the relay itself: which terminals are up, and one
// key beside each to patch through, over the one connection the Zolto kept
// alive while Kozrak tries to keep the galaxy dark.
import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';

const REACHABLE_TERMINALS = [
	{
		name: 'Generator',
		terminal: 'Field Terminal',
		description: 'Print plague-immune Xalians from Scrambler Tokens in salvaged hardware.',
		to: '/generator',
	},
	{
		name: 'Encyclopedia',
		terminal: 'Archive',
		description: 'Every world, species, and event on file under one lamp.',
		to: '/encyclopedia',
	},
	{
		name: 'Duel',
		terminal: 'Registry',
		description: "Kozrak's arena registry: every match a ledger, every token a fee.",
		to: '/duel',
	},
	{
		name: 'Reclamation',
		terminal: 'Field Terminal',
		description: 'Survey worlds instead of genomes: deploy sites and issue orders.',
		to: '/reclamation',
	},
	{
		name: 'Training',
		terminal: 'Field Terminal',
		description: 'Drill your squad on the field unit before the real arena.',
		to: '/train',
	},
];

class Home extends React.Component {
	render() {
		return (
			<div className="g-console home-console" data-terminal="relay">
				<XalianNavbar></XalianNavbar>

				<main className="g-shell home-shell">
					<header className="g-masthead">
						<div className="g-masthead-heading">
							<p className="g-kicker">Relay</p>
							<h1 className="g-title">Xalians</h1>
						</div>
						<div className="g-masthead-aside">
							<span className="g-nameplate">QED Relay &middot; Zolton-3</span>
						</div>
					</header>

					<section className="g-cover-plate g-object">
						<span className="g-cover-screw" style={{ left: '10px', top: '10px' }}></span>
						<span className="g-cover-screw" style={{ right: '10px', top: '10px' }}></span>
						<span className="g-cover-screw" style={{ left: '10px', bottom: '10px' }}></span>
						<span className="g-cover-screw" style={{ right: '10px', bottom: '10px' }}></span>

						<div className="home-plate-body">
							<div className="g-tube home-tube-frame">
								<span className="g-standoff g-standoff--tl"></span>
								<span className="g-standoff g-standoff--tr"></span>
								<span className="g-standoff g-standoff--bl"></span>
								<span className="g-standoff g-standoff--br"></span>

								<div className="g-crt home-tube">
									<p className="g-screen-line">QED RELAY &middot; ZOLTON-3</p>
									<p className="g-screen-line g-screen-line--dim">HANDSHAKE ... HOLD ... PAIR FOUND</p>
									<p className="g-screen-line">
										ENTANGLED<span className="g-cursor" aria-hidden="true"></span>
									</p>

									<div className="home-terminal-list">
										{REACHABLE_TERMINALS.map((t) => (
											<div className="home-terminal-row" key={t.name}>
												<span className="g-lamp" aria-hidden="true"></span>
												<div className="home-terminal-copy">
													<p className="g-screen-line">
														{t.name.toUpperCase()} <span className="g-screen-line--dim">&middot; {t.terminal}</span>
													</p>
													<p className="g-screen-line g-screen-line--dim">{t.description}</p>
												</div>
												<Link to={t.to} className="g-key home-terminal-key">
													Patch Through
												</Link>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="home-plate-copy">
								<p className="g-body home-premise">
									Xalians are the bioengineered creatures Vallerii Generators grow to survive Xalia's worst worlds, no two genomes alike. King Kozrak's Mercurius Machine is the last device that can print a Scrambler Token, an encrypted genome safe from the Nemesis Plague, and he pays them out to the winners of his arena tournaments. This relay is what reaches every terminal from here: a Generator to grow one, the Archive to read what is known, the arena registry for the duel, and the survey terminals for Reclamation and training.
								</p>

								<div className="home-social-row">
									<a href="https://discord.gg/sgGNhNJ2KN" className="g-legend home-social-link">
										Discord
									</a>
									<a href="https://twitter.com/xaliansgame" className="g-legend home-social-link">
										Twitter
									</a>
								</div>

								<div className="g-asset-plate">
									<span>Zolton-3 Relay &middot; Rev C</span>
									<span>Hand-built &middot; Keep Dry</span>
								</div>
							</div>
						</div>
					</section>
				</main>
			</div>
		);
	}
}

export default Home;
