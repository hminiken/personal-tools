'use client';

import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { IconPhoto } from '@tabler/icons-react';
import { promptText } from '@/utils/dialogs';

// Toolbar for the Writing Desk editors. Line/paragraph spacing is NOT here —
// it's a document-wide setting (see components/DocumentSpacing). This toolbar
// covers per-selection formatting only.
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
        <RichTextEditor.Control
          onClick={async () => {
            const url = await promptText({ title: 'Insert image', label: 'Image URL', placeholder: 'https://...' });
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
