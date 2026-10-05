'use client';

import ItemGallery from '@/components/ItemGallery';
import { TagBadges, BadgeRow } from '@components/TagBadges';
import { deleteYarn } from '../_actions/stash_actions';
import YarnForm from './YarnForm';
import type { yarnStash } from '@app/crafting/projects/[id]/types';

interface StashClientProps {
  stashItems: yarnStash[];
}

export default function StashClient({ stashItems }: StashClientProps) {
  return (
    <ItemGallery
      title="Yarn Stash"
      items={stashItems}
      basePath="/crafting/stash"
      searchPlaceholder="Search yarn..."
      newItemText="Add Yarn"
      createModalTitle="Log New Yarn"
      categoryField="fibers"
      groupLabel="Group by fiber"
      deleteAction={deleteYarn}
      renderBadges={(item) => (
        <BadgeRow>
          <TagBadges value={item.weights} color="mustard" />
          <TagBadges value={item.fibers} color="rust" />
          <TagBadges value={item.colors} color="olive" variant="outline" />
        </BadgeRow>
      )}

      renderCreateForm={(closeModal) => (
        <YarnForm onSuccess={closeModal} />
      )}
    />
  );
}