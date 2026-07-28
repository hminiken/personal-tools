'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Pane, { stickyPaneStyle } from './Pane';

// Right-rail "card details" pane, collapsible to a slim rail the same way
// FileBrowserView's file tree collapses on the left — lets the editor take
// the full width for a focus-mode read/write pass.
export default function CardSidebarPane({
  hasBg,
  collapsed,
  onToggle,
  children,
}: {
  hasBg: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pane hasBg={hasBg} style={stickyPaneStyle} noPadding={collapsed}>
      {collapsed ? (
        <Tooltip label="Show card details" withinPortal position="left">
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="sm"
            onClick={onToggle}
            aria-label="Expand card details"
            style={{ width: '100%', height: 32 }}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <>
          <Tooltip label="Hide card details" withinPortal>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={onToggle}
              aria-label="Collapse card details"
              style={{ float: 'left', marginBottom: 4 }}
            >
              <IconChevronRight size={14} />
            </ActionIcon>
          </Tooltip>
          {children}
        </>
      )}
    </Pane>
  );
}
