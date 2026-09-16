import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ListMusic,
  Music2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import Artwork from "../components/atoms/Artwork";
import Sidebar from "../components/molecules/Sidebar";
import {
  MAX_PLAYLIST_TRACKS,
  deletePlaylist,
  deletePlaylistTrack,
  getPlaylist,
  reorderPlaylistTracks,
  toPlayableTrack,
  type Playlist,
} from "../features/playlists/playlist-api";
import styles from "./playlist-detail.module.css";

export function meta() {
  return [{ title: "プレイリスト詳細" }];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "プレイリストの操作に失敗しました。";
}

function formatDuration(durationSeconds?: number): string | undefined {
  if (!durationSeconds) {
    return undefined;
  }
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PlaylistDetailPage() {
  const { playlistId: playlistIdParam } = useParams();
  const playlistId = Number(playlistIdParam);
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    if (!Number.isInteger(playlistId) || playlistId <= 0) {
      setErrorMessage("プレイリストが見つかりませんでした。");
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setErrorMessage(null);
    void getPlaylist(playlistId)
      .then((loadedPlaylist) => {
        if (active) {
          setPlaylist(loadedPlaylist);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [playlistId]);

  async function moveTrack(index: number, direction: -1 | 1) {
    if (!playlist || isMutating) {
      return;
    }
    const destination = index + direction;
    if (destination < 0 || destination >= playlist.tracks.length) {
      return;
    }
    const reorderedTracks = [...playlist.tracks];
    [reorderedTracks[index], reorderedTracks[destination]] = [
      reorderedTracks[destination],
      reorderedTracks[index],
    ];

    setIsMutating(true);
    setErrorMessage(null);
    try {
      setPlaylist(
        await reorderPlaylistTracks(
          playlist.id,
          reorderedTracks.map((track) => track.id),
        ),
      );
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function removeTrack(itemId: number) {
    if (!playlist || isMutating) {
      return;
    }
    setIsMutating(true);
    setErrorMessage(null);
    try {
      setPlaylist(await deletePlaylistTrack(playlist.id, itemId));
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function removePlaylist() {
    if (
      !playlist ||
      isMutating ||
      !window.confirm(`「${playlist.name}」を削除しますか？`)
    ) {
      return;
    }
    setIsMutating(true);
    setErrorMessage(null);
    try {
      await deletePlaylist(playlist.id);
      navigate("/playlists", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setIsMutating(false);
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
            <Link
              className={styles.iconButton}
              to="/playlists"
              aria-label="プレイリストへ戻る"
              title="プレイリストへ戻る"
            >
              <ArrowLeft aria-hidden="true" size={20} />
            </Link>
            <div className={styles.headingIcon}>
              <ListMusic aria-hidden="true" size={21} />
            </div>
            <div className={styles.headingText}>
              <h1>{playlist?.name ?? "プレイリスト"}</h1>
              <p>
                {playlist
                  ? `${playlist.trackCount}/${MAX_PLAYLIST_TRACKS}曲${
                      playlist.description ? ` ・ ${playlist.description}` : ""
                    }`
                  : "読み込み中"}
              </p>
            </div>
            {playlist && (
              <div className={styles.headerActions}>
                <Link
                  className={styles.addButton}
                  to={`/search?playlistId=${playlist.id}`}
                  aria-disabled={
                    playlist.trackCount >= MAX_PLAYLIST_TRACKS || isMutating
                  }
                  onClick={(event) => {
                    if (
                      playlist.trackCount >= MAX_PLAYLIST_TRACKS ||
                      isMutating
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Plus aria-hidden="true" size={18} />
                  <span>曲を追加</span>
                </Link>
                <button
                  className={`${styles.iconButton} ${styles.deletePlaylistButton}`}
                  type="button"
                  aria-label="プレイリストを削除"
                  title="プレイリストを削除"
                  disabled={isMutating}
                  onClick={() => void removePlaylist()}
                >
                  <Trash2 aria-hidden="true" size={19} />
                </button>
              </div>
            )}
          </header>

          {errorMessage && (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading && (
            <p className={styles.status} aria-live="polite">
              プレイリストを読み込んでいます。
            </p>
          )}

          {!isLoading && playlist && playlist.tracks.length === 0 && (
            <div className={styles.emptyState}>
              <Music2 aria-hidden="true" size={34} />
              <p>このプレイリストにはまだ曲がありません。</p>
              <Link to={`/search?playlistId=${playlist.id}`}>
                <Plus aria-hidden="true" size={17} />
                曲を追加
              </Link>
            </div>
          )}

          {playlist && playlist.tracks.length > 0 && (
            <ol className={styles.trackList}>
              {playlist.tracks.map((track, index) => (
                <li key={track.id}>
                  <span className={styles.position}>{index + 1}</span>
                  <Link
                    className={styles.trackLink}
                    to="/"
                    state={{ selectedTrack: toPlayableTrack(track) }}
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
                        <Music2 aria-hidden="true" size={23} />
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
                    <Play
                      className={styles.playIcon}
                      aria-hidden="true"
                      size={17}
                      fill="currentColor"
                    />
                  </Link>
                  <div className={styles.trackActions}>
                    <button
                      type="button"
                      aria-label={`${track.title}を上へ移動`}
                      title="上へ移動"
                      disabled={index === 0 || isMutating}
                      onClick={() => void moveTrack(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${track.title}を下へ移動`}
                      title="下へ移動"
                      disabled={
                        index === playlist.tracks.length - 1 || isMutating
                      }
                      onClick={() => void moveTrack(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" size={18} />
                    </button>
                    <button
                      className={styles.removeTrackButton}
                      type="button"
                      aria-label={`${track.title}をプレイリストから削除`}
                      title="曲を削除"
                      disabled={isMutating}
                      onClick={() => void removeTrack(track.id)}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
