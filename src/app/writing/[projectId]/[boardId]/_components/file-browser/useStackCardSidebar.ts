'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { promptWordGoal } from '@/utils/dialogs';
import {
  updateCard, deleteCardImage, setCardCover,
  addCardLink, removeCardLink, getProjectCards, setCardWordGoal,
} from '../../../../_actions/writing_actions';
import type { BoardCard, LinkedCardRef } from '../../types';
import { defaultCharacterFields, parseCharacterFields, serializeCharacterFields, type CharacterField } from '@/utils/characterFields';
import {
  type CommentRecord,
  parseComments,
  serializeComments,
  removeCommentMarkFromEditor,
  jumpToCommentInEditor,
} from '@/utils/writingComments';
import type { GalleryImage, ProjectCardOption } from './useCardDetail';
import type { CardSidebarController } from './CardDetailSidebar';

// CardSidebarController implementation for the compile stack: binds the
// sidebar to whichever section currently holds the cursor. Unlike
// useCardDetail it does NOT own an editor — it acts on the focused
// StackedCardEditor's instance, and comment changes flow through the stack's
// shared per-card comments state so the section's bubble menu stays in sync.
export function useStackCardSidebar({
  card,
  editor,
  comments,
  onCommentsChange,
  projectId,
  onNavigateToCard,
}: {
  card: BoardCard | null;
  editor: Editor | null;
  comments: CommentRecord;
  onCommentsChange: (next: CommentRecord) => void;
  projectId: number;
  onNavigateToCard: (cardId: number) => void;
}): CardSidebarController {
  const router = useRouter();

  const [includeInCompile, setIncludeInCompile] = useState(true);
  const [isImageCard, setIsImageCard] = useState(false);
  const [isCharacterCard, setIsCharacterCard] = useState(false);
  const [characterFields, setCharacterFields] = useState<CharacterField[]>([]);
  const [hideWordCount, setHideWordCount] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [links, setLinks] = useState<LinkedCardRef[]>([]);
  // Optimistic link edits survive focus moving away and back: the card prop
  // is only as fresh as the last router.refresh(), so re-seeding straight
  // from card.links would silently revert an add/remove made this session.
  const linksOverrideRef = useRef<Map<number, LinkedCardRef[]>>(new Map());
  const [projectCards, setProjectCards] = useState<ProjectCardOption[]>([]);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Re-seed when focus moves to a different section.
  useEffect(() => {
    setIncludeInCompile(card?.includeInCompile ?? true);
    setIsImageCard(card?.isImageCard ?? false);
    setIsCharacterCard(card?.cardType === 'character');
    setCharacterFields(parseCharacterFields(card?.characterFields));
    setHideWordCount(card?.hideWordCount ?? false);
    setColor(card?.color ?? null);
    setCoverImage(card?.coverImage ?? null);
    setImages((card?.images ?? []).map((i) => ({ id: i.id, path: i.path })));
    const overrideLinks = card ? linksOverrideRef.current.get(card.id) : undefined;
    setLinks(overrideLinks ?? card?.links ?? []);
    setLiveWordCount(card?.wordCount ?? 0);
    setCommentsOpen(Object.keys(parseComments(card?.comments)).length > 0);
  }, [card?.id]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const text = editor.getText().trim();
      setLiveWordCount(text ? text.split(/\s+/).length : 0);
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor]);

  const handleToggleCompile = (value: boolean) => {
    setIncludeInCompile(value);
    if (card) updateCard(card.id, { includeInCompile: value });
  };

  const handleToggleImageCard = (value: boolean) => {
    setIsImageCard(value);
    if (card) updateCard(card.id, { isImageCard: value });
  };

  const handleToggleCharacterCard = (value: boolean) => {
    setIsCharacterCard(value);
    if (!card) return;
    if (value && characterFields.length === 0) {
      const seeded = defaultCharacterFields();
      setCharacterFields(seeded);
      updateCard(card.id, { cardType: 'character', characterFields: serializeCharacterFields(seeded), includeInCompile: false });
      setIncludeInCompile(false);
    } else {
      updateCard(card.id, { cardType: value ? 'character' : 'standard' });
    }
  };

  const handleCharacterFieldsChange = (next: CharacterField[]) => {
    setCharacterFields(next);
    if (card) updateCard(card.id, { characterFields: serializeCharacterFields(next) });
  };

  const handleToggleHideWordCount = (value: boolean) => {
    setHideWordCount(value);
    if (card) updateCard(card.id, { hideWordCount: value });
  };

  const handleColorChange = (next: string | null) => {
    setColor(next);
    if (card) updateCard(card.id, { color: next });
  };

  const handleSetCover = (path: string) => {
    if (!card) return;
    const next = coverImage === path ? null : path;
    setCoverImage(next);
    setCardCover(card.id, next);
  };

  const handleDeleteImage = (img: GalleryImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (coverImage === img.path) setCoverImage(null);
    deleteCardImage(img.id);
  };

  const handleImageUploaded = (result: GalleryImage | null) => {
    if (result) {
      setImages((prev) => [...prev, result]);
      setCoverImage((prev) => prev ?? result.path);
    }
  };

  const loadProjectCards = async () => {
    if (projectCards.length > 0) return;
    const rows = await getProjectCards(projectId);
    setProjectCards(rows);
  };

  const handleAddLink = async (targetCardId: number) => {
    if (!card) return;
    await addCardLink(card.id, targetCardId);
    const target = projectCards.find((c) => c.id === targetCardId);
    if (target) {
      const newLinks = [...links, {
        linkId: -Date.now(),
        cardId: targetCardId,
        title: target.title,
        contentPreview: '',
        boardTitle: target.boardTitle,
        cardType: target.cardType,
        color: null,
        labelColors: [],
      }];
      setLinks(newLinks);
      linksOverrideRef.current.set(card.id, newLinks);
    }
  };

  const handleRemoveLink = (linkId: number) => {
    const newLinks = links.filter((l) => l.linkId !== linkId);
    setLinks(newLinks);
    if (card) linksOverrideRef.current.set(card.id, newLinks);
    removeCardLink(linkId);
  };

  const handleSetWordGoal = async () => {
    if (!card) return;
    const goal = await promptWordGoal({ title: 'Card word count goal', initialValue: card.wordCountGoal });
    if (goal === undefined) return;
    await setCardWordGoal(card.id, goal);
    router.refresh();
  };

  // A card-level note: no text selection, no mark in the document — just an
  // entry in the same comments list, distinguished by `anchored: false`.
  const addGeneralNote = (html: string) => {
    if (!card) return;
    const commentId = crypto.randomUUID();
    const next = { ...comments, [commentId]: { text: html, createdAt: new Date().toISOString(), anchored: false } };
    onCommentsChange(next);
    setCommentsOpen(true);
    updateCard(card.id, { comments: serializeComments(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor || !card) return;
    removeCommentMarkFromEditor(editor, commentId);
    const next = { ...comments };
    delete next[commentId];
    onCommentsChange(next);
    updateCard(card.id, {
      content: editor.getHTML() || '',
      comments: serializeComments(next),
    });
  };

  const editComment = (commentId: string, html: string) => {
    if (!card || !comments[commentId]) return;
    const next = { ...comments, [commentId]: { ...comments[commentId], text: html } };
    onCommentsChange(next);
    updateCard(card.id, { comments: serializeComments(next) });
  };

  const jumpToComment = (commentId: string) => {
    if (editor) jumpToCommentInEditor(editor, commentId);
  };

  // Card color can derive from an applied label flagged to drive card color
  // (lowest position wins). An explicit `color` on the card overrides it.
  const drivingLabel = card?.labels
    .filter((l) => l.drivesCardColor)
    .sort((a, b) => a.position - b.position || a.id - b.id)[0] ?? null;
  const labelColor = drivingLabel?.color ?? null;

  return {
    viewingCard: card,
    includeInCompile,
    isImageCard,
    isCharacterCard,
    characterFields,
    hideWordCount,
    handleToggleCompile,
    handleToggleImageCard,
    handleToggleCharacterCard,
    handleCharacterFieldsChange,
    handleToggleHideWordCount,
    color,
    labelColor,
    drivingLabel,
    handleColorChange,
    coverImage,
    images,
    handleSetCover,
    handleDeleteImage,
    handleImageUploaded,
    links,
    linkedCardIds: new Set(links.map((l) => l.cardId)),
    projectCards,
    loadProjectCards,
    handleAddLink,
    handleRemoveLink,
    navigateToLinkedCard: onNavigateToCard,
    liveWordCount,
    handleSetWordGoal,
    comments,
    commentsOpen,
    setCommentsOpen,
    addGeneralNote,
    removeComment,
    editComment,
    jumpToComment,
  };
}
