'use client';

import type { CSSProperties } from 'react';
import { Menu, ActionIcon, Tooltip, Select, Switch, Stack, Group } from '@mantine/core';
import { IconLineHeight, IconCheck } from '@tabler/icons-react';
import classes from './DocumentSpacing.module.css';
import { fontStack, FONTS_BY_CATEGORY, CATEGORY_LABEL, type FontCategory } from '@/utils/writingFonts';

export type Spacing = {
  lineHeight: string | null;
  spaceBefore: string | null;
  spaceAfter: string | null;
  // Typography (all optional so existing call sites that only build the three
  // spacing fields still satisfy the type). fontFamily is a key from
  // utils/writingFonts; fontSize/paragraphIndent are CSS lengths; smartQuotes
  // null = default on, false = straight quotes.
  fontFamily?: string | null;
  fontSize?: string | null;
  paragraphIndent?: string | null;
  smartQuotes?: boolean | null;
};

// Wrapper class + inline CSS vars to apply a board's formatting to its editors.
export const docSpacingClass = classes.doc;

export function spacingVars(s: Spacing): CSSProperties {
  const vars: Record<string, string> = {};
  if (s.lineHeight) vars['--doc-line-height'] = s.lineHeight;
  if (s.spaceBefore) vars['--doc-space-before'] = s.spaceBefore;
  if (s.spaceAfter) vars['--doc-space-after'] = s.spaceAfter;
  const stack = fontStack(s.fontFamily);
  if (stack) vars['--doc-font-family'] = stack;
  if (s.fontSize) vars['--doc-font-size'] = s.fontSize;
  if (s.paragraphIndent) vars['--doc-indent'] = s.paragraphIndent;
  return vars as CSSProperties;
}

const LINE_HEIGHTS: [string, string][] = [
  ['1', 'Single'],
  ['1.15', '1.15'],
  ['1.5', '1.5'],
  ['2', 'Double'],
];
// '0' = explicitly none; the "Default" item below clears to the editor default.
const SPACES: [string, string][] = [
  ['0', 'None'],
  ['0.5em', 'Small'],
  ['1em', 'Medium'],
  ['1.5em', 'Large'],
];
const FONT_SIZES: [string, string][] = [
  ['14px', '14'],
  ['15px', '15'],
  ['16px', '16'],
  ['17px', '17'],
  ['18px', '18'],
  ['20px', '20'],
];
// First-line indent presets. null = off (no auto-indent).
const INDENTS: [string, string][] = [
  ['1.5em', 'Small'],
  ['2.5em', 'Medium'],
  ['4em', 'Large'],
];
const FONT_CATEGORIES: FontCategory[] = ['serif', 'sans', 'mono'];

