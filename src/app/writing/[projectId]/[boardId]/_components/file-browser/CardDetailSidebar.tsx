'use client';

import { useState } from 'react';
import {
  ActionIcon, Badge, Box, Button, Collapse, Combobox, Group, HoverCard, Image, Paper,
  ScrollArea, SimpleGrid, Stack, Switch, Text, Textarea, Tooltip, useCombobox,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconCheck, IconChevronDown, IconChevronUp, IconLink,
  IconMessage, IconPalette, IconPhotoPlus, IconPhotoStar, IconPlus, IconTrash, IconX,
} from '@tabler/icons-react';
import { WordCountDisplay, type WordCountSettings } from '@components/WordCountDisplay';
import type { Spacing } from '@components/DocumentSpacing';
import { UploadModal } from '@components/UploadModal';
import { addCardImage } from '../../../../_actions/writing_actions';
import LabelPicker from '../LabelPicker';
import ColorPicker from '../ColorPicker';
import ImageViewerModal, { useImageViewer } from '../ImageViewerModal';
import type { BoardCard, LabelCatalog, LinkedCardRef, Label } from '../../types';
import type { CommentRecord } from '@/utils/writingComments';
import type { GalleryImage, ProjectCardOption } from './useCardDetail';
import type { CharacterField } from '@/utils/characterFields';
import CharacterFieldsPanel from '../CharacterFieldsPanel';

