'use client';

import { useState } from 'react';
import {
  Title, Group, Badge, Paper, Switch,
  Tabs, Divider, Box, Button, TextInput, Stack,
  TagsInput, 
  Typography,
  useComputedColorScheme,
  Anchor,
  Select
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { updatePattern, updatePatternStatus, uploadPatternImage } from '../_actions/actions';
import Link from 'next/link';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
// Tiptap Imports
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import '@mantine/tiptap/styles.css';
import { processWholePattern } from '@/utils/patternHighlighter';

import { TabContent } from './TabContent';
import ImageGallery from '@/components/PatternImageGallery';
import { Pattern, PatternImage } from '../../types';
import { deleteImage, setCoverImage } from '@actions/patternActions';
import { RichTextEditor } from '@mantine/tiptap';
import ResizeImage from 'tiptap-extension-resize-image';


// Define outside the component
const editorExtensions = [
    StarterKit, 
    TextStyle, 
    Color, 
    ResizeImage.configure({
        allowBase64: true, // Keep this so your paste-to-inline feature still works
        
    })
];

export default function PatternViewer({ pattern, images }: { pattern: Pattern, images: PatternImage[] }) {
  const [colorEnabled, setColorEnabled] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingTabs, setIsEditingTabs] = useState(false);

  // Tags State
  const [hookTags, setHookTags] = useState<string[]>(pattern.hookSizes ? pattern.hookSizes.split(',') : []);
  const [weightTags, setWeightTags] = useState<string[]>(pattern.yarnWeights ? pattern.yarnWeights.split(',') : []);

  const [projectModalOpened, { open: openProject, close: closeProject }] = useDisclosure(false);

  // Editors
  // const patternEditor = useEditor({ extensions: editorExtensions, content: pattern.patternText || '', immediatelyRender: false });
  const patternEditor = useEditor({
    extensions: editorExtensions,
    content: pattern.patternText || '',
    immediatelyRender: false,
  });





  const materialsEditor = useEditor({ extensions: editorExtensions, content: pattern.materials || '', immediatelyRender: false });
  const abbreviationsEditor = useEditor({ extensions: editorExtensions, content: pattern.abbreviations || '', immediatelyRender: false });
  const sizingEditor = useEditor({ extensions: editorExtensions, content: pattern.sizing || '', immediatelyRender: false });
  const notesEditor = useEditor({ extensions: editorExtensions, content: pattern.patternNotes || '', immediatelyRender: false });
  const [rainbowEnabled, setRainbowEnabled] = useState(false);
  const computedColorScheme = useComputedColorScheme('light');
  const [categoryTags, setCategoryTags] = useState<string[]>(pattern.categories ? pattern.categories.split(',') : []);

  const [status, setStatus] = useState<string>('');





  const handleUpdateStatus = async (newStatus: string) => {
    // 1. Store the previous status in case we need to roll back
    const previousStatus = status ?? pattern.status ?? '';

    // 2. Optimistic Update: Set the UI state immediately
    setStatus(newStatus);

    // 3. Call the server
    try {
      const result = await updatePatternStatus(pattern.id, newStatus);

      if (!result.success) {
        throw new Error('Database update failed');
      }
    } catch {
      // 4. Rollback on error
      setStatus(previousStatus);
      alert('Failed to save status. Reverting...');
    }
  };


  return (
    <Paper pl="xl" radius="md">
      <Button
        component={Link}
        href="/crafting/patterns"
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
        pl={0} // Removes the side padding so the icon aligns perfectly with your title
      >
        Back to Patterns
      </Button>
      {/* FORM 1: METADATA */}

      <form action={async (formData) => {
        // Save the tags
        formData.set('hookSizes', hookTags.join(','));
        formData.set('yarnWeights', weightTags.join(','));
        formData.set('categories', categoryTags.join(','));

        // Preserve the rich text so the server doesn't wipe it!

        await updatePattern(formData);
        setIsEditingDetails(false);
      }}>
        <input type="hidden" name="patternId" value={pattern.id} />

        {/* 1. Header Row */}
        <Group justify="space-between" align="flex-start" mb="sm">
          {isEditingDetails ? (
            /* RESTORED: The form inputs for editing! */
            <Stack style={{ flexGrow: 1 }}>
              <TextInput name="title" label="Project Name" defaultValue={pattern.title} required />
              <TextInput name="sourceUrl" label="SourceUrl" defaultValue={pattern.sourceUrl ?? ''} />
              <Group grow>
                {/* <TextInput name="yarnUsed" label="Yarn Brand/Line" defaultValue={pattern.yarnUsed || ''} /> */}
                {/* <TextInput name="colors" label="Colors" defaultValue={pattern.colors || ''} /> */}
              </Group>
              <Group grow align="flex-start">
                <TagsInput label="Hook Sizes" placeholder="5mm" value={hookTags} onChange={setHookTags} clearable />
                <TagsInput label="Yarn Weights" placeholder="Worsted" value={weightTags} onChange={setWeightTags} clearable />
                <TagsInput label="Categories" placeholder="e.g., Blanket" value={categoryTags} onChange={setCategoryTags} clearable />
              </Group>
            </Stack>
          ) : (
            <Box>
              <Group>
                <Title order={2}>{pattern.title}</Title>
                <Anchor fw={500} href={pattern.sourceUrl ?? ''} ml={4} target="_blank"
                  rel="noopener noreferrer">
                  <IconExternalLink />
                </Anchor>
              </Group>
            </Box>
          )}

          {/* The Button & Status Action Group */}
          <Stack align="flex-end">
            <Group>
              {!isEditingDetails && (
                <Group gap="sm">
                  <Select
                    w={140}
                    placeholder="Status"
                    data={[
                      { value: 'Not Started', label: 'Not Started' },
                      { value: 'WIP', label: 'WIP' },
                      { value: 'Completed', label: 'Completed' },
                      { value: 'On Hold', label: 'On Hold' },
                      { value: 'Did Not Like', label: 'Did Not Like' },
                    ]}
                    value={status || pattern.status}
                    onChange={(val) => val && handleUpdateStatus(val)}
                  />

                </Group>
              )}
              <Button variant="outline" onClick={() => setIsEditingDetails(!isEditingDetails)}>
                {isEditingDetails ? 'Cancel' : 'Edit Details'}
              </Button>
              <Button onClick={openProject}>Start New Project</Button>
            </Group>

            {isEditingDetails && (
              <Button type="submit" color="olive.7">
                Save Details
              </Button>
            )}
          </Stack>
        </Group>

        {/* 2. Badge Row (Separated so it doesn't mess up button wrapping!) */}
        {!isEditingDetails && (
          <Group gap="xs" mb="md">
            {pattern.status && <Badge color="neutrals.7" variant="outline" >Status: {status || pattern.status}</Badge>}
            {/* {pattern.yarnUsed && <Badge color="neutrals.5" variant="outline" leftSection={<IconNeedleThread size={12} />}>{pattern.yarnUsed}</Badge>} */}
            {categoryTags.map(tag => <Badge key={`cat-${tag}`} color="olive.6" variant="filled">{tag}</Badge>)}
            {hookTags.map(tag => <Badge key={`hook-${tag}`} color="rust.5" variant="outline">Hook: {tag}</Badge>)}
            {weightTags.map(tag => <Badge key={`weight-${tag}`} color="mustard.6" variant="outline">Weight: {tag}</Badge>)}

          </Group>
        )}
      </form>
      <Divider my="sm" />

      {/* FORM 2: PATTERN CONTENT */}
      <form action={async (formData) => {
        formData.set('patternText', patternEditor?.getHTML() || '');
        formData.set('materials', materialsEditor?.getHTML() || '');
        formData.set('abbreviations', abbreviationsEditor?.getHTML() || '');
        formData.set('sizing', sizingEditor?.getHTML() || '');
        formData.set('patternNotes', notesEditor?.getHTML() || '');
        // Preserve metadata
        formData.set('title', pattern.title);
        formData.set('sourceUrl', pattern.sourceUrl ?? '');
        formData.set('hookSizes', hookTags.join(','));
        formData.set('yarnWeights', weightTags.join(','));
        await updatePattern(formData);
        setIsEditingTabs(false);
      }}>
        <input type="hidden" name="patternId" value={pattern.id} />

        <Group justify="space-between" mb="sm">
          <Title order={4}>Pattern Content</Title>
          <Group>
            <Button variant="light" onClick={() => setIsEditingTabs(!isEditingTabs)}>
              {isEditingTabs ? 'Cancel Editing' : 'Edit Text'}
            </Button>
            {isEditingTabs && <Button type="submit" color="green">Save Text</Button>}
          </Group>
        </Group>

        <Tabs defaultValue="pattern" variant="outline" keepMounted styles={{ list: { flexWrap: 'nowrap', overflowX: 'auto' } }}>
          <Tabs.List>
            <Tabs.Tab value="pattern">Pattern</Tabs.Tab>
            <Tabs.Tab value="materials">Materials</Tabs.Tab>
            <Tabs.Tab value="abbreviations">Abbreviations</Tabs.Tab>
            <Tabs.Tab value="sizing">Sizing</Tabs.Tab>
            <Tabs.Tab value="notes">Notes</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pattern" p="md" bg={colorEnabled && !isEditingTabs ? 'gray.0' : 'transparent'}>
            {!isEditingTabs && (
              <Group justify="flex-end" mb="sm">
                <Switch
                  checked={rainbowEnabled}
                  onChange={(event) => setRainbowEnabled(event.currentTarget.checked)}
                  label="Rainbow Steps"
                  color="grape"
                />
              </Group>
            )}


            <Box

            >


              {/* THE CONDITIONAL RENDER: Show Rainbow HTML, or show Tiptap */}
              {rainbowEnabled && !isEditingTabs ? (
                // If Rainbow is ON and we aren't editing, show the highlighted version
                <Typography style={{ lineHeight: 1.8 }}>
                  <div dangerouslySetInnerHTML={{
                    __html: processWholePattern(patternEditor?.getHTML() || '', computedColorScheme)
                  }} />
                </Typography>
              ) : (
                // Otherwise, show the standard Tiptap Editor
                <RichTextEditor editor={patternEditor} style={{ border: isEditingTabs ? undefined : 'none' }}
                styles={{
                    content: {
                      '& .ProseMirror': {
                        overflowX: 'hidden', 
                      },
                      '& .ProseMirror img': {
                     maxWidth: '100%', 
                      height: 'auto !important'
                      },
                      '& .ProseMirror span.resizeCursor': {
                        display: 'inline-block',
                        maxWidth: '100%',
                      }
                    }
                  }}
                >
                  {isEditingTabs && (
                    <RichTextEditor.Toolbar sticky stickyOffset={60}>
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold /><RichTextEditor.Italic /><RichTextEditor.Strikethrough /><RichTextEditor.Highlight />
                        <RichTextEditor.ColorPicker colors={['#fa5252', '#4c6ef5', '#12b886', '#fab005']} />
                      </RichTextEditor.ControlsGroup>
                    </RichTextEditor.Toolbar>
                  )}
                  <RichTextEditor.Content />
                </RichTextEditor>
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="materials" p="md"><TabContent editor={materialsEditor} isEditing={isEditingTabs} originalContent={pattern.materials} fallbackText="No materials listed." /></Tabs.Panel>
          <Tabs.Panel value="abbreviations" p="md"><TabContent editor={abbreviationsEditor} isEditing={isEditingTabs} originalContent={pattern.abbreviations} fallbackText="No abbreviations listed." /></Tabs.Panel>
          <Tabs.Panel value="sizing" p="md"><TabContent editor={sizingEditor} isEditing={isEditingTabs} originalContent={pattern.sizing} fallbackText="No sizing info added." /></Tabs.Panel>
          <Tabs.Panel value="notes" p="md"><TabContent editor={notesEditor} isEditing={isEditingTabs} originalContent={pattern.patternNotes} fallbackText="No notes added." /></Tabs.Panel>
        </Tabs>
      </form>

      <Divider my="sm" />
      <Box mt="xl">
        <ImageGallery
          images={images}
          title="Pattern Photos"
          targetId={pattern.id}
          idFieldName="patternId"
          revalidateUrl={`/crafting/patterns/${pattern.id}`}
          uploadAction={uploadPatternImage}
          deleteAction={deleteImage}
          coverImagePath={pattern.coverImagePath}
          setCoverAction={setCoverImage}
        />
      </Box>

      {/* <Modal opened={projectModalOpened} onClose={closeProject} title="Start a New Project" centered>
        <form action={spawnProject}>
          <input type="hidden" name="patternId" value={pattern.id} />
          <Stack>
            <TextInput label="Project Name" name="title" required />
            <TextInput label="Yarn Brand/Line" name="yarnUsed" />
            <TextInput label="Colors (comma separated)" name="colors" />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeProject}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </Group>
          </Stack>
        </form>
      </Modal> */}
     
    </Paper>
  );
}