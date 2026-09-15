import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Music2,
  Play,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";

import Artwork from "../components/atoms/Artwork";
import Pagination from "../components/molecules/Pagination";
import Sidebar from "../components/molecules/Sidebar";
import {
  FEEDBACK_CHANGED_EVENT,
  getFeedbackTracks,
  type FeedbackTrack,
} from "../features/feedback/feedback-storage";
import type { FeedbackValue } from "../features/feedback/feedback";
import styles from "./feedback-playlist.module.css";

const PAGE_SIZE = 6;

export function meta() {
  return [{ title: "フィードバックした曲" }];
}

function getFeedbackValue(value: string | undefined): FeedbackValue | null {
  return value === "good" || value === "bad" ? value : null;
}

function getPage(searchParams: URLSearchParams, pageCount: number): number {
  const requestedPage = Number(searchParams.get("page"));
  if (!Number.isInteger(requestedPage)) {
    return 1;
  }
  return Math.min(Math.max(requestedPage, 1), pageCount);
}

function formatDuration(durationSeconds?: number): string | undefined {
  if (!durationSeconds) {
    return undefined;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function FeedbackPlaylistPage() {
  const { feedback: feedbackParam } = useParams();
  const feedback = getFeedbackValue(feedbackParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState<FeedbackTrack[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    function loadTracks() {
      setTracks(getFeedbackTracks(feedback as FeedbackValue));
    }

    loadTracks();
    window.addEventListener(FEEDBACK_CHANGED_EVENT, loadTracks);
    window.addEventListener("storage", loadTracks);
    return () => {
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, loadTracks);
      window.removeEventListener("storage", loadTracks);
    };
  }, [feedback]);

  if (!feedback) {
    return <Navigate to="/playlists" replace />;
  }

  const pageCount = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const page = getPage(searchParams, pageCount);
  const visibleTracks = tracks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isGood = feedback === "good";
  const Icon = isGood ? ThumbsUp : ThumbsDown;
  const title = isGood ? "Goodした曲" : "Badした曲";

  function changePage(nextPage: number) {
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
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
              className={styles.backLink}
              to="/playlists"
              aria-label="プレイリストへ戻る"
              title="プレイリストへ戻る"
            >
              <ArrowLeft aria-hidden="true" size={20} />
            </Link>
            <div className={styles.headingIcon} data-feedback={feedback}>
              <Icon aria-hidden="true" size={21} />
            </div>
            <div className={styles.headingText}>
              <h1>{title}</h1>
              <p>{tracks.length}曲</p>
            </div>
          </header>

          {visibleTracks.length === 0 ? (
            <div className={styles.emptyState}>
              <Music2 aria-hidden="true" size={32} />
              <p>{title}はまだありません。</p>
            </div>
          ) : (
            <ul className={styles.trackGrid}>
              {visibleTracks.map(({ track }) => (
                <li key={track.id}>
                  <Link
                    className={styles.trackLink}
                    to="/"
                    state={{ selectedTrack: track }}
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
                        <Music2 aria-hidden="true" size={24} />
                      )}
                    </span>
                    <span className={styles.trackText}>
                      <span className={styles.trackTitle}>{track.title}</span>
                      <span className={styles.artist}>{track.artist}</span>
                      {formatDuration(track.durationSeconds) && (
                        <span className={styles.duration}>
                          {formatDuration(track.durationSeconds)}
                        </span>
                      )}
                    </span>
                    <span className={styles.playIcon} aria-hidden="true">
                      <Play size={15} fill="currentColor" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Pagination page={page} pageCount={pageCount} onPageChange={changePage} />
        </div>
      </main>
    </div>
  );
}
