// src/components/ImportPatternModal.tsx
'use client';

import { useState } from 'react';
import { Modal, Textarea, TextInput, Button, Group, Box, Loader, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

export function ImportPatternModal({ opened, close }: { opened: boolean; close: () => void }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    if (!sourceUrl && !rawText) return;
    setIsProcessing(true);

    try {
      // 1. Send the raw input to our AI extraction route
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, rawText })
      });

      if (!response.ok) throw new Error('Failed to extract pattern');

      const extractedData = await response.json();

      // 2. We don't save yet! We pass the data to the "Preview" page.
      // We can do this by stringifying it into sessionStorage for temporary passing.
      sessionStorage.setItem('patternImportPreview', JSON.stringify(extractedData));
      
      close();
      router.push('/crafting/patterns/preview'); 

    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to parse pattern. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Smart Import Pattern" centered size="lg">
      <Box style={{ position: 'relative' }}>
        {isProcessing && (
          <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader color="olive" />
            <Text mt="md" fw={500}>Gemini is parsing your pattern...</Text>
          </Box>
        )}

        <TextInput
          label="Pattern URL"
          placeholder="https://..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.currentTarget.value)}
          mb="md"
        />
        
        <Text ta="center" c="dimmed" mb="md">OR</Text>

        <Textarea
          label="Paste Raw Text"
          placeholder="Paste the entire pattern text here..."
          value={rawText}
          onChange={(e) => setRawText(e.currentTarget.value)}
          minRows={6}
          mb="xl"
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={isProcessing}>Cancel</Button>
          <Button color="olive" onClick={handleImport} disabled={(!sourceUrl && !rawText) || isProcessing}>
            Parse Pattern
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}