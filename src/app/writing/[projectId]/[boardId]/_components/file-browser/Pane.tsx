'use client';

import { Paper } from '@mantine/core';
import { glassStyle, glassTextStyle } from '../glass';

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
// glassTextStyle sets a literal `color: white`, which plain default Text/Title
// (they set no `color` of their own) inherit normally; the --mantine-color-text/
// --mantine-color-dimmed overrides below additionally cover anything that
// reads those vars directly (`c="dimmed"`, the board-tabs CSS module).
export default function Pane({
  hasBg,
  solid = false,
  style,
  noPadding = false,
  children,
}: {
  hasBg: boolean;
  // Force a single opaque surface even over a board photo. The editor column
  // uses this: its prose must sit on a solid sheet, so a translucent glass
  // frame would only stack another semi-transparent layer over the photo
  // behind the already-opaque editor. Chrome panes (tree/sidebar) stay glass.
  solid?: boolean;
  style?: React.CSSProperties;
  // For the collapsed-tree rail: just a slim button strip, not a padded panel.
  noPadding?: boolean;
  children: React.ReactNode;
}) {
  const useGlass = hasBg && !solid;
  // Solid panes are the editor's own sheet — theme their background to match
  // the RichTextEditor content sitting inside so the two read as one surface.
  // Chrome panes (tree/sidebar) aren't glass and aren't the editor either —
  // theme them as list/panel chrome, same as a Kanban list column.
  const chrome: React.CSSProperties = useGlass
    ? {
        ...glassStyle,
        ...glassTextStyle,
        '--mantine-color-text': 'rgba(255,255,255,0.92)',
        '--mantine-color-dimmed': 'rgba(255,255,255,0.65)',
      } as React.CSSProperties
    : solid
      ? {
          background: 'var(--theme-editor-bg, var(--mantine-color-body))',
        }
      : {
          background: 'var(--theme-list-bg, var(--mantine-color-body))',
          borderColor: 'var(--theme-list-border, var(--mantine-color-default-border))',
          color: 'var(--theme-list-text, inherit)',
        };
  return (
    <Paper
      radius="md"
      p={noPadding ? 4 : 'sm'}
      // Solid panes are the editor's own sheet (see chrome comment above) —
      // a border there reads as a seam around the sticky toolbar, which
      // bleeds to the pane's edge via its own negative margin and so butts
      // directly against it. Glass panes rely on their own translucent
      // border from glassStyle; list-chrome panes keep the normal border.
      withBorder={!useGlass && !solid}
      style={{ ...chrome, ...style }}
    >
      {children}
    </Paper>
  );
}
