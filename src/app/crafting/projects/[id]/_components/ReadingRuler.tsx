'use client';

import { useRef, useState } from 'react';
import { Box } from '@mantine/core';

const RULER_HEIGHT = 35;

/**
 * A draggable highlight bar over the pattern text that marks the row you're
 * on. Click the text to jump it there, or drag it. `onMove` gets the final
 * position (px from the top of the text) after a click or drag.
 */
export function ReadingRuler({
  enabled,
  initialY,
  onMove,
  children,
}: {
  enabled: boolean;
  initialY: number;
  onMove: (y: number) => void;
  children: React.ReactNode;
}) {
  const [y, setY] = useState(initialY);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const yFromPointer = (clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(clientY - rect.top, rect.height)));
  };

  const handleTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const next = yFromPointer(e.clientY);
    setY(next);
    onMove(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId); // keep the drag even if the finger slips off
    e.stopPropagation(); // don't also count as a click on the text
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) setY(yFromPointer(e.clientY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    onMove(y);
  };

  return (
    <Box
      ref={containerRef}
      style={{ position: 'relative', cursor: enabled ? 'crosshair' : 'auto' }}
      onClick={handleTextClick}
    >
      {enabled && (
        <div
          style={{
            // Centered on y, but clamped to the text box so it never covers
            // the switches above it.
            position: 'absolute', top: Math.max(0, y - 15), left: -10, right: -10, height: RULER_HEIGHT,
            backgroundColor: 'rgba(255, 224, 102, 0.4)', borderLeft: '4px solid var(--mantine-color-mustard-5)',
            zIndex: 5, borderRadius: 4,
            touchAction: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'top 0.2s ease-out',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
      {children}
    </Box>
  );
}
