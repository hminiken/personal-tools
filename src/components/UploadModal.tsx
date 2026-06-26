import { useEffect, useState } from 'react';
import { Modal, Button, Group, FileInput, Box, Text, Accordion, SimpleGrid, Image, Loader, ScrollArea } from '@mantine/core';
import { IconPhotoPlus } from '@tabler/icons-react';

// Import server actions directly
import { getAllLibraryImages, linkLibraryImageAction } from '@app/crafting/actions/ImageActions'; 

export function UploadModal({
  opened,
  close,
  targetId,
  idFieldName,
  uploadAction,
  revalidateUrl,
  showLibrary = true,   // crafting browses its shared image library; writing opts out
  onUploaded,           // optional: receives uploadAction's return value (e.g. the new path)
}: any) {
  
  // Upload States
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Library States
  const [libraryImages, setLibraryImages] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch library images automatically when the modal is opened
  useEffect(() => {
    if (opened && showLibrary) {
      setIsLoadingLibrary(true);
      getAllLibraryImages()
        .then((data: any) => setLibraryImages(data || []))
        .catch((err: any) => console.error("Failed to fetch library", err))
        .finally(() => setIsLoadingLibrary(false));
    } else {
      setLibraryImages([]);
      setFile(null);
    }
  }, [opened, showLibrary]);

  // 1. Global Paste Listener (catches paste events anywhere on the screen while open)
  useEffect(() => {
    if (!opened) return;

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

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [opened]);

  // 2. React Native Paste Listener (intercepts paste events focused inside the modal)
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
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

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append(idFieldName, String(targetId));
      formData.append('file', file);
      formData.append('revalidateUrl', revalidateUrl); // Keep next.js router updated

      const result = await uploadAction(formData);
      onUploaded?.(result);
      setFile(null);
      close();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLinkImage = async (imageUrl: string) => {
    setIsLinking(true);
    try {
      await linkLibraryImageAction(idFieldName, imageUrl, targetId, revalidateUrl);
      close(); 
    } catch (error) {
      console.error("Failed to link image", error);
      alert("Failed to link image.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Add Photo" centered size="lg">
      {/* ✨ FIXED: Added onPaste back to the main container Box so local pastes trigger perfectly! */}
      <Box onPaste={handlePaste} style={{ outline: 'none' }} tabIndex={0}>
        
        {/* Upload New Section */}
        <Box mb="xl">
            <Text size="sm" fw={500} mb="xs">Upload New</Text>
            <FileInput
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

            <Group justify="flex-end">
                <Button variant="default" onClick={close} disabled={isUploading || isLinking}>Cancel</Button>
                <Button color="olive.7" onClick={handleSubmit} disabled={!file || isLinking} loading={isUploading}>Upload</Button>
            </Group>
        </Box>

        {/* Existing Media Library Accordion */}
        {showLibrary && (
        <Accordion variant="separated">
            <Accordion.Item value="library">
                <Accordion.Control>
                    <Text size="sm" fw={500}>Browse Existing Library</Text>
                </Accordion.Control>
                <Accordion.Panel>
                    {isLoadingLibrary ? (
                        <Group justify="center" p="xl">
                            <Loader color="olive.7" />
                        </Group>
                    ) : libraryImages.length > 0 ? (
                        <ScrollArea h={300} type="always" offsetScrollbars>
                            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                                {libraryImages.map((img: any, index: number) => (
                                    <Box 
                                        key={`lib-${img.id || index}`} 
                                        style={{ position: 'relative', cursor: isLinking ? 'wait' : 'pointer' }}
                                        onClick={() => {
                                            if (!isLinking) handleLinkImage(img.path);
                                        }}
                                    >
                                        <Image
                                            src={img.path}
                                            alt="Library Image"
                                            radius="md"
                                            h={100}
                                            fit="cover"
                                            style={{ transition: 'opacity 0.2s', opacity: isLinking ? 0.5 : 1 }}
                                            fallbackSrc="https://placehold.co/100x100?text=Error"
                                        />
                                    </Box>
                                ))}
                            </SimpleGrid>
                        </ScrollArea>
                    ) : (
                        <Text c="dimmed" ta="center" py="md">No images found in your library.</Text>
                    )}
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
        )}

      </Box>
    </Modal>
  );
}