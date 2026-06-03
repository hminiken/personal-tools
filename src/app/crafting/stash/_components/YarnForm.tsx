'use client';

import { useState } from 'react';
import { TextInput, Textarea, Select, TagsInput, FileInput, Button, Stack, Group } from '@mantine/core';
import { IconUpload, IconPalette, IconTag } from '@tabler/icons-react';
import { createYarn } from '../_actions/stash_actions';

export default function YarnForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Mantine TagsInput manages arrays, we will join them into strings on submit
  const [fibers, setFibers] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

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
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <FileInput
          label="Yarn Photo"
          placeholder="Upload a picture of the skein"
          accept="image/png,image/jpeg,image/webp"
          leftSection={<IconUpload size={16} />}
          onChange={setFile}
        />
        
        <TextInput name="title" label="Title/Name" placeholder="e.g., Leftover Navy Blue" required />
        <TextInput name="brand" label="Brand (Optional)" placeholder="e.g., Lion Brand" />
        
        <Select
          name="weight"
          label="Yarn Weight"
          placeholder="Select weight"
          data={[
            'Lace (0)', 'Super Fine (1)', 'Fine (2)', 'Light (3)', 
            'Medium/Worsted (4)', 'Bulky (5)', 'Super Bulky (6)', 'Jumbo (7)'
          ]}
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