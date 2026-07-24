'use client';

import { Box, Button, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { promptText } from '@/utils/dialogs';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import type { CharacterField } from '@/utils/characterFields';
import CharacterFieldEditor from './CharacterFieldEditor';

// The right-rail of named fields on a character card (background,
// appearance, internal/external conflicts, personality, role in story, plus
// whatever the user adds) — each one a small TipTap editor matching the main
// card editor's theming, so headers/formatting work the same way there.
export default function CharacterFieldsPanel({
  fields,
  onChange,
  spacing,
}: {
  fields: CharacterField[];
  onChange: (next: CharacterField[]) => void;
  spacing: Spacing;
}) {
  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id));

  const setLabel = (id: string, label: string) => onChange(fields.map((f) => (f.id === id ? { ...f, label } : f)));
  const setValue = (id: string, value: string) => onChange(fields.map((f) => (f.id === id ? { ...f, value } : f)));

  const addField = async () => {
    const label = (await promptText({ title: 'Add field', label: 'Field name', placeholder: 'e.g. Motivation' }))?.trim();
    if (!label) return;
    onChange([...fields, { id: crypto.randomUUID(), label, value: '' }]);
  };

  return (
    <Stack gap="md">
      <Text size="sm" fw={600} c="dimmed">Character details</Text>
      <Box className={docSpacingClass} style={spacingVars(spacing)}>
        <Stack gap="md">
          {fields.map((field, index) => (
            <CharacterFieldEditor
              key={field.id}
              field={field}
              smartQuotes={spacing.smartQuotes}
              onLabelChange={(label) => setLabel(field.id, label)}
              onValueChange={(value) => setValue(field.id, value)}
              onMoveUp={() => moveField(index, -1)}
              onMoveDown={() => moveField(index, 1)}
              onDelete={() => removeField(field.id)}
              canMoveUp={index > 0}
              canMoveDown={index < fields.length - 1}
            />
          ))}
        </Stack>
      </Box>
      <Button variant="light" color="gray" size="xs" leftSection={<IconPlus size={14} />} onClick={addField}>
        Add field
      </Button>
    </Stack>
  );
}
