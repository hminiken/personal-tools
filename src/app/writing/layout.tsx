// src/app/writing/layout.tsx
//
// Server Component so it can self-host the Writing Desk fonts via next/font.
// Each font is exposed as a CSS custom property (matching the `cssVar` in
// utils/writingFonts.ts); the editor applies the chosen one via --doc-font-family
// (document-wide) or an inline FontFamily mark (per selection). Loading them
// here scopes the font downloads to writing routes only. The interactive
// providers (Mantine theme, scrollbar styling) live in WritingProviders.
//
// The var-carrier <div> uses display:contents so it applies the CSS custom
// properties to the whole subtree without introducing a layout box of its own.
import {
  EB_Garamond,
  Literata,
  Lora,
  Merriweather,
  Crimson_Pro,
  Source_Serif_4,
  Bitter,
  Libre_Baskerville,
  Playfair_Display,
  Fraunces,
  Zilla_Slab,
  Inter,
  Atkinson_Hyperlegible,
  Source_Sans_3,
  Work_Sans,
  Nunito_Sans,
  Space_Grotesk,
  Poppins,
  Josefin_Sans,
  Courier_Prime,
  JetBrains_Mono,
  IBM_Plex_Mono,
} from 'next/font/google';
import WritingProviders from './_components/WritingProviders';

// preload:false — every var is declared, but only the font the user actually
// picks gets applied to text (and thus downloaded). Preloading would fetch all
// of them on every writing page (and warn about the unused ones); on-demand
// load + swap is the right trade-off for a font picker.
// Variable fonts — the whole weight range ships in one file, so no `weight`.
const ebGaramond = EB_Garamond({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-eb-garamond' });
const literata = Literata({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-literata' });
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-lora' });
const crimsonPro = Crimson_Pro({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-crimson-pro' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-source-serif' });
const bitter = Bitter({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-bitter' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-playfair' });
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-fraunces' });
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-inter' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-source-sans' });
const workSans = Work_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-work-sans' });
const nunitoSans = Nunito_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-nunito-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-space-grotesk' });
const josefinSans = Josefin_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-josefin-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-jetbrains' });

// Static fonts — enumerate the weights/styles we use. (Libre Baskerville has no
// 700 italic, so we load normal only and let the browser synthesise italics.)
const merriweather = Merriweather({ subsets: ['latin'], display: 'swap', preload: false, weight: ['300', '400', '700', '900'], style: ['normal', 'italic'], variable: '--font-merriweather' });
const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], style: ['normal'], variable: '--font-libre-baskerville' });
const zillaSlab = Zilla_Slab({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-zilla-slab' });
const poppins = Poppins({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '700'], style: ['normal', 'italic'], variable: '--font-poppins' });
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-atkinson' });
const courierPrime = Courier_Prime({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-courier-prime' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '700'], style: ['normal', 'italic'], variable: '--font-ibm-plex-mono' });

// One list drives both outputs below, so the CSS var names can't drift. Each
// var name matches the `variable` option above and the `cssVar` in
// utils/writingFonts.ts.
const FONTS: [string, { variable: string; style: { fontFamily: string } }][] = [
  ['--font-eb-garamond', ebGaramond],
  ['--font-literata', literata],
  ['--font-lora', lora],
  ['--font-merriweather', merriweather],
  ['--font-crimson-pro', crimsonPro],
  ['--font-source-serif', sourceSerif],
  ['--font-bitter', bitter],
  ['--font-libre-baskerville', libreBaskerville],
  ['--font-playfair', playfair],
  ['--font-fraunces', fraunces],
  ['--font-zilla-slab', zillaSlab],
  ['--font-inter', inter],
  ['--font-atkinson', atkinson],
  ['--font-source-sans', sourceSans],
  ['--font-work-sans', workSans],
  ['--font-nunito-sans', nunitoSans],
  ['--font-space-grotesk', spaceGrotesk],
  ['--font-poppins', poppins],
  ['--font-josefin-sans', josefinSans],
  ['--font-courier-prime', courierPrime],
  ['--font-jetbrains', jetbrainsMono],
  ['--font-ibm-plex-mono', ibmPlexMono],
];

const fontVars = FONTS.map(([, f]) => f.variable).join(' ');

// The var-carrier <div> below only reaches this route's DOM subtree, but the
// font picker's dropdown renders in a portal on <body> (outside the subtree),
// so var(--font-*) there resolved to nothing and every preview fell back to the
// default face. Declaring the same vars at :root makes them global, so portaled
// UI (dropdown previews, modals) inherits them too. next/font exposes each
// font's resolved family name via `.style.fontFamily`.
const rootFontVars = `:root{${FONTS.map(([name, f]) => `${name}:${f.style.fontFamily};`).join('')}}`;

export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={fontVars} style={{ display: 'contents' }}>
      <style>{rootFontVars}</style>
      <WritingProviders>{children}</WritingProviders>
    </div>
  );
}
