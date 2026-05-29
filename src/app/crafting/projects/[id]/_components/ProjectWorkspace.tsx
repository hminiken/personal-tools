'use client';
import { Select, useComputedColorScheme } from '@mantine/core';
import { useRef, useState } from 'react';
import {
    Title, Text, Group, Badge, Paper, Switch,
    Tabs, Divider, Box, Button, TextInput, Stack, Typography,
    Anchor, TagsInput,
    Modal
} from '@mantine/core';
import { IconArrowLeft, IconExternalLink, IconNeedleThread, IconPlus } from '@tabler/icons-react';
import { saveRulerPosition, setProjectCoverImage, updateProject, updateProjectStatus } from '../_actions/actions';
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
import { processWholePattern } from '@/utils/patternHighlighter';
import ImageGallery from '@/components/PatternImageGallery';
import { uploadProjectImage, deleteImage } from '@actions/patternActions';
import { Project, Pattern, PatternImage } from '../types';
import Link from 'next/link';

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

    const computedColorScheme = useComputedColorScheme('light');
    const [noteModalOpened, { open: openNote, close: closeNote }] = useDisclosure(false);
    const [quickNote, setQuickNote] = useState('');
    const [rainbowEnabled, setRainbowEnabled] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<string>('');

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



const handleUpdateStatus = async (newStatus: string) => {
    // 1. Store the previous status in case we need to roll back
    const previousStatus = status ?? project.status ?? '';

    // 2. Optimistic Update: Set the UI state immediately
    setStatus(newStatus);

    // 3. Call the server
    try {
        const result = await updateProjectStatus(project.id, newStatus);
        
        if (!result.success) {
            throw new Error('Database update failed');
        }
    } catch  {
        // 4. Rollback on error
        setStatus(previousStatus);
        alert('Failed to save status. Reverting...');
    }
};

    return (
        <Paper p={{ base: 'xs', sm: 'xl' }} radius="md">
            <Button
                component={Link}
                href="/crafting/projects"
                variant="subtle"
                color="gray"
                leftSection={<IconArrowLeft size={16} />}
                mb="md"
                pl={0} // Removes the side padding so the icon aligns perfectly with your title
            >
                Back to Projects
            </Button>


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

                {/* 1. Header Row */}
                <Group justify="space-between" align="flex-start" mb="sm">
                    {isEditingDetails ? (
                        /* RESTORED: The form inputs for editing! */
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
                        </Stack>
                    ) : (
                        <Box>
                            <Group>
                            <Title order={2}>{project.title}</Title>
                             <Anchor fw={500} href={project.sourceUrl ?? ''} ml={4}  target="_blank" 
                                                                rel="noopener noreferrer">
                                                              <IconExternalLink />
                                                            </Anchor>
                                                        </Group>
                            <Text c="dimmed" size="sm">Based on:
                                <Anchor fw={500} href={`/crafting/patterns/${pattern.id}`} ml={4}>
                                    {pattern.title}
                                </Anchor>
                            </Text>
                        </Box>
                    )}

                    {/* The Button & Status Action Group */}
                    <Stack align="flex-end">
                        <Group>
                            {!isEditingDetails && (
                                <Group gap="sm">
                                    <Select
                                        w={140}
                                        placeholder="Status"
                                        data={[
                                            { value: 'WIP', label: 'WIP' },
                                            { value: 'Complete', label: 'Complete' },
                                            { value: 'On Hold', label: 'On Hold' },
                                            { value: 'Frogged', label: 'Frogged' },
                                        ]}
                                        value={status || project.status}
                                        onChange={(val) => val && handleUpdateStatus(val)}
                                    />
                                    <Button variant="filled" color="olive.6" onClick={openNote} leftSection={<IconPlus size={14} />}>
                                        Quick Note
                                    </Button>
                                </Group>
                            )}
                            <Button variant="outline" onClick={() => setIsEditingDetails(!isEditingDetails)}>
                                {isEditingDetails ? 'Cancel' : 'Edit Details'}
                            </Button>
                        </Group>

                        {isEditingDetails && (
                            <Button type="submit" color="olive.7">
                                Save Details
                            </Button>
                        )}
                    </Stack>
                </Group>

                {/* 2. Badge Row (Separated so it doesn't mess up button wrapping!) */}
                {!isEditingDetails && (
                    <Group gap="xs" mb="md">
                        {project.status && <Badge color="neutrals.7" variant="outline" >Status: {status || project.status}</Badge>}
                        {project.yarnUsed && <Badge color="neutrals.5" variant="outline" leftSection={<IconNeedleThread size={12} />}>{project.yarnUsed}</Badge>}
                        {project.colors && <Badge color="olive.7" variant="outline">Colors: {project.colors}</Badge>}
                        {categoryTags.map(tag => <Badge key={`cat-${tag}`} color="violet.6" variant="filled">{tag}</Badge>)}
                        {hookTags.map(tag => <Badge key={`hook-${tag}`} color="rust.5" variant="outline">Hook: {tag}</Badge>)}
                        {weightTags.map(tag => <Badge key={`weight-${tag}`} color="mustard.6" variant="outline">Weight: {tag}</Badge>)}
                    </Group>
                )}
            </form>

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
                        {isEditingTabs && <Button type="submit" color="olive.5">Save Text</Button>}
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

                    <Tabs.Panel value="pattern" p={{ base: 'xs', sm: 'md' }}>
                        <Group justify="space-between" mb="sm">
                            <Text size="sm" c="dimmed" fs="italic">This is your project's clone of the pattern. Mark it up!</Text>
                        </Group>
                        <Group>
                            <Switch
                                checked={rainbowEnabled}
                                onChange={(event) => setRainbowEnabled(event.currentTarget.checked)}
                                label="Rainbow Steps"
                                color="grape"
                            />
                            <Switch
                                checked={rulerEnabled}
                                onChange={(event) => setRulerEnabled(event.currentTarget.checked)}
                                label="Reading Ruler"
                            />
                        </Group>
                        <Box
                            style={{ position: 'relative', cursor: rulerEnabled ? 'crosshair' : 'auto' }}
                            onClick={handleTextClick}
                        >
                            {/* Only show the ruler if enabled AND not editing */}
                            {rulerEnabled && !isEditingTabs && (
                                <div style={{
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
                                }} />
                            )}

                            {/* THE CONDITIONAL RENDER: Show Rainbow HTML, or show Tiptap */}
                            {rainbowEnabled && !isEditingTabs ? (
                                // If Rainbow is ON and we aren't editing, show the highlighted version
                                <Typography style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                                    <div dangerouslySetInnerHTML={{
                                        __html: processWholePattern(patternEditor?.getHTML() || '', computedColorScheme)
                                    }} />
                                </Typography>
                            ) : (
                                // Otherwise, show the standard Tiptap Editor
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
                            )}
                        </Box>
                        {/* <Box style={{ position: 'relative', cursor: rulerEnabled && !isEditingTabs ? 'crosshair' : 'auto' }} onClick={handleTextClick}>
                            {rulerEnabled && !isEditingTabs && (
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
                        </Box> */}
                    </Tabs.Panel>

                    {/* ... Master Tabs (Materials, Abbreviations, etc) stay exactly the same here ... */}
                    <Tabs.Panel value="materials" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.materials} fallback="No materials listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="abbreviations" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="sizing" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.sizing} fallback="No sizing info in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="patternNotes" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.patternNotes} fallback="No master notes available." /></Tabs.Panel>

                    <Tabs.Panel value="projectNotes" p={{ base: 'xs', sm: 'md' }} bg={isEditingTabs ? 'gray.0' : 'transparent'}>
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