// src/app/layout.tsx

import '@mantine/core/styles.css';
import './imageResize.css';
import './callouts.css';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import NavigationShell from '@/components/NavigationShell';
import { theme } from '@/theme';

export const metadata = {
  title: 'My Command Center',
  description: 'Personal tools and tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved/system color scheme before paint so the page doesn't flash */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <NavigationShell>
            {children}
          </NavigationShell>
        </MantineProvider>
      </body>
    </html>
  );
}
