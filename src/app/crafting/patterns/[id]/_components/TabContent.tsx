


// --- HELPER COMPONENT: Reusable Editor/Viewer ---

import { Typography } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { Editor } from "@tiptap/react";

// This keeps us from copying the Toolbar 5 times!
export function TabContent({ 
  editor, 
  isEditing, 
  originalContent, 
  fallbackText 
}: { 
  editor: Editor | null;
  isEditing: boolean;
  originalContent: string | null;
  fallbackText: string;
}) {
  if (isEditing) {
    return (
      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.ColorPicker
              colors={['#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14']}
            />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content />
      </RichTextEditor>
    );
  }

  return (
    <Typography p={0}>
      <div dangerouslySetInnerHTML={{ __html: originalContent || `<p>${fallbackText}</p>` }} />
    </Typography>
  );
}
