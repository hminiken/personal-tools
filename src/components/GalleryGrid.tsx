import { SimpleGrid, Card, ActionIcon, Image, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { BaseGalleryItem } from "./ItemGallery";



export default 

function GalleryGrid<T extends BaseGalleryItem>({ items, basePath, deleteAction, setItemToDelete, renderBadges }: any) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
      {items.map((item: any, index: number) => (
        <Card
          key={`${item.id}-${index}`}
          shadow="xs" padding="md" radius="md" withBorder
          component={Link} href={`${basePath}/${item.id}`}
          style={{ textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
          }}
        >
          <Card.Section style={{ position: 'relative' }}>
            <Image src={item.coverImage || 'https://placehold.co/600x400?text=No+Cover'} h={{ base: 140, sm: 160 }} alt={item.title} fallbackSrc="https://placehold.co/600x400?text=No+Image" />
            {deleteAction && (
              <ActionIcon variant="filled" color="rust.6" size="md" radius="xl" style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} onClick={(e) => { e.preventDefault(); setItemToDelete(item); }}>
                <IconTrash size={16} stroke={1.5} />
              </ActionIcon>
            )}
          </Card.Section>
          <Text fw={500} size="lg" mt="sm" mb="xs">{item.title}</Text>
          {renderBadges && renderBadges(item)}
          <Text size="sm" c="dimmed" lineClamp={2}>{item.sourceUrl}</Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}