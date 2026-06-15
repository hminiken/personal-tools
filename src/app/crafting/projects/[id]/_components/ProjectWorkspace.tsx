/* eslint-disable react/no-unescaped-entities */
'use client';

import { useRef, useState } from 'react';
import {
    Title, Text, Group, Paper, Switch, Tabs, Divider, Box, Button,
    TextInput, Stack, Typography, Anchor, Modal, useComputedColorScheme, ActionIcon, Card, Image, Badge, Collapse
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconUnlink, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

// Tiptap Imports
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

// Actions & Components
import { saveRulerPosition, updateProject, updateProjectStatus, addQuickNote, deleteProject, unlinkYarnFromProject } from '../../_actions/project_actions';
import { processWholePattern } from '@/utils/patternHighlighter';
import ImageGallery from '@/components/PatternImageGallery';
import { Project, Pattern, PatternImage, yarnStash } from '../types';
import { CraftingMetadataForm } from '@/components/CraftingMetadataForm';
import { useRouter } from 'next/navigation';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { ScrollToTopButton } from '@components/ScrollToTopButton';
import { FloatingEditActions } from '@components/FloatingEditActions';
import { StashBrowserModal } from './StashBrowserModal';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { CraftingEditorToolbar } from '@components/CraftingEditorToolbar';
function ReadOnlyHTML({ html, fallback }: { html: string | null, fallback: string }) {
    return (
        <Typography p={0}>
            <div dangerouslySetInnerHTML={{ __html: html || `<p>${fallback}</p>` }} />
        </Typography>
    );
}

export interface LinkedYarn {
    id: number;
    yarnId: number;
    title: string;
    brand: string | null;
    weight: string | null;
    color_tags: string | null;
    fiber_tags: string | null;
    coverImagePath: string | null;
}

export default function ProjectWorkspace({ project, pattern, images, linkedYarns, availableStash }: { project: Project & { categories?: string | null }, pattern: Pattern, images: PatternImage[], linkedYarns: LinkedYarn[], availableStash: yarnStash[] }) {
    // const [rulerEnabled, setRulerEnabled] = useState(true);
    // const [rulerY, setRulerY] = useState(project.rulerPosition || 0);
    const [rulerEnabled, setRulerEnabled] = useState(true);
    const [rulerY, setRulerY] = useState(project.ruler || 0);
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
    const [hookTags, setHookTags] = useState<string[]>(project.hooks ? project.hooks.split(',') : []);
    const [weightTags, setWeightTags] = useState<string[]>(project.weights ? project.weights.split(',') : []);
    const [categoryTags, setCategoryTags] = useState<string[]>(project.categories ? project.categories.split(',') : []);
    const [status, setStatus] = useState<string>(project.status || '');

    const notesEditor = useCraftingEditor(project.notes, isEditingTabs);
    const patternEditor = useCraftingEditor(project.content || pattern.content, isEditingTabs);




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

    const [stashModalOpened, { open: openStashModal, close: closeStashModal }] = useDisclosure(false);
    const [contentOpened, { toggle: toggleContent, open: openContent }] = useDisclosure(true);

    const handleUnlinkYarn = async (yarnId: number) => {
        if (confirm("Remove this yarn from the project?")) {
            await unlinkYarnFromProject(project.id, yarnId);
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
            <Button component={Link} href="/crafting/projects" variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md" pl={0}>
                Back to Projects
            </Button>

            {/* ABSTRACTION: Metadata Form */}
            <CraftingMetadataForm
                idName="projectId"
                idValue={project.id}
                title={project.title}
                sourceUrl={project.sourceUrl}
                yarnUsed={project.yarn} // Project specific
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
                    formData.set('projectNotes', project.notes || '');
                    formData.set('annotatedPattern', project.content || '');
                    await updateProject(formData);
                }}
            />

            <Divider my="sm" />

            {/* TABS FORM */}
            <form id="project-content-form" action={async (formData) => {
                formData.set('projectNotes', notesEditor?.getHTML() || '');
                formData.set('annotatedPattern', patternEditor?.getHTML() || '');

                // Preserve metadata
                formData.set('title', project.title);
                formData.set('yarnUsed', project.yarn || '');
                formData.set('colors', project.colors || '');
                formData.set('hookSizes', hookTags.join(','));
                formData.set('yarnWeights', weightTags.join(','));
                formData.set('categories', categoryTags.join(','));

                await updateProject(formData);
                setIsEditingTabs(false);
            }}>
                <input type="hidden" name="projectId" value={project.id} />

                <Group justify="space-between" mb="sm">
                    <Group gap={6} onClick={toggleContent} style={{ cursor: 'pointer' }}>
                        <ActionIcon variant="subtle" color="gray" aria-label={contentOpened ? 'Collapse content' : 'Expand content'}>
                            {contentOpened ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                        </ActionIcon>
                        <Title order={4}>Project Content</Title>
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
                            <Switch checked={rainbowEnabled} onChange={(event) => setRainbowEnabled(event.currentTarget.checked)} label="Rainbow Steps" color="grape" />
                            <Switch checked={rulerEnabled} onChange={(event) => setRulerEnabled(event.currentTarget.checked)} label="Reading Ruler" />
                        </Group>

                        <Box
                            ref={containerRef}
                            style={{ position: 'relative', cursor: rulerEnabled && !isEditingTabs ? 'crosshair' : 'auto' }}
                            onClick={handleTextClick}
                        >
                            {rulerEnabled && !isEditingTabs && (
                                <div style={{
                                    position: 'absolute', top: `${rulerY - 15}px`, left: -10, right: -10, height: '35px',
                                    backgroundColor: 'rgba(255, 224, 102, 0.4)', borderLeft: '4px solid var(--mantine-color-yellow-filled)',
                                    zIndex: 5, borderRadius: '4px',
                                    pointerEvents: 'auto',
                                    touchAction: 'none',
                                    cursor: isDraggingRuler ? 'grabbing' : 'grab',
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
                                    {/* ✨ REPLACED THE ENTIRE TOOLBAR BLOCK WITH OUR SINGLE COMPONENT */}
                                    {isEditingTabs && <CraftingEditorToolbar />}
                                    <RichTextEditor.Content />
                                </RichTextEditor>
                            )}
                        </Box>
                    </Tabs.Panel>

                    <Tabs.Panel value="materials" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.materials} fallback="No materials listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="abbreviations" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="sizing" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.sizing} fallback="No sizing info in master pattern." /></Tabs.Panel>
                    <Tabs.Panel value="patternNotes" p={{ base: 'xs', sm: 'md' }}><ReadOnlyHTML html={pattern.notes} fallback="No master notes available." /></Tabs.Panel>

                    {/* ✨ ADDED light-dark() FOR DARK MODE COMPATIBILITY */}
                    <Tabs.Panel value="projectNotes" p={{ base: 'xs', sm: 'md' }} bg={isEditingTabs ? 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))' : 'transparent'}>
                        {isEditingTabs ? (
                            <RichTextEditor editor={notesEditor}>
                                {/* ✨ REPLACED THE ENTIRE TOOLBAR BLOCK WITH OUR SINGLE COMPONENT */}
                                <CraftingEditorToolbar />
                                <RichTextEditor.Content />
                            </RichTextEditor>
                        ) : (
                            <ReadOnlyHTML html={project.notes} fallback="Click 'Edit Text' to start adding notes!" />
                        )}
                    </Tabs.Panel>
                </Tabs>
                </Collapse>
            </form>

            <Divider my="sm" />
            <Box mt="xl">
                <ImageGallery
                    images={images}
                    title="Project Photos"
                    targetId={project.id}
                    idFieldName="projectId"
                    revalidateUrl={`/crafting/projects/${project.id}`}
                    uploadAction={uploadImage}
                    deleteAction={deleteImage}
                    coverImagePath={project.coverImage}
                    setCoverAction={(id, path) => setCoverImage(id, path, 'project')}
                />
            </Box>



            <Box mb="xl" mt="xl">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Project Yarn</Title>
                    <Button variant="light" size="sm" leftSection={<IconPlus size={16} />} onClick={openStashModal}>
                        Browse Stash
                    </Button>
                </Group>

                {linkedYarns.map((yarn: LinkedYarn) => (
                    <Card
                        // eslint-disable-next-line react-hooks/purity
                        key={yarn.yarnId || yarn.id || Math.random()} // <-- Bulletproof key!
                        withBorder
                        shadow="sm"
                        radius="md"
                        component={Link}
                        href={`/crafting/stash/${yarn.yarnId || yarn.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <Group wrap="nowrap" align="flex-start">

                            {/* 1. THE IMAGE (Uncommented the sizing so it renders!) */}
                            <Image
                                src={yarn.coverImagePath || 'https://placehold.co/100x100?text=No+Photo'}
                                h={60}
                                w={60}
                                radius="md"
                                fit="cover"
                                alt={yarn.title}
                                fallbackSrc="https://placehold.co/100x100?text=No+Photo"
                            />

                            {/* 2. THE DETAILS & BADGES */}
                            <Box style={{ flex: 1 }}>
                                <Text fw={500} lineClamp={1}>{yarn.title}</Text>
                                <Text size="xs" c="dimmed" mb={6}>
                                    {yarn.brand || 'Unknown Brand'}
                                </Text>

                                <Group gap={4}>
                                    {/* Weight */}
                                    {yarn.weight && (
                                        <Badge size="xs" color="mustard" variant="outline">
                                            {yarn.weight}
                                        </Badge>
                                    )}

                                    {/* Fibers */}
                                    {yarn.fiber_tags?.split(',').map((fiber: string) => {
                                        const cleanFiber = fiber.trim();
                                        if (!cleanFiber) return null;
                                        return (
                                            <Badge key={cleanFiber} size="xs" color="rust" variant="outline">
                                                {cleanFiber}
                                            </Badge>
                                        );
                                    })}

                                    {/* Colors */}
                                    {yarn.color_tags?.split(',').map((color: string) => {
                                        const cleanColor = color.trim();
                                        if (!cleanColor) return null;
                                        return (
                                            <Badge key={cleanColor} size="xs" color="olive" variant="outline">
                                                {cleanColor}
                                            </Badge>
                                        );
                                    })}
                                </Group>
                            </Box>

                            {/* 3. THE UNLINK BUTTON (With preventDefault added!) */}
                            <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={(e) => {
                                    e.preventDefault(); // <--- Stops the card from linking when you click the trash icon
                                    handleUnlinkYarn(yarn.yarnId || yarn.id);
                                }}
                            >
                                <IconUnlink size={16} />
                            </ActionIcon>

                        </Group>
                    </Card>
                ))}
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
            <StashBrowserModal
                opened={stashModalOpened}
                close={closeStashModal}
                projectId={project.id}
                availableStash={availableStash}
                linkedYarns={linkedYarns}
            />
            <ConfirmDeleteModal
                opened={deleteModalOpened}
                close={closeDelete}
                onConfirm={handleDelete}
                itemName={project.title}
                isDeleting={isDeleting}
            />

            {isEditingTabs ? (
                <FloatingEditActions formId="project-content-form" onCancel={() => setIsEditingTabs(false)} />
            ) : (
                <ScrollToTopButton />
            )}
        </Paper>
    );
}