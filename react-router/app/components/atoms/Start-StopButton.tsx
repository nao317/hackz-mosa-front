import { Pause, Play } from "lucide-react";
import styles from "./Start-StopButton.module.css";

type StartStopButtonProps = {
  isPlaying: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export default function StartStopButton({
  isPlaying,
  onClick,
  disabled = false,
}: StartStopButtonProps) {
  const label = isPlaying ? "一時停止" : "再生";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isPlaying}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={styles.button}
    >
      {isPlaying ? (
        <Pause aria-hidden="true" size={24} fill="currentColor" />
      ) : (
        <Play aria-hidden="true" size={24} fill="currentColor" />
      )}
    </button>
  );
}
