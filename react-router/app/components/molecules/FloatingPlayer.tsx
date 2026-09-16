import StartStopButton from "../atoms/Start-StopButton";
import { usePlayback } from "../../features/playback/PlaybackProvider";
import { useLocation } from "react-router";
import styles from "./FloatingPlayer.module.css";

export default function FloatingPlayer() {
  const location = useLocation();
  const { track, isPlaying, toggle } = usePlayback();
  if (!track || location.pathname === "/") {
    return null;
  }

  return (
    <aside className={styles.player} aria-label="再生中の曲">
      <span className={styles.text}>
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </span>
      <StartStopButton isPlaying={isPlaying} onClick={toggle} />
    </aside>
  );
}
