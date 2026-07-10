'use client';

import { useState } from 'react';
import { ActionIcon, Box, Group, Text, Tooltip } from '@mantine/core';
import {
  IconBan, IconChevronDown, IconChevronRight, IconFileText, IconFolder, IconFolderOpen,
} from '@tabler/icons-react';
import type { BoardCard, BoardGroup, BoardList } from '../../types';
import type { FileBrowserSelection } from './types';

const ROW_PAD_BASE = 8;
const ROW_INDENT = 18;

function TreeRow({
  depth,
  icon,
  label,
  selected,
  dimmed,
  onClick,
  chevron,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  dimmed?: boolean;
  onClick: () => void;
  chevron?: React.ReactNode;
}) {
  return (
    <Group
      gap={4}
      wrap="nowrap"
      onClick={onClick}
      py={4}
      pr={6}
      pl={ROW_PAD_BASE + depth * ROW_INDENT}
      style={{
        cursor: 'pointer',
        borderRadius: 4,
        background: selected ? 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))' : undefined,
      }}
    >
      {chevron}
      {icon}
      <Text size="sm" c={dimmed ? 'dimmed' : undefined} fs={dimmed ? 'italic' : undefined} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {label}
      </Text>
    </Group>
  );
}

// Read/navigate-only tree: boards→groups→lists as folders, cards as files.
// No dnd-kit here — reordering stays the Kanban view's job.
export default function FileTree({
  groups,
  selection,
  onSelectList,
  onSelectCard,
}: {
  groups: BoardGroup[];
  selection: FileBrowserSelection;
  onSelectList: (list: BoardList) => void;
  onSelectCard: (card: BoardCard) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(() => new Set());
  const [collapsedLists, setCollapsedLists] = useState<Set<number>>(() => new Set());

  const toggleGroup = (id: number) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleList = (id: number) =>
    setCollapsedLists((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Box style={{ overflowY: 'auto' }}>
      {groups.map((group) => {
        const groupCollapsed = collapsedGroups.has(group.id);
        return (
          <Box key={group.id}>
            <TreeRow
              depth={0}
              onClick={() => toggleGroup(group.id)}
              chevron={groupCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
              icon={groupCollapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
              label={group.title}
            />
            {!groupCollapsed && group.lists.map((list) => {
              const listCollapsed = collapsedLists.has(list.id);
              const listSelected = selection?.type === 'list' && selection.listId === list.id;
              return (
                <Box key={list.id}>
                  <TreeRow
                    depth={1}
                    selected={listSelected}
                    onClick={() => onSelectList(list)}
                    chevron={
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        color="gray"
                        onClick={(e) => { e.stopPropagation(); toggleList(list.id); }}
                        aria-label={listCollapsed ? 'Expand list' : 'Collapse list'}
                      >
                        {listCollapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
                      </ActionIcon>
                    }
                    icon={listCollapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
                    label={list.title}
                  />
                  {!listCollapsed && list.cards.map((card) => {
                    const cardSelected = selection?.type === 'card' && selection.cardId === card.id;
                    return (
                      <TreeRow
                        key={card.id}
                        depth={2}
                        selected={cardSelected}
                        dimmed={!card.includeInCompile}
                        onClick={() => onSelectCard(card)}
                        icon={
                          card.includeInCompile ? (
                            <IconFileText size={15} />
                          ) : (
                            <Tooltip label="Excluded from compile" withinPortal>
                              <span style={{ display: 'flex' }}>
                                <IconBan size={13} />
                              </span>
                            </Tooltip>
                          )
                        }
                        label={card.title || 'Untitled'}
                      />
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
