// src/components/FilterBuilder.tsx
'use client';

import { useMemo, useState } from 'react';
import { Group, Stack, Select, Autocomplete, Button, Pill, Text } from '@mantine/core';
import { IconFilter, IconPlus } from '@tabler/icons-react';

export interface Filter {
  field: string;
  value: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

interface FilterBuilderProps {
  fields: FieldOption[];
  // Returns the distinct values present in the data for a given field, used to
  // power the value autocomplete (e.g. picking "Search by Category" suggests
  // every category you've used).
  getSuggestions: (field: string) => string[];
  filters: Filter[];
  onAdd: (filter: Filter) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  placeholder?: string;
  universalInputStyles?: object;
}

export function FilterBuilder({
  fields, getSuggestions, filters, onAdd, onRemove, onClear,
  placeholder = 'Search...', universalInputStyles,
}: FilterBuilderProps) {
  const [field, setField] = useState<string>(fields[0]?.value ?? '__all__');
  const [value, setValue] = useState('');

  const labelFor = useMemo(() => {
    const map = new Map(fields.map((f) => [f.value, f.label]));
    return (key: string) => map.get(key) ?? key;
  }, [fields]);

  const suggestions = useMemo(() => getSuggestions(field), [getSuggestions, field]);

  const commit = () => {
    const clean = value.trim();
    if (!clean) return;
    onAdd({ field, value: clean });
    setValue('');
  };

  const valuePlaceholder =
    field === '__all__' ? placeholder : `Search by ${labelFor(field).toLowerCase()}...`;

  return (
    <Stack gap="xs" w="100%">
      <Group wrap="nowrap" w="100%" gap="xs">
        <Select
          aria-label="Search by"
          leftSection={<IconFilter size={16} color="var(--mantine-color-neutrals-9)" />}
          styles={universalInputStyles}
          data={fields}
          value={field}
          onChange={(val) => setField(val || '__all__')}
          allowDeselect={false}
          w={{ base: 130, sm: 160 }}
        />
        <Autocomplete
          styles={universalInputStyles}
          data={suggestions}
          value={value}
          onChange={setValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={valuePlaceholder}
          style={{ flexGrow: 1 }}
        />
        <Button
          color="olive.6"
          leftSection={<IconPlus size={16} />}
          onClick={commit}
          disabled={!value.trim()}
        >
          Add
        </Button>
      </Group>

      {filters.length > 0 && (
        <Group gap="xs" align="center">
          {filters.map((f, i) => (
            <Pill
              key={`${f.field}-${f.value}-${i}`}
              withRemoveButton
              onRemove={() => onRemove(i)}
              size="md"
            >
              <Text span size="xs" fw={600}>{labelFor(f.field)}:</Text> {f.value}
            </Pill>
          ))}
          <Button variant="subtle" color="gray" size="compact-xs" onClick={onClear}>
            Clear all
          </Button>
        </Group>
      )}
    </Stack>
  );
}
