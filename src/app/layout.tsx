// src/app/layout.tsx
import '@mantine/core/styles.css'; // CRITICAL: This must be imported first
import NavigationShell from '@/components/NavigationShell';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';

export const metadata = {
  title: 'My Command Center',
  description: 'Personal tools and tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning is required by Mantine to prevent mismatch errors between server and client rendering
    <html lang="en" suppressHydrationWarning> 
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
         <NavigationShell>
            {children}
          </NavigationShell>
        </MantineProvider>
      </body>
    </html>
  );
}