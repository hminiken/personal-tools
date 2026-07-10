'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Box, Image, Modal } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

// Full-size viewer for a card's image gallery: open at an index, wrap-around
// prev/next via the on-screen arrows or the keyboard arrow keys.
export function useImageViewer(imageCount: number) {
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);
  const showPrev = useCallback(
    () => setIndex((i) => (i === null ? i : i > 0 ? i - 1 : imageCount - 1)),
    [imageCount],
  );
  const showNext = useCallback(
    () => setIndex((i) => (i === null ? i : i < imageCount - 1 ? i + 1 : 0)),
    [imageCount],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, showPrev, showNext]);

  return { index, open, close, showPrev, showNext };
}

export default function ImageViewerModal({
  images,
  viewer,
}: {
  images: { path: string }[];
  viewer: ReturnType<typeof useImageViewer>;
}) {
  const current = viewer.index !== null ? images[viewer.index] : undefined;
  return (
    <Modal
      opened={viewer.index !== null}
      onClose={viewer.close}
      withCloseButton={false}
      size="auto"
      centered
      padding={0}
      styles={{ content: { backgroundColor: 'transparent', boxShadow: 'none' } }}
    >
      {current && (
        <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {images.length > 1 && (
            <ActionIcon variant="filled" color="dark" size="xl" radius="xl"
              style={{ position: 'absolute', left: 10, zIndex: 10, opacity: 0.7 }}
              onClick={viewer.showPrev} aria-label="Previous image">
              <IconChevronLeft size={24} />
            </ActionIcon>
          )}
          <Image src={current.path} alt="" style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain' }} />
          {images.length > 1 && (
            <ActionIcon variant="filled" color="dark" size="xl" radius="xl"
              style={{ position: 'absolute', right: 10, zIndex: 10, opacity: 0.7 }}
              onClick={viewer.showNext} aria-label="Next image">
              <IconChevronRight size={24} />
            </ActionIcon>
          )}
        </Box>
      )}
    </Modal>
  );
}
