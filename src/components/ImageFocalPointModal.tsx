'use client';

import { useRef } from 'react';
import { Modal, Box, Text, Image } from '@mantine/core';

// Lets the user click where the important part of an image is (a face, say)
// so that spot stays in frame wherever the image gets center-cropped to a
// different aspect ratio (card thumbnails, cover images). Stores a simple
// 0-100 (% from top-left) focal point applied as CSS object-position.
export function ImageFocalPointModal({
  opened,
  onClose,
  src,
  focalX,
  focalY,
  onChange,
}: {
  opened: boolean;
  onClose: () => void;
  src: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange(
      Math.max(0, Math.min(100, x)),
      Math.max(0, Math.min(100, y)),
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Adjust image position" size="md">
      <Text size="xs" c="dimmed" mb="sm">
        Click the important part of the image (like a face) — that spot stays
        in view when this image is cropped to fit a thumbnail.
      </Text>
      <Box
        ref={boxRef}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          cursor: 'crosshair',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-gray-4)',
          lineHeight: 0,
        }}
      >
        <Image src={src} alt="" w="100%" fit="contain" display="block" />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${focalX}%`,
            top: `${focalY}%`,
            transform: 'translate(-50%, -50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.5)',
            background: 'rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Modal>
  );
}
