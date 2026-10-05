import { Menu } from '@mantine/core';
import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { useEditorState } from '@tiptap/react';
import { IconInfoSquareRounded, IconPhoto } from '@tabler/icons-react';
import { CALLOUT_TYPES, type CalloutType } from '@/utils/calloutExtension';

// Text colors offered in the picker: red, blue, green, gold.
const TEXT_COLORS = ['#fa5252', '#4c6ef5', '#12b886', '#fab005'];

// The one toolbar used by every rich-text editor in the crafting pages.
// Sticks under the 60px app header while scrolling a long pattern.
export function CraftingEditorToolbar() {
  const { editor } = useRichTextEditorContext();

  const insertImage = () => {
    const url = window.prompt('Enter Image URL');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  // Type of the callout box the cursor is in, or null.
  const activeCallout = useEditorState({
    editor,
    selector: ({ editor: e }) => (e?.isActive('callout') ? (e.getAttributes('callout').type as CalloutType) : null),
  });

  // Wraps the selected paragraphs in a box, or changes the type of the box
  // the cursor is already in.
  const setCallout = (type: CalloutType) => {
    const chain = editor?.chain().focus();
    if (activeCallout) chain?.updateAttributes('callout', { type }).run();
    else chain?.wrapIn('callout', { type }).run();
  };

  // Unwraps the whole box the cursor is in (lift alone would only pull out
  // the paragraph under the cursor and split the box).
  const removeCallout = () => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === 'callout') {
        editor.chain().focus().setTextSelection({ from: $from.start(depth), to: $from.end(depth) }).lift('callout').run();
        return;
      }
    }
  };

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
        <RichTextEditor.Strikethrough />
        <RichTextEditor.Highlight />
        <RichTextEditor.ColorPicker colors={TEXT_COLORS} />
        <RichTextEditor.ClearFormatting />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.BulletList />
        <RichTextEditor.OrderedList />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <Menu position="bottom-start" withinPortal shadow="md">
          <Menu.Target>
            <RichTextEditor.Control aria-label="Callout box" title="Callout box (tip, note, warning...)" active={!!activeCallout}>
              <IconInfoSquareRounded stroke={1.5} size="1rem" />
            </RichTextEditor.Control>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{activeCallout ? 'Change box to' : 'Put selection in a box'}</Menu.Label>
            {CALLOUT_TYPES.map((t) => (
              <Menu.Item key={t.value} onClick={() => setCallout(t.value)} fw={activeCallout === t.value ? 700 : undefined}>
                <span data-callout-swatch={t.value} /> {t.label}
              </Menu.Item>
            ))}
            {activeCallout && (
              <>
                <Menu.Divider />
                <Menu.Item color="rust.7" onClick={removeCallout}>
                  Remove box
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
        <RichTextEditor.Control onClick={insertImage} aria-label="Insert image" title="Insert image">
          <IconPhoto stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </RichTextEditor.ControlsGroup>
    </RichTextEditor.Toolbar>
  );
}
