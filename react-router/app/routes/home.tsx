import { useEffect, useState } from "react";

import Artwork from "../components/atoms/Artwork";
import NextSongButton from "../components/atoms/NextSongButton";
import Slider from "../components/atoms/Slider";
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
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<TrackLoadState>({ status: "loading" });
  const [parameter, setParameter] = useState(42);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: "loading" });
    void fetchStaleWhiskeyTrack(controller.signal)
      .then((track) => setState({ status: "ready", track }))
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
            key={state.track.id}
                      controls
                      
            preload="metadata"
            src={state.track.streamUrl}
          >
            お使いのブラウザは音声再生に対応していません。
          </audio>
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