// The slice of card state this sidebar needs. Satisfied by useCardDetail's
// return value (single-card view) and by useStackCardSidebar (the compile
// stack's focused section), so the same sidebar renders in both contexts.
export type CardSidebarController = {
  viewingCard: BoardCard | null;
  includeInCompile: boolean;
  isImageCard: boolean;
  isCharacterCard: boolean;
  characterFields: CharacterField[];
  hideWordCount: boolean;
  handleToggleCompile: (v: boolean) => void;
  handleToggleImageCard: (v: boolean) => void;
  handleToggleCharacterCard: (v: boolean) => void;
  handleCharacterFieldsChange: (fields: CharacterField[]) => void;
  handleToggleHideWordCount: (v: boolean) => void;
  // Explicit card color overrides any label-driven color (see drivingLabel).
  color: string | null;
  labelColor: string | null;
  drivingLabel: Label | null;
  handleColorChange: (next: string | null) => void;
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
  onPeekCard,
  spacing,
}: {
  detail: CardSidebarController;
  catalog: LabelCatalog;
  onManageLabels: () => void;
  wcSettings: WordCountSettings;
  // Opens a linked character card as a docked reference panel instead of
  // navigating this view away from what's currently open.
  onPeekCard: (cardId: number) => void;
  spacing: Spacing;
}) {
  const { viewingCard } = detail;

  const [pickerSearch, setPickerSearch] = useState('');
  const pickerCombobox = useCombobox({
    onDropdownClose: () => { pickerCombobox.resetSelectedOption(); setPickerSearch(''); },
  });
  const [galleryOpened, setGalleryOpened] = useState(false);
  const viewer = useImageViewer(detail.images.length);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const computedScheme = useComputedColorScheme('light');

  if (!viewingCard) return null;

  const commentCount = Object.keys(detail.comments).length;

  const submitNote = () => {
    if (!noteText.trim()) return;
    detail.addGeneralNote(noteText);
    setNoteText('');
    setAddingNote(false);
  };

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
      {/* Current-card header — the sidebar pops up on its own in the compile /
          stack view, where nothing else names the focused card, so label it. */}
      <Box>
        <Text size="10px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: 0.5 }}>Selected card</Text>
        <Text fw={700} lineClamp={2}>{viewingCard.title || 'Untitled'}</Text>
      </Box>

      <LabelPicker key={viewingCard.id} card={viewingCard} catalog={catalog} onManage={onManageLabels} inline>
        <Stack gap={6} mt={6}>
          <Tooltip label="When off, this card is skipped in the compiled chapter/board view." withinPortal multiline w={220} position="top-start">
            <Switch label="Include in compile" checked={detail.includeInCompile} onChange={(e) => detail.handleToggleCompile(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
          <Tooltip label="Show an image on the board instead of the title and text." withinPortal multiline w={220} position="top-start">
            <Switch label="Image card" checked={detail.isImageCard} onChange={(e) => detail.handleToggleImageCard(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
          <Tooltip label="A character sheet: image gallery plus a rail of named fields (background, appearance, etc). Excluded from compile by default." withinPortal multiline w={220} position="top-start">
            <Switch label="Character card" checked={detail.isCharacterCard} onChange={(e) => detail.handleToggleCharacterCard(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
          <Tooltip label="Leave this card out of word tracking: it won't show a count anywhere, and its words won't count toward any total." withinPortal multiline w={220} position="top-start">
            <Switch label="Disable word count" checked={detail.hideWordCount} onChange={(e) => detail.handleToggleHideWordCount(e.currentTarget.checked)} color="dark" w="fit-content" />
          </Tooltip>
        </Stack>
      </LabelPicker>

      {detail.isCharacterCard && (
        <CharacterFieldsPanel key={viewingCard.id} fields={detail.characterFields} onChange={detail.handleCharacterFieldsChange} spacing={spacing} />
      )}

      {/* Card color — explicit color overrides any label-driven color */}
      <Group gap="xs" align="center">
        <IconPalette size={16} color="var(--mantine-color-dimmed)" />
        <Text size="sm">Card color</Text>
        <ColorPicker value={(detail.color ?? detail.labelColor) ?? 'transparent'} onChange={detail.handleColorChange} size={22} />
        {detail.color ? (
          <Button variant="subtle" size="compact-xs" color="gray" onClick={() => detail.handleColorChange(null)}>
            {detail.labelColor ? 'Use label color' : 'Clear'}
          </Button>
        ) : detail.labelColor ? (
          <Text size="xs" c="dimmed">
            From label{detail.drivingLabel ? ` “${detail.drivingLabel.name}”` : ''}
          </Text>
        ) : null}
      </Group>

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
                  onClick={() => viewer.open(index)}
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
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) detail.navigateToLinkedCard(link.cardId);
                    else onPeekCard(link.cardId);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); detail.navigateToLinkedCard(link.cardId); }}
                >
                  {link.title}
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size="sm" fw={600} lineClamp={2}>{link.title}</Text>
                {link.boardTitle && <Text size="xs" c="dimmed" mt={2}>{link.boardTitle}</Text>}
                {link.contentPreview && <Text size="xs" mt={4} lineClamp={4} c="dimmed">{link.contentPreview}</Text>}
                <Text size="xs" c="blue" mt={6}>Click to preview · ctrl/right-click to open</Text>
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

      {wcSettings.mode !== 'off' && !detail.hideWordCount && (
        <Box>
          <WordCountDisplay
            count={detail.liveWordCount}
            goal={viewingCard.wordCountGoal ?? wcSettings.defaultCardGoal}
            mode={wcSettings.mode}
            size="sm"
          />
          {/* px+negative-ml: keep the label left-aligned under the bar while
              giving the subtle hover pill room so it doesn't clip the text. */}
          <Button variant="subtle" size="compact-xs"  mt={6} px={6} ml={-6} 
            style={{ color: 'var(--mantine-color-dimmed)' }} 
            // color="gray"
            onClick={detail.handleSetWordGoal}>
            {viewingCard.wordCountGoal ? 'Update goal…' : 'Set goal…'}
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
                  styles={{ input: { color: computedScheme === 'dark' ? '#F1F3F5' : '#1A1B1E' } }}
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
                  style={{ flex: 1}}
                />
                <ActionIcon size="sm" color="dark.6" variant="filled" onClick={submitNote} disabled={!noteText.trim()}>
                  <IconCheck size={13} />
                </ActionIcon>
                <ActionIcon size="sm" color="dark.6" variant="filled" onClick={() => { setAddingNote(false); setNoteText(''); }}>
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
                  // Match the card modal: use the active board theme's card
                  // surface. The fallbacks are the no-theme case — and on a glass
                  // pane the Pane forces --mantine-color-text to white, so the
                  // text fallbacks stay explicit light/dark (not --mantine-color-
                  // text) to keep the solid card readable. An anchored comment
                  // gets an accent left border to read as a highlight tied to
                  // text; a note is a plain card.
                  style={{
                    cursor: anchored === false ? 'default' : 'pointer',
                    backgroundColor: 'var(--theme-card-bg, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6)))',
                    color: 'var(--theme-card-text, light-dark(var(--mantine-color-black), var(--mantine-color-gray-0)))',
                    borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
                    borderLeft: anchored === false ? undefined : '3px solid var(--theme-accent, var(--mantine-color-yellow-6))',
                    // Drop the frosted Pane's inherited white text-shadow so the
                    // themed comment text below stays crisp.
                    textShadow: 'none',
                  }}
                  onClick={anchored === false ? undefined : () => detail.jumpToComment(id)}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      {anchored === false && (
                        <Text size="9px" c="var(--theme-card-muted-text, light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1)))" fw={700} tt="uppercase" style={{ letterSpacing: 0.5 }}>Note</Text>
                      )}
                      <Text size="sm" c="var(--theme-card-text, light-dark(var(--mantine-color-black), var(--mantine-color-gray-0)))" style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
                      <Text size="10px" c="var(--theme-card-muted-text, light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1)))" mt={2}>
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

      <ImageViewerModal images={detail.images} viewer={viewer} />
    </Stack>
  );
}
