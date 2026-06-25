'use client';

import { Paper, Title, Text, Box, Button, Divider } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import CompiledCardEditor from './CompiledCardEditor';
import type { CompiledData, CompiledList, Card } from '../types';

function CardDivider() {
  return (
    <div
      aria-hidden
      style={{ borderTop: '2px dotted var(--mantine-color-gray-4)', margin: '20px 0' }}
    />
  );
}

// Cards of one list, flowing as a single chapter with dotted boundaries between them.
function CardList({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <Text c="dimmed" size="sm" fs="italic">No cards yet.</Text>;
  }
  return (
    <>
      {cards.map((card, i) => (
        <Box key={card.id}>
          {i > 0 && <CardDivider />}
          <CompiledCardEditor card={card} />
        </Box>
      ))}
    </>
  );
}

// A list with its own sub-heading (used inside group/board scope).
function ListBlock({ list }: { list: CompiledList }) {
  return (
    <Box mb="xl">
      <Title order={3} c="olive.8" mb="sm">{list.title}</Title>
      <CardList cards={list.cards} />
    </Box>
  );
}

export default function CompiledView({ data, backHref }: { data: CompiledData; backHref: string }) {
  const scopeLabel = data.scope === 'list' ? 'chapter' : data.scope;

  return (
    <Paper pl={{ base: 0, sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }}>
      <Button
        component={Link}
        href={backHref}
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
        pl={0}
      >
        Back to board
      </Button>

      <Title order={1}>{data.title}</Title>
      <Text c="dimmed" size="sm" mt={4} mb="lg">
        Compiled {scopeLabel} · one editor per card. Edits save automatically when you click out of a scene.
      </Text>
      <Divider mb="xl" />

      {/* Constrain prose to a comfortable reading width */}
      <Box maw={760} mx="auto">
        {data.scope === 'list' && <CardList cards={data.lists[0].cards} />}

        {data.scope === 'group' &&
          (data.groups[0].lists.length === 0 ? (
            <Text c="dimmed" size="sm" fs="italic">No lists in this group.</Text>
          ) : (
            data.groups[0].lists.map((list) => <ListBlock key={list.id} list={list} />)
          ))}

        {data.scope === 'board' &&
          data.groups.map((g) => (
            <Box key={g.id} mb={40}>
              <Title order={2} mb="md">{g.title}</Title>
              {g.lists.length === 0 ? (
                <Text c="dimmed" size="sm" fs="italic">No lists in this group.</Text>
              ) : (
                g.lists.map((list) => <ListBlock key={list.id} list={list} />)
              )}
            </Box>
          ))}
      </Box>
    </Paper>
  );
}
