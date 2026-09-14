import {
  type ChangeEvent,
  type CSSProperties,
  useId,
  useMemo,
  useState,
} from "react";

import styles from "./Slider.module.css";

type SliderProps = {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  label?: string;
  onChange?: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
};

export function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getSliderPercentage(value: number, min: number, max: number) {
  if (max === min) {
    return 0;
  }

  return ((clampValue(value, min, max) - min) / (max - min)) * 100;
}

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = min,
  label = "Range",
  onChange,
  disabled = false,
  showValue = true,
}: SliderProps) {
  const inputId = useId();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    clampValue(defaultValue, min, max),
  );

  const activeValue = isControlled ? value : internalValue;
  const percentage = useMemo(
    () => getSliderPercentage(activeValue, min, max),
    [activeValue, min, max],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = clampValue(Number(event.target.value), min, max);

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  return (
    <div
      className={styles.slider}
      style={{ "--slider-progress": `${percentage}%` } as CSSProperties}
    >
      <div className={showValue ? styles.meta : styles.visuallyHidden}>
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId} aria-live="polite">
          {activeValue}
        </output>
      </div>

      <input
        id={inputId}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={activeValue}
        onChange={handleInputChange}
        aria-label={label}
        disabled={disabled}
      />
    </div>
  );
}
