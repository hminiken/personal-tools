import { RichTextEditor } from '@mantine/tiptap';
import { IconPhoto } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { useRichTextEditorContext } from '@mantine/tiptap';

export function CraftingEditorToolbar() {
  const { editor } = useRichTextEditorContext();
  return (
    <RichTextEditor.Toolbar sticky stickyOffset={60}>
      
      {/* Headings */}
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.H1 />
        <RichTextEditor.H2 />
        <RichTextEditor.H3 />
      </RichTextEditor.ControlsGroup>

      {/* Formatting */}
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Bold />
        <RichTextEditor.Italic />
        <RichTextEditor.Strikethrough />
        <RichTextEditor.Highlight />
        <RichTextEditor.ColorPicker colors={['#fa5252', '#4c6ef5', '#12b886', '#fab005']} />
      </RichTextEditor.ControlsGroup>

      {/* Lists (if you want them universally!) */}
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.BulletList />
        <RichTextEditor.OrderedList />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
  <RichTextEditor.Control
    onClick={() => {
      const url = window.prompt('Enter Image URL');
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
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