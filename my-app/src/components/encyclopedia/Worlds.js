import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import './Worlds.css';

function sentenceCase(text) {
    if (!text) return text;
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Worlds: the survey tile catalogue, fourteen worlds keyed by element, in
 * file order (planetRecords.json order, per contract). The masthead already
 * carries the section title and the "N worlds surveyed" count; this section
 * renders no heading of its own.
 * Contract: docs/design/xalian-encyclopedia-page.md §5 "Worlds and world".
 */
export default function Worlds() {
    const worlds = lore.getWorlds();

    return (
        <div className="enc-worlds">
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
                            <span className="enc-tile-sub enc-worlds-terrain">{sentenceCase(world.physical.terrainLabel)}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
