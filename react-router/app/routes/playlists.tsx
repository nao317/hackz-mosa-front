import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ChevronRight,
  ListMusic,
  Music2,
  Plus,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

import Artwork from "../components/atoms/Artwork";
import Pagination from "../components/molecules/Pagination";
import Sidebar from "../components/molecules/Sidebar";
import {
  FEEDBACK_CHANGED_EVENT,
  getFeedbackTracks,
  type FeedbackTrack,
} from "../features/feedback/feedback-storage";
import type { FeedbackValue } from "../features/feedback/feedback";
import {
  createPlaylist,
  listPlaylists,
  type Playlist,
} from "../features/playlists/playlist-api";
import styles from "./playlists.module.css";

const PAGE_SIZE = 4;

type FeedbackPlaylistDefinition = {
  feedback: FeedbackValue;
  title: string;
  description: string;
};

const FEEDBACK_PLAYLISTS: FeedbackPlaylistDefinition[] = [
  {
    feedback: "good",
    title: "Goodした曲",
    description: "気に入った曲をまとめて表示",
  },
  {
    feedback: "bad",
    title: "Badした曲",
    description: "好みに合わなかった曲を確認",
  },
];

type PlaylistItem =
  | (FeedbackPlaylistDefinition & {
      kind: "feedback";
      tracks: FeedbackTrack["track"][];
    })
  | {
      kind: "custom";
      playlist: Playlist;
      title: string;
      description: string;
      tracks: Playlist["tracks"];
    };

export function meta() {
  return [{ title: "プレイリスト" }];
}

function getPage(searchParams: URLSearchParams, pageCount: number): number {
  const requestedPage = Number(searchParams.get("page"));
  if (!Number.isInteger(requestedPage)) {
    return 1;
  }
  return Math.min(Math.max(requestedPage, 1), pageCount);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "プレイリストを取得できませんでした。";
}

