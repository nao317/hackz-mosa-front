import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
  Plus,
} from "lucide-react";
import { useLocation } from "react-router";

import Artwork from "../components/atoms/Artwork";
import AutoPlayToggle from "../components/atoms/AutoPlayToggle";
import type { FeedbackValue } from "../components/atoms/FeedbackButton";
import ImageRecognation from "../components/atoms/ImageRecognation";
import SoundRecognation from "../components/atoms/SoundRecognation";
import Slider from "../components/atoms/Slider";
import PlayButtons from "../components/molecules/PlayButtons";
import Sidebar from "../components/molecules/Sidebar";
import {
  getSelectedTrackFromNavigation,
  type PlayableTrack,
} from "../features/audius/audius";
import { searchAudiusTracks } from "../features/audius/audius.client";
import { getRecommendationQueries } from "../features/audius/recommendation";
import { usePlayback } from "../features/playback/PlaybackProvider";
import {
  listPlaylists,
  addPlaylistTrack,
  type Playlist,
} from "../features/playlists/playlist-api";
import {
  getTrackFeedback,
  updateTrackFeedback,
} from "../features/feedback/feedback-storage";
import {
  fetchMunicipalityName,
  startLocationPolling,
  type Location,
} from "../features/Geolocation/Location";
import {
  fetchWeather,
  type WeatherSnapshot,
} from "../features/Geolocation/Weather";
import styles from "./home.module.css";

export function meta() {
  return [
    { title: "Home" },
    {
      name: "description",
      content: "天気と時間帯に合わせて音楽を再生します。",
    },
  ];
}

type TrackLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; track: PlayableTrack }
  | { status: "error"; message: string };

type WeatherState = WeatherSnapshot | { message: string };

function createClockFormatter(timeZone?: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
}

function getWeatherIcon(weatherCode: number, isDay: boolean): LucideIcon {
  if (weatherCode === 0) {
    return isDay ? Sun : CloudMoon;
  }
  if (weatherCode === 1 || weatherCode === 2) {
    return isDay ? CloudSun : Cloud;
  }
  if (weatherCode === 3) {
    return Cloud;
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return CloudFog;
  }
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
      weatherCode,
    )
  ) {
    return CloudRain;
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return CloudSnow;
  }
  if ([95, 96, 99].includes(weatherCode)) {
    return CloudLightning;
  }
  return Cloud;
}

