'use client';

import { useRef, useState, useEffect } from 'react';
import { Title, Text, Group, Paper, Switch, Tabs, Divider, Box, Button, TextInput, Stack, Typography, Anchor, Modal, useComputedColorScheme } from '@mantine/core';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

// Tiptap Imports
import { useEditor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

// Actions & Components
import { saveRulerPosition, setProjectCoverImage, updateProject, updateProjectStatus, addQuickNote, deleteProject } from '../../_actions/actions';
import { processWholePattern } from '@/utils/patternHighlighter';
import ImageGallery from '@/components/PatternImageGallery';
import { uploadProjectImage, deleteImage } from '@actions/patternActions';
import { Project, Pattern, PatternImage } from '../types';
import { CraftingMetadataForm } from '@/components/CraftingMetadataForm';
import { craftingEditorExtensions } from '@/utils/editorExtensions';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
function ReadOnlyHTML({ html, fallback }: { html: string | null, fallback: string }) {
    return (
        <Typography p={0}>
            <div dangerouslySetInnerHTML={{ __html: html || `<p>${fallback}</p>` }} />
        </Typography>
    );
}

export default function ProjectWorkspace({ project, pattern, images }: { project: Project & { categories?: string | null }, pattern: Pattern, images: PatternImage[] }) {
    // const [rulerEnabled, setRulerEnabled] = useState(true);
    // const [rulerY, setRulerY] = useState(project.rulerPosition || 0);
    const [rulerEnabled, setRulerEnabled] = useState(true);
    const [rulerY, setRulerY] = useState(project.rulerPosition || 0);
    const [isDraggingRuler, setIsDraggingRuler] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingTabs, setIsEditingTabs] = useState(false);
    const [rainbowEnabled, setRainbowEnabled] = useState(false);
    const computedColorScheme = useComputedColorScheme('light');

    const [noteModalOpened, { open: openNote, close: closeNote }] = useDisclosure(false);
    const [quickNote, setQuickNote] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // States
    const [hookTags, setHookTags] = useState<string[]>(project.hookSizes ? project.hookSizes.split(',') : []);
    const [weightTags, setWeightTags] = useState<string[]>(project.yarnWeights ? project.yarnWeights.split(',') : []);
    const [categoryTags, setCategoryTags] = useState<string[]>(project.categories ? project.categories.split(',') : []);
    const [status, setStatus] = useState<string>(project.status || '');

    // Editors
    // Editors - Start them as read-only!
    const notesEditor = useEditor({
        extensions: craftingEditorExtensions,
        content: project.projectNotes || '',
        immediatelyRender: false,
        editable: false
    });

    const patternEditor = useEditor({
        extensions: craftingEditorExtensions,
        content: project.annotatedPattern || pattern.patternText || '',
        immediatelyRender: false,
        editable: false
    });

    // Toggle edit mode seamlessly without re-rendering the whole editor component
    useEffect(() => {
        if (patternEditor) patternEditor.setEditable(isEditingTabs);
        if (notesEditor) notesEditor.setEditable(isEditingTabs);
    }, [isEditingTabs, patternEditor, notesEditor]);

    const handleTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rulerEnabled || !project?.id) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const yPosition = e.clientY - rect.top;
        setRulerY(yPosition);
        saveRulerPosition(Number(project.id), Math.round(yPosition));
    };

    const handleSaveNote = async () => {
        if (!quickNote.trim()) return;
        await addQuickNote(project.id, quickNote);
        setQuickNote('');
        closeNote();
    };

    const handleUpdateStatus = async (newStatus: string) => {
        const previousStatus = status ?? project.status ?? '';
        setStatus(newStatus);
        try {
            const result = await updateProjectStatus(project.id, newStatus);
            if (!result.success) throw new Error('Database update failed');
        } catch {
            setStatus(previousStatus);
            alert('Failed to save status. Reverting...');
        }
    };

    const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDraggingRuler(true);
        e.currentTarget.setPointerCapture(e.pointerId); // Locks the touch to the ruler even if your finger slips off the edge
        e.stopPropagation(); // Prevents the box underneath from thinking you clicked it
    };

    const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRuler || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let newY = e.clientY - rect.top;

        // Keep it clamped inside the box
        newY = Math.max(0, Math.min(newY, rect.height));
        setRulerY(newY);
    };

    const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDraggingRuler(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        saveRulerPosition(Number(project.id), Math.round(rulerY));
    };

    const router = useRouter();
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
      setIsDeleting(true);
      await deleteProject(project.id); 
      setIsDeleting(false);
      closeDelete();
      router.push('/crafting/projects'); 
  };

    return (
        <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
            <Button  component={Link} href="/crafting/projects" variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md" pl={0}>
                Back to Projects
            </Button>

            {/* ABSTRACTION: Metadata Form */}
            <CraftingMetadataForm
                idName="projectId"
                idValue={project.id}
                title={project.title}
                sourceUrl={project.sourceUrl}
                yarnUsed={project.yarnUsed} // Project specific
                colors={project.colors}     // Project specific
                status={status}
                statusOptions={[
                    { value: 'WIP', label: 'WIP' },
                    { value: 'Complete', label: 'Complete' },
                    { value: 'On Hold', label: 'On Hold' },
                    { value: 'Frogged', label: 'Frogged' },
                ]}
                onUpdateStatus={handleUpdateStatus}
                tags={{ hookTags, setHookTags, weightTags, setWeightTags, categoryTags, setCategoryTags }}
                isEditing={isEditingDetails}
                setIsEditing={setIsEditingDetails}
                onDeleteClick={openDelete}
                actionButtons={
                    <Button variant="filled" color="olive.6" onClick={openNote} leftSection={<IconPlus size={14} />}>
                        Quick Note
                    </Button>
                }
                subtext={
                    <Text c="dimmed" size="sm">Based on:
                        <Anchor fw={500} href={`/crafting/patterns/${pattern.id}`} ml={4}>{pattern.title}</Anchor>
                    </Text>
                }
                // We wrap the standard updateProject action so it preserves the rich text blocks
                formAction={async (formData) => {
                    formData.set('projectNotes', project.projectNotes || '');
                    formData.set('annotatedPattern', project.annotatedPattern || '');
                    await updateProject(formData);
                }}
            />

            <Divider my="sm" />

            {/* TABS FORM */}
            <form action={async (formData) => {
                formData.set('projectNotes', notesEditor?.getHTML() || '');
                formData.set('annotatedPattern', patternEditor?.getHTML() || '');

                // Preserve metadata
                formData.set('title', project.title);
                formData.set('yarnUsed', project.yarnUsed || '');
                formData.set('colors', project.colors || '');
                formData.set('hookSizes', hookTags.join(','));
                formData.set('yarnWeights', weightTags.join(','));
                formData.set('categories', categoryTags.join(','));

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
                            <Text size="sm" c="dimmed" fs="italic">This is your project&apos;s clone of the pattern. Mark it up!</Text>
                        </Group>
                        <Group>
                            <Switch checked={rainbowEnabled} onChange={(event) => setRainbowEnabled(event.currentTarget.checked)} label="Rainbow Steps" color="grape" />
                            <Switch checked={rulerEnabled} onChange={(event) => setRulerEnabled(event.currentTarget.checked)} label="Reading Ruler" />
                        </Group>

                        <Box
                            ref={containerRef} // NEW: Attach the ref here
                            style={{ position: 'relative', cursor: rulerEnabled ? 'crosshair' : 'auto' }}
                            onClick={handleTextClick}
                        >
                            {rulerEnabled && !isEditingTabs && (
                                <div style={{
                                    position: 'absolute', top: `${rulerY - 15}px`, left: -10, right: -10, height: '35px',
                                    backgroundColor: 'rgba(255, 224, 102, 0.4)', borderLeft: '4px solid var(--mantine-color-yellow-filled)',
                                    zIndex: 5, borderRadius: '4px',
                                    pointerEvents: 'auto', // Changed from 'none' so you can actually touch it
                                    touchAction: 'none', // Prevents the whole page from scrolling when you swipe the ruler
                                    cursor: isDraggingRuler ? 'grabbing' : 'grab',
                                    // Remove the transition while dragging so it sticks perfectly to your finger
                                    transition: isDraggingRuler ? 'none' : 'top 0.2s ease-out',
                                }}
                                    onPointerDown={handleRulerPointerDown}
                                    onPointerMove={handleRulerPointerMove}
                                    onPointerUp={handleRulerPointerUp}
                                    onPointerCancel={handleRulerPointerUp}
                                />
                            )}

                            {rainbowEnabled && !isEditingTabs ? (
                                <Typography style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
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
                    </Tabs.Panel>

                    <Tabs.Panel value="materials" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.materials} fallback="No materials listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="abbreviations" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="sizing" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.sizing} fallback="No sizing info in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="patternNotes" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.patternNotes} fallback="No master notes available." /></Tabs.Panel>

                    <Tabs.Panel value="projectNotes" p={{ base: 'xs', sm: 'md' }} bg={isEditingTabs ? 'gray.0' : 'transparent'}>
                        {isEditingTabs ? (
                            <RichTextEditor editor={notesEditor}>
                                <RichTextEditor.Toolbar sticky stickyOffset={60}>
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

            {/* Quick Note Modal */}
            <Modal opened={noteModalOpened} onClose={closeNote} title="Quick Note" centered transitionProps={{ onEntered: () => inputRef.current?.focus() }}>
                <Stack>
                    <TextInput
                        ref={inputRef}
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
                    <Button onClick={handleSaveNote}>Save Note</Button>
                </Stack>
            </Modal>
            <ConfirmDeleteModal 
          opened={deleteModalOpened}
          close={closeDelete}
          onConfirm={handleDelete}
          itemName={project.title}
          isDeleting={isDeleting}
      />
        </Paper>
    );
}