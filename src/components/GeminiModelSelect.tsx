'use client';

import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';
import { listGeminiModels } from '@/app/_actions/gemini_actions';
import type { ModelOption } from '@/lib/patternAi/gemini';

// Picks which Gemini model a run starts with. Defaults to the highest model
// that isn't out of quota; if the chosen one is busy, the server still falls
// back down the list automatically. Reloads availability each time it mounts
// (i.e. each time its modal opens).
export function GeminiModelSelect({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (tier: number) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<ModelOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    listGeminiModels()
      .then((models) => {
        if (cancelled) return;
        setOptions(models);
        const firstAvailable = models.find((m) => m.availableAt === null) ?? models[0];
        if (firstAvailable) onChange(firstAvailable.tier);
      })
      .catch(() => {
        // Picker is optional; without it the server starts at the top tier.
      });
    return () => {
      cancelled = true;
    };
    // Only on mount: picking a model must not be overwritten by a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <Select
      label="Model"
      description="Starts with this model; if it's busy, the next ones down are tried automatically."
      data={options.map((m) => ({
        value: String(m.tier),
        label: m.availableAt ? `${m.label} — out of quota until ${resetTime(m.availableAt)}` : m.label,
        disabled: m.availableAt !== null,
      }))}
      value={value === null ? null : String(value)}
      onChange={(v) => v !== null && onChange(Number(v))}
      placeholder="Loading models…"
      allowDeselect={false}
      disabled={disabled || !options.length}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
