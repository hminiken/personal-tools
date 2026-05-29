'use client';

import { Group, Badge } from '@mantine/core';
import ItemGallery from '@/components/ItemGallery';
import { projects } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

export type Project = InferSelectModel<typeof projects>;


export default function ProjectGallery({ initialProjects }: { initialProjects: Project[] }) {
  return (
    <ItemGallery
      title="My Active Projects"
      items={initialProjects}
      basePath="/crafting/projects"
      searchPlaceholder="Search projects..."
      cardDescription="Click to view project notes and progress."
      
      // Inject the Project-specific badges
      renderBadges={(project) => (
        <Group gap="xs" mb="md">
          {project.status && <Badge color="mustard" variant="light">{project.status}</Badge>}
          {project.yarnUsed && <Badge color="mustard" variant="outline">{project.yarnUsed}</Badge>}
          {project.hookSizes && <Badge color="rust" variant="outline">{project.hookSizes}</Badge>}
          {project.yarnWeights && <Badge color="olive" variant="outline">{project.yarnWeights}</Badge>}
        </Group>
      )}
      
      // We explicitly leave out `renderCreateForm` and `newItemText` 
      // so the gallery knows not to render a "New" button here!
    />
  );
}