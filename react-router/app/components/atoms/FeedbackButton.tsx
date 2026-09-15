import { ThumbsDown, ThumbsUp } from "lucide-react";

import styles from "./FeedbackButton.module.css";

export type FeedbackValue = "good" | "bad";

type FeedbackButtonProps = {
  kind: FeedbackValue;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export default function FeedbackButton({
  kind,
  selected,
  onClick,
  disabled = false,
}: FeedbackButtonProps) {
  const label = kind === "good" ? "Good" : "Bad";
  const Icon = kind === "good" ? ThumbsUp : ThumbsDown;

  return (
    <button
      type="button"
      className={styles.button}
      data-kind={kind}
      data-selected={selected}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon
        className={styles.icon}
        aria-hidden="true"
        size={22}
      />
    </button>
  );
}
