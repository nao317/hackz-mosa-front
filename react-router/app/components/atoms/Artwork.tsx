type ArtworkProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function Artwork({ src, alt, className }: ArtworkProps) {
  return <img className={className} src={src} alt={alt} />;
}
