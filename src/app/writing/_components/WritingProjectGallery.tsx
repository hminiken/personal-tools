'use client';

import { Group, Badge, TextInput, Textarea, Button, Stack } from '@mantine/core';
import ItemGallery from '@/components/ItemGallery';
import { InferSelectModel } from 'drizzle-orm';
import { writingProjects } from '@/db/writing/schema';
import { createWritingProject, deleteWritingProject } from '../_actions/writing_actions';

export type WritingProject = InferSelectModel<typeof writingProjects> & {
  coverImagePath?: string;
};

export default function WritingProjectGallery({
  initialProjects,
}: {
  initialProjects: WritingProject[];
}) {
  return (
    <ItemGallery
      title="Writing Projects"
      items={initialProjects}
      basePath="/writing"
      searchPlaceholder="Search projects..."
      newItemText="New Project"
      createModalTitle="Start a Writing Project"
      deleteAction={deleteWritingProject}
      renderBadges={(project) => (
        <Group gap="xs" mb="md">
          {project.status && <Badge color="mustard" variant="light">{project.status}</Badge>}
          {project.categories && <Badge color="olive" variant="outline">{project.categories}</Badge>}
        </Group>
      )}
      renderCreateForm={(closeModal) => (
        <form action={createWritingProject}>
          <Stack>
            <TextInput
              label="Project Title"
              name="title"
              placeholder="e.g., The Saltwell Chronicles"
              required
            />
            <Textarea
              label="Description (optional)"
              name="description"
              placeholder="A one-line premise or working note"
              autosize
              minRows={2}
            />
            <TextInput
              label="Status (optional)"
              name="status"
              placeholder="e.g., Drafting"
            />
            <TextInput
              label="Categories (optional)"
              name="categories"
              placeholder="e.g., Novel, Fantasy"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </Group>
          </Stack>
        </form>
      )}
    />
  );
}
