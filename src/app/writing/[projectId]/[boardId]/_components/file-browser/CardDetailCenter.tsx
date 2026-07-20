'use client';

import {
  ActionIcon, Box, Group, Image, Paper,
  Text, Textarea, TextInput, Title, Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft, IconCheck, IconMessage,
  IconMessageOff, IconPencil, IconTrash, IconX,
} from '@tabler/icons-react';
import { BubbleMenu } from '@tiptap/react/menus';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import { writingEditorStyles } from '@/utils/writingTheme';
import type { CardDetailState } from './useCardDetail';
import { editorTextResetStyle } from './types';

// Center pane for a selected card: title and the rich-text editor. All
// state lives in the shared `useCardDetail` hook — this component only
// reads/writes it, mirroring CardEditorModal's JSX but without the Modal
// chrome or the labels/switches/linked-cards/images/comments (those are in
// CardDetailSidebar, on the same `detail` object).
export default function CardDetailCenter({
  detail,
  spacing,
}: {
  detail: CardDetailState;
  spacing: Spacing;
}) {
  const { viewingCard } = detail;
  if (!viewingCard) return null;

  return (
    <Box>
      {/* Title */}
      <Group gap="xs" wrap="nowrap" mb="sm">
        {detail.canGoBack && (
          <Tooltip label="Back to previous card" withinPortal>
            <ActionIcon variant="subtle" size="sm" onClick={detail.goBack} aria-label="Back">
              <IconArrowLeft size={15} />
            </ActionIcon>
          </Tooltip>
        )}
        {detail.editingTitle ? (
          <TextInput
            value={detail.title}
            onChange={(e) => detail.setTitle(e.currentTarget.value)}
            onBlur={detail.commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                e.stopPropagation();
                detail.setTitle(viewingCard.title ?? '');
                detail.setEditingTitle(false);
              }
            }}
            autoFocus
            size="sm"
            placeholder="Card title"
            style={{ flex: 1 }}
          />
        ) : (
          <Group gap="xs" wrap="nowrap" align="center" style={{ cursor: 'text', flex: 1, minWidth: 0 }} onClick={() => detail.setEditingTitle(true)}>
            {detail.coverImage && <Image src={detail.coverImage} alt="" w={28} h={28} radius="sm" fit="cover" style={{ flexShrink: 0 }} />}
            <Title order={4} style={{ minWidth: 0 }} lineClamp={1}>{detail.title || 'Untitled'}</Title>
            <Tooltip label="Click to rename" withinPortal>
              <IconPencil size={15} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
            </Tooltip>
          </Group>
        )}
        <Tooltip label="Delete card" withinPortal>
          <ActionIcon variant="subtle" color="red.7" size="sm" onClick={detail.handleDelete} aria-label="Delete card">
            <IconTrash size={15} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Editor + comment bubble menu — kept at standard light/dark text
          colors regardless of the glass pane's forced-white chrome text. */}
      <div className={docSpacingClass} style={{ ...spacingVars(spacing), ...editorTextResetStyle }}>
        <RichTextEditor editor={detail.editor} styles={writingEditorStyles()}>
          <WritingEditorToolbar />

          {detail.editor && (
            <BubbleMenu
              editor={detail.editor}
              options={{ placement: 'top', onShow: detail.handleBubbleShow }}
              shouldShow={({ editor: ed }) => {
                const { empty } = ed.state.selection;
                return !empty || ed.isActive('comment');
              }}
            >
              <Paper shadow="sm" p={6} withBorder radius="sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {detail.bubbleMode === 'viewing' && detail.activeCommentId && detail.comments[detail.activeCommentId] ? (
                  <>
                    <Text size="xs" style={{ maxWidth: 200 }} lineClamp={3}>{detail.comments[detail.activeCommentId].text}</Text>
                    <Tooltip label="Remove comment" withinPortal>
                      <ActionIcon size="xs" color="red.7" variant="subtle"
                        onClick={() => { detail.removeComment(detail.activeCommentId!); detail.setBubbleMode('idle'); }}>
                        <IconMessageOff size={13} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                ) : detail.bubbleMode === 'adding' ? (
                  <>
                    <Textarea
                      ref={detail.commentInputRef}
                      size="xs"
                      placeholder="Add a comment…"
                      value={detail.newCommentText}
                      onChange={(e) => detail.setNewCommentText(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); detail.addComment(); }
                        if (e.key === 'Escape') { detail.setBubbleMode('idle'); detail.setNewCommentText(''); }
                      }}
                      autosize
                      minRows={1}
                      maxRows={4}
                      style={{ minWidth: 200 }}
                    />
                    <ActionIcon size="sm" color="dark.6" variant="filled" onClick={detail.addComment} disabled={!detail.newCommentText.trim()}>
                      <IconCheck size={13} />
                    </ActionIcon>
                    <ActionIcon size="sm" variant="subtle" onClick={() => { detail.setBubbleMode('idle'); detail.setNewCommentText(''); }}>
                      <IconX size={13} />
                    </ActionIcon>
                  </>
                ) : (
                  <Tooltip label="Add comment" withinPortal>
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => detail.setBubbleMode('adding')}>
                      <IconMessage size={15} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Paper>
            </BubbleMenu>
          )}

          <RichTextEditor.Content />
        </RichTextEditor>
      </div>
    </Box>
  );
}
