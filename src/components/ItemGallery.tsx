/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { 
  SimpleGrid, Card, Text, Group, TextInput, Title, Button, Image, Modal, ActionIcon 
} from '@mantine/core';
import { IconSearch, IconPlus, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'; // Make sure this path is correct!

export interface BaseGalleryItem {
  id: number;
  title: string;
  coverImagePath?: string | null;
  sourceUrl?: string | null; 
  [key: string]: unknown;
}

interface ItemGalleryProps<T extends BaseGalleryItem> {
  title: string;
  items: T[]; 
  basePath: string; 
  searchPlaceholder?: string;
  newItemText?: string;
  createModalTitle?: string;
  
  // NEW: Pass your server action down to handle the database deletion
  deleteAction?: (id: number) => Promise<void>; 

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
  deleteAction,
  renderBadges,
  renderCreateForm
}: ItemGalleryProps<T>) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  // NEW: Deletion States
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Instantly filter the items
 // Advanced search filtering
  const filteredItems = items.filter((item) => {
    // If the search bar is empty, show everything
    if (!searchQuery.trim()) return true;

    // Split the search query by spaces to allow multiple filters at once
    // e.g., "categories:cardigan colors:blue" becomes ["categories:cardigan", "colors:blue"]
    const tokens = searchQuery.toLowerCase().split(/\s+/);

    // .every() means ALL search conditions must be true for the item to appear
    return tokens.every((token) => {
      // 1. Check if the user is using the "key:value" syntax
      if (token.includes(':')) {
        const [key, value] = token.split(':', 2);
        
        // Grab the data from the item (e.g., item['categories'])
        const itemValue = item[key]; 
        
        // If the item has this field, and it's a string, check if it includes our search value.
        // Because your DB stores comma-separated strings, .includes() works perfectly!
        if (itemValue && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value);
        }
        
        // If the key doesn't exist on the item, hide the item
        return false; 
      }

      // 2. Fallback: If there is no colon, just do a normal title search
      return item.title.toLowerCase().includes(token);
    });
  });

  // Execute the deletion
  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !deleteAction) return;
    
    setIsDeleting(true);
    try {
      await deleteAction(itemToDelete.id);
      setItemToDelete(null); // Close the modal on success
    } catch (error) {
      console.error("Failed to delete item", error);
      alert("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* HEADER & SEARCH BAR */}
      <Group justify="space-between" align="center" mb="xl" mt={'md'}>
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
              href={`${basePath}/${item.id}`} 
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
              <Card.Section style={{ position: 'relative' }}>
                <Image
                  src={item.coverImagePath || 'https://placehold.co/600x400?text=No+Cover'}
                  height={160}
                  alt={item.title}
                  fallbackSrc="https://placehold.co/600x400?text=No+Image"
                />
                
                {/* NEW: The Absolute Positioned Delete Button */}
                {deleteAction && (
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="md"
                    radius="xl"
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                    onClick={(e) => {
                      e.preventDefault(); // STOPS the <Link> from triggering
                      setItemToDelete(item); // Opens the modal
                    }}
                  >
                    <IconTrash size={16} stroke={1.5} />
                  </ActionIcon>
                )}
              </Card.Section>
              
              <Text fw={500} size="lg" mt="sm" mb="xs" c="dark">
                {item.title}
              </Text>
              
              {renderBadges && renderBadges(item)}

              <Text size="sm" c="dimmed" lineClamp={2}>
                {item.sourceUrl}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* DYNAMIC CREATE MODAL */}
      <Modal opened={createModalOpened} onClose={closeCreate} title={createModalTitle} centered>
        {renderCreateForm && renderCreateForm(closeCreate)}
      </Modal>

      {/* DYNAMIC DELETE MODAL */}
      <ConfirmDeleteModal 
        opened={!!itemToDelete}
        close={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.title || "this item"}
        isDeleting={isDeleting}
      />
    </div>
  );
}