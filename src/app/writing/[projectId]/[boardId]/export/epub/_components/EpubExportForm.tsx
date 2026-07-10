'use client';

import { useState } from 'react';
import {
  Stack, Group, Text, Button, TextInput, Select, SegmentedControl,
  Switch, Divider, Radio, Paper, Loader, Alert, Box, Badge, Accordion,
} from '@mantine/core';
import { IconDownload, IconAlertCircle } from '@tabler/icons-react';
import type { EpubSettings, NumberStyle, HeadingContent } from '@/utils/epub';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae.',
  'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti, quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
];

const NUM_SAMPLE: Record<NumberStyle, string> = { numeral: '1', roman: 'I', word: 'One' };
const FONT_SIZE_PX: Record<EpubSettings['fontSize'], number> = { small: 13.5, medium: 15, large: 17.25 };
const LINE_HEIGHT_VAL: Record<EpubSettings['lineSpacing'], number> = { normal: 1.6, relaxed: 1.9, loose: 2.2 };

function headingContentOptions(prefix: string, nameExample: string) {
  return [
    { value: 'none', label: 'None' },
    { value: 'name-only', label: `Name only  ("${nameExample}")` },
    { value: 'number-only', label: `Number only  ("${prefix} 1")` },
    { value: 'number-name', label: `Number: Name  ("${prefix} 1: ${nameExample}")` },
  ];
}

const NUMBER_STYLE_OPTIONS = [
  { value: 'numeral', label: '1, 2, 3' },
  { value: 'roman', label: 'I, II, III' },
  { value: 'word', label: 'One, Two, Three' },
];

const SCENE_BREAKS = [
  { value: '* * *', label: '* * *' },
  { value: '· · ·', label: '· · ·' },
  { value: '—', label: '—' },
  { value: '#', label: '#' },
  { value: '', label: 'None (cards run together)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
];

// ─── HeadingLevelConfig ───────────────────────────────────────────────────────

function HeadingLevelConfig({
  label,
  description,
  prefix,
  nameExample,
  content,
  onContentChange,
  numberStyle,
  onNumberStyleChange,
}: {
  label: string;
  description?: string;
  prefix: string;
  nameExample: string;
  content: HeadingContent;
  onContentChange: (v: HeadingContent) => void;
  numberStyle: NumberStyle;
  onNumberStyleChange: (v: NumberStyle) => void;
}) {
  const showNumberStyle = content === 'number-only' || content === 'number-name';
  const options = headingContentOptions(prefix, nameExample);

  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={600} mb={description ? 2 : 6}>{label}</Text>
        {description && <Text size="xs" c="dimmed" mb={6}>{description}</Text>}
        <Select
          data={options}
          value={content}
          onChange={(v) => onContentChange((v ?? 'none') as HeadingContent)}
          allowDeselect={false}
        />
      </div>
      {showNumberStyle && (
        <div>
          <Text size="xs" c="dimmed" mb={4}>Number format</Text>
          <SegmentedControl
            size="xs"
            data={NUMBER_STYLE_OPTIONS}
            value={numberStyle}
            onChange={(v) => onNumberStyleChange(v as NumberStyle)}
            color="dark"
          />
        </div>
      )}
    </Stack>
  );
}

// ─── EpubPreview ─────────────────────────────────────────────────────────────

function sampleHeading(content: HeadingContent, numStyle: NumberStyle, prefix: string, name: string): string {
  if (content === 'none') return '';
  if (content === 'name-only') return name;
  const numLabel = `${prefix} ${NUM_SAMPLE[numStyle]}`;
  if (content === 'number-only') return numLabel;
  return `${numLabel}: ${name}`;
}

