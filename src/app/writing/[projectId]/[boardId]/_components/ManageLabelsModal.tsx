'use client';

import { useEffect, useState } from 'react';
import {
  Modal, Stack, Group, Text, TextInput, Button, ActionIcon, Switch,
  Paper, ScrollArea, Tooltip, Checkbox, Menu,
} from '@mantine/core';
import {
  IconPlus, IconTrash, IconHelpCircle, IconBorderTop, IconSearch,
  IconGripVertical, IconSortAscendingLetters, IconChevronDown, IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { DndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ColorPicker from './ColorPicker';
import { linkPreviewDropdownStyle } from './CardItem';
import { DEFAULT_LABEL_COLOR } from '@/utils/writingLabels';
import { confirmAction } from '@/utils/dialogs';
import {
  createLabelCategory, updateLabelCategory, deleteLabelCategory,
  createLabel, updateLabel, deleteLabel, moveLabel, sortLabelsAlphabetically,
} from '../../../_actions/writing_actions';
import { useLabelDnd, catKey } from './useLabelDnd';
import { useInlineRename } from './useInlineRename';
import type { Label, LabelCategory, LabelCatalog } from '../types';

const SINGLE_SELECT_HELP =
  'Only one value from this category can be applied to a card at a time (e.g. one POV per scene). Picking another replaces the current one.';
const STANDALONE_HELP =
  'Standalone labels belong to no category — apply any number of them freely to a card (e.g. a red “John” and a green “Sarah”).';

// Themed to match the board it was opened from (labels are project-wide, not
// board-specific — this modal just borrows whichever board's theme was on
// screen, same as the outer Modal — see ManageLabelsModal's own themeVars).
const sectionSurfaceStyle = {
  backgroundColor: 'var(--theme-card-bg, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7)))',
  borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
};
const mutedTextColor = 'var(--theme-card-muted-text, var(--mantine-color-dimmed))';

// Text inputs/checkboxes (search box, label name fields) default to Mantine's
// plain white surface, which reads as a stray unthemed patch against a
// colored board theme — override to the same editor-content surface used for
// card text fields.
const themedFieldStyle = {
  backgroundColor: 'var(--theme-editor-bg, var(--mantine-color-body))',
  color: 'var(--theme-editor-text, var(--mantine-color-text))',
  borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
};

// Delete buttons/icons — blends the theme's dangerColor into the current
// surface via color-mix rather than Mantine's flat light-red (which assumes
// a white page background and reads as a stray patch on a colored board
// theme). See THEME_TOKENS' dangerColor, also reused by dialogs.tsx for the
// bulk-delete confirm popup.
const dangerColor = 'var(--theme-danger, var(--mantine-color-red-6))';
const dangerButtonStyle = {
  color: dangerColor,
  backgroundColor: `color-mix(in srgb, ${dangerColor} 16%, transparent)`,
  borderColor: `color-mix(in srgb, ${dangerColor} 45%, transparent)`,
};

// A small "?" with an explanatory tooltip.
function HelpDot({ text }: { text: string }) {
  return (
    <Tooltip label={text} withinPortal multiline w={260} position="top">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Help">
        <IconHelpCircle size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

// One draggable, editable label: checkbox (multiselect) + grip handle +
// color swatch + name (commits on blur) + "drives card color" toggle +
// delete. Sortable within its category/standalone bucket, and draggable
// across buckets (see useLabelDnd) — dragging one that's part of a >1
// selection carries the whole selection along.
function SortableLabelRow({
  label, selected, onToggleSelect, onChanged,
}: {
  label: Label;
  selected: boolean;
  onToggleSelect: () => void;
  onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `label:${label.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    background: selected ? 'color-mix(in srgb, var(--theme-accent, var(--mantine-color-blue-5)) 14%, transparent)' : undefined,
    borderRadius: 6,
  };
  const [name, setName] = useState(label.name);

  const commitName = () => {
    const t = name.trim();
    if (t && t !== label.name) { updateLabel(label.id, { name: t }); onChanged(); }
    else setName(label.name);
  };

  return (
    <Group ref={setNodeRef} style={style} gap={8} wrap="nowrap" p={2}>
      <Checkbox
        size="xs"
        checked={selected}
        onChange={onToggleSelect}
        aria-label="Select label"
        style={{ flexShrink: 0 }}
        styles={{ input: { backgroundColor: themedFieldStyle.backgroundColor, borderColor: themedFieldStyle.borderColor } }}
      />
      <ActionIcon variant="subtle" color="gray" size="sm" style={{ cursor: 'grab', flexShrink: 0 }} {...attributes} {...listeners} aria-label="Drag label">
        <IconGripVertical size={14} />
      </ActionIcon>
      <ColorPicker
        value={label.color}
        onChange={(color) => { updateLabel(label.id, { color }); onChanged(); }}
      />
      <TextInput
        size="xs"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onBlur={commitName}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ flex: 1 }}
        styles={{ input: themedFieldStyle }}
      />
      <Tooltip
        label={label.drivesCardColor
          ? 'Coloring cards with this label. Click to stop.'
          : "Use this label's color as the card's accent strip when applied"}
        withinPortal multiline w={230}
      >
        <ActionIcon
          variant={label.drivesCardColor ? 'filled' : 'subtle'}
          color={label.drivesCardColor ? label.color : 'gray'}
          autoContrast
          onClick={() => { updateLabel(label.id, { drivesCardColor: !label.drivesCardColor }); onChanged(); }}
          aria-label="Toggle whether this label colors the card"
        >
          <IconBorderTop size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Delete label" withinPortal>
        <ActionIcon variant="subtle" style={{ color: dangerColor }} onClick={() => { deleteLabel(label.id); onChanged(); }} aria-label="Delete label">
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

// Inline "add a label" form (name + color), reused for categories and standalone.
function AddLabelForm({
  placeholder, onAdd,
}: {
  placeholder: string;
  onAdd: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_LABEL_COLOR);

  const submit = () => {
    const t = name.trim();
    if (!t) return;
    onAdd(t, color);
    setName('');
    setColor(DEFAULT_LABEL_COLOR);
  };

  return (
    <Group gap={8} wrap="nowrap" mt="xs">
      <ColorPicker value={color} onChange={setColor} />
      <TextInput
        size="xs"
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        style={{ flex: 1 }}
        styles={{ input: themedFieldStyle }}
      />
      <ActionIcon variant="light" color="gray" onClick={submit} aria-label="Add label" disabled={!name.trim()}>
        <IconPlus size={16} />
      </ActionIcon>
    </Group>
  );
}

// One section — either a real category or the pinned "Standalone" bucket
// (categoryId null). Droppable (so a label can drop into it even when
// empty) with a SortableContext for its own labels. Category-level chrome
// (drag handle, rename, single-select, delete) only renders when the
// corresponding callback is passed, so the same body serves both cases.
function SectionBody({
  categoryId,
  title,
  help,
  singleSelect,
  onToggleSingleSelect,
  onRename,
  onDelete,
  labels,
  search,
  projectId,
  refresh,
  dragHandleProps,
  sectionRef,
  sectionStyle,
  selectedIds,
  onToggleSelect,
}: {
  categoryId: number | null;
  title: string;
  help?: string;
  singleSelect?: boolean;
  onToggleSingleSelect?: (v: boolean) => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  labels: Label[];
  search: string;
  projectId: number;
  refresh: () => void;
  dragHandleProps?: object;
  sectionRef?: (el: HTMLDivElement | null) => void;
  sectionStyle?: React.CSSProperties;
  selectedIds: Set<number>;
  onToggleSelect: (labelId: number) => void;
}) {
  const zoneId = categoryId == null ? 'catzone:standalone' : `catzone:${categoryId}`;
  const { setNodeRef: setDropRef } = useDroppable({ id: zoneId });
  const rename = useInlineRename({ value: title, onCommit: (next) => onRename?.(next) });

  const q = search.trim().toLowerCase();
  const filtered = q ? labels.filter((l) => l.name.toLowerCase().includes(q)) : labels;
  if (q && filtered.length === 0) return null;
  const labelIds = filtered.map((l) => `label:${l.id}`);

  return (
    <Paper ref={sectionRef} style={{ ...sectionSurfaceStyle, ...sectionStyle }} withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" mb="xs" gap={4}>
        <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {dragHandleProps && (
            <ActionIcon variant="subtle" color="gray" size="sm" style={{ cursor: 'grab', flexShrink: 0 }} {...dragHandleProps} aria-label="Drag category">
              <IconGripVertical size={16} />
            </ActionIcon>
          )}
          {rename.editing ? (
            <TextInput size="sm" styles={{ input: { ...themedFieldStyle, fontWeight: 700 } }} {...rename.inputProps} style={{ flex: 1 }} />
          ) : (
            <Text
              fw={700}
              lineClamp={1}
              onDoubleClick={() => onRename && rename.setEditing(true)}
              style={{ cursor: onRename ? 'text' : undefined }}
            >
              {title}
            </Text>
          )}
          {help && <HelpDot text={help} />}
        </Group>
        <Group gap={6} wrap="nowrap">
          {onToggleSingleSelect && (
            <Tooltip label={SINGLE_SELECT_HELP} withinPortal multiline w={230} position="top">
              <Switch
                size="xs"
                label="Single-select"
                checked={!!singleSelect}
                onChange={(e) => onToggleSingleSelect(e.currentTarget.checked)}
              />
            </Tooltip>
          )}
          <Tooltip label="Sort labels A-Z" withinPortal>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              disabled={labels.length < 2}
              onClick={async () => { await sortLabelsAlphabetically(categoryId, projectId); refresh(); }}
              aria-label="Sort labels A-Z"
            >
              <IconSortAscendingLetters size={16} />
            </ActionIcon>
          </Tooltip>
          {onDelete && (
            <Tooltip label="Delete category and its labels" withinPortal>
              <ActionIcon variant="subtle" style={{ color: dangerColor }} onClick={onDelete} aria-label="Delete category">
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      <div ref={setDropRef}>
        <SortableContext items={labelIds} strategy={verticalListSortingStrategy}>
          <Stack gap={6} mih={filtered.length === 0 ? 28 : undefined}>
            {filtered.length === 0 && (
              <Text size="xs" c={mutedTextColor}>
                {labels.length === 0 ? 'No labels yet — drag one here, or add below.' : 'No matches.'}
              </Text>
            )}
            {filtered.map((label) => (
              <SortableLabelRow
                key={label.id}
                label={label}
                selected={selectedIds.has(label.id)}
                onToggleSelect={() => onToggleSelect(label.id)}
                onChanged={refresh}
              />
            ))}
          </Stack>
        </SortableContext>
      </div>

      <AddLabelForm
        placeholder={categoryId == null ? 'Add a standalone label (e.g. John)' : `Add a ${title} value`}
        onAdd={async (name, color) => { await createLabel(projectId, { name, color, categoryId }); refresh(); }}
      />
    </Paper>
  );
}

function SortableCategorySection({
  category, ...rest
}: {
  category: LabelCategory;
  labels: Label[];
  search: string;
  projectId: number;
  refresh: () => void;
  onRename: (name: string) => void;
  onToggleSingleSelect: (v: boolean) => void;
  onDelete: () => void;
  selectedIds: Set<number>;
  onToggleSelect: (labelId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `category:${category.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };
  return (
    <SectionBody
      {...rest}
      categoryId={category.id}
      title={category.name}
      singleSelect={category.singleSelect}
      dragHandleProps={{ ...attributes, ...listeners }}
      sectionRef={setNodeRef}
      sectionStyle={style}
    />
  );
}

export default function ManageLabelsModal({
  projectId,
  catalog,
  opened,
  onClose,
  themeVars,
}: {
  projectId: number;
  catalog: LabelCatalog;
  opened: boolean;
  onClose: () => void;
  // The active board's --theme-* vars (see CardEditorModal, which this modal
  // is commonly opened from) — labels are project-wide, not board-specific,
  // so this just borrows whichever board's theme was on screen when opened.
  themeVars?: Record<string, string>;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  // Local, optimistic copies (drag-and-drop relocates these instantly; other
  // edits just refresh from the server) — resynced whenever fresh catalog
  // props arrive.
  const [categories, setCategories] = useState<LabelCategory[]>(catalog.categories);
  const [allLabels, setAllLabels] = useState<Label[]>(catalog.labels);
  useEffect(() => {
    setCategories(catalog.categories);
    setAllLabels(catalog.labels);
    // Drop any selected id that no longer exists (e.g. deleted elsewhere).
    const liveIds = new Set(catalog.labels.map((l) => l.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => liveIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [catalog]);

  const [search, setSearch] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSingle, setNewCatSingle] = useState(false);

  // Multiselect: checkbox per label, a bulk "Move to…" / "Delete" toolbar
  // when >0 are selected, and dragging any selected label carries the whole
  // selection (see useLabelDnd's group-drag branch).
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelect = (labelId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(labelId) ? next.delete(labelId) : next.add(labelId);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // Moves a whole batch of labels into one category/standalone at once,
  // appended together (in their current relative order) after whatever's
  // already there. Shared by the "Move to…" menu and a multiselect drag-drop.
  const bulkMoveLabels = (ids: number[], targetCategoryId: number | null) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const targetBucket = allLabels.filter((l) => catKey(l.categoryId) === catKey(targetCategoryId) && !idSet.has(l.id));
    const maxPos = targetBucket.length ? Math.max(...targetBucket.map((l) => l.position)) : 0;
    const positions = new Map<number, number>();
    ids.forEach((id, i) => positions.set(id, maxPos + 1 + i));

    setAllLabels((prev) => prev.map((l) => (positions.has(l.id) ? { ...l, categoryId: targetCategoryId, position: positions.get(l.id)! } : l)));
    ids.forEach((id) => moveLabel(id, targetCategoryId, positions.get(id)!));
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!(await confirmAction({
      title: 'Delete labels',
      message: `Delete ${ids.length} label${ids.length === 1 ? '' : 's'}? This removes ${ids.length === 1 ? 'it' : 'them'} from every card ${ids.length === 1 ? "it's" : "they're"} applied to.`,
      themeVars,
    }))) return;
    const idSet = new Set(ids);
    setAllLabels((prev) => prev.filter((l) => !idSet.has(l.id)));
    clearSelection();
    await Promise.all(ids.map((id) => deleteLabel(id)));
    refresh();
  };

  const { sensors, collisionDetection, handleDragStart, handleDragOver, handleDragEnd } =
    useLabelDnd(categories, setCategories, allLabels, setAllLabels, selectedIds, bulkMoveLabels, clearSelection);

  const standaloneLabels = allLabels.filter((l) => l.categoryId == null);
  const categoryIds = categories.map((c) => `category:${c.id}`);

  const addCategory = async () => {
    const t = newCatName.trim();
    if (!t) return;
    await createLabelCategory(projectId, t, newCatSingle);
    setNewCatName('');
    setNewCatSingle(false);
    setAddingCategory(false);
    refresh();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage labels"
      size="lg"
      centered
      // Opened from on top of the card editor modal (both default to the same
      // z-index, which left DOM order deciding the winner) — bump this one
      // explicitly so it always wins over CardEditorModal instead of hiding
      // behind it.
      zIndex={300}
      styles={{
        content: {
          ...themeVars,
          backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
          color: 'var(--theme-heading, inherit)',
        },
        header: {
          backgroundColor: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
          color: 'var(--theme-heading, inherit)',
        },
      }}
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder="Search labels…"
            leftSection={<IconSearch size={15} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            styles={{ input: themedFieldStyle }}
          />
          <Button
            variant={addingCategory ? 'light' : 'default'}
            color="gray"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddingCategory((a) => !a)}
            styles={addingCategory ? undefined : { root: themedFieldStyle }}
          >
            New category
          </Button>
        </Group>

        {selectedIds.size > 0 && (
          <Group justify="space-between" wrap="nowrap" p="xs" style={{ ...sectionSurfaceStyle, borderRadius: 8, border: '1px solid var(--theme-card-border, var(--mantine-color-default-border))' }}>
            <Text size="sm" fw={600}>{selectedIds.size} selected</Text>
            <Group gap={6} wrap="nowrap">
              <Menu withinPortal position="bottom-end" shadow="md">
                <Menu.Target>
                  <Button size="xs" variant="light" color="gray" rightSection={<IconChevronDown size={14} />}>
                    Move to…
                  </Button>
                </Menu.Target>
                <Menu.Dropdown
                  style={{
                    ...themeVars,
                    ...linkPreviewDropdownStyle,
                    border: '1px solid color-mix(in srgb, var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body))) 80%, black 20%)',
                  }}
                >
                  <Menu.Item onClick={() => { bulkMoveLabels([...selectedIds], null); clearSelection(); }}>
                    Standalone
                  </Menu.Item>
                  {categories.length > 0 && <Menu.Divider />}
                  {categories.map((c) => (
                    <Menu.Item key={c.id} onClick={() => { bulkMoveLabels([...selectedIds], c.id); clearSelection(); }}>
                      {c.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <Button size="xs" variant="default" styles={{ root: dangerButtonStyle }} leftSection={<IconTrash size={14} />} onClick={handleBulkDelete}>
                Delete
              </Button>
              <Tooltip label="Clear selection" withinPortal>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={clearSelection} aria-label="Clear selection">
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        )}

        {addingCategory && (
          <Paper withBorder radius="md" p="sm" style={sectionSurfaceStyle}>
            <Group gap={8} wrap="nowrap">
              <TextInput
                size="xs"
                placeholder="Category name (e.g. POV)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                autoFocus
                style={{ flex: 1 }}
                styles={{ input: themedFieldStyle }}
              />
              <Group gap={4} wrap="nowrap">
                <Switch size="xs" label="Single-select" checked={newCatSingle} onChange={(e) => setNewCatSingle(e.currentTarget.checked)} />
                <HelpDot text={SINGLE_SELECT_HELP} />
              </Group>
              <Button size="compact-sm" color="dark" onClick={addCategory} disabled={!newCatName.trim()}>Add</Button>
            </Group>
          </Paper>
        )}

        <ScrollArea.Autosize mah={480} type="auto">
          <DndContext
            id="manage-labels-dnd"
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <Stack gap="sm" pr={6}>
              <SectionBody
                categoryId={null}
                title="Standalone labels"
                help={STANDALONE_HELP}
                labels={standaloneLabels}
                search={search}
                projectId={projectId}
                refresh={refresh}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />

              <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                {categories.map((cat) => (
                  <SortableCategorySection
                    key={cat.id}
                    category={cat}
                    labels={allLabels.filter((l) => l.categoryId === cat.id)}
                    search={search}
                    projectId={projectId}
                    refresh={refresh}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onRename={(name) => { updateLabelCategory(cat.id, { name }); refresh(); }}
                    onToggleSingleSelect={(v) => { updateLabelCategory(cat.id, { singleSelect: v }); refresh(); }}
                    onDelete={async () => { await deleteLabelCategory(cat.id); refresh(); }}
                  />
                ))}
              </SortableContext>
            </Stack>
          </DndContext>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
}
