// Tier: chrome. The front door: the splash, the fourteen worlds and a
// species strip as featured components, and the site's five destinations.
import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated';
import XalianImage from '../components/xalianImage';
import { routeFor } from '../lore/routeFor';
import * as lore from '../lore';
import species from '../json/species.json';

const FEATURED_SPECIES_COUNT = 8;

function pickRandomSpecies() {
	const pool = [...species];
	const picked = [];
	while (pool.length && picked.length < FEATURED_SPECIES_COUNT) {
		const index = Math.floor(Math.random() * pool.length);
		picked.push(pool.splice(index, 1)[0]);
	}
	return picked;
}

const DESTINATIONS = [
	{
		name: 'Generator',
		copy: 'Print a new Xalian from a Scrambler Token and keep it to your account.',
		to: '/generator',
	},
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
	state = {
		featuredSpecies: pickRandomSpecies(),
	};

	render() {
		const worlds = lore.getWorlds();
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
								{worlds.map((world) => (
									<Link
										key={world.key}
										to={routeFor('world', world.key)}
										className={`g-card-link home-world-tile g-el-${world.element}`}>
										<div className="home-world-art">
											<img
												src={`/${world.images.planet}`}
												alt={`${world.name} globe`}
												className="home-world-art-img"
											/>
										</div>
										<span className="g-legend-v4 home-world-name">{world.name}</span>
										<span className="g-chip home-world-chip">{world.element}</span>
									</Link>
								))}
							</div>
						</section>
					</section>

					<section className="home-species" data-tier="featured" aria-label="Featured Xalians">
						<div className="home-species-strip">
							{this.state.featuredSpecies.map((s) => (
								<Link
									key={s.id || s.name}
									to={routeFor('species', s.name.toLowerCase())}
									className={`g-card-link home-species-tile g-el-${s.type.toLowerCase()}`}>
									<div className="home-species-plate">
										<XalianImage
											colored
											speciesName={s.name}
											primaryType={s.type}
											moreClasses="home-species-plate-img" />
									</div>
									<span className="g-legend-v4 home-species-name">{s.name}</span>
								</Link>
							))}
						</div>
					</section>

					<section className="home-destinations">
						<div className="home-destination-list">
							{DESTINATIONS.map((d) => (
								<Link key={d.name} to={d.to} className="home-destination-row">
									<span className="g-h3 home-destination-name">{d.name}</span>
									<span className="g-small-v4 home-destination-copy">{d.copy}</span>
									<span className="g-link home-destination-open">Open</span>
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
