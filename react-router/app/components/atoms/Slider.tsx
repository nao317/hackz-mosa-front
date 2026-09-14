import { type ChangeEvent, useMemo, useState } from "react";

type SliderProps = {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  label?: string;
  onChange?: (value: number) => void;
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
}: SliderProps) {
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
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          fontSize: 14,
        }}
      >
        <label htmlFor={label}>{label}</label>
        <output htmlFor={label} aria-live="polite">
          {activeValue}
        </output>
      </div>

      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={activeValue}
        onChange={handleInputChange}
        aria-label={label}
        style={{
          width: "100%",
          accentColor: "#2563eb",
          background: `linear-gradient(90deg, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          borderRadius: 999,
          height: 12,
          cursor: "pointer",
        }}
      />
    </div>
  );
}
