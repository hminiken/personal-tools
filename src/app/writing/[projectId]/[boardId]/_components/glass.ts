import type { CSSProperties } from 'react';

// The Writing Desk's frosted-glass recipe for chrome sitting on a board
// background photo — same values as BoardTabs.module.css's .tabGlass, so
// tabs, header controls, and panes all read as one style.
export const glassStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.20)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.18)',
};

// Companion text treatment: white with a soft shadow so labels stay legible
// over whatever the background photo puts behind the glass.
export const glassTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.92)',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
};
