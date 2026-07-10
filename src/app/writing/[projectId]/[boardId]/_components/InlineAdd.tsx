'use client';

import { useState } from 'react';
import { Button, TextInput, Group, ActionIcon } from '@mantine/core';
import { IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { glassStyle, glassTextStyle } from './glass';

// A compact "+ Add ___" control that expands into a text input. Used for
// adding groups, lists, and cards. Calls onAdd with the trimmed value.
export default function InlineAdd({
  label,
  placeholder,
  onAdd,
  variant = 'default',
  fullWidth = false,
  glass = false,
}: {
  label: string;
  placeholder?: string;
  onAdd: (value: string) => void | Promise<void>;
  variant?: 'default' | 'subtle';
  fullWidth?: boolean;
  glass?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const submit = async () => {
    const v = value.trim();
    if (v) await onAdd(v);
    setValue('');
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button
        variant={variant === 'subtle' ? 'subtle' : 'light'}
        color="gray"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={() => setEditing(true)}
        fullWidth={fullWidth}
        justify={fullWidth ? 'flex-start' : undefined}
        style={glass ? { ...glassStyle, ...glassTextStyle } : undefined}
      >
        {label}
      </Button>
    );
  }

  return (
    <Group gap={4} wrap="nowrap" w={fullWidth ? '100%' : undefined}>
      <TextInput
        size="xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setValue('');
            setEditing(false);
          }
        }}
        autoFocus
        style={{ flex: 1 }}
      />
      <ActionIcon variant="filled" color="dark" size="md" onClick={submit} aria-label="Add">
        <IconCheck size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="gray" size="md" onClick={() => { setValue(''); setEditing(false); }} aria-label="Cancel">
        <IconX size={16} />
      </ActionIcon>
    </Group>
  );
}
