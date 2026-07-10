'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useRouter } from 'next/navigation';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { confirmAction, promptWordGoal } from '@/utils/dialogs';
import {
  updateCard, deleteCard, deleteCardImage, setCardCover,
  addCardLink, removeCardLink, getCardById, getProjectCards, setCardWordGoal,
} from '../../../../_actions/writing_actions';
import type { BoardCard, LinkedCardRef } from '../../types';
import {
  type CommentRecord,
  parseComments,
  serializeComments,
  removeCommentMarkFromEditor,
  jumpToCommentInEditor,
} from '@/utils/writingComments';

export type GalleryImage = { id: number; path: string };
export type { CommentRecord };
export type ProjectCardOption = { id: number; title: string; boardTitle: string; listTitle: string };
export type BubbleMode = 'idle' | 'adding' | 'viewing';

// Ports CardEditorModal's card-editing state/logic into a hook so it can be
// shared between two sibling panes (center content + right sidebar) that
// both need to act on the same TipTap editor instance. Unlike the modal,
// there's no explicit Save/Cancel footer here — everything either commits
// immediately (switches, labels, images, links, comments) or on editor blur
// (title, content), matching CardEditorModal/CompiledCardEditor exactly.
export function useCardDetail(card: BoardCard | null, projectId: number, onDeleted: () => void) {
  const router = useRouter();

  const [navCard, setNavCard] = useState<BoardCard | null>(null);
  const [cardHistory, setCardHistory] = useState<BoardCard[]>([]);
  const viewingCard = navCard ?? card;

  const editor = useWritingEditor(viewingCard?.content, true);

  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [includeInCompile, setIncludeInCompile] = useState(true);
  const [isImageCard, setIsImageCard] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [liveWordCount, setLiveWordCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const [links, setLinks] = useState<LinkedCardRef[]>([]);
  const linksOverrideRef = useRef<Map<number, LinkedCardRef[]>>(new Map());
  const [projectCards, setProjectCards] = useState<ProjectCardOption[]>([]);

  const [comments, setComments] = useState<CommentRecord>({});
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState<BubbleMode>('idle');
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const viewingCardRef = useRef(viewingCard);
  const commentsRef = useRef(comments);
  const editingTitleRef = useRef(editingTitle);
  const titleRef = useRef(title);
  const lastSavedContent = useRef('');

  useEffect(() => { viewingCardRef.current = viewingCard; }, [viewingCard]);
  useEffect(() => { commentsRef.current = comments; }, [comments]);
  useEffect(() => { editingTitleRef.current = editingTitle; }, [editingTitle]);
  useEffect(() => { titleRef.current = title; }, [title]);

  // Re-init all card-level state whenever the viewed card changes.
  useEffect(() => {
    setTitle(viewingCard?.title ?? '');
    setEditingTitle(false);
    setLiveWordCount(viewingCard?.wordCount ?? 0);
    setIncludeInCompile(viewingCard?.includeInCompile ?? true);
    setIsImageCard(viewingCard?.isImageCard ?? false);
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
    lastSavedContent.current = viewingCard?.content ?? '';
  }, [viewingCard?.id]);

  useEffect(() => {
    if (bubbleMode === 'adding') setTimeout(() => commentInputRef.current?.focus(), 50);
  }, [bubbleMode]);

  const commitTitleNow = useCallback(() => {
    setEditingTitle(false);
    const c = viewingCardRef.current;
    const t = titleRef.current.trim();
    if (!t) { setTitle(c?.title ?? ''); return; }
    if (c && t !== c.title) updateCard(c.id, { title: t });
  }, []);

  const commitTitle = () => commitTitleNow();

  // Force-persist content/comments regardless of blur — the safety net for
  // navigating away via the tree (click, keyboard, or programmatic selection)
  // without necessarily having triggered a real DOM blur first.
  const flushSave = useCallback(() => {
    if (editingTitleRef.current) commitTitleNow();
    const c = viewingCardRef.current;
    if (!c || !editor) return;
    const html = editor.getHTML() || '';
    if (html === lastSavedContent.current) return;
    lastSavedContent.current = html;
    updateCard(c.id, {
      content: html,
      comments: serializeComments(commentsRef.current),
    });
  }, [editor, commitTitleNow]);

  useEffect(() => {
    if (!editor) return;
    const onBlur = () => {
      const c = viewingCardRef.current;
      if (!c) return;
      const html = editor.getHTML() || '';
      if (html === lastSavedContent.current) return;
      lastSavedContent.current = html;
      updateCard(c.id, {
        content: html,
        comments: serializeComments(commentsRef.current),
      }).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    };
    editor.on('blur', onBlur);
    return () => { editor.off('blur', onBlur); };
  }, [editor]);

  // Live word count while typing — recomputed from the editor's plain text.
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const text = editor.getText().trim();
      setLiveWordCount(text ? text.split(/\s+/).length : 0);
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor]);

  const navigateToLinkedCard = useCallback(async (targetCardId: number) => {
    const current = viewingCardRef.current;
    if (!current) return;
    flushSave();
    const fetched = await getCardById(targetCardId);
    if (!fetched) return;
    setCardHistory((h) => [...h, current]);
    setNavCard(fetched as BoardCard);
  }, [flushSave]);

  const goBack = useCallback(() => {
    flushSave();
    setCardHistory((h) => {
      const prev = h[h.length - 1];
      if (!prev) return h;
      setNavCard(h.length === 1 ? null : prev);
      return h.slice(0, -1);
    });
  }, [flushSave]);

  const handleToggleCompile = async (value: boolean) => {
    setIncludeInCompile(value);
    if (viewingCard) await updateCard(viewingCard.id, { includeInCompile: value });
  };

  const handleToggleImageCard = async (value: boolean) => {
    setIsImageCard(value);
    if (viewingCard) await updateCard(viewingCard.id, { isImageCard: value });
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
    if (!viewingCard) return;
    await addCardLink(viewingCard.id, targetCardId);
    const target = projectCards.find((c) => c.id === targetCardId);
    if (target) {
      const newRef: LinkedCardRef = {
        linkId: -Date.now(),
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

  const handleSetWordGoal = async () => {
    if (!viewingCard) return;
    const goal = await promptWordGoal({ title: 'Card word count goal', initialValue: viewingCard.wordCountGoal });
    if (goal === undefined) return;
    await setCardWordGoal(viewingCard.id, goal);
    router.refresh();
  };

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text || !editor || !viewingCard) return;
    const commentId = crypto.randomUUID();
    editor.chain().focus().setMark('comment', { commentId }).run();
    const next = { ...comments, [commentId]: { text, createdAt: new Date().toISOString(), anchored: true } };
    setComments(next);
    setCommentsOpen(true);
    setNewCommentText('');
    setBubbleMode('idle');
    const html = editor.getHTML() || '';
    lastSavedContent.current = html;
    updateCard(viewingCard.id, { content: html, comments: serializeComments(next) });
  };

  // A card-level note: no text selection, no mark in the document — just an
  // entry in the same comments list, distinguished by `anchored: false`.
  const addGeneralNote = (text: string) => {
    const t = text.trim();
    if (!t || !viewingCard) return;
    const commentId = crypto.randomUUID();
    const next = { ...comments, [commentId]: { text: t, createdAt: new Date().toISOString(), anchored: false } };
    setComments(next);
    setCommentsOpen(true);
    updateCard(viewingCard.id, { comments: serializeComments(next) });
  };

  const removeComment = (commentId: string) => {
    if (!editor || !viewingCard) return;
    removeCommentMarkFromEditor(editor, commentId);
    const next = { ...comments };
    delete next[commentId];
    setComments(next);
    const html = editor.getHTML() || '';
    lastSavedContent.current = html;
    updateCard(viewingCard.id, {
      content: html,
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

  const jumpToComment = (commentId: string) => {
    if (editor) jumpToCommentInEditor(editor, commentId);
  };

  const handleDelete = async () => {
    if (!viewingCard) return;
    if (!(await confirmAction({ title: 'Delete card', message: 'Delete this card?' }))) return;
    await deleteCard(viewingCard.id);
    router.refresh();
    onDeleted();
  };

  const linkedCardIds = new Set(links.map((l) => l.cardId));

  return {
    viewingCard,
    editor: editor as Editor | null,
    saved,

    title, editingTitle,
    setTitle, setEditingTitle, commitTitle,

    includeInCompile, isImageCard,
    handleToggleCompile, handleToggleImageCard,

    coverImage, images,
    handleSetCover, handleDeleteImage, handleImageUploaded,

    links, linkedCardIds, projectCards, loadProjectCards,
    handleAddLink, handleRemoveLink,
    cardHistory, canGoBack: cardHistory.length > 0,
    navigateToLinkedCard, goBack,

    liveWordCount, handleSetWordGoal,

    comments, commentsOpen, setCommentsOpen,
    bubbleMode, setBubbleMode,
    newCommentText, setNewCommentText,
    activeCommentId, commentInputRef,
    addComment, addGeneralNote, removeComment, jumpToComment, handleBubbleShow,

    handleDelete,
    flushSave,
  };
}

export type CardDetailState = ReturnType<typeof useCardDetail>;
