import { SimpleGrid, Card, ActionIcon, Image, Text, Center, Tooltip } from "@mantine/core";
import { IconPhoto, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { BaseGalleryItem } from "./ItemGallery";
import { sourceHost } from "@/utils/tags";

const COVER_HEIGHT = { base: 150, sm: 170 };

// Neutral inline placeholder for a cover that fails to load.
const BROKEN_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e9ecef"/></svg>');

// Shown when an item has no cover photo (or it fails to load). Local, so it
// doesn't depend on an outside placeholder service.
function CoverPlaceholder() {
  return (
    <Center h={COVER_HEIGHT} bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))">
      <IconPhoto size={40} stroke={1.2} color="var(--mantine-color-gray-5)" />
    </Center>
  );
}

export default function GalleryGrid<T extends BaseGalleryItem>({
  items,
  basePath,
  deleteAction,
  setItemToDelete,
  renderBadges,
}: {
  items: T[];
  basePath: string;
  deleteAction?: (id: number) => Promise<void>;
  setItemToDelete: (item: T) => void;
  renderBadges?: (item: T) => React.ReactNode;
}) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg">
      {items.map((item, index) => {
        const host = sourceHost(item.sourceUrl);
        return (
          <Card
            key={`${item.id}-${index}`}
            className="gallery-card"
            shadow="xs" padding="md" radius="md" withBorder
            component={Link} href={`${basePath}/${item.id}`}
            h="100%"
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
          >
            <Card.Section style={{ position: 'relative' }}>
              {item.coverImage ? (
                <Image src={item.coverImage} h={COVER_HEIGHT} alt={item.title} fallbackSrc={BROKEN_IMAGE} />
              ) : (
                <CoverPlaceholder />
              )}
              {deleteAction && (
                <Tooltip label="Delete" withArrow openDelay={400}>
                  <ActionIcon
                    className="gallery-card-delete"
                    aria-label={`Delete ${item.title}`}
                    variant="white" color="rust.7" size="md" radius="xl"
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, boxShadow: 'var(--mantine-shadow-xs)' }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete(item); }}
                  >
                    <IconTrash size={16} stroke={1.6} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Card.Section>
            <Text fw={600} size="md" mt="sm" mb={4} lineClamp={2}>{item.title}</Text>
            {renderBadges && renderBadges(item)}
            {host && (
              <Text size="xs" c="dimmed" mt="auto" truncate>{host}</Text>
            )}
          </Card>
        );
      })}
      <style>{`
        .gallery-card { transition: transform 0.2s, box-shadow 0.2s; }
        .gallery-card:hover { transform: translateY(-3px); box-shadow: var(--mantine-shadow-md); }
        /* On devices with a mouse, only reveal delete on hover so the grid
           isn't covered in red buttons; touch devices always show it. */
        @media (hover: hover) {
          .gallery-card .gallery-card-delete { opacity: 0; transition: opacity 0.15s; }
          .gallery-card:hover .gallery-card-delete,
          .gallery-card .gallery-card-delete:focus-visible { opacity: 1; }
        }
      `}</style>
    </SimpleGrid>
  );
}
