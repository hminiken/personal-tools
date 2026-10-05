/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { Title, Group, Paper, Divider, Box, Button, TextInput, Stack, Select, TagsInput, Text, SimpleGrid, Card, ActionIcon, Image, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconCheck, IconUnlink } from '@tabler/icons-react';
import { TagBadges, StatusBadge } from '@components/TagBadges';
import { splitTags } from '@/utils/tags';
import { useRouter } from 'next/navigation';

// Tiptap Imports
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';

// Components & Actions (You will need to create these actions similar to your pattern actions!)
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import ImageGallery from '@/components/PatternImageGallery'; // Reusing your gallery!
import { updateYarn, deleteYarn, unlinkProjectFromYarn } from '../_actions/stash_actions';
import { deleteImage, setCoverImage, uploadImage } from '@app/crafting/actions/ImageActions';
import { useCraftingEditor } from '@hooks/useCraftingEditor';
import { CraftingEditorToolbar } from '@components/CraftingEditorToolbar';
import { YARN_WEIGHTS } from '@/utils/yarnWeights';

// Interfaces — field names match the yarns table (the page passes the row
// straight through). They used to be weight/fiber_tags/color_tags, which
// never matched, so the tags never showed AND every save (even just notes)
// wrote empty weight/fibers/colors back over the real values.
interface Yarn {
    id: number;
    title: string;
    brand?: string | null;
    weights?: string | null;
    fibers?: string | null;
    colors?: string | null;
    notes?: string | null;
    coverImage?: string | null;
}

interface LinkedProject {
    id: number;
    title: string;
    status?: string | null;
    hooks?: string | null;
    categories?: string | null;
}

interface YarnImage {
    id: number;
    createdAt: Date;
    patternId: number | null;
    projectId: number | null;
    yarnId: number | null;
    path: string;
}

export default function YarnViewer({
    yarn,
    images,
    linkedProjects
}: {
    yarn: Yarn;
    images: YarnImage[];
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

    // --- Handlers ---
    const handleUpdateMetadata = async () => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append('id', yarn.id.toString());
        formData.append('title', title);
        formData.append('brand', brand);
        formData.append('weight', weight);
        formData.append('fiberTags', fiberTags.join(','));
        formData.append('colorTags', colorTags.join(','));

        // Preserve existing notes during metadata update
        formData.append('notes', notesEditor?.getHTML() || '');

        await updateYarn(formData);
        router.refresh(); // Pull fresh server props so the editor re-syncs
        setIsSaving(false);
        setIsEditingDetails(false);
    };

    const handleUpdateNotes = async () => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append('id', yarn.id.toString());
        // Preserve existing metadata during notes update
        formData.append('title', title);
        formData.append('brand', brand);
        formData.append('weight', weight);
        formData.append('fiberTags', fiberTags.join(','));
        formData.append('colorTags', colorTags.join(','));

        formData.append('notes', notesEditor?.getHTML() || '');

        await updateYarn(formData);
        router.refresh(); // Pull fresh server props so the editor re-syncs
        setIsSaving(false);
        setIsEditingNotes(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        await deleteYarn(yarn.id);
        setIsDeleting(false);
        closeDelete();
        router.push('/crafting/stash');
    };

    const handleUnlinkProject = async (e: React.MouseEvent, projectId: number) => {
        e.preventDefault();
        if (confirm("Are you sure you want to unlink this project?")) {
            await unlinkProjectFromYarn(yarn.id, projectId); // Passes yarnId, then projectId
        }
    };
    return (
        <Paper pl={{ base: '0', sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }} radius="md">
            <Button component={Link} href="/crafting/stash" variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md" pl={0}>
                Back to Stash
            </Button>

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
                                        <Button variant="outline" onClick={() => setIsEditingDetails(false)} disabled={isSaving}>Cancel</Button>
                                        <Button onClick={handleUpdateMetadata} loading={isSaving} color="olive.7" leftSection={<IconCheck size={16} />}>Save Details</Button>
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
                        <Button color="olive.6" variant="default" onClick={() => setIsEditingDetails(true)} leftSection={<IconEdit size={16} />}>
                            Edit Details
                        </Button>
                    )}
                </Group>
            </Box>

            <Divider my="lg" />

            {/* --- NOTES SECTION (The single Tiptap box) --- */}
            <Box mb="xl">
                <Group justify="space-between" mb="sm">
                    <Title order={4}>Ideas & Notes</Title>
                    <Group gap="xs">
                        <Button variant="light" color="olive" onClick={() => setIsEditingNotes(!isEditingNotes)} disabled={isSaving}>
                            {isEditingNotes ? 'Cancel' : 'Edit Notes'}
                        </Button>
                        {isEditingNotes && (
                            <Button color="olive.7" onClick={handleUpdateNotes} loading={isSaving}>Save Notes</Button>
                        )}
                    </Group>
                </Group>

                <RichTextEditor
                    editor={notesEditor}
                    style={{ border: isEditingNotes ? undefined : 'none' }}
                >
                    {/* ✨ REPLACED THE ENTIRE TOOLBAR BLOCK WITH OUR SINGLE COMPONENT */}
                    {isEditingNotes && <CraftingEditorToolbar />}

                    <RichTextEditor.Content />
                </RichTextEditor>
            </Box>

            <Divider my="lg" />

            {/* --- LINKED PROJECTS SECTION --- */}
            <Box mb="xl">
                <Title order={4} mb="md">Projects Using This Yarn</Title>
                {linkedProjects.length === 0 ? (
                    <Text c="dimmed">This yarn isn't linked to any projects yet.</Text>
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
                    idFieldName="yarnId" // Crucial for making your reusable component save to the right table
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