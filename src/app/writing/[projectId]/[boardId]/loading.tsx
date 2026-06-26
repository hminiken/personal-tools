import { Box, Group, Skeleton, Stack } from '@mantine/core';

export default function BoardLoading() {
  return (
    <Box>
      {/* Header row */}
      <Group justify="space-between" mb="sm" mt="10px" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Skeleton h={28} w={80} radius="sm" />
          <Skeleton h={20} w={20} radius="sm" />
          <Skeleton h={22} w={160} radius="sm" />
        </Group>
        <Skeleton h={34} w={34} radius="sm" />
      </Group>

      {/* Board tabs */}
      <Group gap="xs" mb="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} h={30} w={i === 0 ? 90 : 75} radius="sm" />
        ))}
      </Group>

      {/* Groups columns */}
      <Group align="flex-start" gap="md" wrap="nowrap" style={{ overflowX: 'auto' }}>
        {Array.from({ length: 3 }).map((_, gi) => (
          <Stack key={gi} gap="xs" style={{ minWidth: 260, flexShrink: 0 }}>
            {/* Group header */}
            <Skeleton h={32} radius="sm" />
            {/* Lists inside the group */}
            {Array.from({ length: gi === 0 ? 4 : gi === 1 ? 3 : 2 }).map((_, li) => (
              <Skeleton key={li} h={52} radius="sm" />
            ))}
            {/* Add list button placeholder */}
            <Skeleton h={28} w={100} radius="sm" />
          </Stack>
        ))}
      </Group>
    </Box>
  );
}
