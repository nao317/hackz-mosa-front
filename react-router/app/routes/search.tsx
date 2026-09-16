import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Music2, Play, Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

import Artwork from "../components/atoms/Artwork";
import SearchSpace from "../components/atoms/SearchSpace";
import Sidebar from "../components/molecules/Sidebar";
import { searchAudiusTracks } from "../features/audius/audius.client";
import type { PlayableTrack } from "../features/audius/audius";
import {
  MAX_PLAYLIST_TRACKS,
  addPlaylistTrack,
  getPlaylist,
  type Playlist,
} from "../features/playlists/playlist-api";
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
  const requestedPlaylistId = Number(searchParams.get("playlistId"));
  const playlistId =
    Number.isInteger(requestedPlaylistId) && requestedPlaylistId > 0
      ? requestedPlaylistId
      : undefined;
  const [targetPlaylist, setTargetPlaylist] = useState<Playlist | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [pendingTrackId, setPendingTrackId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!playlistId) {
      setTargetPlaylist(null);
      setPlaylistError(null);
      return;
    }
    let active = true;
    setPlaylistError(null);
    void getPlaylist(playlistId)
      .then((playlist) => {
        if (active) {
          setTargetPlaylist(playlist);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPlaylistError(
            error instanceof Error
              ? error.message
              : "プレイリストを取得できませんでした。",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [playlistId]);

  function handleSubmit(nextQuery: string) {
    setSearchParams(
      playlistId
        ? { q: nextQuery, playlistId: String(playlistId) }
        : { q: nextQuery },
      { replace: true },
    );
    runSearch(nextQuery);
  }

  const handleVoiceResult = useCallback((transcript: string) => {
    setQuery(transcript);
  }, []);

  function handleTrackSelect(track: PlayableTrack) {
    navigate("/", { state: { selectedTrack: track } });
  }

  async function handleTrackAdd(track: PlayableTrack) {
    if (!playlistId || pendingTrackId) {
      return;
    }
    setPendingTrackId(track.id);
    setPlaylistError(null);
    setNoticeMessage(null);
    try {
      const playlist = await addPlaylistTrack(playlistId, track);
      setTargetPlaylist(playlist);
      setNoticeMessage(`「${track.title}」を追加しました。`);
    } catch (error: unknown) {
      setPlaylistError(
        error instanceof Error
          ? error.message
          : "曲を追加できませんでした。",
      );
    } finally {
      setPendingTrackId(null);
    }
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
            {targetPlaylist && (
              <Link
                className={styles.backLink}
                to={`/playlists/${targetPlaylist.id}`}
                aria-label="プレイリストへ戻る"
                title="プレイリストへ戻る"
              >
                <ArrowLeft aria-hidden="true" size={20} />
              </Link>
            )}
            <div>
              <h1>曲を検索</h1>
              {targetPlaylist && (
                <p>
                  「{targetPlaylist.name}」に追加 ・ {targetPlaylist.trackCount}/
                  {MAX_PLAYLIST_TRACKS}曲
                </p>
              )}
            </div>
          </header>

          {(playlistError || noticeMessage) && (
            <p
              className={playlistError ? styles.playlistError : styles.notice}
              role={playlistError ? "alert" : "status"}
            >
              {playlistError ?? noticeMessage}
            </p>
          )}

          <SearchSpace
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onVoiceResult={handleVoiceResult}
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
                        <div className={styles.trackRow}>
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
                              <span className={styles.trackTitle}>
                                {track.title}
                              </span>
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
                          {playlistId && (
                            <button
                              className={styles.addTrackButton}
                              type="button"
                              aria-label={`${track.title}をプレイリストに追加`}
                              title={
                                targetPlaylist?.tracks.some(
                                  (item) => item.trackId === track.id,
                                )
                                  ? "追加済み"
                                  : "プレイリストに追加"
                              }
                              disabled={
                                !targetPlaylist ||
                                Boolean(pendingTrackId) ||
                                targetPlaylist.trackCount >=
                                  MAX_PLAYLIST_TRACKS ||
                                targetPlaylist.tracks.some(
                                  (item) => item.trackId === track.id,
                                )
                              }
                              onClick={() => void handleTrackAdd(track)}
                            >
                              {targetPlaylist?.tracks.some(
                                (item) => item.trackId === track.id,
                              ) ? (
                                <Check aria-hidden="true" size={19} />
                              ) : (
                                <Plus aria-hidden="true" size={19} />
                              )}
                            </button>
                          )}
                        </div>
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
