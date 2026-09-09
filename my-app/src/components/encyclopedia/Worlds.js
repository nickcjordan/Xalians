import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import './Worlds.css';

/**
 * Worlds: the survey tile catalogue, fourteen worlds keyed by element, in
 * file order (planetRecords.json order, per contract).
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Worlds and world".
 */
export default function Worlds() {
    const worlds = lore.getWorlds();

    return (
        <div className="enc-worlds">
            <div className="enc-section-head">
                <h1 className="g-h2">Worlds</h1>
                <span className="enc-count">{worlds.length} surveyed</span>
            </div>

            <div className="enc-grid enc-card-grid">
                {worlds.map((world) => (
                    <Link
                        key={world.key}
                        to={lore.routeFor('world', world.key)}
                        className={`g-panel g-card-link g-el-${world.element} enc-tile`}
                    >
                        <div className="enc-tile-bar" />
                        <div className="enc-tile-art">
                            <img
                                src={`/${world.images.planet}`}
                                alt={`${world.name} globe`}
                                className="enc-tile-art-img"
                            />
                        </div>
                        <div className="enc-tile-meta">
                            <span className="g-h3 enc-tile-name">{world.name}</span>
                            <span className="g-mono enc-tile-sub">{world.physical.terrainLabel}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
