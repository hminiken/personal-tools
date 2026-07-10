import { Box, Flex, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

// Shared skeleton for the writing gallery views (root + folder): a
// breadcrumb slot, a horizontal folders strip, and a projects grid. Callers
// supply the breadcrumb markup and the placeholder counts, since those are
// the only things that differ between the root and folder loading states.
export default function GallerySkeleton({
  breadcrumb,
  folderCount,
  projectCount,
}: {
  breadcrumb: ReactNode;
  folderCount: number;
  projectCount: number;
}) {
  return (
    <Box mt="10px">
      {breadcrumb}

      {/* Folders strip */}
      <Box mb="xl">
        <Skeleton h={14} w={55} radius="sm" mb="sm" />
        <Flex wrap="wrap" gap="md">
          {Array.from({ length: folderCount }).map((_, i) => (
            <Stack key={i} gap={6}>
              <Skeleton h={80} w={115} radius="md" />
              <Skeleton h={11} w={90} radius="sm" />
              <Skeleton h={10} w={55} radius="sm" />
            </Stack>
          ))}
        </Flex>
      </Box>

      {/* Projects section heading + controls */}
      <Skeleton h={16} w={130} radius="sm" mb="sm" />
      <Skeleton h={36} w="100%" radius="sm" mb="md" />

      {/* Project cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
        {Array.from({ length: projectCount }).map((_, i) => (
          <Stack key={i} gap={8}>
            <Skeleton h={160} radius="md" />
            <Skeleton h={14} w="80%" radius="sm" />
            <Skeleton h={22} w={70} radius="xl" />
          </Stack>
        ))}
      </SimpleGrid>
    </Box>
  );
}
