'use client';

import { useState } from 'react';
import { Title, Group, Paper, Switch, Tabs, Divider, Box, Button, TextInput, Stack, Typography, useComputedColorScheme, Modal, Collapse, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { IconArrowLeft, IconChevronDown, IconChevronRight } from '@tabler/icons-react';

// Tiptap Imports
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

// Actions & Components
import { deletePattern, spawnProject, updatePattern, updatePatternStatus } from '../../_actions/pattern_actions';
import { processWholePattern } from '@/utils/patternHighlighter';
import { TabContent } from './TabContent';
import ImageGallery from '@/components/PatternImageGallery';
import { Pattern, PatternImage } from '../../types';
import { CraftingMetadataForm } from '@/components/CraftingMetadataForm';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { ScrollToTopButton } from '@components/ScrollToTopButton';
import { FloatingEditActions } from '@components/FloatingEditActions';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { CraftingEditorToolbar } from '@components/CraftingEditorToolbar';
import type { CraftType } from '@/utils/knittingNeedles';

export default function PatternViewer({ pattern, images }: { pattern: Pattern, images: PatternImage[] }) {
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingTabs, setIsEditingTabs] = useState(false);
  const [rainbowEnabled, setRainbowEnabled] = useState(false);
  const computedColorScheme = useComputedColorScheme('light');
  
  const [projectModalOpened, { open: openProject, close: closeProject }] = useDisclosure(false);
  const [contentOpened, { toggle: toggleContent, open: openContent }] = useDisclosure(true);

  // States
  const [hookTags, setHookTags] = useState<string[]>(pattern.hooks ? pattern.hooks.split(',') : []);
  const [weightTags, setWeightTags] = useState<string[]>(pattern.weights ? pattern.weights.split(',') : []);
  const [categoryTags, setCategoryTags] = useState<string[]>(pattern.categories ? pattern.categories.split(',') : []);
  const [status, setStatus] = useState<string>(pattern.status || '');
  const [craftType, setCraftType] = useState<CraftType>((pattern.craftType as CraftType) || 'crochet');


  const patternEditor = useCraftingEditor(pattern.content, isEditingTabs);
const materialsEditor = useCraftingEditor(pattern.materials, isEditingTabs);
const abbreviationsEditor = useCraftingEditor(pattern.abbreviations, isEditingTabs);
const sizingEditor = useCraftingEditor(pattern.sizing, isEditingTabs);
const notesEditor = useCraftingEditor(pattern.notes, isEditingTabs);
      
  const handleUpdateStatus = async (newStatus: string) => {
    const previousStatus = status ?? pattern.status ?? '';
    setStatus(newStatus);
    try {
      const result = await updatePatternStatus(pattern.id, newStatus);
      if (!result.success) throw new Error('Database update failed');
    } catch {
      setStatus(previousStatus);
      alert('Failed to save status. Reverting...');
    }
  };

  const router = useRouter();
  
  // 2. Add the Modal State
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3. Create the execution function
  const handleDelete = async () => {
      setIsDeleting(true);
      await deletePattern(pattern.id); // This server action should delete the DB row
      setIsDeleting(false);
      closeDelete();
      router.push('/crafting/patterns'); // Boot them back to the list!
  };

  return (
    <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
      <Button component={Link} href="/crafting/patterns" variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md" pl={0}>
        Back to Patterns
      </Button>

      {/* ABSTRACTION: Metadata Form */}
      <CraftingMetadataForm 
        idName="patternId"
        idValue={pattern.id}
        title={pattern.title}
        sourceUrl={pattern.sourceUrl}
        status={status}
        statusOptions={[
          { value: 'Not Started', label: 'Not Started' },
          { value: 'WIP', label: 'WIP' },
          { value: 'Completed', label: 'Completed' },
          { value: 'On Hold', label: 'On Hold' },
          { value: 'Did Not Like', label: 'Did Not Like' },
        ]}
        onUpdateStatus={handleUpdateStatus}
        craftType={craftType}
        setCraftType={setCraftType}
        tags={{ hookTags, setHookTags, weightTags, setWeightTags, categoryTags, setCategoryTags }}
        isEditing={isEditingDetails}
        setIsEditing={setIsEditingDetails}
        formAction={updatePattern}
        actionButtons={<Button bg={'olive.7'} onClick={openProject}>Start New Project</Button>}
        onDeleteClick={openDelete}
      />

      <Divider my="sm" />

      {/* TABS FORM */}
      <form id="pattern-content-form" action={async (formData) => {
        formData.set('patternText', patternEditor?.getHTML() || '');
        formData.set('materials', materialsEditor?.getHTML() || '');
        formData.set('abbreviations', abbreviationsEditor?.getHTML() || '');
        formData.set('sizing', sizingEditor?.getHTML() || '');
        formData.set('patternNotes', notesEditor?.getHTML() || '');
        
        // Preserve metadata
        formData.set('title', pattern.title);
        formData.set('sourceUrl', pattern.sourceUrl ?? '');
        formData.set('hookSizes', hookTags.join(','));
        formData.set('yarnWeights', weightTags.join(','));
        formData.set('categories', categoryTags.join(','));
        
        await updatePattern(formData);
        router.refresh(); // Pull fresh server props so the editors re-sync
        setIsEditingTabs(false);
      }}>
        <input type="hidden" name="patternId" value={pattern.id} />

        <Group justify="space-between" mb="sm">
          <Group gap={6} onClick={toggleContent} style={{ cursor: 'pointer' }}>
            <ActionIcon variant="subtle" color="gray" aria-label={contentOpened ? 'Collapse content' : 'Expand content'}>
              {contentOpened ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
            </ActionIcon>
            <Title order={4}>Pattern Content</Title>
          </Group>
          <Group>
            <Button variant="light" onClick={() => { if (!isEditingTabs) openContent(); setIsEditingTabs(!isEditingTabs); }}>
              {isEditingTabs ? 'Cancel Editing' : 'Edit Text'}
            </Button>
            {isEditingTabs && <Button type="submit" color="olive.5">Save Text</Button>}
          </Group>
        </Group>

        <Collapse expanded={contentOpened} keepMounted>
        <Tabs
          defaultValue="pattern"
          variant="outline"
          keepMounted
          styles={{
            list: {
              flexWrap: 'nowrap',
              overflowX: 'auto',
              // Keep the tab bar in reach while scrolling a long pattern.
              // Disabled while editing so it doesn't collide with the
              // editor's own sticky toolbar (which sits at the same offset).
              ...(!isEditingTabs && {
                position: 'sticky',
                top: 60,
                zIndex: 3,
                backgroundColor: 'var(--mantine-color-body)',
              }),
            },
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
            <Tabs.Tab value="materials">Materials</Tabs.Tab>
            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
            <Tabs.Tab value="notes">Notes</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pattern" p="md" >
            {!isEditingTabs && (
              <Group justify="flex-end" mb="sm">
                <Switch checked={rainbowEnabled} onChange={(event) => setRainbowEnabled(event.currentTarget.checked)} label="Rainbow Steps" color="grape" />
              </Group>
            )}

            <Box>
              {rainbowEnabled && !isEditingTabs ? (
                <Typography style={{ lineHeight: 1.8 }}>
                  <div dangerouslySetInnerHTML={{ __html: processWholePattern(patternEditor?.getHTML() || '', computedColorScheme) }} />
                </Typography>
              ) : (
                <RichTextEditor 
                  editor={patternEditor} 
                  style={{ border: isEditingTabs ? undefined : 'none' }}
                  styles={{
                    content: {
                      '& .ProseMirror': { overflowX: 'hidden' },
                      '& .ProseMirror img': { maxWidth: '100%', height: 'auto !important' },
                      '& .ProseMirror span.resizeCursor': { display: 'inline-block', maxWidth: '100%' }
                    }
                  }}
                >
                 {isEditingTabs && <CraftingEditorToolbar />}
                  <RichTextEditor.Content />
                </RichTextEditor>
              )}
            </Box>
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

      {/* Spawn Project Modal */}
      <Modal opened={projectModalOpened} onClose={closeProject} title="Start a New Project" centered>
        <form action={spawnProject}>
          <input type="hidden" name="patternId" value={pattern.id} />
          <Stack>
            <TextInput label="Project Name" name="title" required />
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