/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useMemo } from 'react';
import {
  SimpleGrid, Card, Text, Group, TextInput, Title, Button, Image, Modal, ActionIcon, Select, Switch, Accordion, Box, List, CloseButton, Collapse, Paper
} from '@mantine/core';
import { IconSearch, IconPlus, IconTrash, IconSortAscending, IconInfoCircle } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import GalleryGrid from './GalleryGrid';
import SearchHelpBox from './SearchHelpBox';
import { GalleryControls } from './GalleryControls';
import { FloatingAddButton } from './FloatingAddButton';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
export interface BaseGalleryItem {
  id: number;
  title: string;
  coverImagePath?: string | null;
  sourceUrl?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  [key: string]: any;
}

interface ItemGalleryProps<T extends BaseGalleryItem> {
  title: string;
  items: T[];
  basePath: string;
  searchPlaceholder?: string;
  newItemText?: string;
  createModalTitle?: string;
  categoryField?: string;
  deleteAction?: (id: number) => Promise<void>;
  renderBadges?: (item: T) => React.ReactNode;
  renderCreateForm?: (closeModal: () => void) => React.ReactNode;
}

// ==========================================
// 2. SHARED STYLES & HELPERS
// ==========================================
const universalInputStyles = {
  input: {
    // Light text in dark mode, dark text in light mode
    color: 'light-dark(var(--mantine-color-neutrals-9), var(--mantine-color-dark-0))',
    
    // Subtle borders that match the current theme
    borderColor: 'light-dark(var(--mantine-color-neutrals-2), var(--mantine-color-dark-4))',
    
    // Ensure the input background matches the theme
    backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))',
    
    '&:focusWithin': { 
      borderColor: 'var(--mantine-color-neutrals-6)' 
    },
    '&::placeholder': { 
      color: 'var(--mantine-color-neutrals-5)', 
      opacity: 1 
    },
  },
};

// Extracted the complex Regex logic out of the component to keep the file clean
function applyAdvancedSearch<T extends BaseGalleryItem>(items: T[], searchQuery: string): T[] {
  if (!searchQuery.trim()) return items;
  const tokens = searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  
  return items.filter((item) => {
    return tokens.every((token) => {
      const cleanToken = token.replace(/(^"|"$)/g, '');
      const match = cleanToken.match(/^(\w+)(>=|<=|>|<|=|:)(.+)$/);

      if (match) {
        const [, field, operator, searchVal] = match;
        const itemVal = item[field];
        if (itemVal == null) return false;

        const isDate = (val: any) => isNaN(Number(val)) && !isNaN(Date.parse(val));
        const numSearchVal = isDate(searchVal) ? new Date(searchVal).getTime() : Number(searchVal);
        const numItemVal = isDate(itemVal) ? new Date(itemVal as string).getTime() : Number(itemVal);

        switch (operator) {
          case ':': return String(itemVal).toLowerCase().includes(String(searchVal).toLowerCase());
          case '=': return String(itemVal).toLowerCase() === String(searchVal).toLowerCase();
          case '>': return !isNaN(numItemVal) && numItemVal > numSearchVal;
          case '<': return !isNaN(numItemVal) && numItemVal < numSearchVal;
          case '>=': return !isNaN(numItemVal) && numItemVal >= numSearchVal;
          case '<=': return !isNaN(numItemVal) && numItemVal <= numSearchVal;
          default: return false;
        }
      }
      return String(item.title || '').toLowerCase().includes(cleanToken.toLowerCase());
    });
  });
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function ItemGallery<T extends BaseGalleryItem>({
  title, items, basePath, searchPlaceholder = "Search...", newItemText = "New",
  createModalTitle = "Create New", categoryField = 'categories', deleteAction,
  renderBadges, renderCreateForm
}: ItemGalleryProps<T>) {

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOption, setSortOption] = useState<string | null>('title-asc');
  const [isGrouped, setIsGrouped] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  // Derived Data (Memoized)
  const filteredItems = useMemo(() => applyAdvancedSearch(items, searchQuery), [items, searchQuery]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortOption === 'title-asc') return a.title.localeCompare(b.title);
      if (sortOption === 'title-desc') return b.title.localeCompare(a.title);
      if (sortOption === 'created-desc') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOption === 'updated-desc') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [filteredItems, sortOption]);

  const groupedItems = useMemo(() => {
    if (!isGrouped) return {};
    const groups: Record<string, T[]> = {};
    const uncategorized: T[] = [];

    sortedItems.forEach(item => {
      const catString = item[categoryField];
      if (typeof catString === 'string' && catString.trim()) {
        catString.split(',').map(c => c.trim()).filter(Boolean).forEach(cat => {
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
        });
      } else {
        uncategorized.push(item);
      }
    });

    if (uncategorized.length > 0) groups['Uncategorized'] = uncategorized;
    return Object.keys(groups).sort().reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {} as Record<string, T[]>);
  }, [sortedItems, isGrouped, categoryField]);

  const availableFields = useMemo(() => {
    if (!items || items.length === 0) return [];
    return Object.entries(items[0])
      .map(([key, value]) => {
        const rawType = typeof value as 'string' | 'number' | 'boolean' | 'object' | 'undefined' | 'function' | 'symbol' | 'bigint';
        const type = rawType === 'string' && !isNaN(Date.parse(value as string)) ? 'date' : rawType;
        return { key, type };
      })
      .filter(f => ['string', 'number', 'boolean', 'date'].includes(f.type));
  }, [items]);

  // Actions
  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !deleteAction) return;
    setIsDeleting(true);
    try {
      await deleteAction(itemToDelete.id);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete item", error);
      alert("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* HEADER */}
      <Group  mb="md" mt="0">
        {/* <Title order={2}>{title}</Title> */}
        {/* {renderCreateForm && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate} bg="olive.5">
            {newItemText}
          </Button>
        )} */}
      </Group>
      {renderCreateForm && (
        <FloatingAddButton onClick={openCreate} text={newItemText} />
      )}

      {/* CONTROLS BAR */}
        <GalleryControls 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        isGrouped={isGrouped}
        setIsGrouped={setIsGrouped}
        sortOption={sortOption}
        setSortOption={setSortOption}
        setShowSearchHelp={setShowSearchHelp}
        universalInputStyles={universalInputStyles}
      />

      <SearchHelpBox opened={showSearchHelp} onClose={() => setShowSearchHelp(false)} availableFields={availableFields} />

      {/* GALLERY GRID */}
      <Box mt="xl">
        {sortedItems.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">No items found matching "{searchQuery}".</Text>
        ) : isGrouped ? (
          <Accordion multiple variant="separated">
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <Accordion.Item key={groupName} value={groupName}>
                <Accordion.Control><Text fw={600}>{groupName} ({groupItems.length})</Text></Accordion.Control>
                <Accordion.Panel>
                  <GalleryGrid items={groupItems} basePath={basePath} deleteAction={deleteAction} setItemToDelete={setItemToDelete} renderBadges={renderBadges} />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <GalleryGrid items={sortedItems} basePath={basePath} deleteAction={deleteAction} setItemToDelete={setItemToDelete} renderBadges={renderBadges} />
        )}
      </Box>

      {/* MODALS */}
      <Modal opened={createModalOpened} onClose={closeCreate} title={createModalTitle} centered>
        {renderCreateForm && renderCreateForm(closeCreate)}
      </Modal>
      <ConfirmDeleteModal opened={!!itemToDelete} close={() => setItemToDelete(null)} onConfirm={handleDeleteConfirm} itemName={itemToDelete?.title || "this item"} isDeleting={isDeleting} />
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS
// ==========================================
