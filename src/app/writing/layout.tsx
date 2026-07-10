// src/app/writing/layout.tsx
'use client';

import { MantineProvider, DEFAULT_THEME } from '@mantine/core';

// The Writing Desk is intentionally neutral/grayscale, unlike the rest of the
// app's olive/rust/mustard theme. Most writing components were recolored
// directly, but several shared components (UploadModal, UnsplashPicker,
// GalleryGrid, FilterBuilder, ...) are also used by Crafting and hardcode
// color="olive"/"rust"/"mustard" — we can't edit those without changing
// Crafting's look too. Instead, redefine what those color *names* resolve to
// just for this subtree: olive/mustard become the stock neutral gray ramp,
// rust (the app's custom danger color) becomes the stock red ramp. Crafting
// renders under the root provider and keeps the real colors.
export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={{
        primaryColor: 'dark',
        colors: {
          olive: DEFAULT_THEME.colors.gray,
          mustard: DEFAULT_THEME.colors.gray,
          rust: DEFAULT_THEME.colors.red,
        },
      }}
    >
      {children}
    </MantineProvider>
  );
}
