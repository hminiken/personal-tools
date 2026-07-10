'use client';

import { useState } from 'react';
import {
  ActionIcon, Badge, Box, Button, Collapse, Combobox, Group, HoverCard, Image, Modal, Paper,
  ScrollArea, SimpleGrid, Stack, Switch, Text, Textarea, Tooltip, useCombobox,
} from '@mantine/core';
import {
  IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconLink,
  IconMessage, IconPhotoPlus, IconPhotoStar, IconPlus, IconTrash, IconX,
} from '@tabler/icons-react';
import { WordCountDisplay, type WordCountSettings } from '@components/WordCountDisplay';
import { UploadModal } from '@components/UploadModal';
import { addCardImage } from '../../../../_actions/writing_actions';
import LabelPicker from '../LabelPicker';
import type { BoardCard, LabelCatalog, LinkedCardRef } from '../../types';
import type { CommentRecord, GalleryImage, ProjectCardOption } from './useCardDetail';

// The slice of card state this sidebar needs. Satisfied by useCardDetail's
// return value (single-card view) and by useStackCardSidebar (the compile
// stack's focused section), so the same sidebar renders in both contexts.
export type CardSidebarController = {
  viewingCard: BoardCard | null;
  includeInCompile: boolean;
  isImageCard: boolean;
  handleToggleCompile: (v: boolean) => void;
  handleToggleImageCard: (v: boolean) => void;
  coverImage: string | null;
  images: GalleryImage[];
  handleSetCover: (path: string) => void;
  handleDeleteImage: (img: GalleryImage) => void;
  handleImageUploaded: (result: GalleryImage | null) => void;
  links: LinkedCardRef[];
  linkedCardIds: Set<number>;
  projectCards: ProjectCardOption[];
  loadProjectCards: () => Promise<void>;
  handleAddLink: (targetCardId: number) => void;
  handleRemoveLink: (linkId: number) => void;
  navigateToLinkedCard: (cardId: number) => void;
  liveWordCount: number;
  handleSetWordGoal: () => void;
  comments: CommentRecord;
  commentsOpen: boolean;
  setCommentsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addGeneralNote: (text: string) => void;
  removeComment: (commentId: string) => void;
  jumpToComment: (commentId: string) => void;
};

// Linked-card badges get a subtle outline elsewhere in the app, but on the
// frosted glass pane a plain gray outline nearly disappears — route the
// color through the same --mantine-color-dimmed variable the glass pane
// already brightens, so it's visible on glass and unchanged off of it.
const dimmedGlassStyle = { color: 'var(--mantine-color-dimmed)', borderColor: 'var(--mantine-color-dimmed)' };

