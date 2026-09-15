import FeedbackButton, {
  type FeedbackValue,
} from "../atoms/FeedbackButton";
import StartStopButton from "../atoms/Start-StopButton";
import NextSongButton, {
  PreviousSongButton,
} from "../atoms/NextSongButton";
import styles from "./PlayButtons.module.css";

type PlayButtonsProps = {
  isPlaying: boolean;
  onToggle: () => void;
  feedback: FeedbackValue | null;
  onFeedbackChange: (value: FeedbackValue | null) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  disabled?: boolean;
};

export default function PlayButtons({
  isPlaying,
  onToggle,
  feedback,
  onFeedbackChange,
  onPrevious,
  onNext,
  disabled = false,
}: PlayButtonsProps) {
  function handleFeedbackClick(nextValue: FeedbackValue) {
    onFeedbackChange(feedback === nextValue ? null : nextValue);
  }

  return (
    <div className={styles.controls} role="group" aria-label="再生・評価操作">
      <div className={styles.feedbackControl}>
        <FeedbackButton
          kind="good"
          selected={feedback === "good"}
          onClick={() => handleFeedbackClick("good")}
          disabled={disabled}
        />
      </div>
      <div className={styles.navigationControl}>
        <PreviousSongButton
          onClick={onPrevious}
          disabled={disabled || !onPrevious}
        />
      </div>
      <div className={styles.playControl}>
        <StartStopButton
          isPlaying={isPlaying}
          onClick={onToggle}
          disabled={disabled}
        />
      </div>
      <div className={styles.navigationControl}>
        <NextSongButton onClick={onNext} disabled={disabled || !onNext} />
      </div>
      <div className={styles.feedbackControl}>
        <FeedbackButton
          kind="bad"
          selected={feedback === "bad"}
          onClick={() => handleFeedbackClick("bad")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
