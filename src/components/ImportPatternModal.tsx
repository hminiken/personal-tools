// src/components/ImportPatternModal.tsx
'use client';

import { useState } from 'react';
import { Modal, Textarea, TextInput, Button, Group, Box, Loader, Text, FileInput, Alert } from '@mantine/core';
import { IconFileTypePdf, IconAlertTriangle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ImportError {
  message: string;
  overloaded: boolean;
  nextTier: number | null;
  nextModelLabel: string | null;
}

export function ImportPatternModal({ opened, close }: { opened: boolean; close: () => void }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);

  // `tier` selects which Gemini model to use (0 = standard, higher = lighter).
  // A failed run can offer a one-click retry at the next tier down.
  const handleImport = async (tier = 0) => {
    if (!sourceUrl && !rawText && !pdfFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Send the raw input to our AI extraction route.
      //    PDFs go as multipart/form-data; URL/text go as JSON.
      let response: Response;
      if (pdfFile) {
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('modelTier', String(tier));
        if (sourceUrl) formData.append('sourceUrl', sourceUrl);
        response = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl, rawText, modelTier: tier }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Show the real reason (e.g. Gemini overloaded) and, when available,
        // offer to retry on a lighter model tier.
        setError({
          message: data.error || 'Failed to parse pattern. Please try again.',
          overloaded: !!data.overloaded,
          nextTier: data.canRetryLower ? data.nextTier : null,
          nextModelLabel: data.nextModelLabel ?? null,
        });
        return;
      }

      // 2. We don't save yet! We pass the data to the "Preview" page.
      // We can do this by stringifying it into sessionStorage for temporary passing.
      sessionStorage.setItem('patternImportPreview', JSON.stringify(data));

      close();
      router.push('/crafting/patterns/preview');

    } catch (err) {
      console.error("Import failed:", err);
      setError({
        message: 'Could not reach the server. Check your connection and try again.',
        overloaded: false,
        nextTier: null,
        nextModelLabel: null,
      });
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
          mb="md"
          disabled={!!pdfFile}
        />

        <Text ta="center" c="dimmed" mb="md">OR</Text>

        <FileInput
          label="Upload PDF"
          placeholder="Choose a pattern PDF..."
          accept="application/pdf"
          leftSection={<IconFileTypePdf size={18} />}
          value={pdfFile}
          onChange={setPdfFile}
          clearable
          mb="xl"
        />

        {error && (
          <Alert
            color={error.overloaded ? 'yellow' : 'red'}
            icon={<IconAlertTriangle size={18} />}
            title={error.overloaded ? 'Gemini is busy right now' : 'Import failed'}
            withCloseButton
            onClose={() => setError(null)}
            mb="md"
          >
            <Text size="sm">{error.message}</Text>
            {error.nextTier !== null && (
              <Button
                mt="sm"
                size="xs"
                color="olive"
                loading={isProcessing}
                onClick={() => handleImport(error.nextTier!)}
              >
                Try a lighter model ({error.nextModelLabel})
              </Button>
            )}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={isProcessing}>Cancel</Button>
          <Button color="olive" onClick={() => handleImport()} disabled={(!sourceUrl && !rawText && !pdfFile) || isProcessing}>
            Parse Pattern
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}