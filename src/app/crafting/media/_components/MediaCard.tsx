// src/app/crafting/media/_components/MediaCard.tsx
import { Paper, Box, Image, Group, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconX, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { startTransition } from "react";
import { unlinkMedia } from "@app/crafting/actions/MediaActions";
import { PLACEHOLDER_IMAGE } from "@/utils/placeholders";
import type { MediaItem } from "./MediaGrid";

type Owner = 'pattern' | 'project' | 'yarn';

// One badge per owner, each with an unlink button.
const OWNERS: { key: Owner; label: string; color: string; href: (id: number) => string }[] = [
    { key: 'pattern', label: 'Pattern', color: 'rust', href: (id) => `/crafting/patterns/${id}` },
    { key: 'project', label: 'Project', color: 'olive', href: (id) => `/crafting/projects/${id}` },
    { key: 'yarn', label: 'Yarn', color: 'mustard', href: (id) => `/crafting/stash/${id}` },
];

export default function MediaCard({ item, onDelete }: { item: MediaItem, onDelete: () => void }) {
    const owners = OWNERS.flatMap((o) => {
        const owner = item[o.key];
        return owner ? [{ ...o, id: owner.id, title: owner.title }] : [];
    });

    return (
        <Paper p="xs" withBorder radius="md">
            <Image src={item.path} h={150} fit="cover" radius="sm" alt="" fallbackSrc={PLACEHOLDER_IMAGE} />

            <Group justify="space-between" align="flex-start" wrap="nowrap" mt="xs" gap={4}>
                <Box style={{ minWidth: 0 }}>
                    {owners.map((o) => (
                        <Group key={o.key} gap={2} mb={2} wrap="nowrap">
                            <Badge
                                size="sm" variant="light" color={o.color} tt="none"
                                component={Link} href={o.href(o.id)}
                                style={{ cursor: 'pointer', maxWidth: '100%' }}
                            >
                                {o.label}: {o.title}
                            </Badge>
                            <ActionIcon
                                size="xs" variant="transparent" color={o.color}
                                aria-label={`Unlink from ${o.label.toLowerCase()}`}
                                onClick={() => startTransition(() => unlinkMedia(item.id, o.key))}
                            >
                                <IconX size={10} />
                            </ActionIcon>
                        </Group>
                    ))}
                    {owners.length === 0 && (
                        <Badge size="xs" color="rust" variant="outline">Orphan</Badge>
                    )}
                </Box>

                <Tooltip label="Delete permanently" withArrow>
                    <ActionIcon variant="subtle" color="rust.7" aria-label="Delete permanently" onClick={onDelete}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}
