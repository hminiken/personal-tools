// src/app/crafting/patterns/[id]/_components/PatternViewer.tsx
'use client';

import { useState } from 'react';
import { 
  Title, Text, Group, Badge, Paper, Switch, 
  Button, Modal, TextInput, Stack, Divider,
  FileInput, Tabs, SimpleGrid, Image, Accordion, Typography 
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spawnProject, updatePattern } from '../_actions/actions';

// Tiptap Imports
import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import {TextStyle} from '@tiptap/extension-text-style';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { TabContent } from './TabContent';
import ImageGallery from '@/components/PatternImageGallery';
import { deleteImage, setCoverImage } from '@actions/patternActions';
import { Pattern, PatternImage } from '../../types';



// Define Tiptap extensions outside the component so they don't re-render unnecessarily
const editorExtensions = [StarterKit, TextStyle, Color];



// --- MAIN COMPONENT ---
export default function PatternViewer({ pattern, images }: { pattern: Pattern, images: PatternImage[] }) {
  const [colorEnabled, setColorEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [projectModalOpened, { open: openProject, close: closeProject }] = useDisclosure(false);

// Initialize an editor for each tab and explicitly disable immediate render
  const patternEditor = useEditor({ 
    extensions: editorExtensions, 
    content: pattern.patternText || '', 
    immediatelyRender: false 
  });
  
  const materialsEditor = useEditor({ 
    extensions: editorExtensions, 
    content: pattern.materials || '', 
    immediatelyRender: false 
  });
  
  const abbreviationsEditor = useEditor({ 
    extensions: editorExtensions, 
    content: pattern.abbreviations || '', 
    immediatelyRender: false 
  });
  
  const sizingEditor = useEditor({ 
    extensions: editorExtensions, 
    content: pattern.sizing || '', 
    immediatelyRender: false 
  });
  
  const notesEditor = useEditor({ 
    extensions: editorExtensions, 
    content: pattern.patternNotes || '', 
    immediatelyRender: false 
  });

  return (
    <Paper p="xl" radius="md" >
      {/* --- HEADER --- */}
      <Group justify="space-between" mb="md">
        <Title order={2}>{pattern.title}</Title>
        <Button onClick={openProject}>Start New Project</Button>
      </Group>

      <Group gap="xs" mb="lg">
        {pattern.hookSize && <Badge color="blue">Hook: {pattern.hookSize}</Badge>}
        {pattern.yarnWeight && <Badge color="grape">Weight: {pattern.yarnWeight}</Badge>}
        {pattern.yarnYardage && <Badge color="teal">Yardage: {pattern.yarnYardage} yds</Badge>}
      </Group>

      <Divider my="sm" />

          <ImageGallery 
      images={images}
      title="Pattern Photos"
      targetId={pattern.id}
      idFieldName="patternId"
      revalidateUrl={`/crafting/patterns/${pattern.id}`}
      uploadAction={updatePattern}
      deleteAction={deleteImage}
      coverImagePath={pattern.coverImagePath}
      setCoverAction={setCoverImage}
    />

      
      {/* --- PATTERN DETAILS HEADER & EDIT BUTTON --- */}
      <Group justify="space-between" mb="sm">
        <Title order={4}>Pattern Details</Title>
        <Button variant="light" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel Editing' : 'Edit Text'}
        </Button>
      </Group>

      {/* --- TABBED PATTERN DATA --- */}
<form action={async (formData) => {
        // 1. Grab the live HTML directly from the editors at the exact moment of clicking save
        formData.set('patternText', patternEditor?.getHTML() || '');
        formData.set('materials', materialsEditor?.getHTML() || '');
        formData.set('abbreviations', abbreviationsEditor?.getHTML() || '');
        formData.set('sizing', sizingEditor?.getHTML() || '');
        formData.set('patternNotes', notesEditor?.getHTML() || '');

        // 2. Send the updated payload to the server
        await updatePattern(formData);
        
        // 3. Exit edit mode
        setIsEditing(false); 
      }}>
        <input type="hidden" name="patternId" value={pattern.id} />


        {/* NEW: Added keepMounted so your typing isn't deleted when switching tabs */}
        <Tabs defaultValue="pattern" variant="outline" keepMounted>
          <Tabs.List>
            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
            <Tabs.Tab value="materials">Materials</Tabs.Tab>
            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
            <Tabs.Tab value="notes">Pattern Notes</Tabs.Tab>
          </Tabs.List>

          {/* TAB: PATTERN */}
          <Tabs.Panel value="pattern" p="md" bg={colorEnabled && !isEditing ? 'gray.0' : 'transparent'}>
            {!isEditing && (
              <Group justify="flex-end" mb="sm">
                <Switch 
                  checked={colorEnabled} 
                  onChange={(event) => setColorEnabled(event.currentTarget.checked)}
                  label="Enable Highlighting" 
                />
              </Group>
            )}
            <TabContent 
              editor={patternEditor} 
              isEditing={isEditing} 
              originalContent={pattern.patternText} 
              fallbackText="No pattern text added." 
            />
          </Tabs.Panel>

          {/* TAB: MATERIALS */}
          <Tabs.Panel value="materials" p="md">
            <TabContent 
              editor={materialsEditor} 
              isEditing={isEditing} 
              originalContent={pattern.materials} 
              fallbackText="No materials listed." 
            />
          </Tabs.Panel>

          {/* TAB: ABBREVIATIONS */}
          <Tabs.Panel value="abbreviations" p="md">
            <TabContent 
              editor={abbreviationsEditor} 
              isEditing={isEditing} 
              originalContent={pattern.abbreviations} 
              fallbackText="No abbreviations listed." 
            />
          </Tabs.Panel>

          {/* TAB: SIZING */}
          <Tabs.Panel value="sizing" p="md">
             <TabContent 
              editor={sizingEditor} 
              isEditing={isEditing} 
              originalContent={pattern.sizing} 
              fallbackText="No sizing info added." 
            />
          </Tabs.Panel>

          {/* TAB: NOTES */}
          <Tabs.Panel value="notes" p="md">
             <TabContent 
              editor={notesEditor} 
              isEditing={isEditing} 
              originalContent={pattern.patternNotes} 
              fallbackText="No notes added." 
            />
          </Tabs.Panel>
        </Tabs>

        {isEditing && (
          <Group justify="flex-end" mt="md">
             <Button type="submit" color="green">Save Text Changes</Button>
          </Group>
        )}
      </form>

      {/* ================= MODALS ================= */}

      {/* 1. SPAWN PROJECT MODAL */}
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