'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal, TextInput, Button, Group, Stack, Switch, Tooltip, Image, Box, Text,
  Title, ActionIcon, SimpleGrid, Paper, Textarea, Collapse, Badge, Combobox,
  useCombobox, ScrollArea, HoverCard,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPhotoPlus, IconPencil, IconTrash, IconPhotoStar,
  IconMessage, IconCheck, IconX, IconMessageOff, IconChevronDown, IconChevronUp,
  IconLink, IconArrowLeft, IconPlus, IconPalette,
} from '@tabler/icons-react';
import { BubbleMenu } from '@tiptap/react/menus';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { useRouter } from 'next/navigation';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import { writingEditorStyles } from '@/utils/writingTheme';
import { UploadModal } from '@components/UploadModal';
import { WordCountDisplay, type WordCountSettings } from '@components/WordCountDisplay';
import { confirmAction, promptWordGoal } from '@/utils/dialogs';
import {
  updateCard, deleteCard, addCardImage, deleteCardImage, setCardCover,
  addCardLink, removeCardLink, getCardById, getProjectCards, setCardWordGoal,
} from '../../../_actions/writing_actions';
import LabelPicker from './LabelPicker';
import ColorPicker from './ColorPicker';
import ImageViewerModal, { useImageViewer } from './ImageViewerModal';
import {
  type CommentRecord,
  parseComments,
  serializeComments,
  removeCommentMarkFromEditor,
  jumpToCommentInEditor,
} from '@/utils/writingComments';
import type { BoardCard, LabelCatalog, LinkedCardRef } from '../types';

type GalleryImage = { id: number; path: string };
type ProjectCard = { id: number; title: string; boardTitle: string; listTitle: string };

