'use client';

import { RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconPhoto, IconTypography, IconTextSize } from '@tabler/icons-react';
import { promptText } from '@/utils/dialogs';
import { FONTS_BY_CATEGORY, CATEGORY_LABEL, type FontCategory } from '@/utils/writingFonts';
// Shared with writingEditorStyles() so these plain ActionIcon triggers
// (font/size) match the RichTextEditor Control icons — one color across the bar.
import { TOOLBAR_ICON_COLOR } from '@/utils/writingTheme';

const FONT_CATEGORIES: FontCategory[] = ['serif', 'sans', 'mono'];
// Inline (per-selection) sizes, distinct from the document-wide base size.
const INLINE_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

// Toolbar for the Writing Desk editors. Document-wide formatting (line/paragraph
// spacing, base font + size, first-line indent, smart quotes) is NOT here — it's
// a per-board setting (see components/DocumentSpacing). This toolbar covers
// per-selection formatting only, including inline font family + size overrides.
export function WritingEditorToolbar() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Toolbar sticky stickyOffset={0}>
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

      {/* Inline font family + size for the current selection. Applied as
          TextStyle marks (FontFamily / FontSize extensions); these override the
          board's document-wide font only for the selected run. */}
      <RichTextEditor.ControlsGroup>
        <Menu withinPortal position="bottom-start" width={220}>
          <Menu.Target>
            <Tooltip label="Font (selection)" withinPortal>
              <ActionIcon variant="subtle" color="gray" style={{ color: TOOLBAR_ICON_COLOR }} aria-label="Font family">
                <IconTypography stroke={1.5} size="1rem" />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {FONT_CATEGORIES.map((cat) => (
              <div key={cat}>
                <Menu.Label fz={10} tt="uppercase">{CATEGORY_LABEL[cat]}</Menu.Label>
                {FONTS_BY_CATEGORY[cat].map((f) => (
                  <Menu.Item
                    key={f.key}
                    style={{ fontFamily: f.stack }}
                    onClick={() => editor?.chain().focus().setFontFamily(f.stack).run()}
                  >
                    {f.label}
                  </Menu.Item>
                ))}
              </div>
            ))}
            <Menu.Divider />
            <Menu.Item c="dimmed" onClick={() => editor?.chain().focus().unsetFontFamily().run()}>
              Clear font
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Menu withinPortal position="bottom-start" width={120}>
          <Menu.Target>
            <Tooltip label="Font size (selection)" withinPortal>
              <ActionIcon variant="subtle" color="gray" style={{ color: TOOLBAR_ICON_COLOR }} aria-label="Font size">
                <IconTextSize stroke={1.5} size="1rem" />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {INLINE_SIZES.map((s) => (
              <Menu.Item key={s} onClick={() => editor?.chain().focus().setFontSize(s).run()}>
                {parseInt(s, 10)}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item c="dimmed" onClick={() => editor?.chain().focus().unsetFontSize().run()}>
              Clear size
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
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
