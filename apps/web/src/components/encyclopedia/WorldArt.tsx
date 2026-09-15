// Tier: featured. Compact planet illustrations support the encyclopedia's story.
export type WorldArtwork = {
    src: string;
    small: string;
    thumbnail: string;
    title: string;
    alt: string;
    caption: string;
};

export default function WorldArt({ art, hero = false }: { art: WorldArtwork; hero?: boolean }) {
    return (
        <figure className="m-0 w-full min-w-0 max-w-[480px]" data-tier="featured">
            <img
                src={`/${art.small}`}
                srcSet={`/${art.thumbnail} 384w, /${art.small} 768w`}
                sizes="(min-width: 1000px) 480px, (min-width: 720px) 45vw, (min-width: 520px) 480px, calc(100vw - 48px)"
                width={768}
                height={512}
                alt={art.alt}
                loading={hero ? 'eager' : 'lazy'}
                fetchPriority={hero ? 'high' : 'auto'}
                decoding="async"
                className="aspect-[3/2] w-full object-cover"
            />
            <figcaption className="border-b border-edge py-3">
                <p className="type-subhead m-0">{art.title}</p>
                <p className="m-0 mt-1 font-body text-small text-ink-2">{art.caption}</p>
            </figcaption>
        </figure>
    );
}
