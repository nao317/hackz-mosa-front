import FeedbackButton, {
  type FeedbackValue,
} from "../atoms/FeedbackButton";
import styles from "./FeedbackButtons.module.css";

type FeedbackButtonsProps = {
  value: FeedbackValue | null;
  onChange: (value: FeedbackValue | null) => void;
  disabled?: boolean;
};

export default function FeedbackButtons({
  value,
  onChange,
  disabled = false,
}: FeedbackButtonsProps) {
  function handleClick(nextValue: FeedbackValue) {
    onChange(value === nextValue ? null : nextValue);
  }

  return (
    <div className={styles.buttons} role="group" aria-label="楽曲の評価">
      <FeedbackButton
        kind="good"
        selected={value === "good"}
        onClick={() => handleClick("good")}
        disabled={disabled}
      />
      <FeedbackButton
        kind="bad"
        selected={value === "bad"}
        onClick={() => handleClick("bad")}
        disabled={disabled}
      />
    </div>
  );
}
