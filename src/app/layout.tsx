// src/app/layout.tsx

import '@mantine/core/styles.css';
import {  MantineProvider, createTheme, MantineColorsTuple, ColorSchemeScript } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import NavigationShell from '@/components/NavigationShell';
import { PageTitleProvider } from '@/components/PageTitleContext';

const themeColors: MantineColorsTuple = [
  "#f1f8f4",
  "#e4eee7",
  "#c3dccb",
  "#a0c9ad",
  "#83ba94",
  "#70b084",
  "#65ab7b",
  "#549669",
  "#49855c",
  "#3c7850"
];

const theme = createTheme({
  colors: {
    themeColors,
    'rust': ["#fff0ea",
      "#f6e0d9",
      "#e7c0b3",
      "#d99e8a",
      "#cd8168",
      "#c66e51",
      "#c36445",
      "#b8593a",
      "#9b492f",
      "#883d25"],
    'olive': [
      "#f5f7f2",
      "#eaede6",
      "#d1d9c7",
      "#b7c5a5",
      "#a1b389",
      "#93a976",
      "#8ca36c",
      "#788e5a",
      "#6a7f4f",
      "#455431"
    ],

    'mustard': [
      "#fef6e6",
      "#f5ebd7",
      "#e7d5b3",
      "#d9be8b",
      "#ccab69",
      "#c59e53",
      "#c39a4a",
      "#ab8437",
      "#98752e",
      "#846421"
    ],
    'neutrals': [
      "#f8f5f2",
      "#e9e7e6",
      "#d4cdc7",
      "#c0b1a6",
      "#ae9989",
      "#a48a76",
      "#9f826b",
      "#8b705a",
      "#7d634e",
      "#453528"
    ]
  },
  primaryColor: 'themeColors',
});
export const metadata = {
  title: 'My Command Center',
  description: 'Personal tools and tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Tells Mantine to inject the script that checks for the user's system preference to prevent flashing */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <ModalsProvider>
            <PageTitleProvider>
              <NavigationShell>
                {children}
              </NavigationShell>
            </PageTitleProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}