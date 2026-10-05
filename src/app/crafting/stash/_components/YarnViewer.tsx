'use client';

import { useState } from 'react';
import { Title, Group, Paper, Divider, Box, Button, TextInput, Stack, Select, TagsInput, Text, SimpleGrid, Card, ActionIcon, Image, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconEdit, IconCheck, IconUnlink } from '@tabler/icons-react';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

import { updateYarn, deleteYarn, unlinkProjectFromYarn } from '../_actions/stash_actions';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import type { yarnStash, PatternImage } from '@app/crafting/projects/[id]/types';
import ImageGallery from '@/components/PatternImageGallery';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { BackButton } from '@components/BackButton';
import { CraftingEditorToolbar } from '@components/CraftingEditorToolbar';
import { TagBadges, StatusBadge } from '@components/TagBadges';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { splitTags } from '@/utils/tags';
import { YARN_WEIGHTS } from '@/utils/yarnWeights';

interface LinkedProject {
    id: number;
    title: string;
    status: string | null;
    hooks: string | null;
    categories: string | null;
}

export default function YarnViewer({
    yarn,
    images,
    linkedProjects
}: {
    yarn: yarnStash;
    images: PatternImage[];
    linkedProjects: LinkedProject[]
}) {
    const router = useRouter();

    // --- States ---
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle] = useState(yarn.title);
    const [brand, setBrand] = useState(yarn.brand || '');
    const [weight, setWeight] = useState(yarn.weights || '');
    const [fiberTags, setFiberTags] = useState<string[]>(splitTags(yarn.fibers));
    const [colorTags, setColorTags] = useState<string[]>(splitTags(yarn.colors));

    // --- Deletion States ---
    const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const notesEditor = useCraftingEditor(yarn.notes, isEditingNotes);

    // Throw away unsaved detail edits. Otherwise they'd linger in state and
    // get written by the next notes save.
    const cancelDetails = () => {
        setTitle(yarn.title);
        setBrand(yarn.brand || '');
        setWeight(yarn.weights || '');
        setFiberTags(splitTags(yarn.fibers));
        setColorTags(splitTags(yarn.colors));
        setIsEditingDetails(false);
    };

    // updateYarn writes every field, so each save sends the details and the
    // notes together (whichever one wasn't being edited is sent unchanged).
    const saveYarn = async (onSaved: () => void) => {
        const formData = new FormData();
        formData.append('id', yarn.id.toString());
        formData.append('title', title);
        formData.append('brand', brand);
        formData.append('weight', weight);
        formData.append('fiberTags', fiberTags.join(','));
        formData.append('colorTags', colorTags.join(','));
        formData.append('notes', notesEditor?.getHTML() || '');

        setIsSaving(true);
        try {
            await updateYarn(formData);
            router.refresh(); // Pull fresh server props so the editor re-syncs
            onSaved();
        } catch {
            alert('Could not save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        await deleteYarn(yarn.id);
        setIsDeleting(false);
        closeDelete();
        router.push('/crafting/stash');
    };

    const handleUnlinkProject = async (e: React.MouseEvent, projectId: number) => {
        e.preventDefault(); // the card is a link
        if (confirm('Unlink this project from the yarn?')) {
            await unlinkProjectFromYarn(yarn.id, projectId);
        }
    };

    return (
        <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
            <BackButton href="/crafting/stash" label="Back to Stash" />

            {/* --- METADATA SECTION --- */}
            <Box mb="xl">
                <Group justify="space-between" align="flex-start" gap="sm">
                    <Box style={{ flex: '1 1 260px', minWidth: 0 }}>
                        {isEditingDetails ? (
                            <Stack gap="sm" maw={{ base: '100%', sm: 500 }}>
                                <TextInput label="Yarn Name" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
                                <TextInput label="Brand" value={brand} onChange={(e) => setBrand(e.currentTarget.value)} />
                                <Select
                                    label="Weight"
                                    data={YARN_WEIGHTS}
                                    value={weight}
                                    onChange={(val) => setWeight(val || '')}
                                    clearable
                                />
                                <TagsInput label="Fibers" value={fiberTags} onChange={setFiberTags} clearable />
                                <TagsInput label="Colors" value={colorTags} onChange={setColorTags} clearable />

                                <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                                    <Button color="rust.9" variant="subtle" onClick={openDelete} disabled={isSaving}>Delete Yarn</Button>
                                    <Group>
                                        <Button variant="outline" onClick={cancelDetails} disabled={isSaving}>Cancel</Button>
                                        <Button onClick={() => saveYarn(() => setIsEditingDetails(false))} loading={isSaving} leftSection={<IconCheck size={16} />}>Save Details</Button>
                                    </Group>
                                </Group>
                            </Stack>
                        ) : (
                            <Group align="flex-start" wrap="nowrap" gap="md">
                                {yarn.coverImage && (
                                    <Image src={yarn.coverImage} alt={yarn.title} w={88} h={88} radius="md" fit="cover" style={{ flexShrink: 0 }} />
                                )}
                                <Box style={{ minWidth: 0 }}>
                                    <Title order={2} style={{ overflowWrap: 'anywhere' }}>{yarn.title}</Title>
                                    <Text c="dimmed" mb="xs">{yarn.brand || 'Unknown brand'}</Text>
                                    <Group gap={6}>
                                        <TagBadges value={yarn.weights} color="mustard" />
                                        <TagBadges value={fiberTags.join(',')} color="rust" />
                                        <TagBadges value={colorTags.join(',')} color="olive" variant="outline" />
                                    </Group>
                                </Box>
                            </Group>
                        )}
                    </Box>

                    {!isEditingDetails && (
                        <Button variant="default" onClick={() => setIsEditingDetails(true)} leftSection={<IconEdit size={16} />}>
                            Edit Details
                        </Button>
                    )}
                </Group>
            </Box>

            <Divider my="lg" />

            {/* --- NOTES --- */}
            <Box mb="xl">
                <Group justify="space-between" mb="sm">
                    <Title order={4}>Ideas & Notes</Title>
                    <Group gap="xs">
                        <Button variant="light" onClick={() => setIsEditingNotes(!isEditingNotes)} disabled={isSaving}>
                            {isEditingNotes ? 'Cancel' : 'Edit Notes'}
                        </Button>
                        {isEditingNotes && (
                            <Button onClick={() => saveYarn(() => setIsEditingNotes(false))} loading={isSaving}>Save Notes</Button>
                        )}
                    </Group>
                </Group>

                <RichTextEditor
                    editor={notesEditor}
                    style={{ border: isEditingNotes ? undefined : 'none' }}
                >
                    {isEditingNotes && <CraftingEditorToolbar />}

                    <RichTextEditor.Content />
                </RichTextEditor>
            </Box>

            <Divider my="lg" />

            {/* --- LINKED PROJECTS SECTION --- */}
            <Box mb="xl">
                <Title order={4} mb="md">Projects Using This Yarn</Title>
                {linkedProjects.length === 0 ? (
                    <Text c="dimmed">This yarn isn&apos;t linked to any projects yet.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                        {linkedProjects.map((project) => (

                            <Card
                                key={project.id}
                                withBorder
                                shadow="sm"
                                radius="md"
                                component={Link}
                                href={`/crafting/projects/${project.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Group wrap="nowrap" align="flex-start" justify="space-between" gap="sm">
                                    <Box style={{ minWidth: 0 }}>
                                        <Text fw={600} lineClamp={2}>{project.title}</Text>
                                        <Group gap={6} mt={6}>
                                            <StatusBadge status={project.status} />
                                            <TagBadges value={project.hooks} color="mustard" />
                                            <TagBadges value={project.categories} color="olive" />
                                        </Group>
                                    </Box>
                                    <Tooltip label="Unlink this project" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="rust.7"
                                            aria-label="Unlink this project"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleUnlinkProject(e, project.id);
                                            }}
                                        >
                                            <IconUnlink size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Card>

                        ))}
                    </SimpleGrid>
                )}
            </Box>

            <Divider my="lg" />

            {/* --- IMAGE GALLERY --- */}
            <Box mt="xl">
                <ImageGallery
                    images={images}
                    title="Yarn Photos"
                    targetId={yarn.id}
                    idFieldName="yarnId"
                    revalidateUrl={`/crafting/stash/${yarn.id}`}
                    uploadAction={uploadImage}
                    deleteAction={deleteImage}
                    coverImagePath={yarn.coverImage}
                    setCoverAction={(id, path) => setCoverImage(id, path, 'yarn')}
                />
            </Box>

            {/* --- DELETE CONFIRMATION --- */}
            <ConfirmDeleteModal
                opened={deleteModalOpened}
                close={closeDelete}
                onConfirm={handleDelete}
                itemName={yarn.title}
                isDeleting={isDeleting}
            />
        </Paper>
    );
}