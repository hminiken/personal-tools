'use client';

import { useState } from 'react';
import { ActionIcon, Box, Group, Text, Tooltip } from '@mantine/core';
import {
  IconBan, IconChevronDown, IconChevronRight, IconFileText, IconFolder, IconFolderOpen,
} from '@tabler/icons-react';
import type { BoardCard, BoardGroup, BoardList } from '../../types';
import type { FileBrowserSelection } from './types';

const ROW_PAD_BASE = 8;
const ROW_INDENT = 14;

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
        background: selected ? 'light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))' : undefined,
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

// Navigate-only tree: the board, groups, and lists are folders (click the
// name to compile that scope in the center pane; the chevron expands or
// collapses without selecting), cards are files. No dnd-kit here —
// reordering stays the Kanban view's job.
export default function FileTree({
  boardTitle,
  groups,
  selection,
  onSelectBoard,
  onSelectGroup,
  onSelectList,
  onSelectCard,
}: {
  boardTitle: string;
  groups: BoardGroup[];
  selection: FileBrowserSelection;
  onSelectBoard: () => void;
  onSelectGroup: (group: BoardGroup) => void;
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

  const expandChevron = (collapsed: boolean, onToggle: () => void, what: string) => (
    <ActionIcon
      size="xs"
      variant="transparent"
      color="gray"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={collapsed ? `Expand ${what}` : `Collapse ${what}`}
    >
      {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
    </ActionIcon>
  );

  return (
    <Box style={{ overflowY: 'auto' }}>
      <TreeRow
        depth={0}
        selected={selection?.type === 'board'}
        onClick={onSelectBoard}
        icon={<IconFolderOpen size={16} />}
        label={boardTitle}
      />
      {groups.map((group) => {
        const groupCollapsed = collapsedGroups.has(group.id);
        return (
          <Box key={group.id}>
            <TreeRow
              depth={1}
              selected={selection?.type === 'group' && selection.groupId === group.id}
              onClick={() => onSelectGroup(group)}
              chevron={expandChevron(groupCollapsed, () => toggleGroup(group.id), 'group')}
              icon={groupCollapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
              label={group.title}
            />
            {!groupCollapsed && group.lists.map((list) => {
              const listCollapsed = collapsedLists.has(list.id);
              const listSelected = selection?.type === 'list' && selection.listId === list.id;
              return (
                <Box key={list.id}>
                  <TreeRow
                    depth={2}
                    selected={listSelected}
                    onClick={() => onSelectList(list)}
                    chevron={expandChevron(listCollapsed, () => toggleList(list.id), 'list')}
                    icon={listCollapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
                    label={list.title}
                  />
                  {!listCollapsed && list.cards.map((card) => {
                    const cardSelected = selection?.type === 'card' && selection.cardId === card.id;
                    return (
                      <TreeRow
                        key={card.id}
                        depth={3}
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
