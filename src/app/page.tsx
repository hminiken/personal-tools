import { Paper, Title, SimpleGrid, Card, Text, Button } from '@mantine/core';
import Link from 'next/link';
import { getDashboardData } from './_actions/actions';

export default async function Home() {
  const { latestProject, latestPattern } = await getDashboardData();

  return (
    <Paper p="xl">
      <Title mb="xl">Crafting Dashboard</Title>
      
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        
        {/* Latest Project Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3}>Latest Project</Title>
          {latestProject ? (
            <>
              <Text mt="md" fw={500}>{latestProject.title}</Text>
              
                <Button component="a" mt="md" fullWidth bg={"olive.6"}  href={`/crafting/projects/${latestProject.id}`}>
                  Continue Project
                </Button>
            </>
          ) : (
            <Text mt="md" c="dimmed">No projects started yet.</Text>
          )}
        </Card>

        {/* Latest Pattern Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3}>Latest Pattern</Title>
          {latestPattern ? (
            <>
              <Text mt="md" fw={500}>{latestPattern.title}</Text>
              
              {/* THE FIX: Wrap the button with Link and use legacyBehavior */}
                <Button component="a" mt="md" fullWidth variant="light" bg={"olive.2"} href={`/crafting/patterns/${latestPattern.id}`}>
                  View Pattern
                </Button>
            </>
          ) : (
            <Text mt="md" c="dimmed">No patterns added yet.</Text>
          )}
        </Card>

      </SimpleGrid>
    </Paper>
  );
}