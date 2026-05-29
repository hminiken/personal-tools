'use client';

import { useRef, useState } from 'react';
import {
    Title, Text, Group, Badge, Paper, Switch,
    Tabs, Divider, Box, Button, TextInput, Stack, Typography,
    Anchor, TagsInput,
    Modal
} from '@mantine/core';
import { IconNeedleThread, IconPlus } from '@tabler/icons-react';
import { saveRulerPosition, setProjectCoverImage, updateProject } from '../_actions/actions';
import { useDisclosure } from '@mantine/hooks';
import { addQuickNote } from '../_actions/actions';
// Tiptap Imports
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

import ImageGallery from '@/components/PatternImageGallery';
import { uploadProjectImage, deleteImage } from '@actions/patternActions';
import { Project, Pattern, PatternImage } from '../types';

function ReadOnlyHTML({ html, fallback }: { html: string | null, fallback: string }) {
    return (
        <Typography p={0}>
            <div dangerouslySetInnerHTML={{ __html: html || `<p>${fallback}</p>` }} />
        </Typography>
    );
}

export default function ProjectWorkspace({ project, pattern, images }: { project: Project & { categories?: string }, pattern: Pattern, images: PatternImage[] }) {
    const [rulerEnabled, setRulerEnabled] = useState(true);
    const [rulerY, setRulerY] = useState(project.rulerPosition || 0);

    // 1. Split the editing states!
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingTabs, setIsEditingTabs] = useState(false);

    // Tags State (Added Categories!)
    const [hookTags, setHookTags] = useState<string[]>(project.hookSizes ? project.hookSizes.split(',') : []);
    const [weightTags, setWeightTags] = useState<string[]>(project.yarnWeights ? project.yarnWeights.split(',') : []);
    const [categoryTags, setCategoryTags] = useState<string[]>(project.categories ? project.categories.split(',') : []);

    const editorExtensions = [StarterKit, TextStyle, Color, Highlight];

    const notesEditor = useEditor({ extensions: editorExtensions, content: project.projectNotes || '', immediatelyRender: false });
    const patternEditor = useEditor({ extensions: editorExtensions, content: project.annotatedPattern || pattern.patternText || '', immediatelyRender: false });
    const [noteModalOpened, { open: openNote, close: closeNote }] = useDisclosure(false);
    const [quickNote, setQuickNote] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    
    const handleTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rulerEnabled || !project?.id) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const yPosition = e.clientY - rect.top;
        setRulerY(yPosition);
        saveRulerPosition(Number(project.id), Math.round(yPosition));
    };


    const handleSaveNote = async () => {
  if (!quickNote.trim()) return; // Don't save empty notes
  await addQuickNote(project.id, quickNote);
  setQuickNote('');
  closeNote();
};

    return (
        <Paper pl="xl" radius="md">

            {/* ========================================= */}
            {/* FORM 1: PROJECT DETAILS & METADATA        */}
            {/* ========================================= */}
            <form action={async (formData) => {
                // Save the tags
                formData.set('hookSizes', hookTags.join(','));
                formData.set('yarnWeights', weightTags.join(','));
                formData.set('categories', categoryTags.join(','));

                // Preserve the rich text so the server doesn't wipe it!
                formData.set('projectNotes', project.projectNotes || '');
                formData.set('annotatedPattern', project.annotatedPattern || '');

                await updateProject(formData);
                setIsEditingDetails(false);
            }}>
                <input type="hidden" name="projectId" value={project.id} />

      <Group justify="space-between" align="flex-start" mb="md">
  {isEditingDetails ? (
    <Stack style={{ flexGrow: 1 }}>
      <TextInput name="title" label="Project Name" defaultValue={project.title} required />
      <Group grow>
        <TextInput name="yarnUsed" label="Yarn Brand/Line" defaultValue={project.yarnUsed || ''} />
        <TextInput name="colors" label="Colors" defaultValue={project.colors || ''} />
      </Group>
      <Group grow align="flex-start">
        <TagsInput label="Hook Sizes" placeholder="5mm" value={hookTags} onChange={setHookTags} clearable />
        <TagsInput label="Yarn Weights" placeholder="Worsted" value={weightTags} onChange={setWeightTags} clearable />
        <TagsInput label="Categories" placeholder="e.g., Blanket" value={categoryTags} onChange={setCategoryTags} clearable />
      </Group>

      {/* ADD THIS GROUP TO SHOW THE SAVE BUTTON ONLY WHEN EDITING */}
      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={() => setIsEditingDetails(false)}>Cancel</Button>
        <Button type="submit" color="green">Save Details</Button>
      </Group>
    </Stack>
  ) : (
    <Box>
       {/* ... your read-only display ... */}
       <Title order={2}>{project.title}</Title>
       {/* ... */}
    </Box>
  )}

  {/* ONLY SHOW THIS BUTTON IF NOT EDITING */}
  {!isEditingDetails && (
    <Button variant="outline" onClick={() => setIsEditingDetails(true)}>
      Edit Project Details
    </Button>
  )}
</Group>

            </form>

            <Group>
                <Button variant="filled"  onClick={openNote} leftSection={<IconPlus size={14} />}>
                    Quick Note
                </Button>
                <Button variant="outline" onClick={() => setIsEditingDetails(!isEditingDetails)}>
                    {isEditingDetails ? 'Cancel' : 'Edit Details'}
                </Button>
            </Group>

            <Divider my="sm" />

            {/* ========================================= */}
            {/* FORM 2: PATTERN CONTENT & TABS            */}
            {/* ========================================= */}
            <form action={async (formData) => {
                // Save the rich text
                formData.set('projectNotes', notesEditor?.getHTML() || '');
                formData.set('annotatedPattern', patternEditor?.getHTML() || '');

                // Preserve the metadata so the server doesn't wipe it!
                formData.set('title', project.title);
                formData.set('yarnUsed', project.yarnUsed || '');
                formData.set('colors', project.colors || '');
                formData.set('hookSizes', project.hookSizes || '');
                formData.set('yarnWeights', project.yarnWeights || '');
                formData.set('categories', project.categories || '');

                await updateProject(formData);
                setIsEditingTabs(false);
            }}>
                <input type="hidden" name="projectId" value={project.id} />

                <Group justify="space-between" mb="sm">
                    <Title order={4}>Project Content</Title>
                    <Group>
                        <Button variant="light" onClick={() => setIsEditingTabs(!isEditingTabs)}>
                            {isEditingTabs ? 'Cancel Editing' : 'Edit Text'}
                        </Button>
                        {isEditingTabs && <Button type="submit" color="green">Save Text</Button>}
                    </Group>
                </Group>

                <Tabs defaultValue="pattern" variant="outline" keepMounted styles={{ list: { flexWrap: 'nowrap', overflowX: 'auto' } }}>
                    <Tabs.List>
                        <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
                        <Tabs.Tab value="projectNotes" color="blue">My Project Notes</Tabs.Tab>
                        <Tabs.Tab value="materials">Materials</Tabs.Tab>
                        <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
                        <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
                        <Tabs.Tab value="patternNotes">Pattern Notes</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="pattern" p="md">
                        <Group justify="space-between" mb="sm">
                            <Text size="sm" c="dimmed" fs="italic">This is your project's clone of the pattern. Mark it up!</Text>
                            <Switch checked={rulerEnabled} onChange={(event) => setRulerEnabled(event.currentTarget.checked)} label="Enable Reading Ruler" />
                        </Group>

                        <Box style={{ position: 'relative', cursor: rulerEnabled ? 'crosshair' : 'auto' }} onClick={handleTextClick}>
                            {rulerEnabled && (
                                <div style={{ position: 'absolute', top: `${rulerY - 15}px`, left: -10, right: -10, height: '35px', backgroundColor: 'rgba(255, 224, 102, 0.4)', borderLeft: '4px solid var(--mantine-color-yellow-filled)', pointerEvents: 'none', transition: 'top 0.2s ease-out', zIndex: 5, borderRadius: '4px' }} />
                            )}
                            <RichTextEditor editor={patternEditor} style={{ border: isEditingTabs ? undefined : 'none' }}>
                                {isEditingTabs && (
                                    <RichTextEditor.Toolbar sticky stickyOffset={60}>
                                        <RichTextEditor.ControlsGroup>
                                            <RichTextEditor.Bold /><RichTextEditor.Italic /><RichTextEditor.Strikethrough /><RichTextEditor.Highlight />
                                            <RichTextEditor.ColorPicker colors={['#fa5252', '#4c6ef5', '#12b886', '#fab005']} />
                                        </RichTextEditor.ControlsGroup>
                                    </RichTextEditor.Toolbar>
                                )}
                                <RichTextEditor.Content />
                            </RichTextEditor>
                        </Box>
                    </Tabs.Panel>

                    {/* ... Master Tabs (Materials, Abbreviations, etc) stay exactly the same here ... */}
                    <Tabs.Panel value="materials" p="md"><ReadOnlyHTML html={pattern.materials} fallback="No materials listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="abbreviations" p="md"><ReadOnlyHTML html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="sizing" p="md"><ReadOnlyHTML html={pattern.sizing} fallback="No sizing info in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="patternNotes" p="md"><ReadOnlyHTML html={pattern.patternNotes} fallback="No master notes available." /></Tabs.Panel>

                    <Tabs.Panel value="projectNotes" p="md" bg={isEditingTabs ? 'gray.0' : 'transparent'}>
                        {isEditingTabs ? (
                            <RichTextEditor editor={notesEditor}>
                                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                                    {/* ... Tiptap controls ... */}
                                    <RichTextEditor.ControlsGroup><RichTextEditor.Bold /><RichTextEditor.Italic /><RichTextEditor.Strikethrough /><RichTextEditor.ClearFormatting /></RichTextEditor.ControlsGroup>
                                </RichTextEditor.Toolbar>
                                <RichTextEditor.Content />
                            </RichTextEditor>
                        ) : (
                            <ReadOnlyHTML html={project.projectNotes} fallback="Click 'Edit Text' to start adding notes!" />
                        )}
                    </Tabs.Panel>
                </Tabs>
            </form>

            {/* 3. THE IMAGE GALLERY */}
            <Divider my="sm" />
            <Box mt="xl">
                <ImageGallery
                    images={images}
                    title="Project Photos"
                    targetId={project.id}
                    idFieldName="projectId"
                    revalidateUrl={`/crafting/projects/${project.id}`}
                    uploadAction={uploadProjectImage}
                    deleteAction={deleteImage}
                    coverImagePath={project.coverImagePath}
                    setCoverAction={setProjectCoverImage}
                />
            </Box>

           <Modal 
  opened={noteModalOpened} 
  onClose={closeNote} 
  title="Quick Note" 
  centered
 transitionProps={{ 
    onEntered: () => inputRef.current?.focus() // This fires when the modal is fully visible
  }}
>
  <Stack>
    <TextInput 
      ref={inputRef} // 3. Attach the ref
      value={quickNote} 
      onChange={(e) => setQuickNote(e.currentTarget.value)} 
      placeholder="What did you just finish?" 
      onKeyDown={async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          await handleSaveNote();
        }
      }}
    />
    <Button onClick={handleSaveNote}>
      Save Note
    </Button>
  </Stack>
</Modal>

        </Paper>
    );
}