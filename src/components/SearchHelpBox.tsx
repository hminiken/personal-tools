/* eslint-disable react/no-unescaped-entities */
import { Box, Collapse, Paper, Group, CloseButton, SimpleGrid, List, Text} from "@mantine/core";


export default 
function SearchHelpBox({ opened, onClose, availableFields }: { opened: boolean; onClose: () => void; availableFields: { key: string; type: string }[] }) {
  return (
    <Box mb={opened ? 'xl' : 0} style={{ transition: 'margin 200ms ease' }}>
      <Collapse expanded={opened}>
        <Paper withBorder p="md" radius="md" bg="mustard.0" bd="1px solid var(--mantine-color-mustard-2)">
          <Group justify="space-between" mb="xs" align="flex-start">
            <div>
              <Text size="sm" fw={600} c="mustard.9">Advanced Search Syntax</Text>
              <Text size="xs" c="mustard.8">Type normally to search titles, or use operators to filter specific fields:</Text>
            </div>
            <CloseButton size="sm" onClick={onClose} color="mustard.9" />
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
            <Box>
              <Text size="xs" fw={700} c="mustard.9" mb={4} tt="uppercase">Operators</Text>
              <List size="xs" spacing="xs" c="mustard.9">
                <List.Item><b>:</b> Includes (e.g., <code>categories:shirt</code>)</List.Item>
                <List.Item><b>=</b> Exact match (e.g., <code>status=WIP</code>)</List.Item>
                <List.Item><b>&gt; &lt;</b> Dates/Numbers (e.g., <code>createdAt&gt;2024-01-01</code>)</List.Item>
                <List.Item><b>" "</b> Exact phrases (e.g., <code>categories:"tank top"</code>)</List.Item>
              </List>
            </Box>
            <Box>
              <Text size="xs" fw={700} c="mustard.9" mb={4} tt="uppercase">Searchable Fields</Text>
              <Box style={{ maxHeight: '110px', overflowY: 'auto', paddingRight: '10px' }}>
                <List size="xs" spacing={2} c="mustard.9" listStyleType="none">
                  {availableFields.map((field) => (
                    <List.Item key={field.key}>
                      <code>{field.key}</code>
                      <Text span c="mustard.6" size="10px" ml={4}>({field.type})</Text>
                    </List.Item>
                  ))}
                  {availableFields.length === 0 && <Text size="xs" c="mustard.7">No fields detected.</Text>}
                </List>
              </Box>
            </Box>
          </SimpleGrid>
        </Paper>
      </Collapse>
    </Box>
  );
}