'use client';

import { useState } from 'react';
import { Group, Paper, Switch, Tabs, Divider, Box, Button, TextInput, Stack, Modal, Collapse } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';

import { deletePattern, spawnProject, updatePattern, updatePatternStatus } from '../../_actions/pattern_actions';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import { Pattern, PatternImage } from '../../types';
import ImageGallery from '@/components/PatternImageGallery';
import { CraftingMetadataForm } from '@/components/CraftingMetadataForm';
import { BackButton } from '@components/BackButton';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { ScrollToTopButton } from '@components/ScrollToTopButton';
import { FloatingEditActions } from '@components/FloatingEditActions';
import { CollapsibleHeader, PatternText, TabContent, contentTabsStyles } from '@components/PatternContent';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { useOptimisticStatus } from '@hooks/useOptimisticStatus';
import { splitTags, PATTERN_STATUSES } from '@/utils/tags';
import type { CraftType } from '@/utils/knittingNeedles';

export default function PatternViewer({ pattern, images }: { pattern: Pattern, images: PatternImage[] }) {
  const router = useRouter();

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingTabs, setIsEditingTabs] = useState(false);
  const [rainbowEnabled, setRainbowEnabled] = useState(false);
  const [contentOpened, { toggle: toggleContent, open: openContent }] = useDisclosure(true);
  const [projectModalOpened, { open: openProject, close: closeProject }] = useDisclosure(false);

  // Metadata
  const [hookTags, setHookTags] = useState(splitTags(pattern.hooks));
  const [weightTags, setWeightTags] = useState(splitTags(pattern.weights));
  const [categoryTags, setCategoryTags] = useState(splitTags(pattern.categories));
  const [craftType, setCraftType] = useState<CraftType>((pattern.craftType as CraftType) || 'crochet');
  const [status, updateStatus] = useOptimisticStatus(pattern.status, (s) => updatePatternStatus(pattern.id, s));

  // One editor per tab
  const patternEditor = useCraftingEditor(pattern.content, isEditingTabs);
  const materialsEditor = useCraftingEditor(pattern.materials, isEditingTabs);
  const abbreviationsEditor = useCraftingEditor(pattern.abbreviations, isEditingTabs);
  const sizingEditor = useCraftingEditor(pattern.sizing, isEditingTabs);
  const notesEditor = useCraftingEditor(pattern.notes, isEditingTabs);

  // Delete
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePattern(pattern.id);
    setIsDeleting(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    closeDelete();
    router.push('/crafting/patterns');
  };

  const saveContent = async (formData: FormData) => {
    formData.set('patternText', patternEditor?.getHTML() || '');
    formData.set('materials', materialsEditor?.getHTML() || '');
    formData.set('abbreviations', abbreviationsEditor?.getHTML() || '');
    formData.set('sizing', sizingEditor?.getHTML() || '');
    formData.set('patternNotes', notesEditor?.getHTML() || '');

    await updatePattern(formData);
    router.refresh(); // Pull fresh server props so the editors re-sync
    setIsEditingTabs(false);
  };

  return (
    <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
      <BackButton href="/crafting/patterns" label="Back to Patterns" />

      <CraftingMetadataForm
        idName="patternId"
        idValue={pattern.id}
        title={pattern.title}
        sourceUrl={pattern.sourceUrl}
        status={status}
        statusOptions={PATTERN_STATUSES}
        onUpdateStatus={updateStatus}
        craftType={craftType}
        setCraftType={setCraftType}
        tags={{ hookTags, setHookTags, weightTags, setWeightTags, categoryTags, setCategoryTags }}
        isEditing={isEditingDetails}
        setIsEditing={setIsEditingDetails}
        formAction={updatePattern}
        actionButtons={<Button onClick={openProject}>Start New Project</Button>}
        onDeleteClick={openDelete}
      />

      <Divider my="sm" />

      {/* Content form. updatePattern only writes the fields it receives, so
          the metadata above is left alone. */}
      <form id="pattern-content-form" action={saveContent}>
        <input type="hidden" name="patternId" value={pattern.id} />

        <CollapsibleHeader title="Pattern Content" opened={contentOpened} onToggle={toggleContent}>
          <Button variant="light" onClick={() => { if (!isEditingTabs) openContent(); setIsEditingTabs(!isEditingTabs); }}>
            {isEditingTabs ? 'Cancel Editing' : 'Edit Text'}
          </Button>
          {isEditingTabs && <Button type="submit">Save Text</Button>}
        </CollapsibleHeader>

        <Collapse expanded={contentOpened} keepMounted>
          <Tabs defaultValue="pattern" variant="outline" keepMounted styles={contentTabsStyles(isEditingTabs)}>
            <Tabs.List>
              <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
              <Tabs.Tab value="materials">Materials</Tabs.Tab>
              <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
              <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
              <Tabs.Tab value="notes">Notes</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="pattern" p="md">
              {!isEditingTabs && (
                <Group justify="flex-end" mb="sm">
                  <Switch checked={rainbowEnabled} onChange={(e) => setRainbowEnabled(e.currentTarget.checked)} label="Rainbow Steps" color="grape" />
                </Group>
              )}
              <PatternText editor={patternEditor} isEditing={isEditingTabs} rainbow={rainbowEnabled} />
            </Tabs.Panel>

            <Tabs.Panel value="materials" p="md"><TabContent editor={materialsEditor} isEditing={isEditingTabs} originalContent={pattern.materials} fallbackText="No materials listed." /></Tabs.Panel>
            <Tabs.Panel value="abbreviations" p="md"><TabContent editor={abbreviationsEditor} isEditing={isEditingTabs} originalContent={pattern.abbreviations} fallbackText="No abbreviations listed." /></Tabs.Panel>
            <Tabs.Panel value="sizing" p="md"><TabContent editor={sizingEditor} isEditing={isEditingTabs} originalContent={pattern.sizing} fallbackText="No sizing info added." /></Tabs.Panel>
            <Tabs.Panel value="notes" p="md"><TabContent editor={notesEditor} isEditing={isEditingTabs} originalContent={pattern.notes} fallbackText="No notes added." /></Tabs.Panel>
          </Tabs>
        </Collapse>
      </form>

      <Divider my="sm" />
      <Box mt="xl">
        <ImageGallery
          images={images}
          title="Pattern Photos"
          targetId={pattern.id}
          idFieldName="patternId"
          revalidateUrl={`/crafting/patterns/${pattern.id}`}
          uploadAction={uploadImage}
          deleteAction={deleteImage}
          coverImagePath={pattern.coverImage}
          setCoverAction={(id, path) => setCoverImage(id, path, 'pattern')}
        />
      </Box>

      <Modal opened={projectModalOpened} onClose={closeProject} title="Start a New Project" centered>
        <form action={spawnProject}>
          <input type="hidden" name="patternId" value={pattern.id} />
          <Stack>
            <TextInput label="Project Name" name="title" required data-autofocus />
            <TextInput label="Yarn Brand/Line" name="yarnUsed" />
            <TextInput label="Colors (comma separated)" name="colors" />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeProject}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDeleteModal
        opened={deleteModalOpened}
        close={closeDelete}
        onConfirm={handleDelete}
        itemName={pattern.title}
        isDeleting={isDeleting}
      />

      {isEditingTabs ? (
        <FloatingEditActions formId="pattern-content-form" onCancel={() => setIsEditingTabs(false)} />
      ) : (
        <ScrollToTopButton />
      )}
    </Paper>
  );
}
