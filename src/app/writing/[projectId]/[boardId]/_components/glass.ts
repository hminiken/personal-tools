import type { CSSProperties } from 'react';

// The Writing Desk's frosted-glass recipe for chrome sitting on a board
// background photo — same values as BoardTabs.module.css's .tabGlass, so
// tabs, header controls, and panes all read as one style. Each value reads
// its --theme-glass-* custom property (set by BoardView from the board's
// active theme) with the original hardcoded look as the var() fallback, so
// an unthemed board renders identically to before.
export const glassStyle: CSSProperties = {
  background: 'var(--theme-glass-bg, rgba(0,0,0,0.20))',
  backdropFilter: 'blur(var(--theme-glass-blur, 10px))',
  WebkitBackdropFilter: 'blur(var(--theme-glass-blur, 10px))',
  border: '1px solid var(--theme-glass-border, rgba(255,255,255,0.18))',
};

// Companion text treatment: white with a soft shadow so labels stay legible
// over whatever the background photo puts behind the glass.
export const glassTextStyle: CSSProperties = {
  color: 'var(--theme-glass-text, rgba(255,255,255,0.92))',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
};
