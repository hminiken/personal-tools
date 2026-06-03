/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { Title, Group, Paper, Divider, Box, Button, TextInput, Stack, Select, TagsInput, Text, Badge, SimpleGrid, Card, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { IconArrowLeft, IconEdit, IconCheck, IconUnlink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

// Tiptap Imports
import { useEditor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { craftingEditorExtensions } from '@/utils/editorExtensions';

// Components & Actions (You will need to create these actions similar to your pattern actions!)
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import ImageGallery from '@/components/PatternImageGallery'; // Reusing your gallery!
import { updateYarn, deleteYarn, deleteYarnImage, setYarnCoverImage, uploadYarnImage, unlinkProjectFromYarn } from '../_actions/stash_actions';

// Interfaces
interface Yarn {
    id: number;
    title: string;
    brand?: string | null;
    weight?: string | null;
    fiber_tags?: string | null;
    color_tags?: string | null;
    notes?: string | null;
    coverImagePath?: string | null;
}

interface LinkedProject {
    id: number;
    title: string;
    status?: string | null;
    hooks?: string | null;
    categories?: string | null;
}

export default function YarnViewer({
    yarn,
    images,
    linkedProjects
}: {
    yarn: Yarn;
    images: unknown[];
    linkedProjects: LinkedProject[]
}) {
    const router = useRouter();

    // --- States ---
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle] = useState(yarn.title);
    const [brand, setBrand] = useState(yarn.brand || '');
    const [weight, setWeight] = useState(yarn.weight || '');
    const [fiberTags, setFiberTags] = useState<string[]>(yarn.fiber_tags ? yarn.fiber_tags.split(',') : []);
    const [colorTags, setColorTags] = useState<string[]>(yarn.color_tags ? yarn.color_tags.split(',') : []);

    // --- Deletion States ---
    const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Editor ---
    const notesEditor = useEditor({
        extensions: craftingEditorExtensions,
        content: yarn.notes || '',
        immediatelyRender: false,
        editable: false
    });
    useEffect(() => {
        if (notesEditor) {
            notesEditor.setEditable(isEditingNotes);
        }
    }, [isEditingNotes, notesEditor]);
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
                <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1 }}>
                        {isEditingDetails ? (
                            <Stack gap="sm" maw={500}>
                                <TextInput label="Yarn Name" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
                                <TextInput label="Brand" value={brand} onChange={(e) => setBrand(e.currentTarget.value)} />
                                <Select
                                    label="Weight"
                                    data={['Lace (0)', 'Super Fine (1)', 'Fine (2)', 'Light (3)', 'Medium/Worsted (4)', 'Bulky (5)', 'Super Bulky (6)', 'Jumbo (7)']}
                                    value={weight}
                                    onChange={(val) => setWeight(val || '')}
                                    clearable
                                />
                                <TagsInput label="Fibers" value={fiberTags} onChange={setFiberTags} clearable />
                                <TagsInput label="Colors" value={colorTags} onChange={setColorTags} clearable />

                                <Group mt="xs">
                                    <Button onClick={handleUpdateMetadata} loading={isSaving} color="olive.6" leftSection={<IconCheck size={16} />}>Save Details</Button>
                                    <Button variant="subtle" color="gray" onClick={() => setIsEditingDetails(false)} disabled={isSaving}>Cancel</Button>
                                </Group>
                            </Stack>
                        ) : (
                            <>
                                <Title order={1}>{yarn.title}</Title>
                                <Text size="lg" c="dimmed" mb="sm">{yarn.brand || 'Unknown Brand'} {yarn.weight ? `• ${yarn.weight}` : ''}</Text>

                                <Group gap="xs" mt="sm">
                                    {fiberTags.map(f => f.trim() && <Badge key={f} color="neutrals.4" variant="outline">{f}</Badge>)}
                                    {colorTags.map(c => c.trim() && <Badge key={c} color="rust.8" variant="dot">{c}</Badge>)}
                                </Group>
                            </>
                        )}
                    </Box>

                    {!isEditingDetails && (
                        <Group>
                            <Button variant="light" color='olive.1' onClick={() => setIsEditingDetails(true)} leftSection={<IconEdit size={16} />}>
                                Edit Details
                            </Button>
                            <Button variant="light" color="rust.2" onClick={openDelete}>Delete Yarn</Button>
                        </Group>
                    )}
                </Group>
            </Box>

            <Divider my="lg" />

            {/* --- NOTES SECTION (The single Tiptap box) --- */}
            <Box mb="xl">
                <Group justify="space-between" mb="sm">
                    <Title order={4}>Ideas & Notes</Title>
                    <Group>
                        <Button color='rust.7' variant="subtle" onClick={() => setIsEditingNotes(!isEditingNotes)}>
                            {isEditingNotes ? 'Cancel Editing' : 'Edit Notes'}
                        </Button>
                        {isEditingNotes && (
                            <Button color="olive.6" onClick={handleUpdateNotes} loading={isSaving}>Save Notes</Button>
                        )}
                    </Group>
                </Group>

                <RichTextEditor
                    editor={notesEditor}
                    style={{ border: isEditingNotes ? undefined : 'none' }}
                >
                    {isEditingNotes && (
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

            <Divider my="lg" />

            {/* --- LINKED PROJECTS SECTION --- */}
            <Box mb="xl">
                <Title order={4} mb="md">Projects Using This Yarn</Title>
                {linkedProjects.length === 0 ? (
                    <Text c="dimmed">This yarn isn't linked to any projects yet.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }}>
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
                                <Group wrap="nowrap" align="flex-start" justify="space-between">

                                    {/* COLUMN 1: Identity (Title & Status) */}
                                    <Box w="35%">
                                        <Text fw={600} lineClamp={2} size="sm">{project.title}</Text>

                                        <Badge
                                            mt="md"
                                            size="sm"
                                            color={project.status === 'Complete' || project.status === 'Completed' ? 'olive' : 'rust'}
                                        >
                                            {project.status || 'Planned'}
                                        </Badge>
                                    </Box>

                                    {/* COLUMN 2: Details (Categories & Hooks) */}
                                    <Box style={{ flex: 1, borderLeft: '1px solid var(--mantine-color-gray-2)' }} pl="sm">
                                        <Group gap={4}>
                                            {project.categories?.split(',').map((cat: string) => {
                                                const cleanCat = cat.trim();
                                                if (!cleanCat) return null;
                                                return (
                                                    <Badge key={cleanCat} size="xs" color="mustard" variant="light">
                                                        {cleanCat}
                                                    </Badge>
                                                );
                                            })}
                                        </Group>

                                        {project.hooks && (
                                            <Text size="xs" c="dimmed" mt={6}>
                                                <strong>Hooks:</strong> {project.hooks.split(',').map(h => h.trim()).join(', ')}
                                            </Text>
                                        )}
                                    </Box>

                                    {/* Unlink Button */}
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleUnlinkProject(e, project.id);
                                        }}
                                    >
                                        <IconUnlink size={16} />
                                    </ActionIcon>
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
                    uploadAction={uploadYarnImage}
                    deleteAction={deleteYarnImage}
                    coverImagePath={yarn.coverImagePath}
                    setCoverAction={setYarnCoverImage}
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