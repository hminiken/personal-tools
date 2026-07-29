// src/app/layout.tsx

import '@mantine/core/styles.css';
import { MantineProvider, createTheme, MantineColorsTuple } from '@mantine/core';
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

// Inlined here (rather than Mantine's <ColorSchemeScript />) because that
// component is "use client", which puts this <script> tag on React's client
// render path — and React 19 warns there since client-rendered <script> tags
// are never executed. A plain string rendered from this Server Component
// avoids that path entirely; the browser executes it directly from the HTML.
const colorSchemeScript = `try {
  var _colorScheme = window.localStorage.getItem("mantine-color-scheme-value");
  var colorScheme = _colorScheme === "light" || _colorScheme === "dark" || _colorScheme === "auto" ? _colorScheme : "auto";
  var computedColorScheme = colorScheme !== "auto" ? colorScheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Checks the user's system/localStorage color scheme preference to prevent flashing */}
        <script data-mantine-script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          {/* zIndex above any app modal's own override (ManageLabelsModal bumps
              itself to 300 to beat CardEditorModal) — otherwise a
              confirm/prompt/alert opened from inside an already-elevated
              modal renders behind it instead of on top. */}
          <ModalsProvider modalProps={{ zIndex: 400 }}>
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