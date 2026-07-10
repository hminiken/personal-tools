'use client';

import { useState } from 'react';
import {
  Modal, Stack, Group, Text, TextInput, Button, ActionIcon, Switch,
  Divider, Paper, ScrollArea, Tooltip, Select,
} from '@mantine/core';
import { IconPlus, IconTrash, IconHelpCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import ColorPicker from './ColorPicker';
import { DEFAULT_LABEL_COLOR } from '@/utils/writingLabels';
import {
  createLabelCategory, updateLabelCategory, deleteLabelCategory,
  createLabel, updateLabel, deleteLabel,
} from '../../../_actions/writing_actions';
import type { Label, LabelCatalog } from '../types';

const SINGLE_SELECT_HELP =
  'Only one value from this category can be applied to a card at a time (e.g. one POV per scene). Picking another replaces the current one.';
const STANDALONE_HELP =
  'Standalone labels belong to no category — apply any number of them freely to a card (e.g. a red “John” and a green “Sarah”).';

const STANDALONE = 'standalone';

// One editable label: color swatch + name (commits on blur) + delete.
function LabelRow({ label, onChanged }: { label: Label; onChanged: () => void }) {
  const [name, setName] = useState(label.name);

  const commitName = () => {
    const t = name.trim();
    if (t && t !== label.name) { updateLabel(label.id, { name: t }); onChanged(); }
    else setName(label.name);
  };

  return (
    <Group gap={8} wrap="nowrap">
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
      />
      <Tooltip label="Delete label" withinPortal>
        <ActionIcon variant="subtle" color="red" onClick={() => { deleteLabel(label.id); onChanged(); }} aria-label="Delete label">
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
    <Group gap={8} wrap="nowrap">
      <ColorPicker value={color} onChange={setColor} />
      <TextInput
        size="xs"
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        style={{ flex: 1 }}
      />
      <ActionIcon variant="light" color="gray" onClick={submit} aria-label="Add label" disabled={!name.trim()}>
        <IconPlus size={16} />
      </ActionIcon>
    </Group>
  );
}

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

export default function ManageLabelsModal({
  projectId,
  catalog,
  opened,
  onClose,
}: {
  projectId: number;
  catalog: LabelCatalog;
  opened: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  // Which section is shown: a category id (as string) or STANDALONE.
  const [selected, setSelected] = useState<string>(STANDALONE);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSingle, setNewCatSingle] = useState(false);

  // Keep the selection valid as the catalog changes (e.g. after a delete).
  const validSelected =
    selected === STANDALONE || catalog.categories.some((c) => String(c.id) === selected)
      ? selected
      : STANDALONE;

  const activeCategory =
    validSelected === STANDALONE ? null : catalog.categories.find((c) => String(c.id) === validSelected) ?? null;

  const standaloneLabels = catalog.labels.filter((l) => l.categoryId == null);
  const activeLabels = activeCategory
    ? catalog.labels.filter((l) => l.categoryId === activeCategory.id)
    : standaloneLabels;

  const selectData = [
    { value: STANDALONE, label: 'Standalone labels' },
    ...catalog.categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const addCategory = async () => {
    const t = newCatName.trim();
    if (!t) return;
    const id = await createLabelCategory(projectId, t, newCatSingle);
    setNewCatName('');
    setNewCatSingle(false);
    setAddingCategory(false);
    if (id) setSelected(String(id));
    refresh();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Manage labels" size="lg" centered>
      <Stack gap="md">
        {/* Category chooser + new-category toggle */}
        <Group gap="xs" align="flex-end" wrap="nowrap">
          <Select
            label="Category"
            data={selectData}
            value={validSelected}
            onChange={(v) => v && setSelected(v)}
            allowDeselect={false}
            checkIconPosition="right"
            style={{ flex: 1 }}
          />
          <Button
            variant={addingCategory ? 'light' : 'default'}
            color="gray"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddingCategory((a) => !a)}
          >
            New category
          </Button>
        </Group>

        {/* New category form */}
        {addingCategory && (
          <Paper withBorder radius="md" p="sm" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))">
            <Group gap={8} wrap="nowrap">
              <TextInput
                size="xs"
                placeholder="Category name (e.g. POV)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                autoFocus
                style={{ flex: 1 }}
              />
              <Group gap={4} wrap="nowrap">
                <Switch size="xs" label="Single-select" checked={newCatSingle} onChange={(e) => setNewCatSingle(e.currentTarget.checked)} />
                <HelpDot text={SINGLE_SELECT_HELP} />
              </Group>
              <Button size="compact-sm" color="dark" onClick={addCategory} disabled={!newCatName.trim()}>Add</Button>
            </Group>
          </Paper>
        )}

        <Divider />

        {/* Active section: category values, or standalone labels */}
        {activeCategory ? (
          <Stack gap="sm">
            <Group justify="space-between" wrap="nowrap" gap="xs">
              <TextInput
                size="sm"
                styles={{ input: { fontWeight: 700 } }}
                defaultValue={activeCategory.name}
                key={activeCategory.id}
                onBlur={(e) => {
                  const t = e.currentTarget.value.trim();
                  if (t && t !== activeCategory.name) { updateLabelCategory(activeCategory.id, { name: t }); refresh(); }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                style={{ flex: 1 }}
              />
              <Group gap={4} wrap="nowrap">
                <Switch
                  size="xs"
                  label="Single-select"
                  checked={activeCategory.singleSelect}
                  onChange={(e) => { updateLabelCategory(activeCategory.id, { singleSelect: e.currentTarget.checked }); refresh(); }}
                />
                <HelpDot text={SINGLE_SELECT_HELP} />
                <Tooltip label="Delete category and its values" withinPortal>
                  <ActionIcon variant="subtle" color="red" onClick={() => { deleteLabelCategory(activeCategory.id); setSelected(STANDALONE); refresh(); }} aria-label="Delete category">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <ScrollArea.Autosize mah={300}>
              <Stack gap={6} pr={6}>
                {activeLabels.length === 0 && <Text size="xs" c="dimmed">No values yet.</Text>}
                {activeLabels.map((label) => (
                  <LabelRow key={label.id} label={label} onChanged={refresh} />
                ))}
              </Stack>
            </ScrollArea.Autosize>

            <AddLabelForm
              placeholder={`Add a ${activeCategory.name} value`}
              onAdd={async (name, color) => { await createLabel(projectId, { name, color, categoryId: activeCategory.id }); refresh(); }}
            />
          </Stack>
        ) : (
          <Stack gap="sm">
            <Group gap={4}>
              <Text fw={700}>Standalone labels</Text>
              <HelpDot text={STANDALONE_HELP} />
            </Group>

            <ScrollArea.Autosize mah={300}>
              <Stack gap={6} pr={6}>
                {standaloneLabels.length === 0 && <Text size="xs" c="dimmed">No standalone labels yet.</Text>}
                {standaloneLabels.map((label) => (
                  <LabelRow key={label.id} label={label} onChanged={refresh} />
                ))}
              </Stack>
            </ScrollArea.Autosize>

            <AddLabelForm
              placeholder="Add a standalone label (e.g. John)"
              onAdd={async (name, color) => { await createLabel(projectId, { name, color, categoryId: null }); refresh(); }}
            />
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
