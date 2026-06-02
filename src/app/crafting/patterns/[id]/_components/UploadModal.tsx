import { useState } from 'react';
import { Modal, Button, Group, FileInput, Box, Text } from '@mantine/core';
import { IconPhotoPlus } from '@tabler/icons-react';

// Assuming you are passing these props into your Gallery or Modal component:
// opened, close (from useDisclosure), patternId, and uploadAction

export function UploadModal({ opened, close, patternId, uploadAction }: any) {
  // 1. Hold the selected or pasted file in state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 2. Intercept the paste event
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const pastedFile = item.getAsFile();
        if (pastedFile) {
          event.preventDefault();
          // Create a clean file object with a guaranteed timestamped name
          const cleanFile = new File([pastedFile], `pasted_photo_${Date.now()}.png`, { type: pastedFile.type });
          
          // Set it to the input state
          setFile(cleanFile);
        }
      }
    }
  };

  // 3. Handle the final submission to your server action
  const handleSubmit = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('patternId', String(patternId));
      formData.append('image', file);

      await uploadAction(formData);
      
      // Reset and close on success
      setFile(null);
      close();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Upload Photo" centered>
      {/* The Box catches the paste event anywhere inside the modal */}
      <Box onPaste={handlePaste} style={{ outline: 'none' }} tabIndex={-1}>
        
        <FileInput
          label="Select Image"
          withAsterisk
          placeholder="Click to browse or paste image (Ctrl+V)"
          value={file}
          onChange={setFile}
          accept="image/*"
          clearable
          leftSection={<IconPhotoPlus size={16} />}
          mb="md"
        />

        {file && (
          <Text size="sm" c="dimmed" mb="md">
            Ready to upload: <strong>{file.name}</strong>
          </Text>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={close} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            color="olive.7" 
            onClick={handleSubmit} 
            disabled={!file} 
            loading={isUploading}
          >
            Upload
          </Button>
        </Group>

      </Box>
    </Modal>
  );
}