import { Group, Skeleton } from '@mantine/core';
import GallerySkeleton from '../../_components/GallerySkeleton';

export default function WritingFolderLoading() {
  return (
    <GallerySkeleton
      breadcrumb={
        <Group mb="lg" gap={8}>
          <Skeleton h={16} w={60} radius="sm" />
          <Skeleton h={12} w={8} radius="sm" />
          <Skeleton h={16} w={100} radius="sm" />
        </Group>
      }
      folderCount={3}
      projectCount={6}
    />
  );
}
