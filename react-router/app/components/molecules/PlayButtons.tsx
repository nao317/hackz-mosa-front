import StartStopButton from "../atoms/Start-StopButton";

type PlayButtonsProps = {
  isPlaying: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export default function PlayButtons({
  isPlaying,
  onToggle,
  disabled = false,
}: PlayButtonsProps) {
  return (
    <StartStopButton
      isPlaying={isPlaying}
      onClick={onToggle}
      disabled={disabled}
    />
  );
}
