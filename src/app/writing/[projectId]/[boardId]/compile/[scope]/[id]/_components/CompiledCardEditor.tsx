'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Group, Paper, ActionIcon, Textarea, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { IconCheck, IconMessage, IconMessageOff, IconX } from '@tabler/icons-react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { updateCard } from '@app/writing/_actions/writing_actions';
import type { Card } from '../types';

export type CommentRecord = Record<string, { text: string; createdAt: string }>;

export default function CompiledCardEditor({
  card,
  comments,
  onCommentsChange,
}: {
  card: Card;
  comments: CommentRecord;
  onCommentsChange: (next: CommentRecord) => void;
}) {
  const editor = useWritingEditor(card.content, true);
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
    if (bubbleMode === 'adding') setTimeout(() => commentInputRef.current?.focus(), 50);
  }, [bubbleMode]);

  // Save content + comments on blur (only when content actually changed).
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => setFocused(true);
    const onBlur = () => {
      setFocused(false);
      const html = editor.getHTML();
      if (html === lastSaved.current) return;
      lastSaved.current = html;
      const cur = commentsRef.current;
      updateCard(card.id, {
        content: html,
        comments: Object.keys(cur).length > 0 ? JSON.stringify(cur) : null,
      }).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
    };
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => { editor.off('focus', onFocus); editor.off('blur', onBlur); };
  }, [editor, card.id]);

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text || !editor) return;
    const commentId = crypto.randomUUID();
    editor.chain().focus().setMark('comment', { commentId }).run();
    const next = { ...commentsRef.current, [commentId]: { text, createdAt: new Date().toISOString() } };
    onCommentsChange(next);
    setNewCommentText('');
    setBubbleMode('idle');
    updateCard(card.id, { content: editor.getHTML() || '', comments: JSON.stringify(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor) return;
    const { state } = editor;
    const tr = state.tr;
    const markType = state.schema.marks.comment;
    if (markType) {
      state.doc.descendants((node, pos) => {
        const m = node.marks.find((mk) => mk.type === markType && mk.attrs.commentId === commentId);
        if (m) tr.removeMark(pos, pos + node.nodeSize, markType);
      });
      editor.view.dispatch(tr);
    }
    const next = { ...commentsRef.current };
    delete next[commentId];
    onCommentsChange(next);
    updateCard(card.id, {
      content: editor.getHTML() || '',
      comments: Object.keys(next).length > 0 ? JSON.stringify(next) : null,
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
          {card.title}
        </Text>
        {saved && (
          <Group gap={2} c="olive.7">
            <IconCheck size={13} />
            <Text size="xs">saved</Text>
          </Group>
        )}
      </Group>
      <RichTextEditor editor={editor} style={{ border: 'none' }}>
        <div style={{ visibility: focused ? 'visible' : 'hidden' }}>
          <WritingEditorToolbar />
        </div>

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
                    <ActionIcon size="xs" color="rust.7" variant="subtle"
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
                  <ActionIcon size="sm" color="olive.6" variant="filled" onClick={addComment} disabled={!newCommentText.trim()}>
                    <IconCheck size={13} />
                  </ActionIcon>
                  <ActionIcon size="sm" variant="subtle" onClick={() => { setBubbleMode('idle'); setNewCommentText(''); }}>
                    <IconX size={13} />
                  </ActionIcon>
                </>
              ) : (
                <Tooltip label="Add comment" withinPortal>
                  <ActionIcon size="sm" variant="subtle" color="olive.6" onClick={() => setBubbleMode('adding')}>
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