export default function CardEditorModal({
  card,
  catalog,
  opened,
  onClose,
  onManageLabels,
  spacing,
  projectId,
  wcSettings,
  themeVars = {},
}: {
  card: BoardCard | null;
  catalog: LabelCatalog;
  opened: boolean;
  onClose: () => void;
  onManageLabels: () => void;
  spacing: Spacing;
  projectId: number;
  wcSettings: WordCountSettings;
  // The active board theme's --theme-* CSS custom properties. The modal is
  // portaled to <body>, outside BoardView's themed wrapper, so without these
  // the editor/toolbar/etc. would fall back to their unthemed defaults. Set on
  // the modal content (ancestor of header + body) so every var(--theme-*)
  // reference inside resolves. Empty {} when no theme is active → unchanged.
  themeVars?: Record<string, string>;
}) {
  const router = useRouter();

  // --- Navigation history (for clicking linked cards inside the modal) ---
  // navCard = null means "show the card prop as-is"; non-null = user navigated to a linked card.
  const [navCard, setNavCard] = useState<BoardCard | null>(null);
  const [cardHistory, setCardHistory] = useState<BoardCard[]>([]);
  // Derived — no effect needed; updates on every render when navCard or card changes.
  const viewingCard = navCard ?? card;

  const navigateToLinkedCard = useCallback(async (targetCardId: number) => {
    if (!viewingCard) return;
    const fetched = await getCardById(targetCardId);
    if (!fetched) return;
    setCardHistory((h) => [...h, viewingCard]);
    setNavCard(fetched as BoardCard);
  }, [viewingCard]);

  const goBack = useCallback(() => {
    setCardHistory((h) => {
      const prev = h[h.length - 1];
      if (!prev) return h;
      // If going back to the original prop card, clear navCard; otherwise keep it as the prev navigated card.
      setNavCard(h.length === 1 ? null : prev);
      return h.slice(0, -1);
    });
  }, []);

  // --- Core card state (derived from viewingCard) ---
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [includeInCompile, setIncludeInCompile] = useState(true);
  const [isImageCard, setIsImageCard] = useState(false);
  const [hideWordCount, setHideWordCount] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const [galleryOpened, { open: openGallery, close: closeGallery }] = useDisclosure(false);

  // --- Links state ---
  const [links, setLinks] = useState<LinkedCardRef[]>([]);
  // Persists optimistic link edits across in-modal navigation (cleared on modal close).
  const linksOverrideRef = useRef<Map<number, LinkedCardRef[]>>(new Map());
  // Link picker
  const [projectCards, setProjectCards] = useState<ProjectCard[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const pickerCombobox = useCombobox({
    onDropdownClose: () => { pickerCombobox.resetSelectedOption(); setPickerSearch(''); },
  });

  // Comments
  const [comments, setComments] = useState<CommentRecord>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState<'idle' | 'adding' | 'viewing'>('idle');
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleModeRef = useRef<'idle' | 'adding' | 'viewing'>('idle');

  const cardRef = useRef(viewingCard);
  const commentsRef = useRef(comments);

  // Keep refs in sync after each render (must be effects, not inline assignments).
  useEffect(() => { bubbleModeRef.current = bubbleMode; }, [bubbleMode]);
  useEffect(() => { cardRef.current = viewingCard; }, [viewingCard]);
  useEffect(() => { commentsRef.current = comments; }, [comments]);

  const editor = useWritingEditor(viewingCard?.content, true);

  // Re-init all card-level state whenever viewingCard changes.
  useEffect(() => {
    setTitle(viewingCard?.title ?? '');
    setEditingTitle(false);
    setLiveWordCount(viewingCard?.wordCount ?? 0);
    setIncludeInCompile(viewingCard?.includeInCompile ?? true);
    setIsImageCard(viewingCard?.isImageCard ?? false);
    setHideWordCount(viewingCard?.hideWordCount ?? false);
    setColor(viewingCard?.color ?? null);
    setCoverImage(viewingCard?.coverImage ?? null);
    setImages((viewingCard?.images ?? []).map((i) => ({ id: i.id, path: i.path })));
    const cardId = viewingCard?.id;
    const overrideLinks = cardId != null ? linksOverrideRef.current.get(cardId) : undefined;
    setLinks(overrideLinks ?? viewingCard?.links ?? []);

    const parsed = parseComments(viewingCard?.comments);
    setComments(parsed);
    setCommentsOpen(Object.keys(parsed).length > 0);
    setBubbleMode('idle');
    setNewCommentText('');
    setActiveCommentId(null);
  }, [viewingCard?.id]);

  useEffect(() => {
    if (bubbleMode === 'adding') {
      setTimeout(() => commentInputRef.current?.focus(), 50);
    }
  }, [bubbleMode]);

  useEffect(() => {
    if (!editor) return;
    const onBlur = async () => {
      const c = cardRef.current;
      if (!c) return;
      await updateCard(c.id, {
        content: editor.getHTML() || '',
        comments: serializeComments(commentsRef.current),
      });
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    };
    editor.on('blur', onBlur);
    return () => { editor.off('blur', onBlur); };
  }, [editor]);

  // Live word count while typing — recomputed from the editor's plain text,
  // not the DB-cached count (which only updates on blur/save).
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const text = editor.getText().trim();
      setLiveWordCount(text ? text.split(/\s+/).length : 0);
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor]);

  const viewer = useImageViewer(images.length);

  const commitTitle = async () => {
    setEditingTitle(false);
    const t = title.trim();
    if (!t) { setTitle(viewingCard?.title ?? ''); return; }
    if (viewingCard && t !== viewingCard.title) await updateCard(viewingCard.id, { title: t });
  };

  const handleSave = async () => {
    if (!viewingCard) return;
    setIsSaving(true);
    await updateCard(viewingCard.id, {
      title: title.trim() || 'Untitled',
      content: editor?.getHTML() || '',
      includeInCompile,
      isImageCard,
      hideWordCount,
      color,
      coverImage,
      comments: serializeComments(comments),
    });
    router.refresh();
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!viewingCard) return;
    if (!(await confirmAction({ title: 'Delete card', message: 'Delete this card?' }))) return;
    setIsSaving(true);
    await deleteCard(viewingCard.id);
    router.refresh();
    setIsSaving(false);
    onClose();
  };

  const handleClose = () => {
    linksOverrideRef.current.clear();
    router.refresh();
    onClose();
  };

  const handleSetCover = async (path: string) => {
    if (!viewingCard) return;
    const next = coverImage === path ? null : path;
    setCoverImage(next);
    await setCardCover(viewingCard.id, next);
  };

  const handleDeleteImage = async (img: GalleryImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (coverImage === img.path) setCoverImage(null);
    await deleteCardImage(img.id);
  };

  const handleViewImage = (index: number) => viewer.open(index);

  const handleToggleImageCard = async (value: boolean) => {
    setIsImageCard(value);
    if (viewingCard) await updateCard(viewingCard.id, { isImageCard: value });
  };

  const handleToggleCompile = async (value: boolean) => {
    setIncludeInCompile(value);
    if (viewingCard) await updateCard(viewingCard.id, { includeInCompile: value });
  };

  const handleToggleHideWordCount = async (value: boolean) => {
    setHideWordCount(value);
    if (viewingCard) await updateCard(viewingCard.id, { hideWordCount: value });
  };

  const handleColorChange = async (next: string | null) => {
    setColor(next);
    if (viewingCard) await updateCard(viewingCard.id, { color: next });
  };

  // --- Link picker ---
  const loadProjectCards = async () => {
    if (projectCards.length > 0) return;
    setPickerLoading(true);
    const rows = await getProjectCards(projectId);
    setProjectCards(rows);
    setPickerLoading(false);
  };

  const handleOpenPicker = async () => {
    await loadProjectCards();
    pickerCombobox.openDropdown();
  };

  const handleAddLink = async (targetCardId: number) => {
    if (!viewingCard) return;
    pickerCombobox.closeDropdown();
    setPickerSearch('');
    await addCardLink(viewingCard.id, targetCardId);
    const target = projectCards.find((c) => c.id === targetCardId);
    if (target) {
      const newRef: LinkedCardRef = {
        linkId: -Date.now(), // temp until page reloads
        cardId: targetCardId,
        title: target.title,
        contentPreview: '',
        boardTitle: target.boardTitle,
      };
      const newLinks = [...links, newRef];
      setLinks(newLinks);
      linksOverrideRef.current.set(viewingCard.id, newLinks);
    }
  };

  const handleRemoveLink = async (linkId: number) => {
    const newLinks = links.filter((l) => l.linkId !== linkId);
    setLinks(newLinks);
    if (viewingCard) linksOverrideRef.current.set(viewingCard.id, newLinks);
    await removeCardLink(linkId);
  };

  const linkedCardIds = new Set(links.map((l) => l.cardId));
  const pickerOptions = projectCards.filter(
    (c) => c.id !== viewingCard?.id && !linkedCardIds.has(c.id) &&
      (pickerSearch === '' || c.title.toLowerCase().includes(pickerSearch.toLowerCase())),
  );

  // --- Comment helpers ---
  const addComment = () => {
    const text = newCommentText.trim();
    if (!text || !editor) return;
    const commentId = crypto.randomUUID();
    editor.chain().focus().setMark('comment', { commentId }).run();
    const next: CommentRecord = { ...comments, [commentId]: { text, createdAt: new Date().toISOString(), anchored: true } };
    setComments(next);
    setCommentsOpen(true);
    setNewCommentText('');
    setBubbleMode('idle');
    if (viewingCard) updateCard(viewingCard.id, { content: editor.getHTML() || '', comments: serializeComments(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor) return;
    removeCommentMarkFromEditor(editor, commentId);
    const next = { ...comments };
    delete next[commentId];
    setComments(next);
    if (viewingCard) {
      updateCard(viewingCard.id, {
        content: editor.getHTML() || '',
        comments: serializeComments(next),
      });
    }
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

  const commentCount = Object.keys(comments).length;

  const jumpToComment = (commentId: string) => {
    if (editor) jumpToCommentInEditor(editor, commentId);
  };

  // Card color can derive from an applied label flagged to drive card color
  // (lowest position wins). An explicit `color` on the card overrides it.
  const drivingLabel = viewingCard?.labels
    .filter((l) => l.drivesCardColor)
    .sort((a, b) => a.position - b.position || a.id - b.id)[0] ?? null;
  const labelColor = drivingLabel?.color ?? null;

  // --- Title node (shown in Modal title slot) ---
  const titleNode = (
    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
      {cardHistory.length > 0 && (
        <Tooltip label="Back to previous card" withinPortal>
          <ActionIcon variant="subtle" size="sm" onClick={goBack} aria-label="Back">
            <IconArrowLeft size={15} />
          </ActionIcon>
        </Tooltip>
      )}
      {editingTitle ? (
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.stopPropagation();
              setTitle(viewingCard?.title ?? '');
              setEditingTitle(false);
            }
          }}
          autoFocus
          size="sm"
          placeholder="Card title"
          style={{ flex: 1 }}
        />
      ) : (
        <Group gap="xs" wrap="nowrap" align="center" style={{ cursor: 'text', flex: 1, minWidth: 0 }} onClick={() => setEditingTitle(true)}>
          {coverImage && <Image src={coverImage} alt="" w={28} h={28} radius="sm" fit="cover" style={{ flexShrink: 0 }} />}
          <Title order={4} style={{ minWidth: 0 }} lineClamp={1}>{title || 'Untitled'}</Title>
          <Tooltip label="Click to rename" withinPortal>
            <IconPencil size={15} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          </Tooltip>
        </Group>
      )}
    </Group>
  );

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton
      size="xl"
      centered
      title={titleNode}
      styles={{
        title: { flex: 1, marginRight: 'var(--mantine-spacing-sm)' },
        // Theme vars live here (content is the ancestor of header + body), so
        // the embedded editor + all var(--theme-*) refs inside resolve. The
        // shell itself borrows the group surface — the same group-bg + heading
        // pairing the board already uses for group titles, so contrast holds.
        content: {
          ...themeVars,
          backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
          color: 'var(--theme-heading, inherit)',
        },
        header: {
          backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
          color: 'var(--theme-heading, inherit)',
        },
      }}
    >
      <Stack gap="sm">
        {viewingCard && (
          <LabelPicker key={viewingCard.id} card={viewingCard} catalog={catalog} onManage={onManageLabels} inline>
            <Tooltip label="When off, this card is skipped in the compiled chapter/board view." withinPortal multiline w={260} position="top-start">
              <Switch label="Include in compile" checked={includeInCompile} onChange={(e) => handleToggleCompile(e.currentTarget.checked)} color="dark" w="fit-content" />
            </Tooltip>
            <Tooltip label="Show an image on the board instead of the title and text." withinPortal multiline w={260} position="top-start">
              <Switch label="Image card" checked={isImageCard} onChange={(e) => handleToggleImageCard(e.currentTarget.checked)} color="dark" w="fit-content" />
            </Tooltip>
            <Tooltip label="Leave this card out of word tracking: it won't show a count anywhere, and its words won't count toward any list, group, board, or project total." withinPortal multiline w={260} position="top-start">
              <Switch label="Hide word count" checked={hideWordCount} onChange={(e) => handleToggleHideWordCount(e.currentTarget.checked)} color="dark" w="fit-content" />
            </Tooltip>
          </LabelPicker>
        )}

        {/* Card color — explicit color overrides any label-driven color */}
        {viewingCard && (
          <Group gap="xs" align="center">
            <IconPalette size={16} color="var(--mantine-color-dimmed)" />
            <Text size="sm">Card color</Text>
            <ColorPicker value={(color ?? labelColor) ?? 'transparent'} onChange={handleColorChange} size={22} />
            {color ? (
              <Button variant="subtle" size="compact-xs" color="gray" onClick={() => handleColorChange(null)}>
                {labelColor ? 'Use label color' : 'Clear'}
              </Button>
            ) : labelColor ? (
              <Text size="xs" c="dimmed">
                From label{drivingLabel ? ` “${drivingLabel.name}”` : ''}
              </Text>
            ) : null}
          </Group>
        )}

        {/* Linked cards */}
        <Box>
          <Group gap={6} align="center" mb={links.length > 0 ? 6 : 0}>
            {links.map((link) => (
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
                        onClick={(e) => { e.stopPropagation(); handleRemoveLink(link.linkId); }}
                        aria-label="Remove link"
                      >
                        <IconX size={9} />
                      </ActionIcon>
                    }
                    style={{ cursor: 'pointer', maxWidth: 180 }}
                    onClick={() => navigateToLinkedCard(link.cardId)}
                  >
                    {link.title}
                  </Badge>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size="sm" fw={600} lineClamp={2}>{link.title}</Text>
                  {link.boardTitle && <Text size="xs" c="dimmed" mt={2}>{link.boardTitle}</Text>}
                  {link.contentPreview && (
                    <Text size="xs" mt={4} lineClamp={4} c="dimmed">{link.contentPreview}</Text>
                  )}
                  <Text size="xs" c="blue" mt={6}>Click to open</Text>
                </HoverCard.Dropdown>
              </HoverCard>
            ))}

            {/* Link picker */}
            <Combobox
              store={pickerCombobox}
              onOptionSubmit={(val) => handleAddLink(Number(val))}
              withinPortal
            >
              <Combobox.Target>
                <Tooltip label="Link another card" withinPortal>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={handleOpenPicker}
                    aria-label="Link card"
                  >
                    <IconPlus size={13} />
                  </ActionIcon>
                </Tooltip>
              </Combobox.Target>
              <Combobox.Dropdown style={{ minWidth: 280 }}>
                <Combobox.Search
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.currentTarget.value)}
                  placeholder="Search cards…"
                />
                <Combobox.Options>
                  <ScrollArea.Autosize mah={240} type="scroll">
                    {pickerLoading ? (
                      <Combobox.Empty>Loading…</Combobox.Empty>
                    ) : pickerOptions.length === 0 ? (
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

        {isImageCard && !coverImage && (
          <Text size="sm" c="dimmed">Add an image below and set it as the cover — that cover is what shows on the board.</Text>
        )}

        {/* Image gallery */}
        <Box>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>Images ({images.length})</Text>
            <Button color="dark" size="compact-sm" leftSection={<IconPhotoPlus size={16} />} onClick={openGallery} disabled={!viewingCard}>
              Add image
            </Button>
          </Group>
          {images.length > 0 ? (
            <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
              {images.map((img, index) => (
                <Box key={img.id} style={{ position: 'relative' }}>
                  <Image
                    src={img.path} alt="" h={90} radius="sm" fit="cover"
                    style={{ cursor: 'pointer', outline: coverImage === img.path ? '2px solid var(--mantine-color-dark-6)' : 'none' }}
                    onClick={() => handleViewImage(index)}
                    fallbackSrc="https://placehold.co/120x120?text=Image"
                  />
                  <Tooltip label={coverImage === img.path ? 'Cover image' : 'Set as cover'} withinPortal>
                    <ActionIcon variant="filled" color={coverImage === img.path ? 'dark.6' : 'gray'} size="sm"
                      style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}
                      onClick={() => handleSetCover(img.path)} aria-label="Set as cover">
                      <IconPhotoStar size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete image" withinPortal>
                    <ActionIcon variant="filled" color="red.7" size="sm"
                      style={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }}
                      onClick={() => handleDeleteImage(img)} aria-label="Delete image">
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <Text size="sm" c="dimmed">No images yet.</Text>
          )}
        </Box>

        {wcSettings.mode !== 'off' && !hideWordCount && (
          <Group justify="space-between" gap="xs">
            <WordCountDisplay
              count={liveWordCount}
              goal={viewingCard?.wordCountGoal ?? wcSettings.defaultCardGoal}
              mode={wcSettings.mode}
              size="sm"
            />
            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              disabled={!viewingCard}
              onClick={async () => {
                if (!viewingCard) return;
                const goal = await promptWordGoal({ title: 'Card word count goal', initialValue: viewingCard.wordCountGoal });
                if (goal === undefined) return;
                await setCardWordGoal(viewingCard.id, goal);
                router.refresh();
              }}
            >
              {viewingCard?.wordCountGoal ? 'Update goal…' : 'Set goal…'}
            </Button>
          </Group>
        )}

        {/* Editor + bubble menu */}
        <div className={docSpacingClass} style={spacingVars(spacing)}>
          <RichTextEditor
            editor={editor}
            styles={{
              ...writingEditorStyles(),
              content: { ...writingEditorStyles().content, maxHeight: 380, overflowY: 'auto' },
            }}
          >
            <WritingEditorToolbar />

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
                      <Text size="xs" style={{ maxWidth: 200 }} lineClamp={3}>{comments[activeCommentId].text}</Text>
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
                      <ActionIcon size="sm" variant="subtle" color="gray"
                        onClick={() => setBubbleMode('adding')}>
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

        {/* Comments panel */}
        <Box>
          <Group
            gap="xs"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setCommentsOpen((v) => !v)}
          >
            <IconMessage size={15} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">
              Comments {commentCount > 0 ? `(${commentCount})` : ''}
            </Text>
            {commentsOpen ? <IconChevronUp size={13} color="var(--mantine-color-dimmed)" /> : <IconChevronDown size={13} color="var(--mantine-color-dimmed)" />}
          </Group>

          <Collapse expanded={commentsOpen}>
            <Stack gap="xs" mt="xs">
              {commentCount === 0 ? (
                <Text size="xs" c="dimmed">No comments yet. Select text in the editor to add one.</Text>
              ) : (
                Object.entries(comments).map(([id, { text, createdAt }]) => (
                  <Paper key={id} p="xs" withBorder radius="sm" bg="light-dark(var(--mantine-color-yellow-0), var(--mantine-color-dark-6))"
                    style={{ cursor: 'pointer' }} onClick={() => jumpToComment(id)}>
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
                        <Text size="10px" c="dimmed" mt={2}>
                          {new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Box>
                      <Tooltip label="Remove comment" withinPortal>
                        <ActionIcon size="xs" color="red.7" variant="subtle"
                          onClick={(e) => { e.stopPropagation(); removeComment(id); }}>
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

        <Group justify="space-between" mt="md">
          <Button variant="subtle" color="red.7" onClick={handleDelete} disabled={isSaving}>Delete</Button>
          <Group>
            {autoSaved && <Text size="xs" c="dimmed">Saved</Text>}
            <Button variant="default" onClick={handleClose} disabled={isSaving}>Cancel</Button>
            <Button color="dark" onClick={handleSave} loading={isSaving}>Save</Button>
          </Group>
        </Group>
      </Stack>

      {viewingCard && (
        <UploadModal
          opened={galleryOpened}
          close={closeGallery}
          targetId={viewingCard.id}
          idFieldName="cardId"
          uploadAction={addCardImage}
          revalidateUrl="/writing"
          showLibrary={false}
          onUploaded={(result: GalleryImage | null) => {
            if (result) {
              setImages((prev) => [...prev, result]);
              setCoverImage((prev) => prev ?? result.path);
            }
          }}
        />
      )}

      {/* Full-size image viewer */}
      <ImageViewerModal images={images} viewer={viewer} />
    </Modal>
  );
}