export default function PlaylistsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracksByFeedback, setTracksByFeedback] = useState<
    Record<FeedbackValue, FeedbackTrack[]>
  >({ good: [], bad: [] });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const loadCustomPlaylists = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setPlaylists(await listPlaylists());
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    function loadFeedbackTracks() {
      setTracksByFeedback({
        good: getFeedbackTracks("good"),
        bad: getFeedbackTracks("bad"),
      });
    }

    loadFeedbackTracks();
    void loadCustomPlaylists();
    window.addEventListener(FEEDBACK_CHANGED_EVENT, loadFeedbackTracks);
    window.addEventListener("storage", loadFeedbackTracks);
    return () => {
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, loadFeedbackTracks);
      window.removeEventListener("storage", loadFeedbackTracks);
    };
  }, [loadCustomPlaylists]);

  const playlistItems = useMemo<PlaylistItem[]>(
    () => [
      ...FEEDBACK_PLAYLISTS.map((playlist) => ({
        ...playlist,
        kind: "feedback" as const,
        tracks: tracksByFeedback[playlist.feedback].map(({ track }) => track),
      })),
      ...playlists.map((playlist) => ({
        kind: "custom" as const,
        playlist,
        title: playlist.name,
        description: playlist.description || "説明はありません",
        tracks: playlist.tracks,
      })),
    ],
    [playlists, tracksByFeedback],
  );
  const pageCount = Math.max(1, Math.ceil(playlistItems.length / PAGE_SIZE));
  const page = getPage(searchParams, pageCount);
  const visiblePlaylists = playlistItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  function changePage(nextPage: number) {
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
  }

  function openCreateDialog() {
    setName("");
    setDescription("");
    setCreateError(null);
    setIsCreateOpen(true);
  }

  function closeCreateDialog() {
    if (!isCreating) {
      setIsCreateOpen(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      const playlist = await createPlaylist(name, description);
      setPlaylists((current) => [playlist, ...current]);
      setSearchParams({});
      setIsCreateOpen(false);
    } catch (error: unknown) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreating(false);
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
            <div className={styles.headingIcon}>
              <ListMusic aria-hidden="true" size={22} />
            </div>
            <div className={styles.headingText}>
              <h1>プレイリスト</h1>
              <p>フィードバックした曲と自分のプレイリスト</p>
            </div>
            <button
              className={styles.createButton}
              type="button"
              onClick={openCreateDialog}
            >
              <Plus aria-hidden="true" size={18} />
              <span>作成</span>
            </button>
          </header>

          <div className={styles.playlistArea}>
            {loadError && (
              <div className={styles.apiNotice} role="alert">
                <span>{loadError}</span>
                <Link to="/mypage">ログイン画面へ</Link>
              </div>
            )}
            {isLoading && (
              <p className={styles.loadingStatus} aria-live="polite">
                プレイリストを読み込んでいます。
              </p>
            )}
            <ul className={styles.playlistGrid}>
              {visiblePlaylists.map((item) => {
                const isFeedback = item.kind === "feedback";
                const feedback = isFeedback ? item.feedback : undefined;
                const Icon =
                  feedback === "good"
                    ? ThumbsUp
                    : feedback === "bad"
                      ? ThumbsDown
                      : ListMusic;
                const href = isFeedback
                  ? `/playlists/feedback/${item.feedback}`
                  : `/playlists/${item.playlist.id}`;

                return (
                  <li key={isFeedback ? item.feedback : item.playlist.id}>
                    <Link
                      className={styles.playlistLink}
                      data-feedback={feedback}
                      to={href}
                    >
                      <span
                        className={styles.cover}
                        data-count={Math.min(item.tracks.length, 4)}
                      >
                        {item.tracks.slice(0, 4).map((track) =>
                          track.artworkUrl ? (
                            <Artwork
                              className={styles.coverArtwork}
                              key={track.id}
                              src={track.artworkUrl}
                              alt=""
                            />
                          ) : (
                            <span
                              className={styles.coverPlaceholder}
                              key={track.id}
                            >
                              <Music2 aria-hidden="true" size={23} />
                            </span>
                          ),
                        )}
                        {item.tracks.length === 0 && (
                          <span className={styles.emptyCover}>
                            <Icon aria-hidden="true" size={42} />
                          </span>
                        )}
                      </span>
                      <span className={styles.playlistBody}>
                        <span className={styles.playlistTitle}>{item.title}</span>
                        <span className={styles.playlistDescription}>
                          {item.description}
                        </span>
                        <span className={styles.playlistMeta}>
                          {item.tracks.length}曲
                          <ChevronRight aria-hidden="true" size={18} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <Pagination page={page} pageCount={pageCount} onPageChange={changePage} />
        </div>
      </main>

      {isCreateOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-playlist-title"
          >
            <header className={styles.modalHeader}>
              <h2 id="create-playlist-title">プレイリストを作成</h2>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="閉じる"
                title="閉じる"
                disabled={isCreating}
                onClick={closeCreateDialog}
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>
            <form className={styles.createForm} onSubmit={handleCreate}>
              <label>
                <span>名前</span>
                <input
                  value={name}
                  maxLength={100}
                  required
                  autoFocus
                  disabled={isCreating}
                  onChange={(event) => setName(event.currentTarget.value)}
                />
              </label>
              <label>
                <span>説明</span>
                <textarea
                  value={description}
                  maxLength={500}
                  rows={3}
                  disabled={isCreating}
                  onChange={(event) =>
                    setDescription(event.currentTarget.value)
                  }
                />
              </label>
              <p className={styles.formError} role="alert">
                {createError ?? ""}
              </p>
              <div className={styles.formActions}>
                <button
                  className={styles.cancelButton}
                  type="button"
                  disabled={isCreating}
                  onClick={closeCreateDialog}
                >
                  キャンセル
                </button>
                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={isCreating || !name.trim()}
                >
                  <Plus aria-hidden="true" size={18} />
                  {isCreating ? "作成中" : "作成"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
