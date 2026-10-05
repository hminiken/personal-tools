'use client';

import { TagBadges, StatusBadge, BadgeRow } from '@components/TagBadges';
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
        <BadgeRow>
          <StatusBadge status={project.status} />
          <TagBadges value={project.yarn} color="neutrals.7" variant="outline" />
          <TagBadges value={project.hooks} color="mustard" />
          <TagBadges value={project.weights} color="rust" />
        </BadgeRow>
      )}
      
    />
  );
}