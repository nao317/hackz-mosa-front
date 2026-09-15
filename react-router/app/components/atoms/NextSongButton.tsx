import { StepBack, StepForward } from "lucide-react";

import styles from "./NextSongButton.module.css";

type SongNavigationButtonProps = {
  direction: "previous" | "next";
  onClick?: () => void;
  disabled?: boolean;
};

function SongNavigationButton({
  direction,
  onClick,
  disabled = false,
}: SongNavigationButtonProps) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "前の曲" : "次の曲";
  const Icon = isPrevious ? StepBack : StepForward;

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon aria-hidden="true" size={48} fill="currentColor" />
    </button>
  );
}

export function PreviousSongButton(
  props: Omit<SongNavigationButtonProps, "direction">,
) {
  return <SongNavigationButton direction="previous" {...props} />;
}

export default function NextSongButton(
  props: Omit<SongNavigationButtonProps, "direction">,
) {
  return <SongNavigationButton direction="next" {...props} />;
}
