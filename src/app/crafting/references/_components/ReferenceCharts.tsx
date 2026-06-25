'use client';

import { Container, Title, Text, Tabs, Table, Paper, Badge, Stack } from '@mantine/core';
import { IconChartBar, IconNeedleThread, IconRulerMeasure } from '@tabler/icons-react';
import {
  YARN_WEIGHT_CHART,
  HOOK_CONVERSION_CHART,
  NEEDLE_CONVERSION_CHART,
} from '../_data/charts';

export function ReferenceCharts() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xs" mb="xl">
        <Title order={2}>References</Title>
        <Text c="dimmed">
          Quick conversion charts for yarn weights and crochet hook / knitting needle sizes.
        </Text>
      </Stack>

      <Tabs defaultValue="yarn" variant="outline" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="yarn" leftSection={<IconChartBar size={16} />}>
            Yarn Weights
          </Tabs.Tab>
          <Tabs.Tab value="hooks" leftSection={<IconRulerMeasure size={16} />}>
            Crochet Hooks
          </Tabs.Tab>
          <Tabs.Tab value="needles" leftSection={<IconNeedleThread size={16} />}>
            Knitting Needles
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Master yarn weight chart ── */}
        <Tabs.Panel value="yarn">
          <Paper withBorder p={0} radius="md">
            <Table.ScrollContainer minWidth={760}>
              <Table striped highlightOnHover withColumnBorders verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Weight</Table.Th>
                    <Table.Th>Also called</Table.Th>
                    <Table.Th>Ply</Table.Th>
                    <Table.Th>Crochet hook</Table.Th>
                    <Table.Th>Knitting needle</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {YARN_WEIGHT_CHART.map((row) => (
                    <Table.Tr key={row.cyc}>
                      <Table.Td>
                        <Badge color="mustard.6" variant="light" mr="xs">{row.cyc}</Badge>
                        {row.name}
                      </Table.Td>
                      <Table.Td>{row.alsoCalled}</Table.Td>
                      <Table.Td>{row.ply}</Table.Td>
                      <Table.Td>{row.crochetHook}</Table.Td>
                      <Table.Td>{row.knitNeedle}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
          <Text size="xs" c="dimmed" mt="sm">
            Hook and needle ranges follow the Craft Yarn Council standard weight system. Treat them as
            starting points — always check your pattern and gauge.
          </Text>
        </Tabs.Panel>

        {/* ── Crochet hook conversions ── */}
        <Tabs.Panel value="hooks">
          <Paper withBorder p={0} radius="md">
            <Table.ScrollContainer minWidth={360}>
              <Table striped highlightOnHover withColumnBorders verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>US</Table.Th>
                    <Table.Th>UK</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {HOOK_CONVERSION_CHART.map((row) => (
                    <Table.Tr key={row.mm}>
                      <Table.Td fw={500}>{row.mm}</Table.Td>
                      <Table.Td>{row.us}</Table.Td>
                      <Table.Td>{row.uk}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>

        {/* ── Knitting needle conversions ── */}
        <Tabs.Panel value="needles">
          <Paper withBorder p={0} radius="md">
            <Table.ScrollContainer minWidth={280}>
              <Table striped highlightOnHover withColumnBorders verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Metric</Table.Th>
                    <Table.Th>US</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {NEEDLE_CONVERSION_CHART.map((row) => (
                    <Table.Tr key={row.mm}>
                      <Table.Td fw={500}>{row.mm}</Table.Td>
                      <Table.Td>{row.us}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
