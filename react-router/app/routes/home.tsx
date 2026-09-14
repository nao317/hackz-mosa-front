import { useEffect, useRef, useState } from "react";

import Artwork from "../components/atoms/Artwork";
import type { FeedbackValue } from "../components/atoms/FeedbackButton";
import NextSongButton from "../components/atoms/NextSongButton";
import Slider from "../components/atoms/Slider";
import FeedbackButtons from "../components/molecules/FeedbackButtons";
import PlayButtons from "../components/molecules/PlayButtons";
import { fetchStaleWhiskeyTrack } from "../features/audius/audius.client";
import type { PlayableTrack } from "../features/audius/audius";

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

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<TrackLoadState>({ status: "loading" });
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [parameter, setParameter] = useState(42);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: "loading" });
    setIsPlaying(false);
    setPlaybackError(null);
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

  return (
    <main>
      <h1>Audius streaming spike</h1>

      {state.status === "loading" && <p>楽曲を取得しています。</p>}

      {state.status === "error" && (
        <section aria-live="polite">
          <p>楽曲を取得できませんでした。</p>
          <pre>{state.message}</pre>
          <button type="button" onClick={() => setRequestId((id) => id + 1)}>
            再試行
          </button>
        </section>
      )}

      {state.status === "ready" && (
        <section>
          <h2>{state.track.title}</h2>
          <p>{state.track.artist}</p>
          {state.track.artworkUrl && (
            <Artwork
              src={state.track.artworkUrl}
              alt={`${state.track.title}のアートワーク`}
            />
          )}
          <NextSongButton />

          <div style={{ marginTop: 24, maxWidth: 420 }}>
            <Slider
              step={1}
              value={parameter}
              onChange={setParameter}
            />
          </div>

          <audio
            ref={audioRef}
            key={state.track.id}
            preload="metadata"
            src={state.track.streamUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
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
          />
          {playbackError && <p role="alert">{playbackError}</p>}
          <FeedbackButtons value={feedback} onChange={setFeedback} />
          {state.track.audiusUrl && (
            <p>
              <a href={state.track.audiusUrl} target="_blank" rel="noreferrer">
                Audiusで楽曲を開く
              </a>
            </p>
          )}
        </section>
      )}
    </main>
  );
}
