'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Group, Paper, ActionIcon, Textarea, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { IconCheck, IconMessage, IconMessageOff, IconX } from '@tabler/icons-react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { updateCard } from '@app/writing/_actions/writing_actions';
import { writingEditorStyles } from '@/utils/writingTheme';
import {
  type CommentRecord,
  removeCommentMarkFromEditor,
  serializeComments,
} from '@/utils/writingComments';

type SectionCard = { id: number; content: string | null };

// One card rendered as a section of a larger compiled document, with its own
// TipTap editor writing back to that card only — on blur, when content
// changed. Serves both compile surfaces:
//  - the /compile route gives each section its own toolbar (withToolbar,
//    revealed while the section has focus);
//  - the file browser's stack view strips per-section chrome and instead
//    registers its editor with the parent (onEditorReady/onEditorFocus),
//    which drives one shared sticky toolbar for whichever section has focus.
export default function CardSectionEditor({
  card,
  heading,
  comments,
  onCommentsChange,
  withToolbar = false,
  smartQuotes,
  onEditorReady,
  onEditorFocus,
}: {
  card: SectionCard;
  // Section heading shown above the prose (card title, optionally prefixed
  // with list/group context for wider compile scopes).
  heading: string;
  comments: CommentRecord;
  onCommentsChange: (next: CommentRecord) => void;
  withToolbar?: boolean;
  // Board's smart-quotes toggle (default on) — forwarded to the editor.
  smartQuotes?: boolean | null;
  onEditorReady?: (cardId: number, editor: Editor | null) => void;
  onEditorFocus?: (editor: Editor) => void;
}) {
  const editor = useWritingEditor(card.content, true, { smartQuotes });
  const [focused, setFocused] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastSaved = useRef(card.content ?? '');

  const [bubbleMode, setBubbleMode] = useState<'idle' | 'adding' | 'viewing'>('idle');
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Keep a ref so async handlers always see current comments.
  const commentsRef = useRef(comments);
  useEffect(() => { commentsRef.current = comments; }, [comments]);

  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady(card.id, editor);
    return () => onEditorReady(card.id, null);
  }, [editor, card.id, onEditorReady]);

  useEffect(() => {
    if (bubbleMode === 'adding') setTimeout(() => commentInputRef.current?.focus(), 50);
  }, [bubbleMode]);

  // Save content + comments on blur (only when content actually changed).
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => {
      setFocused(true);
      onEditorFocus?.(editor);
    };
    const onBlur = () => {
      setFocused(false);
      const html = editor.getHTML();
      if (html === lastSaved.current) return;
      lastSaved.current = html;
      updateCard(card.id, {
        content: html,
        comments: serializeComments(commentsRef.current),
      }).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
    };
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => { editor.off('focus', onFocus); editor.off('blur', onBlur); };
  }, [editor, card.id, onEditorFocus]);

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text || !editor) return;
    const commentId = crypto.randomUUID();
    editor.chain().focus().setMark('comment', { commentId }).run();
    const next: CommentRecord = {
      ...commentsRef.current,
      [commentId]: { text, createdAt: new Date().toISOString(), anchored: true },
    };
    onCommentsChange(next);
    setNewCommentText('');
    setBubbleMode('idle');
    updateCard(card.id, { content: editor.getHTML() || '', comments: serializeComments(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor) return;
    removeCommentMarkFromEditor(editor, commentId);
    const next = { ...commentsRef.current };
    delete next[commentId];
    onCommentsChange(next);
    updateCard(card.id, {
      content: editor.getHTML() || '',
      comments: serializeComments(next),
    });
  };

  const handleBubbleShow = () => {
    if (!editor) return;
    if (editor.isActive('comment')) {
      const id = editor.getAttributes('comment').commentId as string | null;
      setActiveCommentId(id ?? null);
      setBubbleMode('viewing');
    } else {
      setActiveCommentId(null);
      setBubbleMode('idle');
    }
  };

  return (
    <Box data-card-id={card.id}>
      <Group justify="space-between" mb={4} gap="xs">
        <Text size="xs" tt="uppercase" c="dimmed" fw={700} style={{ letterSpacing: 0.5 }}>
          {heading}
        </Text>
        {saved && (
          <Group gap={2} c="dimmed">
            <IconCheck size={13} />
            <Text size="xs">saved</Text>
          </Group>
        )}
      </Group>
      <RichTextEditor editor={editor} style={{ border: 'none' }} styles={writingEditorStyles()}>
        {withToolbar && (
          <div style={{ visibility: focused ? 'visible' : 'hidden' }}>
            <WritingEditorToolbar />
          </div>
        )}

        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top', onShow: handleBubbleShow }}
            shouldShow={({ editor: ed }) => {
              const { empty } = ed.state.selection;
              return !empty || ed.isActive('comment');
            }}
          >
            <Paper shadow="sm" p={6} withBorder radius="sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {bubbleMode === 'viewing' && activeCommentId && comments[activeCommentId] ? (
                <>
                  <Text size="xs" style={{ maxWidth: 200 }} lineClamp={3}>
                    {comments[activeCommentId].text}
                  </Text>
                  <Tooltip label="Remove comment" withinPortal>
                    <ActionIcon size="xs" color="red.7" variant="subtle"
                      onClick={() => { removeComment(activeCommentId); setBubbleMode('idle'); }}>
                      <IconMessageOff size={13} />
                    </ActionIcon>
                  </Tooltip>
                </>
              ) : bubbleMode === 'adding' ? (
                <>
                  <Textarea
                    ref={commentInputRef}
                    size="xs"
                    placeholder="Add a comment…"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); }
                      if (e.key === 'Escape') { setBubbleMode('idle'); setNewCommentText(''); }
                    }}
                    autosize
                    minRows={1}
                    maxRows={4}
                    style={{ minWidth: 200 }}
                  />
                  <ActionIcon size="sm" color="dark.6" variant="filled" onClick={addComment} disabled={!newCommentText.trim()}>
                    <IconCheck size={13} />
                  </ActionIcon>
                  <ActionIcon size="sm" variant="subtle" onClick={() => { setBubbleMode('idle'); setNewCommentText(''); }}>
                    <IconX size={13} />
                  </ActionIcon>
                </>
              ) : (
                <Tooltip label="Add comment" withinPortal>
                  <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setBubbleMode('adding')}>
                    <IconMessage size={15} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Paper>
          </BubbleMenu>
        )}

        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
