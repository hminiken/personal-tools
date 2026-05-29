'use client';

import { useState } from 'react';
import { 
  Title,  Group, Badge, Paper, Switch, 
  Button, Modal, TextInput, Stack, Divider,
  Tabs, Box, TagsInput 
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spawnProject, updatePattern, uploadPatternImage } from '../_actions/actions';

// Tiptap Imports
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import '@mantine/tiptap/styles.css';

import { TabContent } from './TabContent';
import ImageGallery from '@/components/PatternImageGallery';
import { Pattern, PatternImage } from '../../types';
import { deleteImage, setCoverImage } from '@actions/patternActions';

const editorExtensions = [StarterKit, TextStyle, Color];

export default function PatternViewer({ pattern, images }: { pattern: Pattern, images: PatternImage[] }) {
  const [colorEnabled, setColorEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Tags State
  const [hookTags, setHookTags] = useState<string[]>(pattern.hookSizes ? pattern.hookSizes.split(',') : []);
  const [weightTags, setWeightTags] = useState<string[]>(pattern.yarnWeights ? pattern.yarnWeights.split(',') : []);

  // Modals
  const [projectModalOpened, { open: openProject, close: closeProject }] = useDisclosure(false);

  // Editors
  const patternEditor = useEditor({ extensions: editorExtensions, content: pattern.patternText || '', immediatelyRender: false });
  const materialsEditor = useEditor({ extensions: editorExtensions, content: pattern.materials || '', immediatelyRender: false });
  const abbreviationsEditor = useEditor({ extensions: editorExtensions, content: pattern.abbreviations || '', immediatelyRender: false });
  const sizingEditor = useEditor({ extensions: editorExtensions, content: pattern.sizing || '', immediatelyRender: false });
  const notesEditor = useEditor({ extensions: editorExtensions, content: pattern.patternNotes || '', immediatelyRender: false });

  return (
    <Paper p="xl" radius="md">
      
      {/* 1. THE MAIN EDIT FORM */}
      <form action={async (formData) => {
        formData.set('patternText', patternEditor?.getHTML() || '');
        formData.set('materials', materialsEditor?.getHTML() || '');
        formData.set('abbreviations', abbreviationsEditor?.getHTML() || '');
        formData.set('sizing', sizingEditor?.getHTML() || '');
        formData.set('patternNotes', notesEditor?.getHTML() || '');
        
        formData.set('hookSizes', hookTags.join(','));
        formData.set('yarnWeights', weightTags.join(','));

        await updatePattern(formData);
        setIsEditing(false); 
      }}>
        <input type="hidden" name="patternId" value={pattern.id} />

        {/* --- HEADER --- */}
        {isEditing ? (
          <Stack mb="lg">
            <TextInput name="title" label="Pattern Title" defaultValue={pattern.title} required />
            <Group grow align="flex-start">
              <TagsInput label="Hook Sizes" placeholder="e.g., 5mm" value={hookTags} onChange={setHookTags} clearable />
              <TagsInput label="Yarn Weights" placeholder="e.g., Worsted" value={weightTags} onChange={setWeightTags} clearable />
              <TextInput name="yarnYardage" label="Yardage" defaultValue={pattern.yarnYardage?.toString() || ''} />
            </Group>
            <TextInput name="sourceUrl" label="Source Link" defaultValue={pattern.sourceUrl || ''} />
          </Stack>
        ) : (
          <>
            <Group justify="space-between" mb="md">
              <Title order={2}>{pattern.title}</Title>
              <Button onClick={openProject}>Start New Project</Button>
            </Group>

            <Group gap="xs" mb="lg">
              {hookTags.map(tag => <Badge key={tag} color="blue">Hook: {tag}</Badge>)}
              {weightTags.map(tag => <Badge key={tag} color="grape">Weight: {tag}</Badge>)}
              {pattern.yarnYardage && <Badge color="teal">Yardage: {pattern.yarnYardage} yds</Badge>}
            </Group>
          </>
        )}

        <Divider my="sm" />

        {/* --- TABS --- */}
        <Group justify="space-between" mb="sm">
          <Title order={4}>Pattern Details</Title>
          <Button variant="light" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Editing' : 'Edit Pattern'}
          </Button>
        </Group>

        {/* MOBILE FIX: FlexWrap nowrap and overflowX auto allows horizontal swiping on mobile! */}
        <Tabs defaultValue="pattern" variant="outline" keepMounted styles={{ list: { flexWrap: 'nowrap', overflowX: 'auto' } }}>
          <Tabs.List>
            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
            <Tabs.Tab value="materials">Materials</Tabs.Tab>
            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
            <Tabs.Tab value="notes">Notes</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pattern" p="md" bg={colorEnabled && !isEditing ? 'gray.0' : 'transparent'}>
            {!isEditing && (
              <Group justify="flex-end" mb="sm">
                <Switch checked={colorEnabled} onChange={(event) => setColorEnabled(event.currentTarget.checked)} label="Enable Highlighting" />
              </Group>
            )}
            <TabContent editor={patternEditor} isEditing={isEditing} originalContent={pattern.patternText} fallbackText="No pattern text added." />
          </Tabs.Panel>

          <Tabs.Panel value="materials" p="md">
            <TabContent editor={materialsEditor} isEditing={isEditing} originalContent={pattern.materials} fallbackText="No materials listed." />
          </Tabs.Panel>

          <Tabs.Panel value="abbreviations" p="md">
            <TabContent editor={abbreviationsEditor} isEditing={isEditing} originalContent={pattern.abbreviations} fallbackText="No abbreviations listed." />
          </Tabs.Panel>

          <Tabs.Panel value="sizing" p="md">
             <TabContent editor={sizingEditor} isEditing={isEditing} originalContent={pattern.sizing} fallbackText="No sizing info added." />
          </Tabs.Panel>

          <Tabs.Panel value="notes" p="md">
             <TabContent editor={notesEditor} isEditing={isEditing} originalContent={pattern.patternNotes} fallbackText="No notes added." />
          </Tabs.Panel>
        </Tabs>

        {isEditing && (
          <Group justify="flex-end" mt="md" mb="xl">
             <Button type="submit" color="green">Save All Changes</Button>
          </Group>
        )}
      </form>

      {/* 2. THE IMAGE GALLERY (Outside the main form so the file upload form doesn't conflict!) */}
      <Divider my="sm" />
      <Box mt="xl">
        <ImageGallery 
          images={images}
          title="Pattern Photos"
          targetId={pattern.id}
          idFieldName="patternId"
          revalidateUrl={`/crafting/patterns/${pattern.id}`}
          uploadAction={uploadPatternImage} // Use the new dedicated action here!
          deleteAction={deleteImage}
          coverImagePath={pattern.coverImagePath}
          setCoverAction={setCoverImage}
        />
      </Box>

      {/* ================= MODALS ================= */}
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

    </Paper>
  );
}