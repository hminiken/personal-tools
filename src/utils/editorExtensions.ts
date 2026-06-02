import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import ResizeImage from 'tiptap-extension-resize-image';

export const craftingEditorExtensions = [
    StarterKit,
    TextStyle,
    Color,
    Highlight, // From ProjectWorkspace
    ResizeImage.configure({
        allowBase64: true, 
    })
];