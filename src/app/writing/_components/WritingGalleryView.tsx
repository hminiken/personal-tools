'use client';

import { useMemo, useState } from 'react';
import {
  Group, Badge, TextInput, Textarea, Button, Stack, Flex, Box, Text,
  Breadcrumbs, Anchor, Modal, Title, ActionIcon, Menu, Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome, IconDots, IconArrowRight, IconPhoto, IconPhotoUp, IconPhotoOff, IconSortAscending, IconMenu2,
} from '@tabler/icons-react';
import { useNavShell } from '@/components/NavShellContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ItemGallery from '@/components/ItemGallery';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { FloatingAddButton } from '@/components/FloatingAddButton';
import { UploadModal } from '@/components/UploadModal';
import UnsplashPicker from '@/components/UnsplashPicker';
import { WordCountDisplay, type WordCountSettings } from '@/components/WordCountDisplay';
import { promptWordGoal } from '@/utils/dialogs';
import { InferSelectModel } from 'drizzle-orm';
import { writingProjects } from '@/db/writing/schema';
import {
  createWritingProject, deleteWritingProject, createFolder, renameFolder,
  deleteFolder, moveProjectToFolder, moveFolderToFolder,
  setFolderCover, setFolderColor, setProjectCover, uploadFolderCover, uploadProjectCover,
  setProjectWordGoal,
} from '../_actions/writing_actions';
import type { FolderRow, Breadcrumb, ProjectRow } from '../_lib/loadGalleryLevel';
import { FolderCard } from './FolderCard';
import { MoveToFolderModal } from './MoveToFolderModal';
import { FolderColorModal } from './FolderColorModal';

// A cover image can be set on either a folder or a project; the upload action
// and the id field name differ by kind.
type CoverTarget = { kind: 'folder' | 'project'; id: number };

export type WritingProject = InferSelectModel<typeof writingProjects> & {
  coverImagePath?: string;
  wordCount?: number;
};

type MoveTarget =
  | { kind: 'project'; id: number; name: string; currentParentId: number | null }
  | { kind: 'folder'; id: number; name: string; currentParentId: number | null };

