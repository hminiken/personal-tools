'use client';

import { 
  Title, Text, Group, Badge, Paper, Switch, 
  Tabs, Divider, Box, Button, TextInput, Stack, Typography} from '@mantine/core';
import { IconNeedleThread } from '@tabler/icons-react'; // <-- Added Trash icon
import { saveRulerPosition , updateProject} from '../_actions/actions';

// Tiptap Imports for the Project Notes
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import ImageGallery from '@/components/PatternImageGallery';
import { uploadProjectImage, deleteImage } from '@actions/patternActions';
import { useState } from 'react';
import { Project, Pattern , PatternImage} from '../types';

const editorExtensions = [StarterKit, TextStyle, Color];

// A quick helper to safely display the Read-Only Master Pattern tabs
function ReadOnlyHTML({ html, fallback }: { html: string | null, fallback: string }) {
  return (
    <Typography p={0}>
      <div dangerouslySetInnerHTML={{ __html: html || `<p>${fallback}</p>` }} />
    </Typography>
  );
}

export default function ProjectWorkspace({ project, pattern, images }: { project: Project, pattern: Pattern, images: PatternImage[] }) {
  const [rulerEnabled, setRulerEnabled] = useState(true);
  const [rulerY, setRulerY] = useState(project.rulerPosition || 0);
  const [isEditing, setIsEditing] = useState(false);


  // Initialize the rich text editor specifically for the Project Notes
  const notesEditor = useEditor({ 
    extensions: editorExtensions, 
    content: project.projectNotes || '', 
    immediatelyRender: false 
  });

  const handleTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerEnabled || !project?.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const yPosition = e.clientY - rect.top;
    setRulerY(yPosition);
    saveRulerPosition(Number(project.id), Math.round(yPosition));
  };

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      
      {/* WRAP THE WHOLE THING IN THE EDIT FORM */}
      <form action={async (formData) => {
        // Grab the live HTML from the notes editor
        formData.set('projectNotes', notesEditor?.getHTML() || '');
        await updateProject(formData);
        setIsEditing(false);
      }}>
        <input type="hidden" name="projectId" value={project.id} />

        {/* --- HEADER --- */}
        <Group justify="space-between" align="flex-start" mb="md">
          {isEditing ? (
            <Stack style={{ flexGrow: 1 }}>
              <TextInput name="title" label="Project Name" defaultValue={project.title} required />
              <Group grow>
                <TextInput name="yarnUsed" label="Yarn Brand/Line" defaultValue={project.yarnUsed || ''} />
                <TextInput name="colors" label="Colors" defaultValue={project.colors || ''} />
              </Group>
            </Stack>
          ) : (
            <Box>
              <Title order={2}>{project.title}</Title>
              <Text c="dimmed" size="sm">Based on: {pattern.title}</Text>
              <Group gap="xs" mt="xs">
                {project.yarnUsed && <Badge color="violet" variant="light" leftSection={<IconNeedleThread size={12}/>}>{project.yarnUsed}</Badge>}
                {project.colors && <Badge color="gray" variant="outline">Colors: {project.colors}</Badge>}
              </Group>
            </Box>
          )}

          {/* EDIT TOGGLE BUTTON */}
          <Button variant="light" onClick={() => setIsEditing(!isEditing)} mt={isEditing ? 24 : 0}>
            {isEditing ? 'Cancel Editing' : 'Edit Project Details'}
          </Button>
        </Group>

        <Divider my="sm" />
            <ImageGallery 
            images={images}
            title="Project Photos"
            targetId={project.id}
            idFieldName="projectId"
            revalidateUrl={`/crafting/projects/${project.id}`}
            uploadAction={uploadProjectImage}
            deleteAction={deleteImage}
            />
        

        {/* --- TABS --- */}
        <Tabs defaultValue="pattern" variant="outline" keepMounted>
          <Tabs.List>
            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
            <Tabs.Tab value="materials">Materials</Tabs.Tab>
            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
            <Tabs.Tab value="patternNotes">Pattern Notes</Tabs.Tab>
            {/* Visually distinguish the project notes tab */}
            <Tabs.Tab value="projectNotes" color="blue">My Project Notes</Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: MASTER PATTERN WITH READING RULER */}
          <Tabs.Panel value="pattern" p="md">
            <Group justify="flex-end" mb="sm">
              <Switch 
                checked={rulerEnabled} 
                onChange={(event) => setRulerEnabled(event.currentTarget.checked)}
                label="Enable Reading Ruler" 
              />
            </Group>

            <Box 
              style={{ position: 'relative', cursor: rulerEnabled ? 'crosshair' : 'auto' }} 
              onClick={handleTextClick}
            >
              {rulerEnabled && (
                <div 
                  style={{
                    position: 'absolute',
                    top: `${rulerY - 15}px`,
                    left: -10,
                    right: -10,
                    height: '35px',
                    backgroundColor: 'rgba(255, 224, 102, 0.4)',
                    borderLeft: '4px solid var(--mantine-color-yellow-filled)',
                    pointerEvents: 'none',
                    transition: 'top 0.2s ease-out',
                    zIndex: 5,
                    borderRadius: '4px'
                  }}
                />
              )}
              <ReadOnlyHTML html={pattern.patternText} fallback="No pattern text available." />
            </Box>
          </Tabs.Panel>

          {/* READ-ONLY MASTER PATTERN TABS */}
          <Tabs.Panel value="materials" p="md">
            <ReadOnlyHTML html={pattern.materials} fallback="No materials listed in master pattern." />
          </Tabs.Panel>
          <Tabs.Panel value="abbreviations" p="md">
            <ReadOnlyHTML html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." />
          </Tabs.Panel>
          <Tabs.Panel value="sizing" p="md">
            <ReadOnlyHTML html={pattern.sizing} fallback="No sizing info in master pattern." />
          </Tabs.Panel>
          <Tabs.Panel value="patternNotes" p="md">
            <ReadOnlyHTML html={pattern.patternNotes} fallback="No master notes available." />
          </Tabs.Panel>

          {/* EDITABLE PROJECT NOTES TAB */}
          <Tabs.Panel value="projectNotes" p="md" bg={isEditing ? 'gray.0' : 'transparent'}>
            {isEditing ? (
              <RichTextEditor editor={notesEditor}>
                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                  </RichTextEditor.ControlsGroup>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.ColorPicker colors={['#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2', '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e', '#fab005', '#fd7e14']} />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
                <RichTextEditor.Content />
              </RichTextEditor>
            ) : (
              <ReadOnlyHTML html={project.projectNotes} fallback="Click 'Edit Project Details' to start adding notes, tweaks, and row-counts!" />
            )}
          </Tabs.Panel>

        </Tabs>

        {isEditing && (
          <Group justify="flex-end" mt="md">
             <Button type="submit" color="green">Save Project Updates</Button>
          </Group>
        )}
      </form>
    </Paper>
  );
}