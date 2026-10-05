'use client';

// Building blocks shared by the pattern view and the project workspace: the
// collapsible "Pattern Content" header, the sticky tab bar, and the main
// pattern text (rich-text editor, or the Rainbow Steps rendering).

import { ActionIcon, Group, Title, Typography, useComputedColorScheme, type TabsProps } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { CraftingEditorToolbar } from '@components/CraftingEditorToolbar';
import { processWholePattern } from '@/utils/patternHighlighter';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';

/** Saved HTML shown read-only, with a placeholder line when it's empty. */
export function ReadOnlyHtml({ html, fallback }: { html: string | null | undefined; fallback: string }) {
  return (
    <Typography p={0}>
      <div dangerouslySetInnerHTML={{ __html: sanitizePatternHtml(html) || `<p>${fallback}</p>` }} />
    </Typography>
  );
}

/**
 * Tab bar styles. While reading, the bar sticks under the header so it stays
 * in reach on a long pattern; while editing it doesn't, so it can't collide
 * with the editor toolbar (which sticks at the same offset).
 */
export function contentTabsStyles(isEditing: boolean): TabsProps['styles'] {
  return {
    list: {
      flexWrap: 'nowrap',
      overflowX: 'auto',
      ...(!isEditing && {
        position: 'sticky',
        top: 60,
        zIndex: 3,
        backgroundColor: 'var(--mantine-color-body)',
      }),
    },
  };
}

/** Section title with a collapse chevron, plus action buttons on the right. */
export function CollapsibleHeader({
  title,
  opened,
  onToggle,
  children,
}: {
  title: string;
  opened: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" mb="sm" gap="sm">
      <Group gap={6} onClick={onToggle} style={{ cursor: 'pointer' }}>
        <ActionIcon variant="subtle" color="gray" aria-label={opened ? 'Collapse content' : 'Expand content'}>
          {opened ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
        </ActionIcon>
        <Title order={4}>{title}</Title>
      </Group>
      <Group gap="sm">{children}</Group>
    </Group>
  );
}

// Keeps big images and long lines inside the column on phones.
const EDITOR_CONTENT_STYLES = {
  content: {
    '& .ProseMirror': { overflowX: 'hidden' },
    '& .ProseMirror img': { maxWidth: '100%', height: 'auto !important' },
    '& .ProseMirror span.resizeCursor': { display: 'inline-block', maxWidth: '100%' },
  },
};

/**
 * The main pattern text. Edit mode shows the toolbar; read mode is borderless.
 * With Rainbow Steps on (and not editing) it renders the color-coded version.
 */
export function PatternText({
  editor,
  isEditing,
  rainbow,
  fontSize,
}: {
  editor: Editor | null;
  isEditing: boolean;
  rainbow: boolean;
  /** Font size for the Rainbow Steps rendering. */
  fontSize?: string;
}) {
  const colorScheme = useComputedColorScheme('light');

  if (rainbow && !isEditing) {
    return (
      <Typography style={{ fontSize, lineHeight: 1.8 }}>
        <div dangerouslySetInnerHTML={{ __html: processWholePattern(editor?.getHTML() || '', colorScheme) }} />
      </Typography>
    );
  }

  return (
    <RichTextEditor
      editor={editor}
      style={{ border: isEditing ? undefined : 'none' }}
      styles={EDITOR_CONTENT_STYLES}
    >
      {isEditing && <CraftingEditorToolbar />}
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}

/** A secondary tab (materials, notes...): editor while editing, saved HTML otherwise. */
export function TabContent({
  editor,
  isEditing,
  originalContent,
  fallbackText,
}: {
  editor: Editor | null;
  isEditing: boolean;
  originalContent: string | null;
  fallbackText: string;
}) {
  if (!isEditing) return <ReadOnlyHtml html={originalContent} fallback={fallbackText} />;
  return (
    <RichTextEditor editor={editor}>
      <CraftingEditorToolbar />
      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
