'use client';

import { useCallback, useState } from 'react';
import { Box, Group, SegmentedControl, Text, Title, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import type { Editor } from '@tiptap/react';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import type { WordCountSettings } from '@components/WordCountDisplay';
import CardSectionEditor from '../CardSectionEditor';
import { type CommentRecord, parseComments } from '@/utils/writingComments';
import CardDetailSidebar from './CardDetailSidebar';
import { useStackCardSidebar } from './useStackCardSidebar';
import Pane, { stickyPaneStyle } from './Pane';
import type { BoardCard, LabelCatalog } from '../../types';
import { editorTextResetStyle } from './types';
import { writingEditorStyles } from '@/utils/writingTheme';
import classes from './StackCompileView.module.css';
import toolbarClasses from './EditorToolbarBleed.module.css';

export type CompileSection = { card: BoardCard; label: string };

function CardDivider() {
  return <div aria-hidden style={{ borderTop: '2px dashed var(--theme-card-border, var(--mantine-color-gray-4))', margin: '10px 0' }} />;
}

// Renders the read-only merged document for select mode. A separate component
// so the useWritingEditor hook only runs while this mode is active; content
// is a snapshot merged from the live edit-mode editors at toggle time.
function SelectModeDoc({ mergedHtml, smartQuotes }: { mergedHtml: string; smartQuotes?: boolean | null }) {
  const editor = useWritingEditor(mergedHtml, false, { smartQuotes });
  return (
    <div className={classes.selectDoc}>
      <RichTextEditor editor={editor} style={{ border: 'none' }} styles={{ content: writingEditorStyles().content }}>
        <RichTextEditor.Content />
      </RichTextEditor>
    </div>
  );
}

// "Compile" view for a board/group/list selection in the file browser: all
// cards concatenated into what reads as one document. Edit mode keeps one
// TipTap editor per card (each section saves to its own card — the child
// file, never a merged master), chrome stripped, with a single shared sticky
// toolbar bound to whichever section holds the cursor. Select mode swaps in
// one real read-only merged editor so text can be selected/copied across
// section boundaries; being read-only, it has no save path at all.
//
// Renders TWO grid columns (main + right sidebar) as fragment siblings —
// the sidebar shows the focused section's card attachments, driven by
// useStackCardSidebar against that section's own editor instance.
export default function StackCompileView({
  title,
  sections,
  spacing,
  projectId,
  hasBg,
  catalog,
  wcSettings,
  onManageLabels,
  onNavigateToCard,
  onPeekCard,
}: {
  title: string;
  sections: CompileSection[];
  spacing: Spacing;
  projectId: number;
  hasBg: boolean;
  catalog: LabelCatalog;
  wcSettings: WordCountSettings;
  onManageLabels: () => void;
  onNavigateToCard: (cardId: number) => void;
  onPeekCard: (cardId: number) => void;
}) {
  const [mode, setMode] = useState<'edit' | 'select'>('edit');
  const [active, setActive] = useState<{ cardId: number; editor: Editor } | null>(null);
  const [mergedHtml, setMergedHtml] = useState('');

  // Live editor instances by card id, used to snapshot current (possibly
  // not-yet-blur-saved) text when building the select-mode document, and to
  // pick a fallback toolbar target before any section has been focused.
  const [editors, setEditors] = useState<Map<number, Editor>>(() => new Map());

  const [cardComments, setCardComments] = useState<Record<number, CommentRecord>>(() => {
    const init: Record<number, CommentRecord> = {};
    for (const { card } of sections) {
      if (card.comments) init[card.id] = parseComments(card.comments);
    }
    return init;
  });

  const handleCommentsChange = useCallback((cardId: number, next: CommentRecord) => {
    setCardComments((prev) => ({ ...prev, [cardId]: next }));
  }, []);

  const handleEditorReady = useCallback((cardId: number, editor: Editor | null) => {
    setEditors((prev) => {
      const next = new Map(prev);
      if (editor) next.set(cardId, editor);
      else next.delete(cardId);
      return next;
    });
    if (!editor) setActive((prev) => (prev && prev.cardId === cardId ? null : prev));
  }, []);

  const activeCard = active ? sections.find((s) => s.card.id === active.cardId)?.card ?? null : null;

  const sidebar = useStackCardSidebar({
    card: activeCard,
    editor: active?.editor ?? null,
    comments: activeCard ? cardComments[activeCard.id] ?? {} : {},
    onCommentsChange: (next) => { if (activeCard) handleCommentsChange(activeCard.id, next); },
    projectId,
    onNavigateToCard,
  });

  const handleModeChange = (next: string) => {
    if (next === 'select') {
      // Snapshot from the live editors so just-typed (blur-pending) text is
      // included; fall back to stored content for anything not mounted.
      const merged = sections
        .map(({ card }) => editors.get(card.id)?.getHTML() ?? card.content ?? '')
        .join('<hr>');
      setMergedHtml(merged);
    }
    setMode(next as 'edit' | 'select');
  };

  const toolbarEditor = active?.editor ?? editors.get(sections[0]?.card.id) ?? null;
  const showSidebar = mode === 'edit' && !!activeCard;

  return (
    <>
      <Pane hasBg={hasBg} solid>
        {/* Sticky toolbar sits first, above the title — it's the first thing
            in the pane so nothing scrolls past above it once it locks in
            place. A flat, fully opaque bar (matching the solid editor sheet)
            so scrolled prose never shows through and no translucent layers
            stack over the board photo behind it. */}
        {sections.length > 0 && mode === 'edit' && (
          <div
            className={toolbarClasses.stickyToolbar}
            style={{
              background: 'var(--theme-editor-header-bg, var(--theme-editor-bg, var(--mantine-color-body)))',
              color: 'var(--theme-editor-header-text, inherit)',
              // borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <RichTextEditor
              editor={toolbarEditor}
              style={{ border: 'none', background: 'none' }}
              styles={{ toolbar: writingEditorStyles().toolbar, controlsGroup: writingEditorStyles().controlsGroup, control: writingEditorStyles().control }}
            >
              <WritingEditorToolbar />
            </RichTextEditor>
          </div>
        )}

        <Group justify="space-between" align="center" mb="md" mt="sm" wrap="nowrap">
          <Title order={4} lineClamp={1}>{title}</Title>
          <Tooltip label="Edit: each section saves to its own card. Select: read-only, but text can be selected across sections." withinPortal multiline w={260}>
            <SegmentedControl
              size="xs"
              color="dark"
              value={mode}
              onChange={handleModeChange}
              data={[
                { value: 'edit', label: 'Edit' },
                { value: 'select', label: 'Select' },
              ]}
            />
          </Tooltip>
        </Group>

        {sections.length === 0 ? (
          <Text c="dimmed" size="sm" fs="italic">No cards yet.</Text>
        ) : (
          <>
            {/* Edit mode stays mounted (hidden) during select mode so the
                per-card editors keep their state and pending edits. */}
            <div style={{ display: mode === 'edit' ? undefined : 'none' }}>
              <Box className={docSpacingClass} style={{ ...spacingVars(spacing), ...editorTextResetStyle }}>
                {sections.map(({ card, label }, i) => (
                  <Box key={card.id}>
                    {i > 0 && <CardDivider />}
                    <CardSectionEditor
                      card={card}
                      heading={label}
                      comments={cardComments[card.id] ?? {}}
                      smartQuotes={spacing.smartQuotes}
                      onCommentsChange={(next) => handleCommentsChange(card.id, next)}
                      onEditorReady={handleEditorReady}
                      onEditorFocus={(editor) => setActive({ cardId: card.id, editor })}
                    />
                  </Box>
                ))}
              </Box>
            </div>

            {mode === 'select' && (
              <Box className={docSpacingClass} style={{ ...spacingVars(spacing), ...editorTextResetStyle }} mt="sm">
                <SelectModeDoc mergedHtml={mergedHtml} smartQuotes={spacing.smartQuotes} />
              </Box>
            )}
          </>
        )}
      </Pane>

      {showSidebar ? (
        <Pane hasBg={hasBg} style={stickyPaneStyle}>
          <CardDetailSidebar detail={sidebar} catalog={catalog} onManageLabels={onManageLabels} wcSettings={wcSettings} onPeekCard={onPeekCard} spacing={spacing} />
        </Pane>
      ) : (
        <div />
      )}
    </>
  );
}
