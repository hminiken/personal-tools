'use client';

import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { tailorProjectPattern } from '../../_actions/project_actions';
import { GeminiModelSelect } from '@/components/GeminiModelSelect';

/**
 * "Tailor with AI": Gemini rewrites the project's pattern copy (e.g. "only
 * size XL"). Nothing is saved here; `onTailored` hands the HTML back so the
 * workspace can load it into the editor for review.
 */
export function TailorModal({
  projectId,
  opened,
  close,
  onTailored,
}: {
  projectId: number;
  opened: boolean;
  close: () => void;
  onTailored: (html: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [modelTier, setModelTier] = useState<number | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isTailoring) return;
    setError(null);
    close();
  };

  const handleTailor = async () => {
    if (!prompt.trim()) return;
    setIsTailoring(true);
    setError(null);
    let result: Awaited<ReturnType<typeof tailorProjectPattern>>;
    try {
      result = await tailorProjectPattern(projectId, prompt, modelTier ?? 0);
    } catch {
      // Network drop / server restart: don't leave the button spinning.
      result = { error: 'Could not reach the server. Check your connection and try again.' };
    } finally {
      setIsTailoring(false);
    }
    if ('error' in result) {
      setError(result.error);
      return;
    }
    onTailored(result.html);
    close();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Tailor pattern with AI" centered size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Gemini rewrites this project&apos;s copy of the pattern. Nothing is saved until you review it and click Save Text.
        </Text>
        <Textarea
          label="What should change?"
          placeholder={'e.g. Only show size "XL" — remove the other sizes\' stitch counts and any sections for other sizes.'}
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
          autosize
          minRows={3}
          maxRows={8}
          disabled={isTailoring}
          data-autofocus
        />
        {/* Mounted only while the modal is open, so availability is fresh. */}
        {opened && <GeminiModelSelect value={modelTier} onChange={setModelTier} disabled={isTailoring} />}
        {error && <Alert color="rust" title="Couldn't tailor the pattern">{error}</Alert>}
        <Group justify="space-between">
          <Text size="xs" c="dimmed">{isTailoring ? 'Working through the pattern section by section — long patterns can take a minute.' : ''}</Text>
          <Group>
            <Button variant="default" onClick={handleClose} disabled={isTailoring}>Cancel</Button>
            <Button color="grape" leftSection={<IconSparkles size={16} />} onClick={handleTailor} loading={isTailoring} disabled={!prompt.trim()}>
              Tailor
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
