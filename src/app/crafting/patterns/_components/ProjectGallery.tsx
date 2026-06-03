'use client';

import { Group, Badge } from '@mantine/core';
import ItemGallery from '@/components/ItemGallery';
import { projects } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';
import { deleteProject } from '@app/crafting/projects/_actions/project_actions';

export type Project = InferSelectModel<typeof projects>;

export default function ProjectGallery({ initialProjects }: { initialProjects: Project[] }) {
  return (
    <ItemGallery
      title="Projects"
      items={initialProjects}
      basePath="/crafting/projects"
      searchPlaceholder="Search projects..."
      // cardDescription="Click to view project notes and progress."
      deleteAction={deleteProject}
      
      // Inject the Project-specific badges
      renderBadges={(project) => (
        <Group gap="xs" mb="md">
          {project.status && <Badge color="mustard" variant="light">{project.status}</Badge>}
          {project.yarnUsed && <Badge color="mustard" variant="outline">{project.yarnUsed}</Badge>}
          {project.hookSizes && <Badge color="rust" variant="outline">{project.hookSizes}</Badge>}
          {project.yarnWeights && <Badge color="olive" variant="outline">{project.yarnWeights}</Badge>}
          {project.categories && <Badge color="olive" variant="outline">{project.categories}</Badge>}
        </Group>
      )}
      
    />
  );
}