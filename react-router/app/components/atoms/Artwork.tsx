type ArtworkProps = {
    src: string;
    alt: string;
};

export default function Artwork({ src, alt }: ArtworkProps) {
    return <img src={src} alt={alt} width="240" height="240" />;
}