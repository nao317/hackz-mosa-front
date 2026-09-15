import { useCallback, useEffect, useState } from "react";
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
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [tracks, setTracks] = useState<PlayableTrack[]>([]);
	const [area, setArea] = useState<LatLngTuple[]>([]);
	const [location, setLocation] = useState<Location>();
	const [isInside, setIsInside] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
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
				onSelect={(track) => {
					navigate("/", { state: { selectedTrack: track } });
				}}
			/>
			<MapPoint
				onAreaChange={handleAreaChange}
				onLocationChange={handleLocationChange}
			/>
			<p aria-live="polite">
				現在地の範囲を地図で指定できます。
				{isInside ? " 現在地は範囲内です。" : ""}
			</p>
			</main>
		</div>
	);
}
