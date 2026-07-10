import { Skeleton } from '@mantine/core';
import GallerySkeleton from './_components/GallerySkeleton';

export default function WritingLoading() {
  return (
    <GallerySkeleton
      breadcrumb={<Skeleton h={16} w={80} radius="sm" mb="lg" />}
      folderCount={4}
      projectCount={8}
    />
  );
}