function EpubPreview({
  structure, paragraphStyle, fontSize, lineSpacing,
  groupHeadingContent, groupNumberStyle,
  listHeadingContent, listNumberStyle,
  cardHeadingContent, cardNumberStyle,
  sceneBreak,
}: {
  structure: EpubSettings['structure'];
  paragraphStyle: 'indent' | 'space';
  fontSize: EpubSettings['fontSize'];
  lineSpacing: EpubSettings['lineSpacing'];
  groupHeadingContent: HeadingContent;
  groupNumberStyle: NumberStyle;
  listHeadingContent: HeadingContent;
  listNumberStyle: NumberStyle;
  cardHeadingContent: HeadingContent;
  cardNumberStyle: NumberStyle;
  sceneBreak: string;
}) {
  const lh = LINE_HEIGHT_VAL[lineSpacing];
  const fs = FONT_SIZE_PX[fontSize];

  // Chapter heading: list in lists-as-chapters, card in cards-as-chapters
  const chapterHeading =
    structure === 'lists-as-chapters'
      ? sampleHeading(listHeadingContent, listNumberStyle, 'Chapter', 'The Forest Path')
      : sampleHeading(cardHeadingContent, cardNumberStyle, 'Chapter', 'The Forest Path');

  // Part heading: group is always the top-level part;
  // in cards-as-chapters, lists are mid-level parts
  const partHeading = sampleHeading(groupHeadingContent, groupNumberStyle, 'Part', 'Act I');

  const midPartHeading =
    structure === 'cards-as-chapters' && groupHeadingContent === 'none'
      ? sampleHeading(listHeadingContent, listNumberStyle, 'Part', 'Chapter One')
      : null;

  const p = (first: boolean) =>
    paragraphStyle === 'indent'
      ? { textIndent: first ? '0' : '1.5em', margin: '0', lineHeight: lh }
      : { textIndent: '0', marginBottom: '0.8em', lineHeight: lh };

  return (
    <div style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: fs,
      lineHeight: lh,
      padding: '24px 36px',
      background: '#faf9f6',
      border: '1px solid var(--mantine-color-gray-3)',
      borderRadius: 6,
      maxHeight: 440,
      overflowY: 'auto',
      color: '#1a1a1a',
    }}>

      {/* Part strip */}
      {(partHeading || midPartHeading) && (
        <div style={{
          textAlign: 'center',
          paddingBottom: 16,
          marginBottom: 20,
          borderBottom: '1px solid #ddd',
          fontSize: '1.3em',
          fontWeight: 'normal',
          letterSpacing: '0.02em',
        }}>
          {partHeading || midPartHeading}
        </div>
      )}

      {/* Chapter heading */}
      {chapterHeading && (
        <div style={{
          textAlign: 'center',
          fontSize: '1.3em',
          fontWeight: 'normal',
          margin: '0 0 1.5em',
          letterSpacing: '0.01em',
        }}>
          {chapterHeading}
        </div>
      )}

      {/* Scene 1 */}
      <p style={p(true)}>{LOREM[0]}</p>
      <p style={p(false)}>{LOREM[1]}</p>

      {/* Scene break + scene 2 (only meaningful in lists-as-chapters) */}
      {structure === 'lists-as-chapters' && (
        <>
          <div style={{
            textAlign: 'center',
            margin: '1.4em 0',
            color: '#777',
            letterSpacing: sceneBreak.length > 1 ? '0.15em' : undefined,
            minHeight: '1em',
          }}>
            {sceneBreak || ' '}
          </div>
          <p style={p(true)}>{LOREM[2]}</p>
          <p style={p(false)}>{LOREM[3]}</p>
        </>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  projectId: number;
  boardId: number;
  defaultTitle: string;
}

// ─── Main form ───────────────────────────────────────────────────────────────

export default function EpubExportForm({ projectId, boardId, defaultTitle }: Props) {
  // Metadata
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('en');

  // Structure
  const [structure, setStructure] = useState<EpubSettings['structure']>('lists-as-chapters');

  // Headings — per level
  const [groupHeadingContent, setGroupHeadingContent] = useState<HeadingContent>('none');
  const [groupNumberStyle, setGroupNumberStyle] = useState<NumberStyle>('roman');
  const [listHeadingContent, setListHeadingContent] = useState<HeadingContent>('number-name');
  const [listNumberStyle, setListNumberStyle] = useState<NumberStyle>('numeral');
  const [cardHeadingContent, setCardHeadingContent] = useState<HeadingContent>('number-name');
  const [cardNumberStyle, setCardNumberStyle] = useState<NumberStyle>('numeral');

  // Scene break (lists-as-chapters only)
  const [sceneBreak, setSceneBreak] = useState('* * *');

  // Typography
  const [paragraphStyle, setParagraphStyle] = useState<'indent' | 'space'>('indent');
  const [fontSize, setFontSize] = useState<EpubSettings['fontSize']>('medium');
  const [lineSpacing, setLineSpacing] = useState<EpubSettings['lineSpacing']>('normal');

  // ToC
  const [includeToc, setIncludeToc] = useState(true);
  const [tocDepth, setTocDepth] = useState<1 | 2>(2);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setError(null);
    setLoading(true);

    const settings: EpubSettings = {
      title: title.trim(), author: author.trim(), language, structure,
      groupHeadingContent, groupNumberStyle,
      listHeadingContent, listNumberStyle,
      cardHeadingContent, cardNumberStyle,
      sceneBreak, paragraphStyle, fontSize, lineSpacing,
      includeToc, tocDepth,
    };

    try {
      const res = await fetch(`/writing/${projectId}/${boardId}/export/epub/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.trim().replace(/[^a-z0-9\- ]/gi, '_')}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="md" style={{ maxWidth: 600 }}>

      <Accordion
        multiple
        defaultValue={['metadata', 'structure', 'headings', 'typography', 'preview']}
        variant="separated"
        styles={{ item: { borderRadius: 6 } }}
      >

        {/* ── Metadata ──────────────────────────────────────────────── */}
        <Accordion.Item value="metadata">
          <Accordion.Control>
            <Text fw={600} size="sm">Book metadata</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <TextInput
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                placeholder="My Novel"
                required
              />
              <TextInput
                label="Author"
                value={author}
                onChange={(e) => setAuthor(e.currentTarget.value)}
                placeholder="Your name"
              />
              <Select
                label="Language"
                data={LANGUAGES}
                value={language}
                onChange={(v) => setLanguage(v ?? 'en')}
                allowDeselect={false}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Structure ─────────────────────────────────────────────── */}
        <Accordion.Item value="structure">
          <Accordion.Control>
            <Text fw={600} size="sm">Structure</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" c="dimmed" mb="sm">
              How does your board hierarchy map to the epub?
            </Text>
            <Stack gap="sm">
              <Paper
                withBorder p="md"
                style={{ cursor: 'pointer', borderColor: structure === 'lists-as-chapters' ? 'var(--mantine-color-dark-6)' : undefined }}
                onClick={() => setStructure('lists-as-chapters')}
              >
                <Group gap="sm" align="flex-start">
                  <Radio checked={structure === 'lists-as-chapters'} onChange={() => setStructure('lists-as-chapters')} label="" mt={2} />
                  <div>
                    <Text fw={600} size="sm">Lists are chapters, cards are scenes</Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      Each list becomes one chapter. Cards within a list are combined as scenes,
                      separated by your chosen scene break.
                    </Text>
                    <Group gap={4} mt="xs">
                      <Badge size="xs" variant="light" color="grape">Groups → Parts</Badge>
                      <Badge size="xs" variant="light" color="blue">Lists → Chapters</Badge>
                      <Badge size="xs" variant="light" color="teal">Cards → Scenes</Badge>
                    </Group>
                  </div>
                </Group>
              </Paper>

              <Paper
                withBorder p="md"
                style={{ cursor: 'pointer', borderColor: structure === 'cards-as-chapters' ? 'var(--mantine-color-dark-6)' : undefined }}
                onClick={() => setStructure('cards-as-chapters')}
              >
                <Group gap="sm" align="flex-start">
                  <Radio checked={structure === 'cards-as-chapters'} onChange={() => setStructure('cards-as-chapters')} label="" mt={2} />
                  <div>
                    <Text fw={600} size="sm">Cards are chapters</Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      Each card becomes its own chapter file. Lists and groups can optionally
                      become part headers.
                    </Text>
                    <Group gap={4} mt="xs">
                      <Badge size="xs" variant="light" color="grape">Groups → Sections</Badge>
                      <Badge size="xs" variant="light" color="blue">Lists → Parts</Badge>
                      <Badge size="xs" variant="light" color="teal">Cards → Chapters</Badge>
                    </Group>
                  </div>
                </Group>
              </Paper>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Headings ──────────────────────────────────────────────── */}
        <Accordion.Item value="headings">
          <Accordion.Control>
            <Text fw={600} size="sm">Headings</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              {structure === 'lists-as-chapters' ? (
                <>
                  <HeadingLevelConfig
                    label="Chapter heading"
                    description="Shown at the top of each chapter (from the list name)"
                    prefix="Chapter"
                    nameExample="The Forest Path"
                    content={listHeadingContent}
                    onContentChange={setListHeadingContent}
                    numberStyle={listNumberStyle}
                    onNumberStyleChange={setListNumberStyle}
                  />
                  <Divider variant="dashed" />
                  <HeadingLevelConfig
                    label="Part heading"
                    description="Full-page header before each group of chapters (from the group name)"
                    prefix="Part"
                    nameExample="Act I"
                    content={groupHeadingContent}
                    onContentChange={setGroupHeadingContent}
                    numberStyle={groupNumberStyle}
                    onNumberStyleChange={setGroupNumberStyle}
                  />
                </>
              ) : (
                <>
                  <HeadingLevelConfig
                    label="Chapter heading"
                    description="Shown at the top of each chapter (from the card title)"
                    prefix="Chapter"
                    nameExample="The Forest Path"
                    content={cardHeadingContent}
                    onContentChange={setCardHeadingContent}
                    numberStyle={cardNumberStyle}
                    onNumberStyleChange={setCardNumberStyle}
                  />
                  <Divider variant="dashed" />
                  <HeadingLevelConfig
                    label="Part heading"
                    description="Full-page header before each group of chapters (from the list name)"
                    prefix="Part"
                    nameExample="Chapter One"
                    content={listHeadingContent}
                    onContentChange={setListHeadingContent}
                    numberStyle={listNumberStyle}
                    onNumberStyleChange={setListNumberStyle}
                  />
                  <Divider variant="dashed" />
                  <HeadingLevelConfig
                    label="Section heading"
                    description="High-level header before each group, above the part headers (from the group name)"
                    prefix="Part"
                    nameExample="Act I"
                    content={groupHeadingContent}
                    onContentChange={setGroupHeadingContent}
                    numberStyle={groupNumberStyle}
                    onNumberStyleChange={setGroupNumberStyle}
                  />
                </>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Scene breaks (lists-as-chapters only) ─────────────────── */}
        {structure === 'lists-as-chapters' && (
          <Accordion.Item value="scene-break">
            <Accordion.Control>
              <Text fw={600} size="sm">Scene breaks</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" mb="sm">
                Separator inserted between cards within a chapter.
              </Text>
              <Select
                data={SCENE_BREAKS}
                value={sceneBreak}
                onChange={(v) => setSceneBreak(v ?? '* * *')}
                allowDeselect={false}
              />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* ── Typography ────────────────────────────────────────────── */}
        <Accordion.Item value="typography">
          <Accordion.Control>
            <Text fw={600} size="sm">Typography</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500} mb="xs">Paragraph style</Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { value: 'indent', label: 'First-line indent' },
                    { value: 'space', label: 'Space between' },
                  ]}
                  value={paragraphStyle}
                  onChange={(v) => setParagraphStyle(v as 'indent' | 'space')}
                  color="dark"
                />
                <Text size="xs" c="dimmed" mt={4}>
                  {paragraphStyle === 'indent'
                    ? 'Literary style: paragraphs indent, no gap between them.'
                    : 'Modern style: paragraphs have space between them, no indent.'}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500} mb="xs">Font size</Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  value={fontSize}
                  onChange={(v) => setFontSize(v as EpubSettings['fontSize'])}
                  color="dark"
                />
              </div>
              <div>
                <Text size="sm" fw={500} mb="xs">Line spacing</Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'relaxed', label: 'Relaxed' },
                    { value: 'loose', label: 'Loose' },
                  ]}
                  value={lineSpacing}
                  onChange={(v) => setLineSpacing(v as EpubSettings['lineSpacing'])}
                  color="dark"
                />
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Table of contents ─────────────────────────────────────── */}
        <Accordion.Item value="toc">
          <Accordion.Control>
            <Text fw={600} size="sm">Table of contents</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Switch
                label="Include table of contents"
                checked={includeToc}
                onChange={(e) => setIncludeToc(e.currentTarget.checked)}
                color="dark"
              />
              {includeToc && (
                <div>
                  <Text size="sm" fw={500} mb="xs">Depth</Text>
                  <SegmentedControl
                    data={[
                      { value: '1', label: 'Top level only' },
                      { value: '2', label: 'Two levels' },
                    ]}
                    value={String(tocDepth)}
                    onChange={(v) => setTocDepth(Number(v) as 1 | 2)}
                    color="dark"
                  />
                </div>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Preview ───────────────────────────────────────────────── */}
        <Accordion.Item value="preview">
          <Accordion.Control>
            <Text fw={600} size="sm">Preview</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="xs" c="dimmed" mb="sm">
              Sample chapter with lorem ipsum — updates live as you change settings.
            </Text>
            <EpubPreview
              structure={structure}
              paragraphStyle={paragraphStyle}
              fontSize={fontSize}
              lineSpacing={lineSpacing}
              groupHeadingContent={groupHeadingContent}
              groupNumberStyle={groupNumberStyle}
              listHeadingContent={listHeadingContent}
              listNumberStyle={listNumberStyle}
              cardHeadingContent={cardHeadingContent}
              cardNumberStyle={cardNumberStyle}
              sceneBreak={sceneBreak}
            />
          </Accordion.Panel>
        </Accordion.Item>

      </Accordion>

      {/* ── Export button ─────────────────────────────────────────────── */}
      <Box>
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}
        <Button
          size="md"
          color="dark"
          leftSection={loading ? <Loader size={16} color="white" /> : <IconDownload size={18} />}
          onClick={handleExport}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Generating epub…' : 'Download .epub'}
        </Button>
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          Only cards marked &ldquo;include in compile&rdquo; are exported.
          Images in card content are not embedded.
        </Text>
      </Box>

    </Stack>
  );
}
