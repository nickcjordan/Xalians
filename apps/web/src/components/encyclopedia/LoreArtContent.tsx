// Tier: featured. Artwork metadata loads only with illustrated record content.
import artwork from '@xalians/content/loreArtwork.json';
import WorldArt from './WorldArt';

export default function LoreArtContent({ kind, recordKey }: { kind: 'entries' | 'beats' | 'paragraphs'; recordKey: string }) {
    const index = artwork[kind] as Record<string, keyof typeof artwork.images>;
    const imageKey = index[recordKey];
    if (!imageKey) return null;
    return (
        <div className="my-5 min-w-0" data-tier="featured" data-lore-art={imageKey}>
            <WorldArt art={artwork.images[imageKey]} />
        </div>
    );
}