// A menu for the whole-document (per-board) prose formatting: font, size, line
// spacing, paragraph spacing, first-line indent, and smart quotes. Stays open
// while you adjust multiple values; each change calls onChange with the full
// next value.
export function DocumentSpacingMenu({
  value,
  onChange,
}: {
  value: Spacing;
  onChange: (next: Spacing) => void;
}) {
  const update = (patch: Partial<Spacing>) => onChange({ ...value, ...patch });
  const check = (active: boolean) => (active ? <IconCheck size={14} /> : null);
  const smartOn = value.smartQuotes !== false; // null/undefined = default on

  return (
    <Menu position="bottom-end" withinPortal width={240} closeOnItemClick={false}>
      <Menu.Target>
        <Tooltip label="Document formatting">
          <ActionIcon variant="light" color="gray" size="lg" aria-label="Document formatting">
            <IconLineHeight size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      {/* The combined controls can exceed the viewport — cap the dropdown and
          let it scroll rather than run off-screen. */}
      <Menu.Dropdown style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Menu.Label>Font</Menu.Label>
        {FONT_CATEGORIES.map((cat) => (
          <div key={cat}>
            <Menu.Label c="dimmed" fz={10} tt="uppercase" py={2}>{CATEGORY_LABEL[cat]}</Menu.Label>
            {FONTS_BY_CATEGORY[cat].map((f) => (
              <Menu.Item
                key={f.key}
                rightSection={check(value.fontFamily === f.key)}
                onClick={() => update({ fontFamily: f.key })}
                style={{ fontFamily: f.stack }}
              >
                {f.label}
              </Menu.Item>
            ))}
          </div>
        ))}
        <Menu.Item c="dimmed" onClick={() => update({ fontFamily: null })}>Default</Menu.Item>

        <Menu.Divider />
        <Menu.Label>Font size</Menu.Label>
        {FONT_SIZES.map(([v, l]) => (
          <Menu.Item key={`fs-${v}`} rightSection={check(value.fontSize === v)} onClick={() => update({ fontSize: v })}>
            {l}
          </Menu.Item>
        ))}
        <Menu.Item c="dimmed" onClick={() => update({ fontSize: null })}>Default</Menu.Item>

        <Menu.Divider />
        <Menu.Label>Line spacing</Menu.Label>
        {LINE_HEIGHTS.map(([v, l]) => (
          <Menu.Item key={`lh-${v}`} rightSection={check(value.lineHeight === v)} onClick={() => update({ lineHeight: v })}>
            {l}
          </Menu.Item>
        ))}
        <Menu.Item c="dimmed" onClick={() => update({ lineHeight: null })}>Default</Menu.Item>

        <Menu.Divider />
        <Menu.Label>Space before paragraph</Menu.Label>
        {SPACES.map(([v, l]) => (
          <Menu.Item key={`sb-${v}`} rightSection={check(value.spaceBefore === v)} onClick={() => update({ spaceBefore: v })}>
            {l}
          </Menu.Item>
        ))}
        <Menu.Item c="dimmed" onClick={() => update({ spaceBefore: null })}>Default</Menu.Item>

        <Menu.Divider />
        <Menu.Label>Space after paragraph</Menu.Label>
        {SPACES.map(([v, l]) => (
          <Menu.Item key={`sa-${v}`} rightSection={check(value.spaceAfter === v)} onClick={() => update({ spaceAfter: v })}>
            {l}
          </Menu.Item>
        ))}
        <Menu.Item c="dimmed" onClick={() => update({ spaceAfter: null })}>Default</Menu.Item>

        <Menu.Divider />
        <Menu.Label>First-line indent</Menu.Label>
        <Menu.Item rightSection={check(!value.paragraphIndent)} onClick={() => update({ paragraphIndent: null })}>
          Off
        </Menu.Item>
        {INDENTS.map(([v, l]) => (
          <Menu.Item key={`in-${v}`} rightSection={check(value.paragraphIndent === v)} onClick={() => update({ paragraphIndent: v })}>
            {l}
          </Menu.Item>
        ))}

        <Menu.Divider />
        <Menu.Label>Typography</Menu.Label>
        <Menu.Item rightSection={check(smartOn)} onClick={() => update({ smartQuotes: !smartOn })}>
          Smart quotes “ ”
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

// Grouped Select data for the font picker (serif / sans / mono).
const FONT_SELECT_DATA = FONT_CATEGORIES.map((cat) => ({
  group: CATEGORY_LABEL[cat],
  items: FONTS_BY_CATEGORY[cat].map((f) => ({ value: f.key, label: f.label })),
}));

// Inline version of the document-formatting controls — the same settings as
// DocumentSpacingMenu, but laid out as a stack of labelled Selects + a Switch
// so they can live expanded inside the settings drawer rather than in a
// scrollable popup. Clearing a Select falls back to the editor default (null).
export function DocumentFormattingControls({
  value,
  onChange,
}: {
  value: Spacing;
  onChange: (next: Spacing) => void;
}) {
  const update = (patch: Partial<Spacing>) => onChange({ ...value, ...patch });
  const smartOn = value.smartQuotes !== false; // null/undefined = default on
  const cbx = { withinPortal: true } as const;

  return (
    <Stack gap="xs">
      <Select
        label="Font"
        placeholder="Default"
        size="xs"
        clearable
        data={FONT_SELECT_DATA}
        value={value.fontFamily ?? null}
        onChange={(v) => update({ fontFamily: v })}
        comboboxProps={cbx}
        renderOption={({ option }) => (
          <span style={{ fontFamily: fontStack(option.value) ?? undefined }}>{option.label}</span>
        )}
      />
      <Group gap="xs" grow wrap="nowrap">
        <Select
          label="Size"
          placeholder="Default"
          size="xs"
          clearable
          data={FONT_SIZES.map(([v, l]) => ({ value: v, label: l }))}
          value={value.fontSize ?? null}
          onChange={(v) => update({ fontSize: v })}
          comboboxProps={cbx}
        />
        <Select
          label="Line spacing"
          placeholder="Default"
          size="xs"
          clearable
          data={LINE_HEIGHTS.map(([v, l]) => ({ value: v, label: l }))}
          value={value.lineHeight ?? null}
          onChange={(v) => update({ lineHeight: v })}
          comboboxProps={cbx}
        />
      </Group>
      <Group gap="xs" grow wrap="nowrap">
        <Select
          label="Space before"
          placeholder="Default"
          size="xs"
          clearable
          data={SPACES.map(([v, l]) => ({ value: v, label: l }))}
          value={value.spaceBefore ?? null}
          onChange={(v) => update({ spaceBefore: v })}
          comboboxProps={cbx}
        />
        <Select
          label="Space after"
          placeholder="Default"
          size="xs"
          clearable
          data={SPACES.map(([v, l]) => ({ value: v, label: l }))}
          value={value.spaceAfter ?? null}
          onChange={(v) => update({ spaceAfter: v })}
          comboboxProps={cbx}
        />
      </Group>
      <Select
        label="First-line indent"
        placeholder="Off"
        size="xs"
        clearable
        data={INDENTS.map(([v, l]) => ({ value: v, label: l }))}
        value={value.paragraphIndent ?? null}
        onChange={(v) => update({ paragraphIndent: v })}
        comboboxProps={cbx}
      />
      <Switch
        mt={4}
        size="sm"
        label="Smart quotes"
        checked={smartOn}
        onChange={(e) => update({ smartQuotes: e.currentTarget.checked })}
      />
    </Stack>
  );
}
