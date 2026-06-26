'use client';

import type { CSSProperties } from 'react';
import { Menu, ActionIcon, Tooltip } from '@mantine/core';
import { IconLineHeight, IconCheck } from '@tabler/icons-react';
import classes from './DocumentSpacing.module.css';

export type Spacing = {
  lineHeight: string | null;
  spaceBefore: string | null;
  spaceAfter: string | null;
};

// Wrapper class + inline CSS vars to apply a board's spacing to its editors.
export const docSpacingClass = classes.doc;

export function spacingVars(s: Spacing): CSSProperties {
  const vars: Record<string, string> = {};
  if (s.lineHeight) vars['--doc-line-height'] = s.lineHeight;
  if (s.spaceBefore) vars['--doc-space-before'] = s.spaceBefore;
  if (s.spaceAfter) vars['--doc-space-after'] = s.spaceAfter;
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

// A menu for the whole-document (per-board) prose spacing. Stays open while you
// adjust multiple values; each change calls onChange with the full next value.
export function DocumentSpacingMenu({
  value,
  onChange,
}: {
  value: Spacing;
  onChange: (next: Spacing) => void;
}) {
  const update = (patch: Partial<Spacing>) => onChange({ ...value, ...patch });
  const check = (active: boolean) => (active ? <IconCheck size={14} /> : null);

  return (
    <Menu position="bottom-end" withinPortal width={240} closeOnItemClick={false}>
      <Menu.Target>
        <Tooltip label="Document spacing">
          <ActionIcon variant="light" color="olive" size="lg" aria-label="Document spacing">
            <IconLineHeight size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
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
      </Menu.Dropdown>
    </Menu>
  );
}
