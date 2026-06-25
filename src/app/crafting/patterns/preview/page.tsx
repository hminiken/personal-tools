// src/app/crafting/patterns/preview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { TextInput, Button, Group, Title, Container, Paper, Stack, Input, MultiSelect, Select } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { useRouter } from 'next/navigation';
import { useCraftingEditor } from '@/hooks/useCraftingEditor';
import { CraftingEditorToolbar } from '@/components/CraftingEditorToolbar';
import { createPatternFromImport } from '../_actions/pattern_actions';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';
import { weightOptionsWith, normalizeYarnWeights } from '@/utils/yarnWeights';
import { hookOptionsWith, normalizeHookSizes } from '@/utils/hookSizes';
import { needleOptionsWith, normalizeNeedleSizes, type CraftType } from '@/utils/knittingNeedles';

const CRAFT_OPTIONS = [
  { value: 'crochet', label: 'Crochet' },
  { value: 'knitting', label: 'Knitting' },
];

export default function PatternPreviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string | null> | null>(null);
  const [weightTags, setWeightTags] = useState<string[]>([]);
  const [hookTags, setHookTags] = useState<string[]>([]);
  const [craftType, setCraftType] = useState<CraftType>('crochet');
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

      // Normalize the AI's free-text weights ("Worsted, DK, 4 ply") down to our
      // 8 canonical CYC weights for the dropdown.
      setWeightTags(normalizeYarnWeights(parsed.weights));

      // Craft type drives whether the tool field is hooks or needles. Trust the
      // AI's inference, defaulting to crochet.
      const craft: CraftType = parsed.craftType === 'knitting' ? 'knitting' : 'crochet';
      setCraftType(craft);

      // Same for the AI's free-text tool sizes, normalized to the right chart.
      setHookTags(
        craft === 'knitting'
          ? normalizeNeedleSizes(parsed.hooks)
          : normalizeHookSizes(parsed.hooks)
      );

      // 2. Hydrate ALL editor instances once data lands from sessionStorage
      // We wait until the editors exist, then push the HTML text into them.
      // Content is sanitized the same way the saved-pattern viewer does, so
      // broken AI <img> attributes don't swallow following paragraphs.
      if (!isHydrated && materialsEditor && sizingEditor && abbreviationsEditor && notesEditor && contentEditor) {
        materialsEditor.commands.setContent(sanitizePatternHtml(parsed.materials) || '');
        sizingEditor.commands.setContent(sanitizePatternHtml(parsed.sizing) || '');
        abbreviationsEditor.commands.setContent(sanitizePatternHtml(parsed.abbreviations) || '');
        notesEditor.commands.setContent(sanitizePatternHtml(parsed.notes) || '');
        contentEditor.commands.setContent(sanitizePatternHtml(parsed.content) || '');
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
        craftType,
        hooks: hookTags.join(','),
        weights: weightTags.join(','),
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

          <Select
            label="Craft"
            data={CRAFT_OPTIONS}
            value={craftType}
            onChange={(val) => setCraftType((val as CraftType) || 'crochet')}
            allowDeselect={false}
          />

          <Group grow>
             <MultiSelect
              label={craftType === 'knitting' ? 'Needles' : 'Hooks'}
              placeholder={craftType === 'knitting' ? 'Select needle(s)' : 'Select hook(s)'}
              value={hookTags}
              onChange={setHookTags}
              data={craftType === 'knitting' ? needleOptionsWith(hookTags) : hookOptionsWith(hookTags)}
              clearable
              searchable
            />
             <MultiSelect
              label="Yarn Weights"
              placeholder="Select weight(s)"
              value={weightTags}
              onChange={setWeightTags}
              data={weightOptionsWith(weightTags)}
              clearable
              searchable
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