'use client';

import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { Menu } from '@mantine/core';
import { IconPhoto, IconLineHeight } from '@tabler/icons-react';

const LINE_HEIGHTS: [string, string][] = [
  ['1', 'Single'],
  ['1.15', '1.15'],
  ['1.5', '1.5'],
  ['2', 'Double'],
];

// [value-or-null, label] — null means "no extra space" (back to default).
const SPACES: [string | null, string][] = [
  [null, 'None'],
  ['0.5em', 'Small'],
  ['1em', 'Medium'],
  ['1.5em', 'Large'],
];

// One menu for line spacing + space before/after the current paragraph/heading.
function SpacingControl() {
  const { editor } = useRichTextEditorContext();
  const setAttr = (key: string, value: string | null) =>
    editor
      ?.chain()
      .focus()
      .updateAttributes('paragraph', { [key]: value })
      .updateAttributes('heading', { [key]: value })
      .run();

  return (
    <Menu position="bottom-start" withinPortal width={210}>
      <Menu.Target>
        <RichTextEditor.Control aria-label="Spacing" title="Line & paragraph spacing">
          <IconLineHeight stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Line spacing</Menu.Label>
        {LINE_HEIGHTS.map(([value, label]) => (
          <Menu.Item key={`lh-${value}`} onClick={() => setAttr('lineHeight', value)}>{label}</Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Label>Space before paragraph</Menu.Label>
        {SPACES.map(([value, label]) => (
          <Menu.Item key={`sb-${label}`} onClick={() => setAttr('spaceBefore', value)}>{label}</Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Label>Space after paragraph</Menu.Label>
        {SPACES.map(([value, label]) => (
          <Menu.Item key={`sa-${label}`} onClick={() => setAttr('spaceAfter', value)}>{label}</Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function WritingEditorToolbar() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Toolbar sticky stickyOffset={60}>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.H1 />
        <RichTextEditor.H2 />
        <RichTextEditor.H3 />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Bold />
        <RichTextEditor.Italic />
        <RichTextEditor.Underline />
        <RichTextEditor.Strikethrough />
        <RichTextEditor.Highlight />
        <RichTextEditor.ColorPicker colors={['#fa5252', '#4c6ef5', '#12b886', '#fab005']} />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.AlignLeft />
        <RichTextEditor.AlignCenter />
        <RichTextEditor.AlignRight />
        <RichTextEditor.AlignJustify />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.BulletList />
        <RichTextEditor.OrderedList />
        <RichTextEditor.Blockquote />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <SpacingControl />
        <RichTextEditor.Control
          onClick={() => {
            const url = window.prompt('Enter Image URL');
            if (url) editor?.chain().focus().setImage({ src: url }).run();
          }}
          aria-label="Insert image"
          title="Insert image"
        >
          <IconPhoto stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </RichTextEditor.ControlsGroup>
    </RichTextEditor.Toolbar>
  );
}
