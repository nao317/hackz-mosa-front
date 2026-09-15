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
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeTrackRef = useRef<PlayableTrack | undefined>(undefined);
  const shouldStartPlaybackRef = useRef(Boolean(selectedTrack));
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
  const [recommendationTracks, setRecommendationTracks] = useState<
    PlayableTrack[]
  >([]);
  const [recommendationIndex, setRecommendationIndex] = useState(-1);
  const [recommendationRequestId, setRecommendationRequestId] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(
    () => !selectedTrack,
  );
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [clockTime, setClockTime] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    [clockTime, weatherData, weatherSnapshot],
  );
  const recommendationKey = recommendationQueries.join("|");

  useEffect(() => {
    if (state.status === "ready") {
      activeTrackRef.current = state.track;
      setFeedback(getTrackFeedback(state.track.id));
    } else {
      activeTrackRef.current = undefined;
    }
  }, [state.status, state.status === "ready" ? state.track.id : undefined]);

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
    if ((!isAutoPlayEnabled && !selectedTrack) || !recommendationKey) {
      return;
    }

    const controller = new AbortController();
    if (!selectedTrack) {
      setState({ status: "loading" });
    }
    setIsPlaying(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);

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
        shouldStartPlaybackRef.current = true;
        setRecommendationTracks(nextTracks);
        setRecommendationIndex(0);
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
    recommendationKey,
    recommendationRequestId,
    selectedTrack,
  ]);

  function resetPlaybackState() {
    setIsPlaying(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
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

    shouldStartPlaybackRef.current = true;
    resetPlaybackState();
    setRecommendationIndex(nextIndex);
    setState({ status: "ready", track: nextTrack });
  }

  function handlePrevious() {
    if (recommendationTracks.length === 0) {
      return;
    }
    const nextIndex =
      (recommendationIndex - 1 + recommendationTracks.length) %
      recommendationTracks.length;
    selectRecommendation(nextIndex);
  }

  function handleNext() {
    if (recommendationTracks.length === 0) {
      return;
    }
    const nextIndex = (recommendationIndex + 1) % recommendationTracks.length;
    selectRecommendation(nextIndex);
  }

  function handleAutoPlayChange(enabled: boolean) {
    shouldStartPlaybackRef.current = false;
    setIsAutoPlayEnabled(enabled);
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
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setPlaybackError(null);
    if (!audio.paused) {
      audio.pause();
      return;
    }

    void audio.play().catch((error: unknown) => {
      setIsPlaying(false);
      setPlaybackError(
        error instanceof Error ? error.message : "楽曲を再生できませんでした。",
      );
    });
  }, []);

  function handleSeek(nextTime: number) {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function handleCanPlay(audio: HTMLAudioElement) {
    if (!shouldStartPlaybackRef.current) {
      return;
    }

    shouldStartPlaybackRef.current = false;
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
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
            </div>

            <audio
              ref={audioRef}
              className={styles.audio}
              key={state.track.id}
              preload="metadata"
              src={state.track.streamUrl}
              onCanPlay={(event) => handleCanPlay(event.currentTarget)}
              onLoadedMetadata={(event) => {
                if (Number.isFinite(event.currentTarget.duration)) {
                  setDuration(event.currentTarget.duration);
                }
              }}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (isAutoPlayEnabled && recommendationTracks.length > 0) {
                  handleNext();
                } else {
                  setCurrentTime(playbackDuration);
                }
              }}
              onError={() => {
                setIsPlaying(false);
                setPlaybackError("楽曲を読み込めませんでした。");
              }}
            >
              お使いのブラウザは音声再生に対応していません。
            </audio>

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
