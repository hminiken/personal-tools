import { RichTextEditor } from '@mantine/tiptap';

export function CraftingEditorToolbar() {
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

    </RichTextEditor.Toolbar>
  );
}