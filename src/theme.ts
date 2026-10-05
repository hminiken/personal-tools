import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Earthy palette used across the crafting pages:
//   olive    – primary actions, categories, "done"
//   rust     – destructive actions, fibers, "frogged"
//   mustard  – hooks/weights, "in progress"
//   neutrals – warm grays for surfaces and outlines
const olive: MantineColorsTuple = [
  '#f5f7f2', '#eaede6', '#d1d9c7', '#b7c5a5', '#a1b389',
  '#93a976', '#8ca36c', '#788e5a', '#6a7f4f', '#455431',
];

const rust: MantineColorsTuple = [
  '#fff0ea', '#f6e0d9', '#e7c0b3', '#d99e8a', '#cd8168',
  '#c66e51', '#c36445', '#b8593a', '#9b492f', '#883d25',
];

const mustard: MantineColorsTuple = [
  '#fef6e6', '#f5ebd7', '#e7d5b3', '#d9be8b', '#ccab69',
  '#c59e53', '#c39a4a', '#ab8437', '#98752e', '#846421',
];

const neutrals: MantineColorsTuple = [
  '#f8f5f2', '#e9e7e6', '#d4cdc7', '#c0b1a6', '#ae9989',
  '#a48a76', '#9f826b', '#8b705a', '#7d634e', '#453528',
];

export const theme = createTheme({
  colors: { olive, rust, mustard, neutrals },
  primaryColor: 'olive',
  // Shade 7 in both schemes: lighter olives are too pale for white button text.
  primaryShade: 7,
});
