import { useEffect, useRef, useState } from "react";

import Artwork from "../components/atoms/Artwork";
import type { FeedbackValue } from "../components/atoms/FeedbackButton";
import Slider from "../components/atoms/Slider";
import PlayButtons from "../components/molecules/PlayButtons";
import { fetchStaleWhiskeyTrack } from "../features/audius/audius.client";
import type { PlayableTrack } from "../features/audius/audius";
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

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<TrackLoadState>({ status: "loading" });
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
