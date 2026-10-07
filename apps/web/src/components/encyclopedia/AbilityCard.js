import React from 'react';
import { SpecPlate } from '@/components/system/record';
import { Term } from '@/components/system/term';
import { Card } from '@/components/ui/card';

/**
 * One v5 action or passive as a card: kicker, name, description and its
 * fields. Takes the flattened shape lore.buildAbility returns, so the
 * encyclopedia's species page (a template's guaranteed abilities, intensity
 * as a band) and the registry's record view (one creature's four actions and
 * passives, intensity as its rolled number) render abilities the same way.
 */

function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function bodyValue(value) {
    return <span className="font-body normal-case tracking-normal text-ink">{value}</span>;
}

/**
 * Humanizes an ability field's raw registry value into visitor-facing
 * prose, per the ratified vocabulary map for the ability fields
 * (activation, delivery, range, element, instrument). Falls
 * back to capitalizing the first letter for anything not in the map.
 */
const ABILITY_VALUE_MAP = {
    ongoing: 'Ongoing',
    discrete: 'Single act',
    single: 'Single act',
    contact: 'By contact',
    projectile: 'Projectile',
    area: 'Over an area',
    restrain: 'Restrain',
    ranged: 'At range',
    self: 'On itself',
    touch: 'By touch',
    line: 'In a line',
    burst: 'In a burst',
    stream: 'As a stream',
    pulse: 'As a pulse',
    field: 'As a field',
    signal: 'As a signal',
};

const ELEMENT_NAMES = new Set([
    'fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
    'chemical', 'air', 'psychic', 'ice', 'metal', 'sand',
]);

function humanizeAbilityValue(value) {
    if (!value) return value;
    const key = String(value).toLowerCase();
    if (ABILITY_VALUE_MAP[key]) return ABILITY_VALUE_MAP[key];
    if (ELEMENT_NAMES.has(key)) return capitalize(key);
    return capitalize(String(value));
}

const ABILITY_FIELD_GLOSSES = {
    Instrument: 'The body part or channel the ability works through.',
    Activation: 'How it fires: a single act, ongoing while held, or set off by something done to it.',
    Delivery: 'How it reaches its target: by contact, as a projectile, a stream, a pulse, a field or a signal.',
    Range: 'How far it reaches.',
    Effects: 'What it does.',
    Element: 'The element it works through.',
    Intensity: 'Strength of each effect. 50 is a standard reference and values above 100 are allowed. A species shows its range; one creature shows its number.',
};

function abilityKicker(ability) {
    if (ability.signature) return ability.kind === 'passive' ? 'Signature passive' : 'Signature ability';
    // A generated record's drawn actions are the ones its species does not always have.
    if (ability.guaranteed === false) return ability.kind === 'passive' ? 'Passive' : 'Drawn action';
    return ability.kind === 'passive' ? 'Guaranteed passive' : 'Guaranteed action';
}

export default function AbilityCard({ ability }) {
    const field = (label, value) => (value
        ? { key: <Term definition={ABILITY_FIELD_GLOSSES[label]}>{label}</Term>, value: bodyValue(humanizeAbilityValue(value)) }
        : null);
    return (
        <Card variant="panel" className="p-4">
            <p className="type-legend m-0">{abilityKicker(ability)}</p>
            <p className="type-subhead m-0">{ability.name}</p>
            <p className="m-0 font-body text-body text-ink">{ability.description}</p>
            <SpecPlate
                columns={2}
                entries={[
                    field('Instrument', ability.instrument),
                    field('Activation', ability.activation),
                    field('Delivery', ability.delivery),
                    field('Range', ability.range),
                    field('Effects', ability.effects),
                    field('Element', ability.element),
                    field('Intensity', ability.intensity),
                ].filter(Boolean)}
            />
        </Card>
    );
}
