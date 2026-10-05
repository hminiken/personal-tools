'use client';

import ItemGallery from '@/components/ItemGallery';
import { TagBadges, BadgeRow } from '@components/TagBadges';
import { deleteYarn } from '../_actions/stash_actions';
import YarnForm from './YarnForm';

// Define the shape of the data we expect from the server
interface StashClientProps {
  stashItems: any[]; // You can type this more strictly if you exported the YarnStash type!
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