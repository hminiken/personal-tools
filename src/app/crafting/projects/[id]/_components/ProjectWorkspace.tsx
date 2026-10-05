'use client';

import { useEffect, useRef, useState } from 'react';
import { Text, Group, Paper, Switch, Tabs, Divider, Box, Button, Anchor, Collapse, Alert } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSparkles } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { saveRulerPosition, updateProject, updateProjectStatus, deleteProject } from '../../_actions/project_actions';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import { Project, Pattern, PatternImage, yarnStash } from '../types';
import ImageGallery from '@/components/PatternImageGallery';
import { CraftingMetadataForm } from '@/components/CraftingMetadataForm';
import { BackButton } from '@components/BackButton';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { ScrollToTopButton } from '@components/ScrollToTopButton';
import { FloatingEditActions } from '@components/FloatingEditActions';
import { CollapsibleHeader, PatternText, ReadOnlyHtml, TabContent, contentTabsStyles } from '@components/PatternContent';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { useOptimisticStatus } from '@hooks/useOptimisticStatus';
import { splitTags, PROJECT_STATUSES } from '@/utils/tags';
import type { CraftType } from '@/utils/knittingNeedles';
import { ReadingRuler } from './ReadingRuler';
import { QuickNoteModal } from './QuickNoteModal';
import { TailorModal } from './TailorModal';
import { LinkedYarnSection, type LinkedYarn } from './LinkedYarnSection';

