'use client';

import { useState, useMemo, useCallback } from 'react';
import { Text, Accordion, Box, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import GalleryGrid from './GalleryGrid';
import { GalleryControls } from './GalleryControls';
import { FloatingAddButton } from './FloatingAddButton';
import { Filter, FieldOption } from './FilterBuilder';

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
  // Optional per-card menu (e.g. the writing gallery's "Move to folder…").
  // Undefined elsewhere, so other galleries render no extra control.
  renderItemMenu?: (item: T) => React.ReactNode;
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

// Friendly labels for the fields users can filter by. Only the keys that
// actually exist on the items show up in the "Search by..." dropdown, so this
// one map serves patterns, projects, and yarn without per-page config.
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  categories: 'Category',
  status: 'Status',
  hooks: 'Hook',
  weights: 'Weight',
  brand: 'Brand',
  fibers: 'Fiber',
  colors: 'Color',
  yarn: 'Yarn',
};

// The keys "Anything" searches across (the union of all known text fields).
const ALL_TEXT_FIELDS = Object.keys(FIELD_LABELS);

// AND together every active filter. Each filter is a simple case-insensitive
// "contains" against one field (or across all text fields for "Anything").
function applyFilters<T extends BaseGalleryItem>(items: T[], filters: Filter[]): T[] {
  const active = filters.filter((f) => f.value.trim());
  if (active.length === 0) return items;

  return items.filter((item) =>
    active.every((f) => {
      const needle = f.value.trim().toLowerCase();
      if (f.field === '__all__') {
        return ALL_TEXT_FIELDS.some((k) =>
          String(item[k] ?? '').toLowerCase().includes(needle)
        );
      }
      return String(item[f.field] ?? '').toLowerCase().includes(needle);
    })
  );
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function ItemGallery<T extends BaseGalleryItem>({
  items, basePath, searchPlaceholder = "Search...", newItemText = "New",
  createModalTitle = "Create New", categoryField = 'categories', deleteAction,
  renderBadges, renderCreateForm, renderItemMenu
}: ItemGalleryProps<T>) {

  // State Management
  const [filters, setFilters] = useState<Filter[]>([]);
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOption, setSortOption] = useState<string | null>('title-asc');
  const [isGrouped, setIsGrouped] = useState(false);

  // Filter handlers
  const addFilter = useCallback((f: Filter) => setFilters((prev) => [...prev, f]), []);
  const removeFilter = useCallback((index: number) => setFilters((prev) => prev.filter((_, i) => i !== index)), []);
  const clearFilters = useCallback(() => setFilters([]), []);

  // Derived Data (Memoized)
  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);

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

  // The fields offered in the "Search by..." dropdown: "Anything" first, then
  // any known text field that actually exists on these items.
  const fieldOptions = useMemo<FieldOption[]>(() => {
    const sample = items[0] || {};
    const opts: FieldOption[] = [{ value: '__all__', label: 'Anything' }];
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (key in sample) opts.push({ value: key, label });
    }
    return opts;
  }, [items]);

  // Distinct values present in the data for a field, powering the value
  // autocomplete. Comma-joined fields (categories, hooks, etc.) are split so
  // each individual tag is suggested on its own.
  const getSuggestions = useCallback((field: string) => {
    if (!field || field === '__all__' || field === 'title') return [];
    const set = new Set<string>();
    for (const item of items) {
      const raw = item[field];
      if (typeof raw === 'string') {
        raw.split(',').forEach((part) => {
          const t = part.trim();
          if (t) set.add(t);
        });
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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
      {renderCreateForm && (
        <FloatingAddButton onClick={openCreate} text={newItemText} />
      )}

      {/* CONTROLS BAR */}
        <GalleryControls
        fields={fieldOptions}
        getSuggestions={getSuggestions}
        filters={filters}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
        searchPlaceholder={searchPlaceholder}
        isGrouped={isGrouped}
        setIsGrouped={setIsGrouped}
        sortOption={sortOption}
        setSortOption={setSortOption}
        universalInputStyles={universalInputStyles}
      />

      {/* GALLERY GRID */}
      <Box mt="xl">
        {sortedItems.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            {filters.length > 0 ? 'No items match your filters.' : 'No items yet.'}
          </Text>
        ) : isGrouped ? (
          <Accordion multiple variant="separated">
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <Accordion.Item key={groupName} value={groupName}>
                <Accordion.Control><Text fw={600}>{groupName} ({groupItems.length})</Text></Accordion.Control>
                <Accordion.Panel>
                  <GalleryGrid items={groupItems} basePath={basePath} deleteAction={deleteAction} setItemToDelete={setItemToDelete} renderBadges={renderBadges} renderItemMenu={renderItemMenu} />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <GalleryGrid items={sortedItems} basePath={basePath} deleteAction={deleteAction} setItemToDelete={setItemToDelete} renderBadges={renderBadges} renderItemMenu={renderItemMenu} />
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
