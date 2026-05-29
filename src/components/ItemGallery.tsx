'use client';

import { useState } from 'react';
import { 
  SimpleGrid, Card, Text, Group, TextInput, Title, Button, Image, Modal 
} from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';

// 1. Define the absolute minimum fields every gallery item must have
export interface BaseGalleryItem {
  id: number;
  title: string;
  coverImagePath?: string | null;
}

// 2. Define the props for our reusable component
interface ItemGalleryProps<T extends BaseGalleryItem> {
  title: string;
  items: T[]; // Accepts an array of ANY type, as long as it has id, title, and coverImagePath
  basePath: string; // e.g., '/crafting/patterns'
  searchPlaceholder?: string;
  newItemText?: string;
  createModalTitle?: string;
  cardDescription?: string;
  
  // Render Props: These allow the parent to inject custom UI for specific items
  renderBadges?: (item: T) => React.ReactNode;
  renderCreateForm?: (closeModal: () => void) => React.ReactNode;
}

export default function ItemGallery<T extends BaseGalleryItem>({
  title,
  items,
  basePath,
  searchPlaceholder = "Search...",
  newItemText = "New",
  createModalTitle = "Create New",
  cardDescription = "Click to view details.",
  renderBadges,
  renderCreateForm
}: ItemGalleryProps<T>) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  // Instantly filter the items
  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* HEADER & SEARCH BAR */}
      <Group justify="space-between" align="center" mb="xl">
        <Title order={2}>{title}</Title>
        <Group>
          <TextInput
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            w={{ base: '100%', sm: 300 }}
          />
          {renderCreateForm && (
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              {newItemText}
            </Button>
          )}
        </Group>
      </Group>

      {/* THE GALLERY GRID */}
      {filteredItems.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          No items found matching "{searchQuery}".
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder 
              component={Link} 
              href={`${basePath}/${item.id}`} // Dynamically links to /patterns/1 or /projects/1
              style={{ textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
              }}
            >
              <Card.Section>
                <Image
                  src={item.coverImagePath || 'https://placehold.co/600x400?text=No+Cover'}
                  height={160}
                  alt={item.title}
                  fallbackSrc="https://placehold.co/600x400?text=No+Image"
                />
              </Card.Section>
              
              <Text fw={500} size="lg" mt="sm" mb="xs" c="dark">
                {item.title}
              </Text>
              
              {/* Call the custom badge rendering function if it was provided */}
              {renderBadges && renderBadges(item)}

              <Text size="sm" c="dimmed" lineClamp={2}>
                {cardDescription}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* DYNAMIC MODAL */}
      <Modal opened={createModalOpened} onClose={closeCreate} title={createModalTitle} centered>
        {/* We pass 'closeCreate' down so the custom form can close the modal if needed */}
        {renderCreateForm && renderCreateForm(closeCreate)}
      </Modal>
    </div>
  );
}