export default function WritingGalleryView({
  folders,
  projects,
  allFolders,
  allProjects,
  breadcrumbs,
  childCounts,
  currentFolderId,
  wcSettings,
}: {
  folders: FolderRow[];
  projects: WritingProject[];
  allFolders: FolderRow[];
  allProjects: ProjectRow[];
  breadcrumbs: Breadcrumb[];
  childCounts: Record<number, number>;
  currentFolderId: number | null;
  wcSettings: WordCountSettings;
}) {
  const router = useRouter();
  const { toggle: toggleNavShell } = useNavShell();
  const [newFolderOpened, { open: openNewFolder, close: closeNewFolder }] = useDisclosure(false);
  const [renameTarget, setRenameTarget] = useState<FolderRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FolderRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  // Cover/color editing targets (shared across folders + projects).
  const [unsplashTarget, setUnsplashTarget] = useState<CoverTarget | null>(null);
  const [uploadTarget, setUploadTarget] = useState<CoverTarget | null>(null);
  const [colorTarget, setColorTarget] = useState<FolderRow | null>(null);
  const [folderSort, setFolderSort] = useState<string>('name-asc');

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      if (folderSort === 'name-asc') return a.name.localeCompare(b.name);
      if (folderSort === 'name-desc') return b.name.localeCompare(a.name);
      if (folderSort === 'created-desc') return b.createdAt.getTime() - a.createdAt.getTime();
      if (folderSort === 'created-asc') return a.createdAt.getTime() - b.createdAt.getTime();
      return 0;
    });
  }, [folders, folderSort]);

  // For a folder move, the destination can't be the folder itself or any of its
  // descendants. Precompute descendants from the flat folder list.
  const descendantIds = useMemo(() => {
    if (moveTarget?.kind !== 'folder') return [];
    const ids: number[] = [moveTarget.id];
    let frontier = [moveTarget.id];
    while (frontier.length) {
      const next = allFolders.filter((f) => f.parentFolderId != null && frontier.includes(f.parentFolderId)).map((f) => f.id);
      ids.push(...next);
      frontier = next;
    }
    return ids;
  }, [moveTarget, allFolders]);

  const handleDeleteFolder = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFolder(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (folderId: number | null) => {
    if (!moveTarget) return;
    if (moveTarget.kind === 'project') await moveProjectToFolder(moveTarget.id, folderId);
    else await moveFolderToFolder(moveTarget.id, folderId);
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (name) await renameFolder(renameTarget.id, name);
    setRenameTarget(null);
  };

  const applyUnsplashCover = async (fullUrl: string) => {
    if (!unsplashTarget) return;
    if (unsplashTarget.kind === 'folder') await setFolderCover(unsplashTarget.id, fullUrl);
    else await setProjectCover(unsplashTarget.id, fullUrl);
    router.refresh();
  };

  const removeCover = async (t: CoverTarget) => {
    if (t.kind === 'folder') await setFolderCover(t.id, null);
    else await setProjectCover(t.id, null);
    router.refresh();
  };

  const applyColor = async (color: string | null) => {
    if (!colorTarget) return;
    await setFolderColor(colorTarget.id, color);
    router.refresh();
  };

  return (
    <Box mt={'10px'}>
      {/* Breadcrumbs (top level shows just Home) */}
      <Group gap="xs" mb="lg" wrap="nowrap">
        {currentFolderId === null && (
          <ActionIcon variant="subtle" color="gray" onClick={toggleNavShell} aria-label="Toggle menu">
            <IconMenu2 size={18} stroke={1.5} />
          </ActionIcon>
        )}
        <Breadcrumbs mb={0}>
        <Anchor component={Link} href="/writing" c="dimmed">
          <Group gap={4} wrap="nowrap"><IconHome size={16} /> Writing</Group>
        </Anchor>
        {breadcrumbs.map((b, i) =>
          i === breadcrumbs.length - 1 ? (
            <Text key={b.id} fw={600}>{b.name}</Text>
          ) : (
            <Anchor key={b.id} component={Link} href={`/writing/folder/${b.id}`} c="dimmed">{b.name}</Anchor>
          )
        )}
      </Breadcrumbs>
      </Group>

      {/* New Folder button, stacked above ItemGallery's New Project button */}
      <FloatingAddButton onClick={openNewFolder} text="New Folder" color="dark.4" botOffset={56} />

      {/* Folders strip */}
      {folders.length > 0 && (
        <Box mb="xl">
          <Group justify="space-between" mb="sm">
            <Title order={5} c="dimmed">Folders</Title>
            <Select
              leftSection={<IconSortAscending size={14} />}
              value={folderSort}
              onChange={(v) => setFolderSort(v ?? 'name-asc')}
              data={[
                { value: 'name-asc', label: 'A → Z' },
                { value: 'name-desc', label: 'Z → A' },
                { value: 'created-desc', label: 'Newest first' },
                { value: 'created-asc', label: 'Oldest first' },
              ]}
              size="xs"
              w={150}
            />
          </Group>
          <Flex wrap="wrap" gap="md">
            {sortedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                childCount={childCounts[folder.id] ?? 0}
                onRename={() => { setRenameTarget(folder); setRenameValue(folder.name); }}
                onMove={() => setMoveTarget({ kind: 'folder', id: folder.id, name: folder.name, currentParentId: folder.parentFolderId })}
                onDelete={() => setDeleteTarget(folder)}
                onCoverUnsplash={() => setUnsplashTarget({ kind: 'folder', id: folder.id })}
                onCoverUpload={() => setUploadTarget({ kind: 'folder', id: folder.id })}
                onRemoveCover={() => removeCover({ kind: 'folder', id: folder.id })}
                onSetColor={() => setColorTarget(folder)}
              />
            ))}
          </Flex>
        </Box>
      )}

      {/* Projects gallery (search / sort / filter preserved) */}
      <ItemGallery
        title="Writing Projects"
        items={projects}
        basePath="/writing"
        searchPlaceholder="Search projects..."
        newItemText="New Project"
        newItemColor="dark"
        createModalTitle="Start a Writing Project"
        deleteAction={deleteWritingProject}
        renderBadges={(project: WritingProject) => (
          <Stack gap={4} mb="md">
            <Group gap="xs">
              {project.status && <Badge color="dark" variant="light">{project.status}</Badge>}
              {project.categories && <Badge color="gray" variant="outline">{project.categories}</Badge>}
            </Group>
            <WordCountDisplay count={project.wordCount ?? 0} goal={project.wordCountGoal} mode={wcSettings.mode} />
          </Stack>
        )}
        renderItemMenu={(project: WritingProject) => (
          <Menu shadow="md" position="bottom-start" withinPortal>
            <Menu.Target>
              <ActionIcon variant="filled" color="dark.6" size="md" radius="xl">
                <IconDots size={16} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconArrowRight size={16} />}
                onClick={() => setMoveTarget({ kind: 'project', id: project.id, name: project.title, currentParentId: project.folderId ?? null })}
              >
                Move to…
              </Menu.Item>
              <Menu.Item
                onClick={async () => {
                  const goal = await promptWordGoal({ title: 'Word count goal', initialValue: project.wordCountGoal });
                  if (goal === undefined) return;
                  setProjectWordGoal(project.id, goal);
                }}
              >
                {project.wordCountGoal ? 'Update word goal…' : 'Set word goal…'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Cover image</Menu.Label>
              <Menu.Item leftSection={<IconPhoto size={16} />} onClick={() => setUnsplashTarget({ kind: 'project', id: project.id })}>
                From Unsplash
              </Menu.Item>
              <Menu.Item leftSection={<IconPhotoUp size={16} />} onClick={() => setUploadTarget({ kind: 'project', id: project.id })}>
                Upload / paste
              </Menu.Item>
              {project.coverImage && (
                <Menu.Item leftSection={<IconPhotoOff size={16} />} onClick={() => removeCover({ kind: 'project', id: project.id })}>
                  Remove cover
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
        renderCreateForm={(closeModal: () => void) => (
          <form action={createWritingProject}>
            <Stack>
              {/* New projects land in the folder currently being viewed. */}
              {currentFolderId != null && <input type="hidden" name="folderId" value={currentFolderId} />}
              <TextInput label="Project Title" name="title" placeholder="e.g., The Saltwell Chronicles" required />
              <Textarea label="Description (optional)" name="description" placeholder="A one-line premise or working note" autosize minRows={2} />
              <TextInput label="Status (optional)" name="status" placeholder="e.g., Drafting" />
              <TextInput label="Categories (optional)" name="categories" placeholder="e.g., Novel, Fantasy" />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Create Project</Button>
              </Group>
            </Stack>
          </form>
        )}
      />

      {/* New Folder modal */}
      <Modal opened={newFolderOpened} onClose={closeNewFolder} title="New Folder" centered>
        <form action={async (fd) => { await createFolder(fd); closeNewFolder(); }}>
          <Stack>
            {currentFolderId != null && <input type="hidden" name="parentFolderId" value={currentFolderId} />}
            <TextInput label="Folder Name" name="name" placeholder="e.g., Short Stories" required data-autofocus />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeNewFolder}>Cancel</Button>
              <Button type="submit">Create Folder</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Rename folder modal */}
      <Modal opened={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Folder" centered>
        <Stack>
          <TextInput
            label="Folder Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
            data-autofocus
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={submitRename}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Shared move picker (projects + folders) */}
      <MoveToFolderModal
        opened={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        allFolders={allFolders}
        allProjects={allProjects}
        excludeIds={descendantIds}
        currentParentId={moveTarget?.currentParentId ?? null}
        onPick={handleMove}
        itemName={moveTarget?.name ?? ''}
      />

      {/* Folder delete confirmation */}
      <ConfirmDeleteModal
        opened={!!deleteTarget}
        close={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFolder}
        itemName={deleteTarget ? `${deleteTarget.name} (its contents move up one level)` : 'this folder'}
        isDeleting={isDeleting}
      />

      {/* Cover image — Unsplash (folders + projects) */}
      <UnsplashPicker
        opened={!!unsplashTarget}
        onClose={() => setUnsplashTarget(null)}
        onSelect={(photo) => applyUnsplashCover(photo.fullUrl)}
      />

      {/* Cover image — upload / paste (folders + projects) */}
      {uploadTarget && (
        <UploadModal
          opened={!!uploadTarget}
          close={() => setUploadTarget(null)}
          targetId={uploadTarget.id}
          idFieldName={uploadTarget.kind === 'folder' ? 'folderId' : 'projectId'}
          uploadAction={uploadTarget.kind === 'folder' ? uploadFolderCover : uploadProjectCover}
          revalidateUrl="/writing"
          showLibrary={false}
          onUploaded={() => router.refresh()}
        />
      )}

      {/* Folder color */}
      <FolderColorModal
        opened={!!colorTarget}
        onClose={() => setColorTarget(null)}
        folderName={colorTarget?.name ?? ''}
        value={colorTarget?.color ?? null}
        onPick={applyColor}
      />
    </Box>
  );
}