// Right-rail "attachments" pane for a selected card: labels + the two
// board-specific switches, image gallery, linked cards, word count/goal, and
// the comments list. Reads and mutates the same `useCardDetail` state
// CardDetailCenter is bound to, so jump-to/remove-comment act on the exact
// editor instance the center pane's bubble menu is using.
export default function CardDetailSidebar({
  detail,
  catalog,
  onManageLabels,
  wcSettings,
}: {
  detail: CardSidebarController;
  catalog: LabelCatalog;
  onManageLabels: () => void;
  wcSettings: WordCountSettings;
}) {
  const { viewingCard } = detail;

  const [pickerSearch, setPickerSearch] = useState('');
  const pickerCombobox = useCombobox({
    onDropdownClose: () => { pickerCombobox.resetSelectedOption(); setPickerSearch(''); },
  });
  const [galleryOpened, setGalleryOpened] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!viewingCard) return null;

  const commentCount = Object.keys(detail.comments).length;

  const submitNote = () => {
    if (!noteText.trim()) return;
    detail.addGeneralNote(noteText);
    setNoteText('');
    setAddingNote(false);
  };

  const showPrev = () => setViewerIndex((i) => (i === null ? null : i > 0 ? i - 1 : detail.images.length - 1));
  const showNext = () => setViewerIndex((i) => (i === null ? null : i < detail.images.length - 1 ? i + 1 : 0));

  const handleOpenPicker = async () => {
    await detail.loadProjectCards();
    pickerCombobox.openDropdown();
  };

  const pickerOptions = detail.projectCards.filter(
    (c) => c.id !== viewingCard.id && !detail.linkedCardIds.has(c.id) &&
      (pickerSearch === '' || c.title.toLowerCase().includes(pickerSearch.toLowerCase())),
  );

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

      {/* Images */}
      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={600} c="dimmed">Images ({detail.images.length})</Text>
          <ActionIcon color="dark" size="sm" variant="light" onClick={() => setGalleryOpened(true)} aria-label="Add image">
            <IconPhotoPlus size={16} />
          </ActionIcon>
        </Group>
        {detail.images.length > 0 && (
          <SimpleGrid cols={2} spacing="xs">
            {detail.images.map((img, index) => (
              <Box key={img.id} style={{ position: 'relative' }}>
                <Image
                  src={img.path} alt="" h={80} radius="sm" fit="cover"
                  style={{ cursor: 'pointer', outline: detail.coverImage === img.path ? '2px solid var(--mantine-color-dark-6)' : 'none' }}
                  onClick={() => setViewerIndex(index)}
                  fallbackSrc="https://placehold.co/120x120?text=Image"
                />
                <Tooltip label={detail.coverImage === img.path ? 'Cover image' : 'Set as cover'} withinPortal>
                  <ActionIcon variant="filled" color={detail.coverImage === img.path ? 'dark.6' : 'gray'} size="sm"
                    style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}
                    onClick={() => detail.handleSetCover(img.path)} aria-label="Set as cover">
                    <IconPhotoStar size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete image" withinPortal>
                  <ActionIcon variant="filled" color="red.7" size="sm"
                    style={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }}
                    onClick={() => detail.handleDeleteImage(img)} aria-label="Delete image">
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Linked cards */}
      <Box>
        <Text size="sm" fw={600} c="dimmed" mb={6}>Linked cards</Text>
        <Group gap={6} align="center">
          {detail.links.map((link) => (
            <HoverCard key={link.linkId} width={260} shadow="md" withinPortal openDelay={300} closeDelay={100}>
              <HoverCard.Target>
                <Badge
                  size="sm"
                  variant="outline"
                  color="gray"
                  leftSection={<IconLink size={10} style={{ display: 'block' }} />}
                  rightSection={
                    <ActionIcon
                      size={12}
                      variant="transparent"
                      color="gray"
                      style={dimmedGlassStyle}
                      onClick={(e) => { e.stopPropagation(); detail.handleRemoveLink(link.linkId); }}
                      aria-label="Remove link"
                    >
                      <IconX size={9} />
                    </ActionIcon>
                  }
                  style={{ ...dimmedGlassStyle, cursor: 'pointer', maxWidth: 180 }}
                  onClick={() => detail.navigateToLinkedCard(link.cardId)}
                >
                  {link.title}
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size="sm" fw={600} lineClamp={2}>{link.title}</Text>
                {link.boardTitle && <Text size="xs" c="dimmed" mt={2}>{link.boardTitle}</Text>}
                {link.contentPreview && <Text size="xs" mt={4} lineClamp={4} c="dimmed">{link.contentPreview}</Text>}
                <Text size="xs" c="blue" mt={6}>Click to open</Text>
              </HoverCard.Dropdown>
            </HoverCard>
          ))}

          <Combobox store={pickerCombobox} onOptionSubmit={(val) => detail.handleAddLink(Number(val))} withinPortal>
            <Combobox.Target>
              <Tooltip label="Link another card" withinPortal>
                <ActionIcon size="sm" variant="subtle" color="gray" style={dimmedGlassStyle} onClick={handleOpenPicker} aria-label="Link card">
                  <IconPlus size={13} />
                </ActionIcon>
              </Tooltip>
            </Combobox.Target>
            <Combobox.Dropdown style={{ minWidth: 260 }}>
              <Combobox.Search value={pickerSearch} onChange={(e) => setPickerSearch(e.currentTarget.value)} placeholder="Search cards…" />
              <Combobox.Options>
                <ScrollArea.Autosize mah={240} type="scroll">
                  {pickerOptions.length === 0 ? (
                    <Combobox.Empty>No cards found</Combobox.Empty>
                  ) : (
                    pickerOptions.map((c) => (
                      <Combobox.Option key={c.id} value={String(c.id)}>
                        <Text size="sm" lineClamp={1}>{c.title}</Text>
                        <Text size="xs" c="dimmed">{c.boardTitle} · {c.listTitle}</Text>
                      </Combobox.Option>
                    ))
                  )}
                </ScrollArea.Autosize>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </Group>
      </Box>

      {wcSettings.mode !== 'off' && (
        <Box>
          <WordCountDisplay
            count={detail.liveWordCount}
            goal={viewingCard.wordCountGoal ?? wcSettings.defaultCardGoal}
            mode={wcSettings.mode}
            size="sm"
          />
          <Button variant="subtle" size="compact-xs" color="gray" px={0} style={{ color: 'var(--mantine-color-dimmed)' }} onClick={detail.handleSetWordGoal}>
            Set goal…
          </Button>
        </Box>
      )}

      {/* Comments + card notes */}
      <Box>
        <Group justify="space-between" gap="xs">
          <Group gap="xs" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => detail.setCommentsOpen((v) => !v)}>
            <IconMessage size={15} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">Comments {commentCount > 0 ? `(${commentCount})` : ''}</Text>
            {detail.commentsOpen ? <IconChevronUp size={13} color="var(--mantine-color-dimmed)" /> : <IconChevronDown size={13} color="var(--mantine-color-dimmed)" />}
          </Group>
          <Tooltip label="Add a general note (not tied to any text)" withinPortal>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              style={{ color: 'var(--mantine-color-dimmed)' }}
              onClick={() => { detail.setCommentsOpen(true); setAddingNote(true); }}
              aria-label="Add note"
            >
              <IconPlus size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Collapse expanded={detail.commentsOpen}>
          <Stack gap="xs" mt="xs">
            {addingNote && (
              <Group gap={6} align="flex-start" wrap="nowrap">
                <Textarea
                  size="xs"
                  placeholder="Note about this card…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNote(); }
                    if (e.key === 'Escape') { setAddingNote(false); setNoteText(''); }
                  }}
                  autosize
                  minRows={1}
                  maxRows={5}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <ActionIcon size="sm" color="dark.6" variant="filled" onClick={submitNote} disabled={!noteText.trim()}>
                  <IconCheck size={13} />
                </ActionIcon>
                <ActionIcon size="sm" variant="subtle" onClick={() => { setAddingNote(false); setNoteText(''); }}>
                  <IconX size={13} />
                </ActionIcon>
              </Group>
            )}

            {commentCount === 0 && !addingNote ? (
              <Text size="xs" c="dimmed">No comments yet. Select text in the editor to comment on it, or add a general note above.</Text>
            ) : (
              Object.entries(detail.comments).map(([id, { text, createdAt, anchored }]) => (
                <Paper
                  key={id}
                  p="xs"
                  withBorder
                  radius="sm"
                  bg={anchored === false
                    ? 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))'
                    : 'light-dark(var(--mantine-color-yellow-0), var(--mantine-color-dark-6))'}
                  style={{ cursor: anchored === false ? 'default' : 'pointer' }}
                  onClick={anchored === false ? undefined : () => detail.jumpToComment(id)}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      {anchored === false && (
                        <Text size="9px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: 0.5 }}>Note</Text>
                      )}
                      <Text size="sm">{text}</Text>
                      <Text size="10px" c="dimmed" mt={2}>
                        {new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                    <Tooltip label={anchored === false ? 'Remove note' : 'Remove comment'} withinPortal>
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

      <UploadModal
        opened={galleryOpened}
        close={() => setGalleryOpened(false)}
        targetId={viewingCard.id}
        idFieldName="cardId"
        uploadAction={addCardImage}
        revalidateUrl="/writing"
        showLibrary={false}
        onUploaded={detail.handleImageUploaded}
      />

      <Modal
        opened={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        withCloseButton={false}
        size="auto"
        centered
        padding={0}
        styles={{ content: { backgroundColor: 'transparent', boxShadow: 'none' } }}
      >
        {viewerIndex !== null && detail.images[viewerIndex] && (
          <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {detail.images.length > 1 && (
              <ActionIcon variant="filled" color="dark" size="xl" radius="xl"
                style={{ position: 'absolute', left: 10, zIndex: 10, opacity: 0.7 }}
                onClick={showPrev} aria-label="Previous image">
                <IconChevronLeft size={24} />
              </ActionIcon>
            )}
            <Image src={detail.images[viewerIndex].path} alt="" style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain' }} />
            {detail.images.length > 1 && (
              <ActionIcon variant="filled" color="dark" size="xl" radius="xl"
                style={{ position: 'absolute', right: 10, zIndex: 10, opacity: 0.7 }}
                onClick={showNext} aria-label="Next image">
                <IconChevronRight size={24} />
              </ActionIcon>
            )}
          </Box>
        )}
      </Modal>
    </Stack>
  );
}
