// src/utils/writingFonts.ts
//
// The curated set of writing fonts available in the Writing Desk, shared by:
//   - the document-wide font picker (DocumentSpacing menu → applied as the
//     `--doc-font-family` CSS var on the editor wrapper), and
//   - the inline per-selection font dropdown in the editor toolbar (Tiptap's
//     FontFamily mark, storing the resolved stack in the run's inline style).
//
// The actual font files are self-hosted at build time by next/font/google in
// the writing route layout, which exposes each as a CSS custom property (the
// `cssVar` below). `stack` references that var first, then names the font and a
// generic fallback so text still renders sensibly if the var isn't present
// (e.g. an exported/compiled surface rendered outside the writing layout).
//
// Keys are stored in the DB (boards.font_family) and in inline marks — treat
// them as a stable contract; add new fonts, don't rename existing keys.

export type FontCategory = 'serif' | 'sans' | 'mono';

export type WritingFont = {
  key: string;
  label: string;
  // The CSS custom property next/font assigns (see writing/layout.tsx). Must
  // match the `variable` option passed to the corresponding next/font loader.
  cssVar: string;
  // Full font-family value to apply: the var, the literal family name, then a
  // generic fallback of the right category.
  stack: string;
  category: FontCategory;
};

export const WRITING_FONTS: WritingFont[] = [
  // Serif — literary/manuscript body text
  { key: 'eb-garamond', label: 'EB Garamond', cssVar: '--font-eb-garamond', stack: "var(--font-eb-garamond), 'EB Garamond', Georgia, serif", category: 'serif' },
  { key: 'literata', label: 'Literata', cssVar: '--font-literata', stack: 'var(--font-literata), Literata, Georgia, serif', category: 'serif' },
  { key: 'lora', label: 'Lora', cssVar: '--font-lora', stack: 'var(--font-lora), Lora, Georgia, serif', category: 'serif' },
  { key: 'merriweather', label: 'Merriweather', cssVar: '--font-merriweather', stack: 'var(--font-merriweather), Merriweather, Georgia, serif', category: 'serif' },
  { key: 'crimson-pro', label: 'Crimson Pro', cssVar: '--font-crimson-pro', stack: "var(--font-crimson-pro), 'Crimson Pro', Georgia, serif", category: 'serif' },
  { key: 'source-serif', label: 'Source Serif 4', cssVar: '--font-source-serif', stack: "var(--font-source-serif), 'Source Serif 4', Georgia, serif", category: 'serif' },
  { key: 'bitter', label: 'Bitter', cssVar: '--font-bitter', stack: 'var(--font-bitter), Bitter, Georgia, serif', category: 'serif' },
  { key: 'libre-baskerville', label: 'Libre Baskerville', cssVar: '--font-libre-baskerville', stack: "var(--font-libre-baskerville), 'Libre Baskerville', Georgia, serif", category: 'serif' },
  // Distinctive serifs — strong personality, still readable as body text
  { key: 'playfair-display', label: 'Playfair Display', cssVar: '--font-playfair', stack: "var(--font-playfair), 'Playfair Display', Georgia, serif", category: 'serif' },
  { key: 'fraunces', label: 'Fraunces', cssVar: '--font-fraunces', stack: 'var(--font-fraunces), Fraunces, Georgia, serif', category: 'serif' },
  { key: 'zilla-slab', label: 'Zilla Slab', cssVar: '--font-zilla-slab', stack: "var(--font-zilla-slab), 'Zilla Slab', Georgia, serif", category: 'serif' },

  // Sans — clean/legible
  { key: 'inter', label: 'Inter', cssVar: '--font-inter', stack: 'var(--font-inter), Inter, system-ui, sans-serif', category: 'sans' },
  { key: 'atkinson', label: 'Atkinson Hyperlegible', cssVar: '--font-atkinson', stack: "var(--font-atkinson), 'Atkinson Hyperlegible', system-ui, sans-serif", category: 'sans' },
  { key: 'source-sans', label: 'Source Sans 3', cssVar: '--font-source-sans', stack: "var(--font-source-sans), 'Source Sans 3', system-ui, sans-serif", category: 'sans' },
  { key: 'work-sans', label: 'Work Sans', cssVar: '--font-work-sans', stack: "var(--font-work-sans), 'Work Sans', system-ui, sans-serif", category: 'sans' },
  { key: 'nunito-sans', label: 'Nunito Sans', cssVar: '--font-nunito-sans', stack: "var(--font-nunito-sans), 'Nunito Sans', system-ui, sans-serif", category: 'sans' },
  // Distinctive sans — geometric / quirky shapes
  { key: 'space-grotesk', label: 'Space Grotesk', cssVar: '--font-space-grotesk', stack: "var(--font-space-grotesk), 'Space Grotesk', system-ui, sans-serif", category: 'sans' },
  { key: 'poppins', label: 'Poppins', cssVar: '--font-poppins', stack: 'var(--font-poppins), Poppins, system-ui, sans-serif', category: 'sans' },
  { key: 'josefin-sans', label: 'Josefin Sans', cssVar: '--font-josefin-sans', stack: "var(--font-josefin-sans), 'Josefin Sans', system-ui, sans-serif", category: 'sans' },

  // Mono — screenplay/drafting
  { key: 'courier-prime', label: 'Courier Prime', cssVar: '--font-courier-prime', stack: "var(--font-courier-prime), 'Courier Prime', ui-monospace, 'Courier New', monospace", category: 'mono' },
  { key: 'jetbrains', label: 'JetBrains Mono', cssVar: '--font-jetbrains', stack: "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, monospace", category: 'mono' },
  { key: 'ibm-plex-mono', label: 'IBM Plex Mono', cssVar: '--font-ibm-plex-mono', stack: "var(--font-ibm-plex-mono), 'IBM Plex Mono', ui-monospace, monospace", category: 'mono' },
];

const FONT_BY_KEY = new Map(WRITING_FONTS.map((f) => [f.key, f]));

// Resolve a stored font key to a CSS font-family value. Unknown/empty keys
// (including the "System default" sentinel of null) return null so callers can
// fall through to the editor's inherited font.
export function fontStack(key: string | null | undefined): string | null {
  if (!key) return null;
  return FONT_BY_KEY.get(key)?.stack ?? null;
}

export function fontLabel(key: string | null | undefined): string {
  if (!key) return 'Default';
  return FONT_BY_KEY.get(key)?.label ?? key;
}

// Grouped for rendering the picker under category headers.
export const FONTS_BY_CATEGORY: Record<FontCategory, WritingFont[]> = {
  serif: WRITING_FONTS.filter((f) => f.category === 'serif'),
  sans: WRITING_FONTS.filter((f) => f.category === 'sans'),
  mono: WRITING_FONTS.filter((f) => f.category === 'mono'),
};

export const CATEGORY_LABEL: Record<FontCategory, string> = {
  serif: 'Serif',
  sans: 'Sans-serif',
  mono: 'Monospace',
};
