'use client';

import ItemGallery from '@/components/ItemGallery';
import { Badge, Group } from '@mantine/core';
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
      searchPlaceholder="Search 'colors:blue' or 'weight:worsted'"
      newItemText="Add Yarn"
      createModalTitle="Log New Yarn"
      deleteAction={deleteYarn}
      renderBadges={(item) => (
        <Group gap="xs" mt="xs">
          {item.weight && <Badge color="indigo" variant="light">{item.weight}</Badge>}
          {item.color_tags?.split(',').map((color: string) => (
            color.trim() && <Badge key={color} color="teal" variant="dot">{color.trim()}</Badge>
          ))}
        </Group>
      )}

      renderCreateForm={(closeModal) => (
        <YarnForm onSuccess={closeModal} />
      )}
    />
  );
}