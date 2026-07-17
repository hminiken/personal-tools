'use client';

// src/app/misc/_components/MiscTools.tsx
import { useState } from 'react';
import { Button, Card, Code, Group, ScrollArea, Stack, Text, Badge } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { runScript, type RunResult } from '../_actions/scriptActions';
import type { ScriptInfo } from '../_lib/scripts';

function ToolCard({ script }: { script: ScriptInfo }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      setResult(await runScript(script.id));
    } catch (e) {
      setResult({ ok: false, output: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Group gap="xs">
            <Text fw={600}>{script.label}</Text>
            {result && (
              <Badge color={result.ok ? 'green' : 'red'} variant="light">
                {result.ok ? 'Done' : 'Failed'}
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            {script.description}
          </Text>
        </div>
        <Button
          onClick={handleRun}
          loading={running}
          leftSection={<IconPlayerPlay size="1rem" stroke={1.5} />}
          style={{ flexShrink: 0 }}
        >
          Run
        </Button>
      </Group>

      {result && (
        <ScrollArea.Autosize mah={300} mt="md">
          <Code block>{result.output}</Code>
        </ScrollArea.Autosize>
      )}
    </Card>
  );
}

export function MiscTools({ scripts }: { scripts: ScriptInfo[] }) {
  return (
    <Stack gap="md" maw={800} py="md">
      {scripts.map((script) => (
        <ToolCard key={script.id} script={script} />
      ))}
    </Stack>
  );
}
