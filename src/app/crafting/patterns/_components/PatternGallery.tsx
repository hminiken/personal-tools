// src/app/crafting/patterns/_components/PatternGallery.tsx
'use client';

import { useState } from 'react';
import { 
  SimpleGrid, Card, Text, Badge, Group, TextInput, Title, Button, ActionIcon , Image
} from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { Pattern } from '../[id]/_components/PatternViewer';



export default function PatternGallery({ initialPatterns }: { initialPatterns: Pattern[] }) {
  // State to hold the user's search text
  const [searchQuery, setSearchQuery] = useState('');

  // Instantly filter the patterns based on the search query
  const filteredPatterns = initialPatterns.filter((pattern) =>
    pattern.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* HEADER & SEARCH BAR */}
      <Group justify="space-between" align="center" mb="xl">
        <Title order={2}>Pattern Library</Title>
        <Group>
          <TextInput
            placeholder="Search patterns..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            w={{ base: '100%', sm: 300 }} // Full width on mobile, 300px on desktop
          />
          {/* We'll wire this button up to a modal or action later! */}
          <Button leftSection={<IconPlus size={16} />}>
            New Pattern
          </Button>
        </Group>
      </Group>

      {/* THE GALLERY GRID */}
      {filteredPatterns.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          No patterns found matching "{searchQuery}".
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
          {filteredPatterns.map((pattern) => (
            <Card 
              key={pattern.id} 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder 
              component={Link} 
              href={`/crafting/patterns/${pattern.id}`}
              style={{ 
                textDecoration: 'none', 
                transition: 'transform 0.2s, box-shadow 0.2s' 
              }}
              // A quick little CSS hack in JS to make the card lift up when you hover over it
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
              }}
            >
                <Card.Section>
                    <Image
                    src={pattern.coverImagePath || 'https://placehold.co/600x400?text=No+Cover'}
                    height={160}
                    alt={pattern.title}
                    fallbackSrc="https://placehold.co/600x400?text=No+Image"
                    />
                </Card.Section>
              <Text fw={500} size="lg" mt="sm" mb="xs" c="dark">
                {pattern.title}
              </Text>
              
              <Group gap="xs" mb="md">
                {pattern.hookSize && <Badge color="blue" variant="light">{pattern.hookSize}</Badge>}
                {pattern.yarnWeight && <Badge color="grape" variant="light">{pattern.yarnWeight}</Badge>}
                {!pattern.hookSize && !pattern.yarnWeight && (
                  <Badge color="gray" variant="light">Draft</Badge>
                )}
              </Group>

              <Text size="sm" c="dimmed" lineClamp={2}>
                Click to view details and instructions.
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </div>
  );
}