export default function Home() {
  const location = useLocation();
  const selectedTrack = getSelectedTrackFromNavigation(location.state);
  const { track: playbackTrack, queue: playbackQueue, index: playbackIndex, isPlaying, currentTime, duration, autoPlay: isAutoPlayEnabled, setQueue, selectTrack, toggle, seek, setAutoPlay } = usePlayback();
  const activeTrackRef = useRef<PlayableTrack | undefined>(undefined);
  const [weatherData, setWeatherData] = useState<WeatherState | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(
    null,
  );
  const [municipalityName, setMunicipalityName] = useState<string | null>(null);
  const [state, setState] = useState<TrackLoadState>(() =>
    selectedTrack
      ? { status: "ready", track: selectedTrack }
      : { status: "loading" },
  );
  const [recommendationTracks, setRecommendationTracks] = useState<PlayableTrack[]>([]);
  const [recommendationRequestId, setRecommendationRequestId] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [clockTime, setClockTime] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const [playlistMessage, setPlaylistMessage] = useState<string | null>(null);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const weatherSnapshot =
    weatherData && "temperatureC" in weatherData ? weatherData : undefined;
  const clockFormatter = useMemo(
    () => createClockFormatter(weatherSnapshot?.timeZone),
    [weatherSnapshot?.timeZone],
  );
  const recommendationQueries = useMemo(
    () =>
      weatherData === null
        ? []
        : getRecommendationQueries(weatherSnapshot, new Date()),
    [weatherData, weatherSnapshot],
  );
  const recommendationKey = recommendationQueries.join("|");

  useEffect(() => {
    if (playbackTrack) {
      activeTrackRef.current = playbackTrack;
      setFeedback(getTrackFeedback(playbackTrack.id));
      setState({ status: "ready", track: playbackTrack });
    } else {
      activeTrackRef.current = undefined;
    }
  }, [playbackTrack]);

  useEffect(() => {
    return startLocationPolling(
      (locationSnapshot) => {
        setCurrentLocation(locationSnapshot);
        void fetchWeather(locationSnapshot)
          .then(setWeatherData)
          .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            setWeatherData({
              message:
                error instanceof Error
                  ? error.message
                  : "天気情報を取得できませんでした。",
            });
          });
      },
      (error) => setWeatherData({ message: error.message }),
    );
  }, []);

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    const controller = new AbortController();
    setMunicipalityName(null);

    void fetchMunicipalityName(currentLocation, controller.signal)
      .then(setMunicipalityName)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMunicipalityName(null);
        }
      });

    return () => controller.abort();
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    function updateClockTime() {
      setClockTime(clockFormatter.format(new Date()));
    }

    updateClockTime();
    const intervalId = window.setInterval(updateClockTime, 1_000);
    return () => window.clearInterval(intervalId);
  }, [clockFormatter]);

  useEffect(() => {
    if (!isPlaylistMenuOpen) {
      return;
    }
    void listPlaylists()
      .then(setPlaylists)
      .catch((error: unknown) => {
        setPlaylistMessage(
          error instanceof Error
            ? error.message
            : "プレイリストを取得できませんでした。",
        );
      });
  }, [isPlaylistMenuOpen]);

  async function addCurrentTrackToPlaylist(playlist: Playlist) {
    if (!playbackTrack) {
      return;
    }
    try {
      await addPlaylistTrack(playlist.id, playbackTrack);
      setPlaylistMessage(`「${playlist.name}」に追加しました。`);
      setIsPlaylistMenuOpen(false);
    } catch (error: unknown) {
      setPlaylistMessage(
        error instanceof Error ? error.message : "曲を追加できませんでした。",
      );
    }
  }

  useEffect(() => {
    if (!selectedTrack && playbackTrack) {
      return;
    }

    if ((!isAutoPlayEnabled && !selectedTrack) || !recommendationKey) {
      return;
    }

    const controller = new AbortController();
    if (!selectedTrack) {
      setState({ status: "loading" });
    }
    setPlaybackError(null);

    void (async () => {
      const tracksById = new Map<string, PlayableTrack>();
      for (const query of recommendationQueries) {
        const tracks = await searchAudiusTracks(query, controller.signal);
        for (const track of tracks) {
          tracksById.set(track.id, track);
        }
        if (tracksById.size >= 20) {
          break;
        }
      }
      return [...tracksById.values()].slice(0, 20);
    })()
      .then((tracks) => {
        if (controller.signal.aborted) {
          return;
        }
        if (tracks.length === 0) {
          throw new Error("再生できる候補が見つかりませんでした。");
        }

        const nextTracks = selectedTrack
          ? [
              selectedTrack,
              ...tracks.filter((track) => track.id !== selectedTrack.id),
            ]
          : tracks;
        setRecommendationTracks(nextTracks);
        setQueue(nextTracks, 0, true);
        setState({
          status: "ready",
          track: selectedTrack ?? nextTracks[0],
        });
        setFeedback(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          if (!selectedTrack) {
            setState({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "楽曲候補を取得できませんでした。",
            });
          }
        }
      });

    return () => controller.abort();
  }, [
    isAutoPlayEnabled,
    playbackTrack,
    recommendationKey,
    recommendationRequestId,
    selectedTrack,
  ]);

  function resetPlaybackState() {
    setPlaybackError(null);
    setFeedback(null);
  }

  const handleFeedbackChange = useCallback((value: FeedbackValue | null) => {
    const track = activeTrackRef.current;
    if (!track) {
      return;
    }
    updateTrackFeedback(track, value);
    setFeedback(value);
  }, []);

  function selectRecommendation(nextIndex: number) {
    const nextTrack = recommendationTracks[nextIndex];
    if (!nextTrack) {
      return;
    }

    resetPlaybackState();
    selectTrack(recommendationTracks[nextIndex], true);
    setState({ status: "ready", track: nextTrack });
  }

  function handlePrevious() {
    if (playbackQueue.length === 0) {
      return;
    }
    const nextIndex =
      (playbackIndex - 1 + playbackQueue.length) % playbackQueue.length;
    selectRecommendation(nextIndex);
  }

  function handleNext() {
    if (playbackQueue.length === 0) {
      return;
    }
    const nextIndex = (playbackIndex + 1) % playbackQueue.length;
    selectRecommendation(nextIndex);
  }

  function handleAutoPlayChange(enabled: boolean) {
    setAutoPlay(enabled);
    if (enabled) {
      setRecommendationRequestId((id) => id + 1);
    } else {
      setState((current) =>
        current.status === "loading" || current.status === "error"
          ? { status: "idle" }
          : current,
      );
    }
  }

  const handlePlayPause = useCallback(() => {
    setPlaybackError(null);
    toggle();
  }, []);

  function handleSeek(nextTime: number) {
    seek(nextTime);
  }

  const playbackDuration =
    state.status === "ready"
      ? duration || state.track.durationSeconds || 1
      : 1;
  const canNavigateRecommendations = recommendationTracks.length > 1;

  return (
    <div className={styles.appShell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={openSidebar}
        onClose={closeSidebar}
      />
      <main className={styles.page}>
        <h1 className={styles.visuallyHidden}>Home</h1>
        <SoundRecognation onSnap={handlePlayPause} />
        <div className={styles.autoModeControl}>
          <AutoPlayToggle
            checked={isAutoPlayEnabled}
            onChange={handleAutoPlayChange}
          />
        </div>

        {state.status === "idle" && (
          <p className={styles.statusMessage}>自動再生はOFFです。</p>
        )}

        {state.status === "loading" && (
          <p className={styles.statusMessage}>楽曲候補を取得しています。</p>
        )}

        {state.status === "error" && (
          <section className={styles.errorMessage} aria-live="polite">
            <p>楽曲候補を取得できませんでした。</p>
            <pre>{state.message}</pre>
            <button
              type="button"
              onClick={() => setRecommendationRequestId((id) => id + 1)}
            >
              再試行
            </button>
          </section>
        )}

        {state.status === "ready" && (
          <section className={styles.player}>
            <div className={styles.clockArea}>
              {municipalityName && (
                <p className={styles.municipalityName}>{municipalityName}</p>
              )}
              {clockTime && (
                <time
                  className={styles.clockTime}
                  dateTime={clockTime}
                  aria-label={`現在時刻 ${clockTime}`}
                >
                  {clockTime}
                </time>
              )}
            </div>

            {weatherData && "message" in weatherData ? (
              <p className={styles.weatherError} role="status">
                {weatherData.message}
              </p>
            ) : weatherSnapshot ? (
              (() => {
                const WeatherIcon = getWeatherIcon(
                  weatherSnapshot.weatherCode,
                  weatherSnapshot.isDay,
                );
                return (
                  <div
                    className={styles.weatherIcon}
                    role="img"
                    aria-label={
                      weatherSnapshot.isDay ? "昼の天気" : "夜の天気"
                    }
                  >
                    <WeatherIcon
                      aria-hidden="true"
                      size={40}
                      strokeWidth={1.8}
                    />
                  </div>
                );
              })()
            ) : (
              <div
                className={styles.weatherIcon}
                aria-label="天気情報を取得しています。"
              >
                <Cloud aria-hidden="true" size={32} strokeWidth={1.8} />
              </div>
            )}

            <div className={styles.artworkFrame}>
              {state.track.artworkUrl ? (
                <Artwork
                  className={styles.artwork}
                  src={state.track.artworkUrl}
                  alt={`${state.track.title}のアートワーク`}
                />
              ) : (
                <div className={styles.artworkPlaceholder}>No artwork</div>
              )}
            </div>

            <div className={styles.progress}>
              <Slider
                min={0}
                max={playbackDuration}
                step={1}
                value={Math.min(currentTime, playbackDuration)}
                label="再生位置"
                onChange={handleSeek}
                showValue={false}
              />
            </div>

            <div className={styles.trackInfo}>
              <h2 className={styles.trackTitle}>
                {state.track.audiusUrl ? (
                  <a
                    href={state.track.audiusUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {state.track.title}
                  </a>
                ) : (
                  state.track.title
                )}
              </h2>
              <p className={styles.artist}>{state.track.artist}</p>
              <button
                className={styles.addPlaylistButton}
                type="button"
                aria-label="プレイリストに追加"
                title="プレイリストに追加"
                onClick={() => {
                  setPlaylistMessage(null);
                  setIsPlaylistMenuOpen((open) => !open);
                }}
              >
                <Plus aria-hidden="true" size={20} />
              </button>
            </div>
            {isPlaylistMenuOpen && (
              <div className={styles.playlistMenu} role="dialog" aria-label="プレイリストに追加">
                <strong>追加先を選択</strong>
                {playlists.length === 0 ? (
                  <p>プレイリストがありません。</p>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      type="button"
                      key={playlist.id}
                      onClick={() => void addCurrentTrackToPlaylist(playlist)}
                    >
                      {playlist.name}
                    </button>
                  ))
                )}
                {playlistMessage && <p role="status">{playlistMessage}</p>}
              </div>
            )}

            <PlayButtons
              isPlaying={isPlaying}
              onToggle={handlePlayPause}
              feedback={feedback}
              onFeedbackChange={handleFeedbackChange}
              onPrevious={
                canNavigateRecommendations ? handlePrevious : undefined
              }
              onNext={canNavigateRecommendations ? handleNext : undefined}
            />

            <ImageRecognation onGesture={handleFeedbackChange} />

            {playbackError && (
              <p className={styles.playbackError} role="alert">
                {playbackError}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
