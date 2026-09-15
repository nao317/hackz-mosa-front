import type { PlayableTrack } from "../../features/audius/audius";
import styles from "./SearchSongs.module.css";

type SearchSongsProps = {
	tracks: PlayableTrack[];
	isLoading?: boolean;
	errorMessage?: string;
	selectedTrackId?: string;
	onSelect?: (track: PlayableTrack) => void;
};

export default function SearchSongs({
	tracks,
	isLoading = false,
	errorMessage,
	selectedTrackId,
	onSelect,
}: SearchSongsProps) {
	if (isLoading) {
		return <p className={styles.message}>曲を検索しています。</p>;
	}

	if (errorMessage) {
		return (
			<p className={styles.message} role="alert">
				{errorMessage}
			</p>
		);
	}

	if (tracks.length === 0) {
		return <p className={styles.message}>検索結果がありません。</p>;
	}

	return (
		<ul className={styles.list}>
			{tracks.map((track) => (
				<li className={styles.item} key={track.id}>
					<button
						type="button"
						className={styles.selectButton}
						aria-pressed={selectedTrackId === track.id}
						onClick={() => onSelect?.(track)}
					>
						{track.artworkUrl && (
							<img
								className={styles.artwork}
								src={track.artworkUrl}
								alt=""
							/>
						)}
						<span className={styles.details}>
							<strong>{track.title}</strong>
							<span>{track.artist}</span>
						</span>
						{selectedTrackId === track.id ? "選択中" : "この曲を選択"}
					</button>
				</li>
			))}
		</ul>
	);
}
