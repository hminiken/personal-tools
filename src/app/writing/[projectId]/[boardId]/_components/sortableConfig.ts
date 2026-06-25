import { defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable';

// By default dnd-kit only animates an item's position while it's being actively
// sorted. When an item is added to or removed from a container, the remaining
// items snap to their new positions instantly (the "jump" when a group/list
// resizes). Forcing `wasDragging: true` keeps the layout-shift animation in
// those cases too, so siblings slide smoothly into place.
export const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

// Snappy ease-out for all sortable movement. ease-out settles faster than
// dnd-kit's default ease-in-out, so reordering feels responsive, not sluggish.
export const sortableTransition = {
  duration: 180,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};
