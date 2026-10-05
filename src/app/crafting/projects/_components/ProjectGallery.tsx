'use client';

import { TagBadges, StatusBadge, BadgeRow } from '@components/TagBadges';
import ItemGallery from '@/components/ItemGallery';
import type { Project } from '../[id]/types';
import { deleteProject } from '@app/crafting/projects/_actions/project_actions';

export default function ProjectGallery({ initialProjects }: { initialProjects: Project[] }) {
  return (
    <ItemGallery
      title="Projects"
      items={initialProjects}
      basePath="/crafting/projects"
      searchPlaceholder="Search projects..."
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