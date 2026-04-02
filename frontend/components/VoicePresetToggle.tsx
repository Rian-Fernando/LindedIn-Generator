"use client";

import type { VoicePreset } from "../lib/types";

interface VoicePresetToggleProps {
  value: VoicePreset;
  onChange: (value: VoicePreset) => void;
}

const OPTIONS: Array<{
  value: VoicePreset;
  label: string;
  copy: string;
}> = [
  {
    value: "founder",
    label: "Founder Voice",
    copy: "Sharper, more opinionated, more operator-led."
  },
  {
    value: "company",
    label: "Company Voice",
    copy: "Measured, educational, and category-authoritative."
  }
];

export function VoicePresetToggle({ value, onChange }: VoicePresetToggleProps) {
  return (
    <div className="voice-toggle">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          aria-pressed={option.value === value}
          className={option.value === value ? "voice-option active" : "voice-option"}
          onClick={() => onChange(option.value)}
          type="button"
        >
          <span>{option.label}</span>
          <small>{option.copy}</small>
        </button>
      ))}
    </div>
  );
}
