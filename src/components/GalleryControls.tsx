// src/components/GalleryControls.tsx
import { Group, Switch, Select } from '@mantine/core';
import { IconSortAscending } from '@tabler/icons-react';
import { FilterBuilder, Filter, FieldOption } from './FilterBuilder';

interface GalleryControlsProps {
  fields: FieldOption[];
  getSuggestions: (field: string) => string[];
  filters: Filter[];
  onAddFilter: (filter: Filter) => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
  searchPlaceholder?: string;
  isGrouped: boolean;
  setIsGrouped: (val: boolean) => void;
  sortOption: string | null;
  setSortOption: (val: string | null) => void;
  universalInputStyles?: object;
}

export function GalleryControls({
  fields, getSuggestions, filters, onAddFilter, onRemoveFilter, onClearFilters,
  searchPlaceholder, isGrouped, setIsGrouped, sortOption, setSortOption,
  universalInputStyles,
}: GalleryControlsProps) {
  return (
    <Group
      wrap="wrap"
      w={{ base: '100%', md: 'auto' }}
      style={{ flexGrow: 1 }}
      align="flex-start"
      bg="light-dark(var(--mantine-color-neutrals-0), var(--mantine-color-dark-7))"
      bdrs="md" p="sm" mb="sm"
    >
      <Group wrap="nowrap" w={{ base: '100%', md: 'auto' }} style={{ flexGrow: 1 }}>
        <FilterBuilder
          fields={fields}
          getSuggestions={getSuggestions}
          filters={filters}
          onAdd={onAddFilter}
          onRemove={onRemoveFilter}
          onClear={onClearFilters}
          placeholder={searchPlaceholder}
          universalInputStyles={universalInputStyles}
        />
      </Group>

      <Group justify="space-between" wrap="wrap" w={{ base: '100%', md: 'auto' }}>
        <Switch
          color="neutrals.7" label="Group by Category" checked={isGrouped}
          onChange={(e) => setIsGrouped(e.currentTarget.checked)}
          styles={{ track: { backgroundColor: 'var(--mantine-color-neutrals-2)' } }}
        />
        <Select
          leftSection={<IconSortAscending size={16} color="var(--mantine-color-neutrals-9)" />}
          styles={universalInputStyles}
          placeholder="Sort by"
          value={sortOption}
          onChange={setSortOption}
          data={[
            { value: 'title-asc', label: 'Title (A-Z)' },
            { value: 'title-desc', label: 'Title (Z-A)' },
            { value: 'created-desc', label: 'Newest First' },
            { value: 'updated-desc', label: 'Recently Updated' },
          ]}
          w={{ base: '100%', xs: 200 }}
        />
      </Group>
    </Group>
  );
}
