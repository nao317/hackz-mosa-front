import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ListMusic,
  Music2,
  ThumbsDown,
  ThumbsUp,
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
import styles from "./playlists.module.css";

const PAGE_SIZE = 4;

type PlaylistDefinition = {
  feedback: FeedbackValue;
  title: string;
  description: string;
};

const PLAYLISTS: PlaylistDefinition[] = [
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

export default function PlaylistsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracksByFeedback, setTracksByFeedback] = useState<
    Record<FeedbackValue, FeedbackTrack[]>
  >({ good: [], bad: [] });
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const pageCount = Math.max(1, Math.ceil(PLAYLISTS.length / PAGE_SIZE));
  const page = getPage(searchParams, pageCount);
  const visiblePlaylists = useMemo(
    () => PLAYLISTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page],
  );

  useEffect(() => {
    function loadFeedbackTracks() {
      setTracksByFeedback({
        good: getFeedbackTracks("good"),
        bad: getFeedbackTracks("bad"),
      });
    }

    loadFeedbackTracks();
    window.addEventListener(FEEDBACK_CHANGED_EVENT, loadFeedbackTracks);
    window.addEventListener("storage", loadFeedbackTracks);
    return () => {
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, loadFeedbackTracks);
      window.removeEventListener("storage", loadFeedbackTracks);
    };
  }, []);

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
            <div className={styles.headingIcon}>
              <ListMusic aria-hidden="true" size={22} />
            </div>
            <div>
              <h1>プレイリスト</h1>
              <p>フィードバックした曲</p>
            </div>
          </header>

          <ul className={styles.playlistGrid}>
            {visiblePlaylists.map((playlist) => {
              const feedbackTracks = tracksByFeedback[playlist.feedback];
              const Icon = playlist.feedback === "good" ? ThumbsUp : ThumbsDown;

              return (
                <li key={playlist.feedback}>
                  <Link
                    className={styles.playlistLink}
                    data-feedback={playlist.feedback}
                    to={`/playlists/${playlist.feedback}`}
                  >
                    <span
                      className={styles.cover}
                      data-count={Math.min(feedbackTracks.length, 4)}
                    >
                      {feedbackTracks.slice(0, 4).map(({ track }) =>
                        track.artworkUrl ? (
                          <Artwork
                            className={styles.coverArtwork}
                            key={track.id}
                            src={track.artworkUrl}
                            alt=""
                          />
                        ) : (
                          <span className={styles.coverPlaceholder} key={track.id}>
                            <Music2 aria-hidden="true" size={23} />
                          </span>
                        ),
                      )}
                      {feedbackTracks.length === 0 && (
                        <span className={styles.emptyCover}>
                          <Icon aria-hidden="true" size={42} />
                        </span>
                      )}
                    </span>
                    <span className={styles.playlistBody}>
                      <span className={styles.playlistTitle}>{playlist.title}</span>
                      <span className={styles.playlistDescription}>
                        {playlist.description}
                      </span>
                      <span className={styles.playlistMeta}>
                        {feedbackTracks.length}曲
                        <ChevronRight aria-hidden="true" size={18} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} pageCount={pageCount} onPageChange={changePage} />
        </div>
      </main>
    </div>
  );
}
