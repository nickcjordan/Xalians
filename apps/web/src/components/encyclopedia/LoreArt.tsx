// Tier: featured. Selected illustrations accompany the passage they explain.
import { lazy, Suspense } from 'react';

const LoreArtContent = lazy(() => import('./LoreArtContent'));

export default function LoreArt({ kind, recordKey }: { kind: 'entries' | 'beats' | 'paragraphs'; recordKey: string }) {
    return (
        <Suspense fallback={null}>
            <LoreArtContent kind={kind} recordKey={recordKey} />
        </Suspense>
    );
}
