'use client';

import { useState } from 'react';
import { ActionIcon, Box, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconFolderOpen } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { Spacing } from '@components/DocumentSpacing';
import type { WordCountSettings } from '@components/WordCountDisplay';
import type { BoardGroup, LabelCatalog } from '../../types';
import { findCardInGroups, findGroupInGroups, findListInGroups, type FileBrowserSelection } from './types';
import { useCardDetail } from './useCardDetail';
import FileTree from './FileTree';
import CardDetailCenter from './CardDetailCenter';
import CardDetailSidebar from './CardDetailSidebar';
import StackCompileView, { type CompileSection } from './StackCompileView';
import Pane, { stickyPaneStyle } from './Pane';

function EmptyCenterState() {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 8 }}>
      <IconFolderOpen size={32} color="var(--mantine-color-dimmed)" />
      <Text c="dimmed" size="sm">Select a list or card to view its contents.</Text>
    </Box>
  );
}

export default function FileBrowserView({
  projectId,
  boardTitle,
  groups,
  catalog,
  wcSettings,
  spacing,
  hasBg,
  onManageLabels,
}: {
  projectId: number;
  boardTitle: string;
  groups: BoardGroup[];
  catalog: LabelCatalog;
  wcSettings: WordCountSettings;
  spacing: Spacing;
  hasBg: boolean;
  onManageLabels: () => void;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<FileBrowserSelection>(null);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  const selectedCard = selection?.type === 'card' ? findCardInGroups(groups, selection.cardId) : null;

  const detail = useCardDetail(selectedCard, projectId, () => setSelection(null));

  const select = (next: NonNullable<FileBrowserSelection>) => {
    detail.flushSave();
    router.refresh();
    setSelection(next);
  };

  // Compile scope → flat card sections, labelled with enough ancestry to
  // tell same-named cards apart at wider scopes.
  let compileTitle = '';
  let compileKey = '';
  let sections: CompileSection[] | null = null;
  if (selection?.type === 'board') {
    compileTitle = boardTitle;
    compileKey = 'board';
    sections = groups.flatMap((g) =>
      g.lists.flatMap((l) => l.cards.map((card) => ({ card, label: `${g.title} · ${l.title} · ${card.title}` })))
    );
  } else if (selection?.type === 'group') {
    const group = findGroupInGroups(groups, selection.groupId);
    if (group) {
      compileTitle = group.title;
      compileKey = `group:${group.id}`;
      sections = group.lists.flatMap((l) => l.cards.map((card) => ({ card, label: `${l.title} · ${card.title}` })));
    }
  } else if (selection?.type === 'list') {
    const list = findListInGroups(groups, selection.listId);
    if (list) {
      compileTitle = list.title;
      compileKey = `list:${list.id}`;
      sections = list.cards.map((card) => ({ card, label: card.title }));
    }
  }

  const showCard = selection?.type === 'card' && !!detail.viewingCard;

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: `${treeCollapsed ? 40 : 260}px minmax(0, 1fr) 300px`,
        gap: 16,
        alignItems: 'start',
      }}
    >
      <Pane hasBg={hasBg} style={stickyPaneStyle} noPadding={treeCollapsed}>
        {treeCollapsed ? (
          <Tooltip label="Show file tree" withinPortal position="right">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setTreeCollapsed(false)} aria-label="Expand file tree" style={{ width: '100%' }}>
              <IconChevronRight size={16} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <>
            <Tooltip label="Hide file tree" withinPortal>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setTreeCollapsed(true)}
                aria-label="Collapse file tree"
                style={{ float: 'right', marginBottom: 4 }}
              >
                <IconChevronLeft size={14} />
              </ActionIcon>
            </Tooltip>
            <FileTree
              boardTitle={boardTitle}
              groups={groups}
              selection={selection}
              onSelectBoard={() => select({ type: 'board' })}
              onSelectGroup={(group) => select({ type: 'group', groupId: group.id })}
              onSelectList={(list) => select({ type: 'list', listId: list.id })}
              onSelectCard={(card) => select({ type: 'card', cardId: card.id })}
            />
          </>
        )}
      </Pane>

      {showCard ? (
        <>
          <Pane hasBg={hasBg}>
            <CardDetailCenter detail={detail} spacing={spacing} />
          </Pane>
          <Pane hasBg={hasBg} style={stickyPaneStyle}>
            <CardDetailSidebar detail={detail} catalog={catalog} onManageLabels={onManageLabels} wcSettings={wcSettings} />
          </Pane>
        </>
      ) : sections ? (
        // Renders its own two grid columns (main pane + focused-card sidebar).
        <StackCompileView
          key={compileKey}
          title={compileTitle}
          sections={sections}
          spacing={spacing}
          projectId={projectId}
          hasBg={hasBg}
          catalog={catalog}
          wcSettings={wcSettings}
          onManageLabels={onManageLabels}
          onNavigateToCard={(cardId) => select({ type: 'card', cardId })}
        />
      ) : (
        <>
          <Pane hasBg={hasBg}>
            <EmptyCenterState />
          </Pane>
          <div />
        </>
      )}
    </Box>
  );
}
