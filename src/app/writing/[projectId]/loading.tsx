import { Box, Group, Paper, Skeleton, Stack } from '@mantine/core';

export default function ProjectLoading() {
  return (
    <Paper p="xl" maw={520} mx="auto" mt="xl">
      <Stack align="center" gap="md">
        <Skeleton h={28} w={130} radius="sm" style={{ alignSelf: 'flex-start' }} />
        <Skeleton h={48} w={48} radius="md" />
        <Skeleton h={26} w={200} radius="sm" />
        <Group gap="xs">
          <Skeleton h={16} w={300} radius="sm" />
        </Group>
        <Skeleton h={36} w="100%" radius="sm" />
        <Box w="100%" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton h={34} w={110} radius="sm" />
        </Box>
      </Stack>
    </Paper>
  );
}
