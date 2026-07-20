// src/utils/writingTheme.ts
//
// The Writing Desk theme contract: a flat, all-optional set of named CSS
// tokens a user can supply (as JSON) to restyle the board without touching
// code. Every surface below has a hardcoded default elsewhere (glass.ts,
// GroupRow.tsx, CardItem.tsx, the Tiptap editor) — a theme only overrides
// what it explicitly sets via a CSS custom property; anything it omits falls
// through to that hardcoded default (`var(--theme-x, <default>)`), so "no
// theme selected" stays pixel-identical to today.
import { onSwatchColor } from './writingLabels';

export type ThemeTokenKind = 'color' | 'length' | 'shadow';

type TokenSpec = {
  key: string;
  cssVar: string;
  kind: ThemeTokenKind;
  label: string;
  // If set, this token is a background whose paired text token (below) gets
  // an auto-derived readable color when the theme sets the background but
  // omits the text color.
  pairedTextKey?: string;
};

// The whitelist. Keys here are the ONLY keys a theme file may set — anything
// else is rejected at upload time so typos surface immediately instead of
// silently doing nothing.
export const THEME_TOKENS: TokenSpec[] = [
  { key: 'boardBackground', cssVar: '--theme-board-bg', kind: 'color', label: 'Board background (used when there is no image background)' },

  { key: 'glassBackground', cssVar: '--theme-glass-bg', kind: 'color', label: 'Glass panel background (over an image background)' },
  { key: 'glassBorder', cssVar: '--theme-glass-border', kind: 'color', label: 'Glass panel border' },
  { key: 'glassBlur', cssVar: '--theme-glass-blur', kind: 'length', label: 'Glass panel blur radius' },
  { key: 'glassText', cssVar: '--theme-glass-text', kind: 'color', label: 'Text on glass panels' },

  { key: 'groupBackground', cssVar: '--theme-group-bg', kind: 'color', label: 'Group row background' },
  { key: 'groupBorder', cssVar: '--theme-group-border', kind: 'color', label: 'Group row border' },
  { key: 'groupShadow', cssVar: '--theme-group-shadow', kind: 'shadow', label: 'Group row shadow' },

  { key: 'cardBackground', cssVar: '--theme-card-bg', kind: 'color', label: 'Card background', pairedTextKey: 'cardText' },
  { key: 'cardBorder', cssVar: '--theme-card-border', kind: 'color', label: 'Card border' },
  { key: 'cardText', cssVar: '--theme-card-text', kind: 'color', label: 'Card title/body text' },
  { key: 'cardMutedText', cssVar: '--theme-card-muted-text', kind: 'color', label: 'Card secondary text (word counts, meta)' },

  { key: 'editorBackground', cssVar: '--theme-editor-bg', kind: 'color', label: 'Editor content background', pairedTextKey: 'editorText' },
  { key: 'editorText', cssVar: '--theme-editor-text', kind: 'color', label: 'Editor content text' },
  { key: 'editorHeaderBackground', cssVar: '--theme-editor-header-bg', kind: 'color', label: 'Editor toolbar background', pairedTextKey: 'editorHeaderText' },
  { key: 'editorHeaderText', cssVar: '--theme-editor-header-text', kind: 'color', label: 'Editor toolbar icons/text' },

  { key: 'headingColor', cssVar: '--theme-heading', kind: 'color', label: 'Headings/titles' },
  { key: 'mutedText', cssVar: '--theme-muted-text', kind: 'color', label: 'General secondary text' },
  { key: 'accentColor', cssVar: '--theme-accent', kind: 'color', label: 'Buttons/active-state accent' },
];

const TOKEN_BY_KEY = new Map(THEME_TOKENS.map((t) => [t.key, t]));

export type WritingThemeDefinition = Partial<Record<string, string>>;

