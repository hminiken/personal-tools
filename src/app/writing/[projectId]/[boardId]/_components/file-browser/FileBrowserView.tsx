'use client';

import { useState } from 'react';
import { Box, Text } from '@mantine/core';
import { IconFolderOpen } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { Spacing } from '@components/DocumentSpacing';
import type { WordCountSettings } from '@components/WordCountDisplay';
import type { BoardGroup, LabelCatalog } from '../../types';
import { findCardInGroups, findListInGroups, type FileBrowserSelection } from './types';
import { useCardDetail } from './useCardDetail';
import FileTree from './FileTree';
import CardDetailCenter from './CardDetailCenter';
import CardDetailSidebar from './CardDetailSidebar';
import ListStackView from './ListStackView';

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
  groups,
  catalog,
  wcSettings,
  spacing,
  onManageLabels,
}: {
  projectId: number;
  groups: BoardGroup[];
  catalog: LabelCatalog;
  wcSettings: WordCountSettings;
  spacing: Spacing;
  onManageLabels: () => void;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<FileBrowserSelection>(null);

  const selectedList = selection?.type === 'list' ? findListInGroups(groups, selection.listId) : null;
  const selectedCard = selection?.type === 'card' ? findCardInGroups(groups, selection.cardId) : null;

  const detail = useCardDetail(selectedCard, projectId, () => setSelection(null));

  const selectList = (list: { id: number }) => {
    detail.flushSave();
    router.refresh();
    setSelection({ type: 'list', listId: list.id });
  };
  const selectCard = (card: { id: number }) => {
    detail.flushSave();
    router.refresh();
    setSelection({ type: 'card', cardId: card.id });
  };

  const showCard = selection?.type === 'card' && !!detail.viewingCard;
  const showList = selection?.type === 'list' && !!selectedList;

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr) 300px',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <FileTree groups={groups} selection={selection} onSelectList={selectList} onSelectCard={selectCard} />

      {showCard ? (
        <>
          <CardDetailCenter detail={detail} spacing={spacing} />
          <CardDetailSidebar detail={detail} catalog={catalog} onManageLabels={onManageLabels} wcSettings={wcSettings} />
        </>
      ) : showList ? (
        <>
          <ListStackView key={selectedList!.id} list={selectedList!} spacing={spacing} />
          <div />
        </>
      ) : (
        <>
          <EmptyCenterState />
          <div />
        </>
      )}
    </Box>
  );
}
