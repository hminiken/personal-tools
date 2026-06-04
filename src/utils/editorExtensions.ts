import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import ResizeImage from 'tiptap-extension-resize-image';

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
    ResizeImage.configure({
        allowBase64: true, 
    })
];