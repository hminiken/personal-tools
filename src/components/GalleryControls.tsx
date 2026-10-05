// src/components/GalleryControls.tsx
import { Group, Switch, Select, Box } from '@mantine/core';
import { IconSortAscending } from '@tabler/icons-react';
import { FilterBuilder, Filter, FieldOption } from './FilterBuilder';

interface GalleryControlsProps {
  fields: FieldOption[];
  getSuggestions: (field: string) => string[];
  filters: Filter[];
  onAddFilter: (filter: Filter) => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
  onDraftChange?: (draft: Filter | null) => void;
  searchPlaceholder?: string;
  isGrouped: boolean;
  setIsGrouped: (val: boolean) => void;
  groupLabel?: string;
  sortOption: string | null;
  setSortOption: (val: string | null) => void;
  // Page-level buttons (New Pattern, Smart Import, Add Yarn, ...).
  actions?: React.ReactNode;
}

// Search on its own row; sort, grouping and the page's actions on the next.
// Everything wraps cleanly down to phone width.
export function GalleryControls({
  fields, getSuggestions, filters, onAddFilter, onRemoveFilter, onClearFilters, onDraftChange,
  searchPlaceholder, isGrouped, setIsGrouped, groupLabel = 'Group by category', sortOption, setSortOption,
  actions,
}: GalleryControlsProps) {
  return (
    <Box
      bg="light-dark(var(--mantine-color-neutrals-0), var(--mantine-color-dark-7))"
      bdrs="md" p="sm" mb="sm"
    >
      <Group align="flex-start" gap="sm" wrap="wrap">
        <Box style={{ flex: '1 1 320px', minWidth: 0 }}>
          <FilterBuilder
            fields={fields}
            getSuggestions={getSuggestions}
            filters={filters}
            onAdd={onAddFilter}
            onRemove={onRemoveFilter}
            onClear={onClearFilters}
            onDraftChange={onDraftChange}
            placeholder={searchPlaceholder}
          />
        </Box>

        <Group gap="sm" wrap="wrap" style={{ flex: '1 1 auto' }} justify="flex-end">
          <Select
            aria-label="Sort by"
            leftSection={<IconSortAscending size={16} />}
            placeholder="Sort by"
            value={sortOption}
            onChange={setSortOption}
            allowDeselect={false}
            data={[
              { value: 'title-asc', label: 'Title (A-Z)' },
              { value: 'title-desc', label: 'Title (Z-A)' },
              { value: 'created-desc', label: 'Newest first' },
              { value: 'updated-desc', label: 'Recently updated' },
            ]}
            w={{ base: '100%', xs: 190 }}
          />
          <Switch
            label={groupLabel} checked={isGrouped}
            onChange={(e) => setIsGrouped(e.currentTarget.checked)}
          />
          {actions && (
            <Group gap="xs" wrap="nowrap" ml={{ base: 0, sm: 'auto' }}>
              {actions}
            </Group>
          )}
        </Group>
      </Group>
    </Box>
  );
}
