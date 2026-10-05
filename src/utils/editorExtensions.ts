import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

// Tiptap's built-in resizable image. Unlike tiptap-extension-resize-image
// (width-only, height forced to auto), this lets width and height be dragged
// independently via the edge/corner handles. Hold Shift while dragging to keep
// the original proportions. Size is saved as plain width/height attributes.
const ResizableImage = Image.configure({
    allowBase64: true,
    resize: {
        enabled: true,
        directions: ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
        minWidth: 40,
        minHeight: 40,
        alwaysPreserveAspectRatio: false,
    },
});

export const craftingEditorExtensions = [
    StarterKit.configure({
        // Configure the heading extension bundled in StarterKit
        heading: {
            levels: [1, 2, 3],
        },
    }),
    TextStyle,
    Color,
    Highlight,
    ResizableImage,
];
