'use client';

import {
  ActionIcon, Box, Button, Collapse, Group, Paper, Stack, Switch, Text, Tooltip,
} from '@mantine/core';
import {
  IconChevronDown, IconChevronUp, IconMessage, IconTrash,
} from '@tabler/icons-react';
import { WordCountDisplay, type WordCountSettings } from '@components/WordCountDisplay';
import LabelPicker from '../LabelPicker';
import type { LabelCatalog } from '../../types';
import type { CardDetailState } from './useCardDetail';

// Right-rail "attachments" pane for a selected card: labels + the two
// board-specific switches, word count/goal, and the comments list. Reads and
// mutates the same `useCardDetail` state CardDetailCenter is bound to, so
// jump-to/remove-comment act on the exact editor instance the center pane's
// bubble menu is using.
export default function CardDetailSidebar({
  detail,
  catalog,
  onManageLabels,
  wcSettings,
}: {
  detail: CardDetailState;
  catalog: LabelCatalog;
  onManageLabels: () => void;
  wcSettings: WordCountSettings;
}) {
  const { viewingCard } = detail;
  if (!viewingCard) return null;

  const commentCount = Object.keys(detail.comments).length;

  return (
    <Stack gap="md">
      <LabelPicker key={viewingCard.id} card={viewingCard} catalog={catalog} onManage={onManageLabels} inline>
        <Stack gap={6} mt={6}>
          <Tooltip label="When off, this card is skipped in the compiled chapter/board view." withinPortal multiline w={220} position="top-start">
            <Switch label="Include in compile" checked={detail.includeInCompile} onChange={(e) => detail.handleToggleCompile(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
          <Tooltip label="Show an image on the board instead of the title and text." withinPortal multiline w={220} position="top-start">
            <Switch label="Image card" checked={detail.isImageCard} onChange={(e) => detail.handleToggleImageCard(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
        </Stack>
      </LabelPicker>

      {wcSettings.mode !== 'off' && (
        <Box>
          <WordCountDisplay
            count={detail.liveWordCount}
            goal={viewingCard.wordCountGoal ?? wcSettings.defaultCardGoal}
            mode={wcSettings.mode}
            size="sm"
          />
          <Button variant="subtle" size="compact-xs" color="gray" px={0} onClick={detail.handleSetWordGoal}>
            Set goal…
          </Button>
        </Box>
      )}

      {/* Comments */}
      <Box>
        <Group gap="xs" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => detail.setCommentsOpen((v) => !v)}>
          <IconMessage size={15} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed">Comments {commentCount > 0 ? `(${commentCount})` : ''}</Text>
          {detail.commentsOpen ? <IconChevronUp size={13} color="var(--mantine-color-dimmed)" /> : <IconChevronDown size={13} color="var(--mantine-color-dimmed)" />}
        </Group>

        <Collapse expanded={detail.commentsOpen}>
          <Stack gap="xs" mt="xs">
            {commentCount === 0 ? (
              <Text size="xs" c="dimmed">No comments yet. Select text in the editor to add one.</Text>
            ) : (
              Object.entries(detail.comments).map(([id, { text, createdAt }]) => (
                <Paper key={id} p="xs" withBorder radius="sm" bg="light-dark(var(--mantine-color-yellow-0), var(--mantine-color-dark-6))"
                  style={{ cursor: 'pointer' }} onClick={() => detail.jumpToComment(id)}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm">{text}</Text>
                      <Text size="10px" c="dimmed" mt={2}>
                        {new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                    <Tooltip label="Remove comment" withinPortal>
                      <ActionIcon size="xs" color="red.7" variant="subtle" onClick={(e) => { e.stopPropagation(); detail.removeComment(id); }}>
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        </Collapse>
      </Box>
    </Stack>
  );
}
