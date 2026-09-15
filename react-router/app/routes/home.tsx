import { useEffect, useRef, useState } from "react";
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

import Artwork from "../components/atoms/Artwork";
import type { FeedbackValue } from "../components/atoms/FeedbackButton";
import Slider from "../components/atoms/Slider";
import PlayButtons from "../components/molecules/PlayButtons";
import { fetchStaleWhiskeyTrack } from "../features/audius/audius.client";
import type { PlayableTrack } from "../features/audius/audius";
import { startLocationPolling } from "../features/Geolocation/Location";
import { fetchWeather, type WeatherSnapshot } from "../features/Geolocation/Weather";
import styles from "./home.module.css";

export function meta() {
  return [
    { title: "Audius streaming spike" },
    {
      name: "description",
      content: "Audius API connection and streaming playback spike",
    },
  ];
}

type TrackLoadState =
  | { status: "loading" }
  | { status: "ready"; track: PlayableTrack }
  | { status: "error"; message: string };

const clockTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

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
  const [weatherData, setWeatherData] = useState<
    WeatherSnapshot | { message: string } | null
  >(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<TrackLoadState>({ status: "loading" });
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return startLocationPolling(
      (location) => {
        void fetchWeather(location)
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
      () => undefined,
    );
  }, []);

  const [clockTime, setClockTime] = useState("");

  useEffect(() => {
    function updateClockTime() {
      setClockTime(clockTimeFormatter.format(new Date()));
    }

    updateClockTime();
    const intervalId = window.setInterval(updateClockTime, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: "loading" });
    setIsPlaying(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
    void fetchStaleWhiskeyTrack(controller.signal)
      .then((track) => {
        setState({ status: "ready", track });
        setFeedback(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Audius API request failed.",
        });
      });

    return () => controller.abort();
  }, [requestId]);

  function handlePlayPause() {
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
  }

  function handleSeek(nextTime: number) {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const playbackDuration =
    state.status === "ready"
      ? duration || state.track.durationSeconds || 1
      : 1;
  return (
    <main className={styles.page}>
      <h1 className={styles.visuallyHidden}>Audius streaming spike</h1>

      {state.status === "loading" && (
        <p className={styles.statusMessage}>楽曲を取得しています。</p>
      )}

      {state.status === "error" && (
        <section className={styles.errorMessage} aria-live="polite">
          <p>楽曲を取得できませんでした。</p>
          <pre>{state.message}</pre>
          <button type="button" onClick={() => setRequestId((id) => id + 1)}>
            再試行
          </button>
        </section>
      )}

      {state.status === "ready" && (
        <section className={styles.player}>
          <div className={styles.clockArea}>
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
            <p role="alert">{weatherData.message}</p>
          ) : weatherData && "temperatureC" in weatherData ? (
            (() => {
              const WeatherIcon = getWeatherIcon(
                weatherData.weatherCode,
                weatherData.isDay,
              );

              return (
                <div
                  className={styles.weatherIcon}
                  role="img"
                  aria-label={weatherData.isDay ? "昼の天気" : "夜の天気"}
                >
                  <WeatherIcon aria-hidden="true" size={32} strokeWidth={1.8} />
                </div>
              );
            })()
          ) : (
            <div className={styles.weatherIcon} aria-label="天気情報を取得しています。">
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
              setCurrentTime(playbackDuration);
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
            onFeedbackChange={setFeedback}
          />

          {playbackError && (
            <p className={styles.playbackError} role="alert">
              {playbackError}
            </p>
          )}

        </section>
      )}
    </main>
  );
}
