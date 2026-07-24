'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, TextInput, Tooltip } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconTrash } from '@tabler/icons-react';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { writingEditorStyles } from '@/utils/writingTheme';
import type { CharacterField } from '@/utils/characterFields';

// One field's editor — a small TipTap instance matching the main card
// editor (same theming, headers/formatting available), scoped to just this
// field's value. Uses the abbreviated single-row toolbar (see
// WritingEditorToolbar's `compact` mode) since several of these stack in the
// narrow side rail; it's always visible rather than only-on-focus.
export default function CharacterFieldEditor({
  field,
  onLabelChange,
  onValueChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
  smartQuotes,
}: {
  field: CharacterField;
  onLabelChange: (label: string) => void;
  onValueChange: (html: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  smartQuotes?: boolean | null;
}) {
  const [label, setLabel] = useState(field.label);
  const editor = useWritingEditor(field.value, true, { smartQuotes });
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const commitLabel = () => {
    const t = label.trim();
    if (!t) { setLabel(field.label); return; }
    if (t !== field.label) onLabelChange(t);
  };

  useEffect(() => {
    if (!editor) return;
    const onBlur = () => onValueChangeRef.current(editor.getHTML());
    editor.on('blur', onBlur);
    return () => { editor.off('blur', onBlur); };
  }, [editor]);

  return (
    <Box>
      <Group gap={4} wrap="nowrap" mb={4}>
        <TextInput
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          variant="unstyled"
          size="sm"
          style={{ flex: 1 }}
          styles={{ input: { fontWeight: 600, minHeight: 'unset' } }}
        />
        <Tooltip label="Move up" withinPortal>
          <ActionIcon size="sm" variant="subtle" color="gray" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Move field up">
            <IconChevronUp size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Move down" withinPortal>
          <ActionIcon size="sm" variant="subtle" color="gray" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Move field down">
            <IconChevronDown size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete field" withinPortal>
          <ActionIcon size="sm" variant="subtle" color="red.7" onClick={onDelete} aria-label="Delete field">
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <RichTextEditor
        editor={editor}
        styles={{
          ...writingEditorStyles(),
          content: { ...writingEditorStyles().content, minHeight: 60, maxHeight: 220, overflowY: 'auto', paddingRight: 30 },
        }}
      >
        <WritingEditorToolbar compact />
        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
