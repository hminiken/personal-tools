import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Group, FileInput, Box, Text } from '@mantine/core';
import { IconPhotoPlus } from '@tabler/icons-react';

// Assuming you are passing these props into your Gallery or Modal component:
// opened, close (from useDisclosure), patternId, and uploadAction

export function UploadModal({ 
  opened, 
  close, 
  targetId, 
  idFieldName,
  uploadAction 
}: any) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Global Paste Listener
  useEffect(() => {
    if (!opened) return; // Only listen when the modal is visible

    // We use the native ClipboardEvent here
    const handleGlobalPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            event.preventDefault();
            const cleanFile = new File([pastedFile], `pasted_photo_${Date.now()}.png`, { type: pastedFile.type });
            setFile(cleanFile);
          }
        }
      }
    };

    // Attach to the whole document
    document.addEventListener('paste', handleGlobalPaste);
    
    // Cleanup: Remove the listener when the modal closes
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [opened]); // Re-run this effect whenever 'opened' changes

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
const handleSubmit = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      // 2. Dynamically set the ID key based on where the modal is opened
      formData.append(idFieldName, String(targetId));
      
      // 3. Change 'image' to 'file' to match ALL of your server actions
      formData.append('file', file);

      await uploadAction(formData);
      
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
      <Box onPaste={handlePaste} style={{ outline: 'none' }} tabIndex={0}>
        
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