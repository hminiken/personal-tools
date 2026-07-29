// src/utils/dialogs.tsx
//
// Mantine-based replacements for window.confirm/prompt/alert. Each helper
// returns a Promise so call sites can `await` them just like the browser
// built-ins they replace.
'use client';

import { useState } from 'react';
import { Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';

// These dialogs are shared app-wide (Writing Desk boards and Crafting alike),
// but only Writing Desk boards carry a `--theme-*` palette. `modals.open*`
// portals straight to document.body — outside the board wrapper that sets
// those CSS vars — so a themed caller has to pass its own `themeVars` through
// for the popup to pick up the board's colors (same portal-breakout fix as
// NotesPopover/CardItem's dropdowns). Omitting it renders a plain Mantine
// modal exactly as before, so unthemed callers (Crafting) are unaffected.
type ThemeVars = Record<string, string>;

function themedModalStyles(themeVars?: ThemeVars) {
  if (!themeVars) return undefined;
  return {
    content: {
      ...themeVars,
      backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
      color: 'var(--theme-heading, inherit)',
    },
    header: {
      backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
      color: 'var(--theme-heading, inherit)',
    },
  };
}

// A themed surface for the Cancel button — same editor-content surface used
// for text-entry fields elsewhere (see ManageLabelsModal's themedFieldStyle).
function themedCancelStyle(themeVars: ThemeVars) {
  return {
    ...themeVars,
    backgroundColor: 'var(--theme-editor-bg, var(--mantine-color-body))',
    color: 'var(--theme-editor-text, var(--mantine-color-text))',
    borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
  };
}

// A themed danger surface — blends the theme's danger color into the current
// surface via color-mix instead of Mantine's flat light-red (which assumes a
// white page background and reads as a stray patch on a colored board theme).
function themedDangerStyle(themeVars: ThemeVars) {
  return {
    ...themeVars,
    color: 'var(--theme-danger, var(--mantine-color-red-6))',
    backgroundColor: 'color-mix(in srgb, var(--theme-danger, var(--mantine-color-red-6)) 16%, transparent)',
    borderColor: 'color-mix(in srgb, var(--theme-danger, var(--mantine-color-red-6)) 45%, transparent)',
  };
}

// ---------- confirm ----------

type ConfirmOptions = {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** Defaults to true — red confirm button for destructive actions. */
  danger?: boolean;
  themeVars?: ThemeVars;
};

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    modals.openConfirmModal({
      title: opts.title ?? 'Are you sure?',
      centered: true,
      styles: themedModalStyles(opts.themeVars),
      children: <Text size="sm">{opts.message}</Text>,
      labels: { confirm: opts.confirmLabel ?? 'Delete', cancel: 'Cancel' },
      cancelProps: opts.themeVars ? { variant: 'default', style: themedCancelStyle(opts.themeVars) } : undefined,
      confirmProps: opts.danger === false
        ? undefined
        : { color: opts.themeVars ? undefined : 'red', style: opts.themeVars ? themedDangerStyle(opts.themeVars) : undefined },
      onCancel: () => resolve(false),
      onConfirm: () => resolve(true),
    });
  });
}

// ---------- text prompt ----------

type PromptOptions = {
  title: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
};

function PromptForm({
  initialValue,
  label,
  placeholder,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initialValue?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
      <TextInput
        data-autofocus
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
      />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{submitLabel ?? 'Save'}</Button>
      </Group>
    </form>
  );
}

export function promptText(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let id: string;
    id = modals.open({
      title: opts.title,
      centered: true,
      onClose: () => settle(null),
      children: (
        <PromptForm
          initialValue={opts.initialValue}
          label={opts.label}
          placeholder={opts.placeholder}
          submitLabel={opts.submitLabel}
          onCancel={() => { settle(null); modals.close(id); }}
          onSubmit={(value) => { settle(value); modals.close(id); }}
        />
      ),
    });
  });
}

// ---------- word-count goal prompt ----------
// Replaces the "<n> (leave blank to clear)" prompt() pattern used for word
// count goals. Resolves to: a number to set, null to clear, undefined if
// the user cancelled (caller should leave the goal untouched).

type WordGoalOptions = {
  title?: string;
  initialValue?: number | null;
};

function WordGoalForm({
  initialValue,
  onCancel,
  onClear,
  onSave,
}: {
  initialValue?: number | null;
  onCancel: () => void;
  onClear: () => void;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState<number | ''>(initialValue ?? '');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (typeof value === 'number') onSave(value); }}>
      <NumberInput
        data-autofocus
        label="Word count goal"
        placeholder="No goal"
        min={0}
        value={value}
        onChange={(v) => setValue(typeof v === 'number' ? v : '')}
      />
      <Group justify="space-between" mt="md">
        <Button variant="subtle" color="gray" onClick={onClear}>Clear goal</Button>
        <Group>
          <Button variant="default" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={value === ''}>Save</Button>
        </Group>
      </Group>
    </form>
  );
}

export function promptWordGoal(opts: WordGoalOptions): Promise<number | null | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: number | null | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let id: string;
    id = modals.open({
      title: opts.title ?? 'Word count goal',
      centered: true,
      onClose: () => settle(undefined),
      children: (
        <WordGoalForm
          initialValue={opts.initialValue}
          onCancel={() => { settle(undefined); modals.close(id); }}
          onClear={() => { settle(null); modals.close(id); }}
          onSave={(value) => { settle(value); modals.close(id); }}
        />
      ),
    });
  });
}

// ---------- alert ----------

export function alertUser(opts: { title?: string; message: React.ReactNode }): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    let id: string;
    id = modals.open({
      title: opts.title ?? 'Notice',
      centered: true,
      onClose: settle,
      children: (
        <Stack gap="md">
          <Text size="sm">{opts.message}</Text>
          <Group justify="flex-end">
            <Button onClick={() => { settle(); modals.close(id); }}>OK</Button>
          </Group>
        </Stack>
      ),
    });
  });
}
