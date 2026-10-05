import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { IconPhoto } from '@tabler/icons-react';

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
        <RichTextEditor.Control onClick={insertImage} aria-label="Insert image" title="Insert image">
          <IconPhoto stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </RichTextEditor.ControlsGroup>
    </RichTextEditor.Toolbar>
  );
}
