'use client';

import { useState } from 'react';
import {
  ActionIcon, Badge, Box, Combobox, Group, HoverCard, Image, Modal, Paper, ScrollArea,
  SimpleGrid, Text, Textarea, TextInput, Title, Tooltip, useCombobox,
} from '@mantine/core';
import {
  IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight, IconLink, IconMessage,
  IconMessageOff, IconPencil, IconPhotoPlus, IconPhotoStar, IconPlus, IconTrash, IconX,
} from '@tabler/icons-react';
import { BubbleMenu } from '@tiptap/react/menus';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import { UploadModal } from '@components/UploadModal';
import { addCardImage } from '../../../../_actions/writing_actions';
import type { CardDetailState } from './useCardDetail';

// Center pane for a selected card: title, linked cards, image gallery, and
// the rich-text editor. All state lives in the shared `useCardDetail` hook —
// this component only reads/writes it, mirroring CardEditorModal's JSX but
// without the Modal chrome or the labels/switches/comments (those are in
// CardDetailSidebar, on the same `detail` object).
export default function CardDetailCenter({
  detail,
  spacing,
}: {
  detail: CardDetailState;
  spacing: Spacing;
}) {
  const [galleryOpened, setGalleryOpened] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerCombobox = useCombobox({
    onDropdownClose: () => { pickerCombobox.resetSelectedOption(); setPickerSearch(''); },
  });

  const { viewingCard } = detail;
  if (!viewingCard) return null;

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

      {/* Linked cards */}
      <Group gap={6} align="center" mb="sm">
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
                    onClick={(e) => { e.stopPropagation(); detail.handleRemoveLink(link.linkId); }}
                    aria-label="Remove link"
                  >
                    <IconX size={9} />
                  </ActionIcon>
                }
                style={{ cursor: 'pointer', maxWidth: 180 }}
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
              <ActionIcon size="sm" variant="subtle" color="gray" onClick={handleOpenPicker} aria-label="Link card">
                <IconPlus size={13} />
              </ActionIcon>
            </Tooltip>
          </Combobox.Target>
          <Combobox.Dropdown style={{ minWidth: 280 }}>
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

      {/* Image gallery */}
      <Box mb="sm">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Images ({detail.images.length})</Text>
          <ActionIcon color="dark" size="sm" variant="light" onClick={() => setGalleryOpened(true)} aria-label="Add image">
            <IconPhotoPlus size={16} />
          </ActionIcon>
        </Group>
        {detail.images.length > 0 && (
          <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
            {detail.images.map((img, index) => (
              <Box key={img.id} style={{ position: 'relative' }}>
                <Image
                  src={img.path} alt="" h={90} radius="sm" fit="cover"
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

      {/* Editor + comment bubble menu */}
      <div className={docSpacingClass} style={spacingVars(spacing)}>
        <RichTextEditor editor={detail.editor}>
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

      {viewingCard && (
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
      )}

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
    </Box>
  );
}