// Rejects anything that isn't a plausible CSS color: hex (#rgb/#rgba/#rrggbb/
// #rrggbbaa), rgb()/rgba()/hsl()/hsla(), the `transparent` keyword, or a bare
// CSS color name (letters only). Blocks parens-based CSS functions other than
// the color functions above, so nothing here can smuggle in url(...) or a
// stylesheet breakout — these values are set via the DOM style API (not
// string-concatenated into a <style> tag), but validating the shape keeps bad
// uploads from silently rendering as invisible/broken instead of erroring.
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.%,\s]+\)|hsla?\(\s*[\d.%,\s]+\)|transparent|[a-zA-Z]+)$/;
const LENGTH_RE = /^\d+(\.\d+)?(px|rem|em)$/;
// A box-shadow value: one or more comma-separated "offset offset blur? spread? color?"
// clauses. Same charset restriction as color, plus digits/px/spaces/commas.
const SHADOW_CLAUSE = '(inset\\s+)?(-?\\d+(\\.\\d+)?(px|rem|em)?\\s*)+(#[0-9a-fA-F]{3,8}|rgba?\\(\\s*[\\d.%,\\s]+\\)|[a-zA-Z]+)?';
const SHADOW_RE = new RegExp(`^${SHADOW_CLAUSE}(\\s*,\\s*${SHADOW_CLAUSE})*$`);

function isValidValue(kind: ThemeTokenKind, value: string): boolean {
  if (kind === 'color') return COLOR_RE.test(value.trim());
  if (kind === 'length') return LENGTH_RE.test(value.trim());
  return SHADOW_RE.test(value.trim());
}

// Parses+validates an uploaded theme file's JSON text. Throws a descriptive
// Error naming the exact problem (unknown key, bad value) — callers surface
// that to the user rather than swallowing it, since a silently-rejected key
// is a theme that looks wrong for no visible reason.
export function parseThemeDefinition(json: string): WritingThemeDefinition {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Theme file must be a JSON object of token: value pairs.');
  }

  const result: WritingThemeDefinition = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const spec = TOKEN_BY_KEY.get(key);
    if (!spec) {
      throw new Error(`Unknown theme token "${key}". Valid tokens: ${THEME_TOKENS.map((t) => t.key).join(', ')}`);
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Theme token "${key}" must be a non-empty string.`);
    }
    if (!isValidValue(spec.kind, value)) {
      throw new Error(`Theme token "${key}" has an invalid ${spec.kind} value: "${value}"`);
    }
    result[key] = value.trim();
  }
  return result;
}

// Best-effort luminance read for an arbitrary CSS color string, used only to
// pick a readable fallback text color. Handles hex and rgb()/rgba(); anything
// else (hsl, named colors) defaults to treating the background as dark, which
// biases toward white text — the safer failure mode for readability.
function isLight(color: string): boolean {
  const hex = /^#([0-9a-fA-F]{6})/.exec(color);
  if (hex) return onSwatchColor(`#${hex[1]}`) === '#000';
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    return 0.299 * r + 0.587 * g + 0.114 * b > 150;
  }
  return false;
}

// Emits the CSS custom properties for a theme, as a plain object suitable to
// spread into a React inline `style`. Background tokens missing their paired
// text token get one derived for contrast instead of being left unset (which
// would fall through to a default text color that may not read against the
// custom background).
export function themeVars(definition: WritingThemeDefinition | null | undefined): Record<string, string> {
  if (!definition) return {};
  const vars: Record<string, string> = {};
  for (const spec of THEME_TOKENS) {
    const value = definition[spec.key];
    if (value) vars[spec.cssVar] = value;
  }
  for (const spec of THEME_TOKENS) {
    if (!spec.pairedTextKey) continue;
    const bg = definition[spec.key];
    const textSpec = TOKEN_BY_KEY.get(spec.pairedTextKey);
    if (bg && textSpec && !definition[spec.pairedTextKey]) {
      vars[textSpec.cssVar] = isLight(bg) ? '#111111' : '#ffffff';
    }
  }
  return vars;
}
