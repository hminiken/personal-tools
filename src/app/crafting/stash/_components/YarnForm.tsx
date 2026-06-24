'use client';

import { useState } from 'react';
import { TextInput, Textarea, Select, TagsInput, FileInput, Button, Stack, Group } from '@mantine/core';
import { IconUpload, IconPalette, IconTag } from '@tabler/icons-react';
import { createYarn } from '../_actions/stash_actions';
import { YARN_WEIGHTS } from '@/utils/yarnWeights';

export default function YarnForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Mantine TagsInput manages arrays, we will join them into strings on submit
  const [fibers, setFibers] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  // Let the user paste a screenshot/photo straight into the form instead of
  // having to save the file and browse for it. Mirrors the paste handling in
  // the edit-view UploadModal.
  const handlePaste = (e: React.ClipboardEvent<HTMLFormElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const pastedFile = item.getAsFile();
        if (pastedFile) {
          e.preventDefault();
          const ext = pastedFile.type.split('/')[1] || 'png';
          const cleanFile = new File([pastedFile], `pasted_photo_${Date.now()}.${ext}`, { type: pastedFile.type });
          setFile(cleanFile);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Build the payload
    const formData = new FormData(e.currentTarget);
    formData.append('fiberTags', fibers.join(','));
    formData.append('colorTags', colors.join(','));
    if (file) formData.set('photo', file);

    // Fire the server action
    await createYarn(formData);
    
    setLoading(false);
    onSuccess(); // Close the modal
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste}>
      <Stack gap="md">
        <FileInput
          label="Yarn Photo"
          placeholder="Upload or paste a picture of the skein (Ctrl+V)"
          accept="image/png,image/jpeg,image/webp"
          leftSection={<IconUpload size={16} />}
          value={file}
          onChange={setFile}
          clearable
        />
        
        <TextInput name="title" label="Title/Name" placeholder="e.g., Leftover Navy Blue" required />
        <TextInput name="brand" label="Brand (Optional)" placeholder="e.g., Lion Brand" />
        
        <Select
          name="weight"
          label="Yarn Weight"
          placeholder="Select weight"
          data={YARN_WEIGHTS}
        />

        <TagsInput
          label="Fiber Content"
          placeholder="Type and press enter (e.g., acrylic, cotton)"
          leftSection={<IconTag size={16} />}
          value={fibers}
          onChange={setFibers}
          clearable
        />

        <TagsInput
          label="Colors"
          placeholder="Type and press enter (e.g., blue, teal)"
          leftSection={<IconPalette size={16} />}
          value={colors}
          onChange={setColors}
          clearable
        />

        <Textarea
          name="notes"
          label="Brainstorming & Notes"
          placeholder="What do you want to make with this?"
          minRows={3}
          autosize
        />

        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={loading}>Save to Stash</Button>
        </Group>
      </Stack>
    </form>
  );
}