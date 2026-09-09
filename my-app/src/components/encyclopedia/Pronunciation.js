import React from 'react';

/**
 * Pronunciation: the respelled reading of a coined name, printed under the
 * designation the way a reference work prints it. Renders nothing when an
 * entry carries no pronunciation -- transparent English names (Death Tide,
 * Drilltail) are deliberately left unmarked rather than respelled to no
 * purpose.
 *
 * The respelling is what a reader needs; the IPA rides along in the data for
 * anything that wants it (a future audio pass, a screen reader) and is
 * exposed here only as the title attribute.
 */
export default function Pronunciation({ pronunciation }) {
    if (!pronunciation || !pronunciation.respelling) return null;

    return (
        <p data-slot="pronunciation" className="type-data m-0 mt-0.5 text-small tracking-wide text-ink-2" title={pronunciation.ipa || undefined}>
            {pronunciation.respelling}
        </p>
    );
}
