// src/app/crafting/patterns/preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { TextInput, Button, Group, Title, Container, Paper, Stack, Input } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { useRouter } from 'next/navigation';
import { useCraftingEditor } from '@/hooks/useCraftingEditor'; 
import { CraftingEditorToolbar } from '@/components/CraftingEditorToolbar'; 
import { createPatternFromImport } from '../_actions/pattern_actions';

export default function PatternPreviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Initialize independent editors for all 5 text-heavy fields
  const materialsEditor = useCraftingEditor('', true);
  const sizingEditor = useCraftingEditor('', true);
  const abbreviationsEditor = useCraftingEditor('', true);
  const notesEditor = useCraftingEditor('', true);
  const contentEditor = useCraftingEditor('', true);

  useEffect(() => {
    const stored = sessionStorage.getItem('patternImportPreview');
    if (stored) {
      const parsed = JSON.parse(stored);
      setFormData(parsed);
      
      // 2. Hydrate ALL editor instances once data lands from sessionStorage
      // We wait until the editors exist, then push the HTML text into them
      if (!isHydrated && materialsEditor && sizingEditor && abbreviationsEditor && notesEditor && contentEditor) {
        materialsEditor.commands.setContent(parsed.materials || '');
        sizingEditor.commands.setContent(parsed.sizing || '');
        abbreviationsEditor.commands.setContent(parsed.abbreviations || '');
        notesEditor.commands.setContent(parsed.notes || '');
        contentEditor.commands.setContent(parsed.content || '');
        setIsHydrated(true); // Ensure we only do this once
      }
    } else {
      router.push('/crafting/patterns');
    }
  }, [router, isHydrated, materialsEditor, sizingEditor, abbreviationsEditor, notesEditor, contentEditor]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 3. Pull the latest HTML from every editor instance
      const payload = {
        ...formData,
        materials: materialsEditor ? materialsEditor.getHTML() : '',
        sizing: sizingEditor ? sizingEditor.getHTML() : '',
        abbreviations: abbreviationsEditor ? abbreviationsEditor.getHTML() : '',
        notes: notesEditor ? notesEditor.getHTML() : '',
        content: contentEditor ? contentEditor.getHTML() : '',
      };

      const newPatternId = await createPatternFromImport(payload);
      
      sessionStorage.removeItem('patternImportPreview');
      router.push(`/crafting/patterns/${newPatternId}`);
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save pattern.");
      setIsSaving(false);
    }
  };

  if (!formData) return null;

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Review Imported Pattern</Title>
        <Group>
          <Button variant="default" onClick={() => router.back()} disabled={isSaving}>Discard</Button>
          <Button color="olive" onClick={handleSave} loading={isSaving}>Save to Database</Button>
        </Group>
      </Group>

      <Paper p="md" withBorder>
        <Stack>
          <TextInput 
            label="Title" 
            value={formData.title || ''} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
          />
          <TextInput 
            label="Categories" 
            value={formData.categories || ''} 
            onChange={(e) => setFormData({...formData, categories: e.target.value})} 
          />
          
          <Group grow>
             <TextInput 
              label="Hooks" 
              value={formData.hooks || ''} 
              onChange={(e) => setFormData({...formData, hooks: e.target.value})} 
            />
             <TextInput 
              label="Weights" 
              value={formData.weights || ''} 
              onChange={(e) => setFormData({...formData, weights: e.target.value})} 
            />
          </Group>
          <TextInput  label="Source URL" value={formData.sourceUrl ?? ''}
          onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}  />

          {/* ✨ Replaced all 5 textareas with the Rich Text Editor Setup */}
          
          <Input.Wrapper label="Materials">
            <RichTextEditor editor={materialsEditor} mt="xs">
              <CraftingEditorToolbar />
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>

          <Input.Wrapper label="Sizing & Gauge">
            <RichTextEditor editor={sizingEditor} mt="xs">
              <CraftingEditorToolbar />
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>

          <Input.Wrapper label="Abbreviations">
            <RichTextEditor editor={abbreviationsEditor} mt="xs">
              <CraftingEditorToolbar />
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>

          <Input.Wrapper label="Notes / About">
            <RichTextEditor editor={notesEditor} mt="xs">
              <CraftingEditorToolbar />
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>

          <Input.Wrapper label="Pattern Instructions">
            <RichTextEditor editor={contentEditor} mt="xs">
              <CraftingEditorToolbar />
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>

        </Stack>
      </Paper>
    </Container>
  );
}