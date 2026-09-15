import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Play } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import Artwork from "../components/atoms/Artwork";
import SearchSpace from "../components/atoms/SearchSpace";
import Sidebar from "../components/molecules/Sidebar";
import { searchAudiusTracks } from "../features/audius/audius.client";
import type { PlayableTrack } from "../features/audius/audius";
import styles from "./search.module.css";

export function meta() {
  return [{ title: "検索" }];
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; tracks: PlayableTrack[] }
  | { status: "error"; message: string };

function formatDuration(durationSeconds?: number): string | undefined {
  if (!durationSeconds) {
    return undefined;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQueryRef = useRef(searchParams.get("q")?.trim() ?? "");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(initialQueryRef.current);
  const [searchedQuery, setSearchedQuery] = useState(initialQueryRef.current);
  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const runSearch = useCallback((nextQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSearchedQuery(nextQuery);
    setSearchState({ status: "loading" });

    void searchAudiusTracks(nextQuery, controller.signal)
      .then((tracks) => {
        if (!controller.signal.aborted) {
          setSearchState({ status: "ready", tracks: tracks.slice(0, 20) });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSearchState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "検索結果を取得できませんでした。",
          });
        }
      });
  }, []);

  useEffect(() => {
    if (initialQueryRef.current) {
      runSearch(initialQueryRef.current);
    }
    return () => abortControllerRef.current?.abort();
  }, [runSearch]);

  function handleSubmit(nextQuery: string) {
    setSearchParams({ q: nextQuery }, { replace: true });
    runSearch(nextQuery);
  }

  function handleTrackSelect(track: PlayableTrack) {
    navigate("/", { state: { selectedTrack: track } });
  }

  return (
    <div className={styles.appShell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onOpen={openSidebar}
        onClose={closeSidebar}
      />
      <main className={styles.page}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1>曲を検索</h1>
          </header>

          <SearchSpace
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            placeholder="曲名やアーティスト名"
            label="キーワード"
          />

          <section className={styles.results} aria-live="polite">
            {searchState.status === "loading" && (
              <p className={styles.status}>検索しています。</p>
            )}

            {searchState.status === "error" && (
              <div className={styles.error} role="alert">
                <p>検索結果を取得できませんでした。</p>
                <p>{searchState.message}</p>
              </div>
            )}

            {searchState.status === "ready" && (
              <>
                <h2 className={styles.resultsTitle}>
                  「{searchedQuery}」の検索結果
                </h2>
                {searchState.tracks.length === 0 ? (
                  <p className={styles.status}>
                    該当する曲が見つかりませんでした。
                  </p>
                ) : (
                  <ul className={styles.trackList}>
                    {searchState.tracks.map((track) => (
                      <li key={track.id}>
                        <button
                          className={styles.trackButton}
                          type="button"
                          onClick={() => handleTrackSelect(track)}
                          aria-label={`${track.title}、${track.artist}を再生`}
                        >
                          <span className={styles.artworkFrame}>
                            {track.artworkUrl ? (
                              <Artwork
                                className={styles.artwork}
                                src={track.artworkUrl}
                                alt=""
                              />
                            ) : (
                              <Music2 aria-hidden="true" size={26} />
                            )}
                          </span>
                          <span className={styles.trackText}>
                            <span className={styles.trackTitle}>{track.title}</span>
                            <span className={styles.artist}>{track.artist}</span>
                          </span>
                          {formatDuration(track.durationSeconds) && (
                            <span className={styles.duration}>
                              {formatDuration(track.durationSeconds)}
                            </span>
                          )}
                          <span className={styles.playIcon} aria-hidden="true">
                            <Play size={18} fill="currentColor" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