export default function ProjectWorkspace({ project, pattern, images, linkedYarns, availableStash }: {
    project: Project;
    pattern: Pattern;
    images: PatternImage[];
    linkedYarns: LinkedYarn[];
    availableStash: yarnStash[];
}) {
    const router = useRouter();

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingTabs, setIsEditingTabs] = useState(false);
    const [rainbowEnabled, setRainbowEnabled] = useState(false);
    const [rulerEnabled, setRulerEnabled] = useState(true);
    const [contentOpened, { toggle: toggleContent, open: openContent }] = useDisclosure(true);
    const [noteOpened, { open: openNote, close: closeNote }] = useDisclosure(false);
    const [tailorOpened, { open: openTailor, close: closeTailor }] = useDisclosure(false);

    // Metadata
    const [hookTags, setHookTags] = useState(splitTags(project.hooks));
    const [weightTags, setWeightTags] = useState(splitTags(project.weights));
    const [categoryTags, setCategoryTags] = useState(splitTags(project.categories));
    const [craftType, setCraftType] = useState<CraftType>((project.craftType as CraftType) || 'crochet');
    const [status, updateStatus] = useOptimisticStatus(project.status, (s) => updateProjectStatus(project.id, s));

    // The project's own copy of the pattern, plus its notes. Materials etc.
    // are read straight from the master pattern.
    const patternEditor = useCraftingEditor(project.content || pattern.content, isEditingTabs);
    const notesEditor = useCraftingEditor(project.notes, isEditingTabs);

    // An AI-tailored version waits here until the editor has been rebuilt in
    // edit mode (toggling edit mode recreates the editor, which would wipe
    // content set earlier). It's loaded but NOT saved: Save Text keeps it,
    // Cancel Editing throws it away.
    const pendingTailoredHtml = useRef<string | null>(null);
    const [showTailoredNotice, setShowTailoredNotice] = useState(false);

    useEffect(() => {
        if (pendingTailoredHtml.current && patternEditor?.isEditable) {
            patternEditor.commands.setContent(pendingTailoredHtml.current);
            pendingTailoredHtml.current = null;
        }
    }, [patternEditor, isEditingTabs]);

    const loadTailored = (html: string) => {
        pendingTailoredHtml.current = html;
        setShowTailoredNotice(true);
        openContent();
        setIsEditingTabs(true);
    };

    const startEditingTabs = () => {
        openContent();
        setIsEditingTabs(true);
    };

    const stopEditingTabs = () => {
        setIsEditingTabs(false);
        setShowTailoredNotice(false);
    };

    // Delete
    const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        await deleteProject(project.id);
        setIsDeleting(false);
        closeDelete();
        router.push('/crafting/projects');
    };

    const saveContent = async (formData: FormData) => {
        formData.set('projectNotes', notesEditor?.getHTML() || '');
        formData.set('annotatedPattern', patternEditor?.getHTML() || '');

        await updateProject(formData);
        router.refresh(); // Pull fresh server props so the editors re-sync
        stopEditingTabs();
    };

    const tabPadding = { base: 'xs', sm: 'md' };

    return (
        <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
            <BackButton href="/crafting/projects" label="Back to Projects" />

            {/* updateProject only writes the fields it receives, so saving
                details leaves the pattern copy and notes alone. */}
            <CraftingMetadataForm
                idName="projectId"
                idValue={project.id}
                title={project.title}
                sourceUrl={project.sourceUrl}
                yarnUsed={project.yarn}
                colors={project.colors}
                status={status}
                statusOptions={PROJECT_STATUSES}
                onUpdateStatus={updateStatus}
                craftType={craftType}
                setCraftType={setCraftType}
                tags={{ hookTags, setHookTags, weightTags, setWeightTags, categoryTags, setCategoryTags }}
                isEditing={isEditingDetails}
                setIsEditing={setIsEditingDetails}
                onDeleteClick={openDelete}
                actionButtons={
                    <Button onClick={openNote} leftSection={<IconPlus size={14} />}>
                        Quick Note
                    </Button>
                }
                subtext={
                    <Text c="dimmed" size="sm">Based on:
                        <Anchor fw={500} href={`/crafting/patterns/${pattern.id}`} ml={4}>{pattern.title}</Anchor>
                    </Text>
                }
                formAction={updateProject}
            />

            <Divider my="sm" />

            <form id="project-content-form" action={saveContent}>
                <input type="hidden" name="projectId" value={project.id} />

                <CollapsibleHeader title="Project Content" opened={contentOpened} onToggle={toggleContent}>
                    {!isEditingTabs && (
                        <Button variant="light" color="grape" leftSection={<IconSparkles size={16} />} onClick={openTailor}>
                            Tailor with AI
                        </Button>
                    )}
                    <Button variant="light" onClick={isEditingTabs ? stopEditingTabs : startEditingTabs}>
                        {isEditingTabs ? 'Cancel Editing' : 'Edit Text'}
                    </Button>
                    {isEditingTabs && <Button type="submit">Save Text</Button>}
                </CollapsibleHeader>

                <Collapse expanded={contentOpened} keepMounted>
                    <Tabs defaultValue="pattern" variant="outline" keepMounted styles={contentTabsStyles(isEditingTabs)}>
                        <Tabs.List>
                            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
                            <Tabs.Tab value="projectNotes">My Project Notes</Tabs.Tab>
                            <Tabs.Tab value="materials">Materials</Tabs.Tab>
                            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
                            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
                            <Tabs.Tab value="patternNotes">Pattern Notes</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="pattern" p={tabPadding}>
                            <Text size="sm" c="dimmed" fs="italic" mb="sm">This is your project&apos;s copy of the pattern. Mark it up!</Text>
                            {showTailoredNotice && isEditingTabs && (
                                <Alert color="grape" icon={<IconSparkles size={18} />} title="AI-tailored version loaded" mb="sm">
                                    Review the changes below. <strong>Save Text</strong> keeps them; <strong>Cancel Editing</strong> discards them and restores your saved copy.
                                </Alert>
                            )}
                            {!isEditingTabs && (
                                <Group mb="sm">
                                    <Switch checked={rainbowEnabled} onChange={(e) => setRainbowEnabled(e.currentTarget.checked)} label="Rainbow Steps" color="grape" />
                                    <Switch checked={rulerEnabled} onChange={(e) => setRulerEnabled(e.currentTarget.checked)} label="Reading Ruler" />
                                </Group>
                            )}

                            <ReadingRuler
                                enabled={rulerEnabled && !isEditingTabs}
                                initialY={project.ruler || 0}
                                onMove={(y) => saveRulerPosition(project.id, y)}
                            >
                                <PatternText editor={patternEditor} isEditing={isEditingTabs} rainbow={rainbowEnabled} fontSize="1.1rem" />
                            </ReadingRuler>
                        </Tabs.Panel>

                        <Tabs.Panel
                            value="projectNotes"
                            p={tabPadding}
                            bg={isEditingTabs ? 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))' : undefined}
                        >
                            <TabContent editor={notesEditor} isEditing={isEditingTabs} originalContent={project.notes} fallbackText="Click 'Edit Text' to start adding notes!" />
                        </Tabs.Panel>
                        <Tabs.Panel value="materials" p={tabPadding}><ReadOnlyHtml html={pattern.materials} fallback="No materials listed in master pattern." /></Tabs.Panel>
                        <Tabs.Panel value="abbreviations" p={tabPadding}><ReadOnlyHtml html={pattern.abbreviations} fallback="No abbreviations listed in master pattern." /></Tabs.Panel>
                        <Tabs.Panel value="sizing" p={tabPadding}><ReadOnlyHtml html={pattern.sizing} fallback="No sizing info in master pattern." /></Tabs.Panel>
                        <Tabs.Panel value="patternNotes" p={tabPadding}><ReadOnlyHtml html={pattern.notes} fallback="No master notes available." /></Tabs.Panel>
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

            <LinkedYarnSection projectId={project.id} linkedYarns={linkedYarns} availableStash={availableStash} />

            <QuickNoteModal projectId={project.id} opened={noteOpened} close={closeNote} />
            <TailorModal projectId={project.id} opened={tailorOpened} close={closeTailor} onTailored={loadTailored} />
            <ConfirmDeleteModal
                opened={deleteModalOpened}
                close={closeDelete}
                onConfirm={handleDelete}
                itemName={project.title}
                isDeleting={isDeleting}
            />

            {isEditingTabs ? (
                <FloatingEditActions formId="project-content-form" onCancel={stopEditingTabs} />
            ) : (
                <ScrollToTopButton />
            )}
        </Paper>
    );
}
