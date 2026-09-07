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
                        className={`g-paper g-paper--card g-el-${world.element} enc-worlds-card`}
                    >
                        <div className="g-paper-tabs">
                            <span className={`g-tab g-el-${world.element}`}>{world.element}</span>
                        </div>
                        <div className="g-plate--photo enc-worlds-mount">
                            <img
                                src={`/${world.images.planet}`}
                                alt={`${world.name} globe`}
                                className="enc-worlds-globe"
                            />
                        </div>
                        <span className="enc-worlds-card-name">{world.name}</span>
                        <span className="enc-worlds-card-terrain">{world.physical.terrainLabel}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
