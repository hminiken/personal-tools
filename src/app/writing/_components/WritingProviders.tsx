'use client';

import { MantineProvider, DEFAULT_THEME, ScrollArea } from '@mantine/core';

// Client-side providers for the Writing Desk subtree. Split out from the route
// layout so the layout itself can stay a Server Component (it loads the writing
// fonts via next/font, which must run server-side). See writing/layout.tsx.
//
// The Writing Desk is intentionally neutral/grayscale, unlike the rest of the
// app's olive/rust/mustard theme. Most writing components were recolored
// directly, but several shared components (UploadModal, UnsplashPicker,
// GalleryGrid, FilterBuilder, ...) are also used by Crafting and hardcode
// color="olive"/"rust"/"mustard" — we can't edit those without changing
// Crafting's look too. Instead, redefine what those color *names* resolve to
// just for this subtree: olive/mustard become the stock neutral gray ramp,
// rust (the app's custom danger color) becomes the stock red ramp. Crafting
// renders under the root provider and keeps the real colors.
export default function WritingProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={{
        primaryColor: 'dark',
        colors: {
          olive: DEFAULT_THEME.colors.gray,
          mustard: DEFAULT_THEME.colors.gray,
          rust: DEFAULT_THEME.colors.red,
        },
        components: {
          // The board's scroll areas used Mantine's stock scrollbars: ~12px
          // wide with a gray thumb on a light track — inconsistent (only group
          // rows set a size) and visually heavy. Thin them out and give the
          // thumb a translucent color that reads correctly on any surface in
          // both light and dark, with the track transparent. Scoped to the
          // writing subtree so the rest of the app is untouched. The theme var
          // fallback lets a future board theme override the thumb color.
          ScrollArea: ScrollArea.extend({
            defaultProps: { scrollbarSize: 8 },
            styles: {
              scrollbar: { background: 'transparent' },
              thumb: {
                backgroundColor:
                  'var(--theme-scrollbar-thumb, light-dark(rgba(0, 0, 0, 0.28), rgba(255, 255, 255, 0.32)))',
              },
            },
          }),
        },
      }}
    >
      {children}
    </MantineProvider>
  );
}
