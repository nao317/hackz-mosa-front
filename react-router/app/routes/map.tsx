import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { MapPin, Music2, Save, Trash2 } from "lucide-react";
import type { LatLngTuple } from "leaflet";

import SearchSpace from "../components/atoms/SearchSpace";
import MapPoint from "../components/molecules/MapPoint";
import SearchSongs from "../components/molecules/SearchSongs";
import Sidebar from "../components/molecules/Sidebar";
import type { Location } from "../features/Geolocation/Location";
import type { PlayableTrack } from "../features/audius/audius";
import { searchAudiusTracks } from "../features/audius/audius.client";
import {
	findMappingAtLocation,
	getAreaPlaybackTransition,
} from "../features/map-mappings/geometry";
import {
	createMapMapping,
	deleteMapMapping,
	listMapMappings,
	type GeoPoint,
	type MapMapping,
} from "../features/map-mappings/map-mapping-api";
import styles from "./map.module.css";

type AccessState =
	| { status: "loading" }
	| { status: "ready" }
	| { status: "error"; message: string };

function toGeoPoints(area: LatLngTuple[]): GeoPoint[] {
	const points =
		area.length > 1 &&
		area[0][0] === area.at(-1)?.[0] &&
		area[0][1] === area.at(-1)?.[1]
			? area.slice(0, -1)
			: area;
	return points.map(([latitude, longitude]) => ({ latitude, longitude }));
}

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

