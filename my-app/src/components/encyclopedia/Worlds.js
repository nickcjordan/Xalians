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

            <div className="enc-grid">
                {worlds.map((world) => (
                    <Link
                        key={world.key}
                        to={lore.routeFor('world', world.key)}
                        className={`g-tile g-el-${world.element} enc-worlds-tile`}
                    >
                        <div className="g-specimen enc-worlds-mount">
                            <div className="g-specimen-inner">
                                <img
                                    src={`/${world.images.planet}`}
                                    alt={`${world.name} globe`}
                                    className="enc-worlds-globe"
                                />
                            </div>
                        </div>
                        <div className="g-tile-meta">
                            <span className="g-tile-name">{world.name}</span>
                        </div>
                        <div className="g-tile-meta enc-worlds-sub">
                            <span className="g-chip">{world.element}</span>
                            <span className="g-tile-id enc-worlds-terrain">{world.physical.terrainLabel}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
