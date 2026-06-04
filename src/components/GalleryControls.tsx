// src/components/GalleryControls.tsx
import { Group, TextInput, ActionIcon, Switch, Select, CloseButton } from '@mantine/core';
import { IconSearch, IconSortAscending, IconInfoCircle } from '@tabler/icons-react';

export function GalleryControls({
  searchQuery, setSearchQuery, searchPlaceholder,
  isGrouped, setIsGrouped,
  sortOption, setSortOption,
  setShowSearchHelp,
  universalInputStyles
}: any) {
  return (
    <Group 
      wrap="nowrap" 
      w={{ base: '100%', md: 'auto' }} 
      style={{ flexGrow: 1 }} 
      bg="light-dark(var(--mantine-color-neutrals-0), var(--mantine-color-dark-7))" 
      bdrs="md" p="sm" mb="sm"
    >
      <Group>
        <TextInput
          styles={universalInputStyles}
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} color="var(--mantine-color-neutrals-9)" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          w={{ base: '100%', sm: 300 }}
          rightSection={searchQuery.length > 0 ? <CloseButton size="sm" onClick={() => setSearchQuery('')} /> : null}
        />
        <ActionIcon variant="subtle" color="neutrals.8" size="lg" onClick={() => setShowSearchHelp((prev: boolean) => !prev)}>
          <IconInfoCircle size={20} />
        </ActionIcon>
      </Group>

      <Group justify="space-between" w={{ base: '100%', md: 'auto' }}>
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
          w={200}
        />
      </Group>
    </Group>
  );
}