export default function MapPage() {
	const audioRef = useRef<HTMLAudioElement>(null);
	const previousActiveMappingIdRef = useRef<number | null>(null);
	const pendingAutoPlayIdRef = useRef<number | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [accessState, setAccessState] = useState<AccessState>({ status: "loading" });
	const [query, setQuery] = useState("");
	const [tracks, setTracks] = useState<PlayableTrack[]>([]);
	const [selectedTrack, setSelectedTrack] = useState<PlayableTrack>();
	const [area, setArea] = useState<LatLngTuple[]>([]);
	const [resetSelectionKey, setResetSelectionKey] = useState(0);
	const [location, setLocation] = useState<Location>();
	const [mappings, setMappings] = useState<MapMapping[]>([]);
	const [nowPlaying, setNowPlaying] = useState<MapMapping>();
	const [isPlaying, setIsPlaying] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [deletingMappingId, setDeletingMappingId] = useState<number>();
	const [searchError, setSearchError] = useState<string>();
	const [operationMessage, setOperationMessage] = useState<string>();
	const [playbackMessage, setPlaybackMessage] = useState(
		"登録エリアへの入場を待っています。",
	);
	const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
	const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

	useEffect(() => {
		let active = true;
		void listMapMappings()
			.then((loadedMappings) => {
				if (active) {
					setMappings(loadedMappings);
					setAccessState({ status: "ready" });
				}
			})
			.catch((error: unknown) => {
				if (active) {
					setAccessState({
						status: "error",
						message: getErrorMessage(
							error,
							"マッピング機能を利用するにはログインしてください。",
						),
					});
				}
			});
		return () => {
			active = false;
		};
	}, []);

	const activeMapping = useMemo(
		() => findMappingAtLocation(location, mappings),
		[location, mappings],
	);

	useEffect(() => {
		const activeMappingId = activeMapping?.id ?? null;
		const transition = getAreaPlaybackTransition(
			previousActiveMappingIdRef.current,
			activeMappingId,
		);
		if (!transition.changed) {
			return;
		}

		const audio = audioRef.current;
		audio?.pause();
		if (audio) {
			audio.currentTime = 0;
		}
		setIsPlaying(false);
		previousActiveMappingIdRef.current = activeMappingId;

		if (!activeMapping || !transition.shouldStart) {
			pendingAutoPlayIdRef.current = null;
			setNowPlaying(undefined);
			setPlaybackMessage("登録エリアへの入場を待っています。");
			return;
		}

		pendingAutoPlayIdRef.current = activeMapping.id;
		setNowPlaying(activeMapping);
		setPlaybackMessage(`「${activeMapping.track.title}」を準備しています。`);
	}, [activeMapping]);

	async function handleSearch(nextQuery: string) {
		setQuery(nextQuery);
		setIsSearching(true);
		setSearchError(undefined);
		setOperationMessage(undefined);
		try {
			setTracks(await searchAudiusTracks(nextQuery));
		} catch (error: unknown) {
			setTracks([]);
			setSearchError(getErrorMessage(error, "曲の検索に失敗しました。"));
		} finally {
			setIsSearching(false);
		}
	}

	async function handleRegister() {
		if (!selectedTrack || area.length < 4 || isRegistering) {
			return;
		}
		setIsRegistering(true);
		setOperationMessage(undefined);
		try {
			const mapping = await createMapMapping(toGeoPoints(area), selectedTrack);
			setMappings((current) => [mapping, ...current]);
			setSelectedTrack(undefined);
			setArea([]);
			setResetSelectionKey((key) => key + 1);
			setOperationMessage(`「${mapping.track.title}」を地図に登録しました。`);
		} catch (error: unknown) {
			setOperationMessage(
				getErrorMessage(error, "エリアと曲を登録できませんでした。"),
			);
		} finally {
			setIsRegistering(false);
		}
	}

	async function handleDelete(mapping: MapMapping) {
		if (
			deletingMappingId ||
			!window.confirm(`「${mapping.track.title}」の登録エリアを削除しますか？`)
		) {
			return;
		}
		setDeletingMappingId(mapping.id);
		setOperationMessage(undefined);
		try {
			await deleteMapMapping(mapping.id);
			setMappings((current) =>
				current.filter((item) => item.id !== mapping.id),
			);
			setOperationMessage("登録エリアを削除しました。");
		} catch (error: unknown) {
			setOperationMessage(
				getErrorMessage(error, "登録エリアを削除できませんでした。"),
			);
		} finally {
			setDeletingMappingId(undefined);
		}
	}

	function handleCanPlay(audio: HTMLAudioElement) {
		if (!nowPlaying || pendingAutoPlayIdRef.current !== nowPlaying.id) {
			return;
		}
		pendingAutoPlayIdRef.current = null;
		void audio.play().catch(() => {
			setPlaybackMessage(
				"自動再生がブロックされました。再生ボタンを押してください。",
			);
		});
	}

	return (
		<div className={styles.layout}>
			<Sidebar isOpen={isSidebarOpen} onOpen={openSidebar} onClose={closeSidebar} />
			<main className={styles.page}>
				<header className={styles.header}>
					<MapPin aria-hidden="true" size={22} />
					<div>
						<h1>曲のマッピング</h1>
						<p>場所に曲を登録し、入場時に一度だけ再生します。</p>
					</div>
				</header>

				{accessState.status === "loading" && (
					<p className={styles.status} aria-live="polite">
						ログイン状態と登録エリアを確認しています。
					</p>
				)}

				{accessState.status === "error" && (
					<section className={styles.accessError} role="alert">
						<p>{accessState.message}</p>
						<Link to="/mypage">マイページでログイン</Link>
					</section>
				)}

				{accessState.status === "ready" && (
					<>
						<SearchSpace
							value={query}
							onChange={setQuery}
							onSubmit={handleSearch}
							onVoiceResult={setQuery}
							placeholder="範囲内で流す曲を検索"
						/>
						<SearchSongs
							tracks={tracks}
							isLoading={isSearching}
							errorMessage={searchError}
							selectedTrackId={selectedTrack?.id}
							onSelect={setSelectedTrack}
						/>

						<MapPoint
							onAreaChange={setArea}
							onLocationChange={setLocation}
							registeredMappings={mappings}
							activeMappingId={activeMapping?.id}
							resetSelectionKey={resetSelectionKey}
						/>

						<div className={styles.selectionBar}>
							<div>
								<strong>{selectedTrack?.title ?? "曲を選択してください"}</strong>
								<span>
									{selectedTrack?.artist ??
										(area.length >= 4
											? "次に検索結果から曲を選択します。"
											: "地図に3点以上を指定して範囲を作成します。")}
								</span>
							</div>
							<button
								type="button"
								disabled={!selectedTrack || area.length < 4 || isRegistering}
								onClick={() => void handleRegister()}
							>
								<Save aria-hidden="true" size={18} />
								{isRegistering ? "登録中" : "登録"}
							</button>
						</div>

						<p className={styles.locationStatus} aria-live="polite">
							{activeMapping
								? `現在地は「${activeMapping.track.title}」の登録エリア内です。`
								: "現在地は登録エリアの外です。自動再生は待機中です。"}
						</p>

						{nowPlaying && (
							<section className={styles.player} aria-label="エリアの楽曲プレイヤー">
								<div className={styles.nowPlaying}>
									{nowPlaying.track.artworkUrl ? (
										<img src={nowPlaying.track.artworkUrl} alt="" />
									) : (
										<span><Music2 aria-hidden="true" size={24} /></span>
									)}
									<div>
										<strong>{nowPlaying.track.title}</strong>
										<span>{nowPlaying.track.artist}</span>
									</div>
								</div>
								<audio
									ref={audioRef}
									key={nowPlaying.id}
									controls
									preload="metadata"
									src={nowPlaying.track.streamUrl}
									onCanPlay={(event) => handleCanPlay(event.currentTarget)}
									onPlay={() => {
										setIsPlaying(true);
										setPlaybackMessage("登録エリアの曲を再生しています。");
									}}
									onPause={() => setIsPlaying(false)}
									onEnded={() => {
										setIsPlaying(false);
										setPlaybackMessage(
											"再生が完了しました。エリアを出るまで自動再生しません。",
										);
									}}
									onError={() => {
										setIsPlaying(false);
										setPlaybackMessage("登録された曲を再生できませんでした。");
									}}
								/>
								<p aria-live="polite" data-playing={isPlaying}>{playbackMessage}</p>
							</section>
						)}

						{operationMessage && (
							<p className={styles.operationMessage} role="status">
								{operationMessage}
							</p>
						)}

						<section className={styles.registeredAreas}>
							<h2>登録したエリア</h2>
							{mappings.length === 0 ? (
								<p>登録したエリアはありません。</p>
							) : (
								<ul>
									{mappings.map((mapping) => (
										<li key={mapping.id} data-active={mapping.id === activeMapping?.id}>
											<div>
												<strong>{mapping.track.title}</strong>
												<span>{mapping.track.artist}</span>
											</div>
											<button
												type="button"
												title="登録エリアを削除"
												aria-label={`${mapping.track.title}の登録エリアを削除`}
												disabled={Boolean(deletingMappingId)}
												onClick={() => void handleDelete(mapping)}
											>
												<Trash2 aria-hidden="true" size={18} />
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					</>
				)}
			</main>
		</div>
	);
}
