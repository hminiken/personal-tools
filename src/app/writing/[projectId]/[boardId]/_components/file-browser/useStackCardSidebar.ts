'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { promptWordGoal } from '@/utils/dialogs';
import {
  updateCard, deleteCardImage, setCardCover,
  addCardLink, removeCardLink, getProjectCards, setCardWordGoal,
} from '../../../../_actions/writing_actions';
import type { BoardCard, LinkedCardRef } from '../../types';
import type { CommentRecord, GalleryImage, ProjectCardOption } from './useCardDetail';
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
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [links, setLinks] = useState<LinkedCardRef[]>([]);
  const [projectCards, setProjectCards] = useState<ProjectCardOption[]>([]);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Re-seed when focus moves to a different section.
  useEffect(() => {
    setIncludeInCompile(card?.includeInCompile ?? true);
    setIsImageCard(card?.isImageCard ?? false);
    setCoverImage(card?.coverImage ?? null);
    setImages((card?.images ?? []).map((i) => ({ id: i.id, path: i.path })));
    setLinks(card?.links ?? []);
    setLiveWordCount(card?.wordCount ?? 0);
    let parsed: CommentRecord = {};
    try { if (card?.comments) parsed = JSON.parse(card.comments); } catch { /* ignore */ }
    setCommentsOpen(Object.keys(parsed).length > 0);
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
      setLinks((prev) => [...prev, {
        linkId: -Date.now(),
        cardId: targetCardId,
        title: target.title,
        contentPreview: '',
        boardTitle: target.boardTitle,
      }]);
    }
  };

  const handleRemoveLink = (linkId: number) => {
    setLinks((prev) => prev.filter((l) => l.linkId !== linkId));
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
  const addGeneralNote = (text: string) => {
    const t = text.trim();
    if (!t || !card) return;
    const commentId = crypto.randomUUID();
    const next = { ...comments, [commentId]: { text: t, createdAt: new Date().toISOString(), anchored: false } };
    onCommentsChange(next);
    setCommentsOpen(true);
    updateCard(card.id, { comments: JSON.stringify(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor || !card) return;
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
    const next = { ...comments };
    delete next[commentId];
    onCommentsChange(next);
    updateCard(card.id, {
      content: editor.getHTML() || '',
      comments: Object.keys(next).length > 0 ? JSON.stringify(next) : null,
    });
  };

  const jumpToComment = (commentId: string) => {
    if (!editor) return;
    const markType = editor.state.schema.marks.comment;
    if (markType) {
      let foundPos: number | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (foundPos !== null) return false;
        const m = node.marks.find((mk) => mk.type === markType && mk.attrs.commentId === commentId);
        if (m) { foundPos = pos; return false; }
      });
      if (foundPos !== null) editor.commands.setTextSelection(foundPos);
    }
    const el = editor.view.dom.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return {
    viewingCard: card,
    includeInCompile,
    isImageCard,
    handleToggleCompile,
    handleToggleImageCard,
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
    jumpToComment,
  };
}
