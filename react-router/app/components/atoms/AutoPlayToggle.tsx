import styles from "./AutoPlayToggle.module.css";

type AutoPlayToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function AutoPlayToggle({
  checked,
  onChange,
}: AutoPlayToggleProps) {
  return (
    <label className={styles.control}>
      <span className={styles.label}>自動再生</span>
      <input
        className={styles.input}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className={styles.switch} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={styles.state}>{checked ? "ON" : "OFF"}</span>
    </label>
  );
}
