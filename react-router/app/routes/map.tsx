import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngTuple } from "leaflet";
import { useNavigate } from "react-router";

import SearchSpace from "../components/atoms/SearchSpace";
import MapPoint from "../components/molecules/MapPoint";
import SearchSongs from "../components/molecules/SearchSongs";
import Sidebar from "../components/molecules/Sidebar";
import type { Location } from "../features/Geolocation/Location";
import type { PlayableTrack } from "../features/audius/audius";
import { searchAudiusTracks } from "../features/audius/audius.client";
import styles from "./map.module.css";

function isInsideArea(location: Location, area: LatLngTuple[]) {
	if (area.length < 4) {
		return false;
	}

	const { latitude, longitude } = location;
	let isInside = false;

	for (
		let index = 0, previous = area.length - 1;
		index < area.length;
		previous = index++
	) {
		const [currentLatitude, currentLongitude] = area[index];
		const [previousLatitude, previousLongitude] = area[previous];
		const crossesLatitude =
			currentLatitude > latitude !== previousLatitude > latitude;
		const intersectionLongitude =
			((previousLongitude - currentLongitude) *
				(latitude - currentLatitude)) /
				(previousLatitude - currentLatitude) +
				currentLongitude;

		if (crossesLatitude && longitude < intersectionLongitude) {
			isInside = !isInside;
		}
	}

	return isInside;
}

export default function MapPage() {
	const navigate = useNavigate();
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [tracks, setTracks] = useState<PlayableTrack[]>([]);
	const [selectedTrack, setSelectedTrack] = useState<PlayableTrack>();
	const [area, setArea] = useState<LatLngTuple[]>([]);
	const [location, setLocation] = useState<Location>();
	const [isInside, setIsInside] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const [playbackError, setPlaybackError] = useState<string>();
	const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
	const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

	async function handleSearch(nextQuery: string) {
		setQuery(nextQuery);
		setIsLoading(true);
		setErrorMessage(undefined);

		try {
			setTracks(await searchAudiusTracks(nextQuery));
		} catch (error: unknown) {
			setTracks([]);
			setErrorMessage(
				error instanceof Error ? error.message : "曲の検索に失敗しました。",
			);
		} finally {
			setIsLoading(false);
		}
	}

	const handleAreaChange = useCallback((nextArea: LatLngTuple[]) => {
		setArea(nextArea);
	}, []);

	const handleLocationChange = useCallback(
		(nextLocation: Location) => {
			setLocation(nextLocation);
			setIsInside(isInsideArea(nextLocation, area));
		},
		[area],
	);

	useEffect(() => {
		if (location) {
			setIsInside(isInsideArea(location, area));
		}
	}, [area, location]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !selectedTrack) {
			return;
		}

		if (!isInside) {
			audio.pause();
			return;
		}

		void audio.play().catch((error: unknown) => {
			setPlaybackError(
				error instanceof Error
					? error.message
					: "自動再生できませんでした。再生ボタンを押してください。",
			);
		});
	}, [isInside, selectedTrack]);

	return (
		<div className={styles.layout}>
			<Sidebar
				isOpen={isSidebarOpen}
				onOpen={openSidebar}
				onClose={closeSidebar}
			/>
			<main className={styles.page}>
			<SearchSpace
				value={query}
				onChange={setQuery}
				onSubmit={handleSearch}
				placeholder="範囲内で流す曲を検索"
			/>
			<SearchSongs
				tracks={tracks}
				isLoading={isLoading}
				errorMessage={errorMessage}
				selectedTrackId={selectedTrack?.id}
				onSelect={(track) => {
					navigate("/", { state: { selectedTrack: track } });
				}}
			/>
			<MapPoint
				onAreaChange={handleAreaChange}
				onLocationChange={handleLocationChange}
			/>
			<p aria-live="polite">
				{selectedTrack
					? `${selectedTrack.title}を範囲内で再生します。`
					: "曲を選択すると、現在地が範囲内に入ったときに再生します。"}
				{isInside && selectedTrack ? " 現在地は範囲内です。" : ""}
			</p>
			{selectedTrack && (
				<div className={styles.player}>
					<strong>{selectedTrack.title}</strong>
					<audio
						ref={audioRef}
						controls
						src={selectedTrack.streamUrl}
						onError={() => setPlaybackError("曲を再生できませんでした。")}
					/>
					{playbackError && <p role="alert">{playbackError}</p>}
				</div>
			)}
			</main>
		</div>
	);
}
