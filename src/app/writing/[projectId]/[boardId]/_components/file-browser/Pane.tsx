'use client';

import { Paper } from '@mantine/core';

// Pins a pane to the viewport as the page scrolls (the center editor can grow
// arbitrarily tall, so the page itself scrolls) and scrolls its own content
// internally once it exceeds the visible height, instead of scrolling away
// with the rest of the page.
export const stickyPaneStyle: React.CSSProperties = {
  position: 'sticky',
  top: 16,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  // Without an explicit overflow-x, browsers auto-compute it to 'auto' too
  // (per spec, once one axis is non-visible) — any 1px horizontal overflow
  // then draws a bottom scrollbar, which shows up on the slim collapsed rail.
  overflowX: 'hidden',
};

// A frosted panel behind each pane's content when the board has a background
// photo — same frosted-glass recipe as the board tabs' `.tabGlass` variant
// (BoardTabs.module.css), so the tabs and these panes read as one style.
// Text inside is white: Mantine's Text/Title read the --mantine-color-text /
// --mantine-color-dimmed CSS variables rather than an inherited `color`, so
// overriding those two vars on the wrapper turns every default-colored and
// "dimmed" label inside white without touching each child component.
export default function Pane({
  hasBg,
  style,
  noPadding = false,
  children,
}: {
  hasBg: boolean;
  style?: React.CSSProperties;
  // For the collapsed-tree rail: just a slim button strip, not a padded panel.
  noPadding?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Paper
      radius="md"
      p={noPadding ? 4 : 'sm'}
      withBorder={!hasBg}
      style={{
        ...(hasBg
          ? ({
              background: 'rgba(0,0,0,0.20)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
              '--mantine-color-text': 'rgba(255,255,255,0.92)',
              '--mantine-color-dimmed': 'rgba(255,255,255,0.65)',
            } as React.CSSProperties)
          : {}),
        ...style,
      }}
    >
      {children}
    </Paper>
  );
}
