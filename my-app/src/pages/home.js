// Tier: chrome. The front door: the splash, the fourteen worlds as a
// featured component, and the site's five destinations.
import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import { routeFor } from '../lore/routeFor';
import planets from '../json/planets.json';

const DESTINATIONS = [
	{
		name: 'Encyclopedia',
		copy: 'Every world, species, power and event on file, read as one story or by entry.',
		to: '/encyclopedia',
	},
	{
		name: 'Duel',
		copy: 'Squad tactics on an 8 by 8 board. Capture the flag or eliminate the team.',
		to: '/duel',
	},
	{
		name: 'Reclamation',
		copy: 'Send creatures into three worlds a round and hold more of them than your rival.',
		to: '/reclamation',
	},
	{
		name: 'Training',
		copy: 'Short games to learn the pieces before the arena.',
		to: '/train',
	},
];

class Home extends React.Component {
	render() {
		return (
			<main className="g-page" data-tier="chrome">
				<XalianNavbar></XalianNavbar>

				<div className="g-shell home-shell">
					<section className="home-hero">
						<div className="home-hero-copy">
							<XaliansLogoDnaAnimated />
							<p className="g-kicker home-kicker">Xalia</p>
							<h1 className="g-display home-title">Creatures grown for dying worlds</h1>
							<p className="g-lead-v4 home-lead">
								Xalians are bioengineered creatures the Vallerii Generators grow to survive the worst planets in the galaxy, no two genomes alike. King Kozrak&rsquo;s Mercurius Machine prints the Scrambler Tokens that make new ones, and pays them out to the winners of his arena tournaments.
							</p>
							<div className="home-actions">
								<Link to="/generator" className="g-btn g-btn--primary">Generate a Xalian</Link>
								<Link to="/encyclopedia/story" className="g-link home-story-link">Read the story</Link>
							</div>
						</div>

						<section className="home-worlds" data-tier="featured" aria-label="The worlds of Xalia">
							<div className="home-worlds-grid">
								{planets.map((planet) => {
									const element = (planet.data && planet.data.Type) || '';
									return (
										<Link
											key={planet.name}
											to={routeFor('world', planet.name.toLowerCase())}
											className={`g-card-link home-world-tile g-el-${element.toLowerCase()}`}>
											<span className="home-world-tab" aria-hidden="true"></span>
											<span className="g-legend-v4 home-world-name">{planet.name}</span>
											<span className="g-chip home-world-chip">{element}</span>
										</Link>
									);
								})}
							</div>
						</section>
					</section>

					<section className="home-destinations">
						<div className="g-panel home-generator">
							<span className="g-legend-v4">Generator</span>
							<p className="g-body-v4 home-generator-copy">
								Print a new Xalian from a Scrambler Token and keep it to your account. No two genomes come out the same.
							</p>
						</div>
						<div className="home-destination-list">
							{DESTINATIONS.map((d) => (
								<Link key={d.name} to={d.to} className="g-card-link home-destination-row">
									<span className="g-legend-v4">{d.name}</span>
									<span className="g-small-v4">{d.copy}</span>
								</Link>
							))}
						</div>
					</section>
				</div>
			</main>
		);
	}
}

export default Home;
