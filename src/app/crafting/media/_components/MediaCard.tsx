// src/app/crafting/media/_components/MediaCard.tsx
import { Paper, Box, Image, Group, Badge, ActionIcon } from "@mantine/core";
import { IconX, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { startTransition } from "react";
import { unlinkMedia } from "@app/crafting/actions/MediaActions";

export default function MediaCard({ item, onDelete }: { item: any, onDelete: () => void }) {
    return (
        <Paper p="xs" withBorder>
            <Image src={item.path} h={150} fit="cover" radius="sm" />
            
            <Box mt="xs" h={60}>
                {item.pattern && (
                    <Group gap={2} mb={2}>
                        <Badge size="sm" variant="light" color="rust" component={Link} href={`/crafting/patterns/${item.patternId}`}>
                            Pat: {item.pattern.title}
                        </Badge>
                        <ActionIcon size="xs" variant="transparent" color="rust" onClick={() => startTransition(() => unlinkMedia(item.id, 'pattern'))}>
                            <IconX size={10} />
                        </ActionIcon>
                    </Group>
                )}
                
                {item.project && (
                    <Group gap={2} mb={2}>
                        <Badge size="sm" variant="light" color="olive" component={Link} href={`/crafting/projects/${item.projectId}`}>
                            Proj: {item.project.title}
                        </Badge>
                        <ActionIcon size="xs" variant="transparent" color="olive" onClick={() => startTransition(() => unlinkMedia(item.id, 'project'))}>
                            <IconX size={10} />
                        </ActionIcon>
                    </Group>
                )}

                {item.yarn && (
                    <Group gap={2} mb={2}>
                        <Badge size="sm" variant="light" color="mustard" component={Link} href={`/crafting/stash/${item.yarnId}`}>
                            Yarn: {item.yarn.title}
                        </Badge>
                        <ActionIcon size="xs" variant="transparent" color="mustard" onClick={() => startTransition(() => unlinkMedia(item.id, 'yarn'))}>
                            <IconX size={10} />
                        </ActionIcon>
                    </Group>
                )}

                {!item.pattern && !item.project && !item.yarn && (
                    <Badge size="xs" color="red" variant="outline" m={2}>ORPHAN</Badge>
                )}
            </Box>

            <ActionIcon color="rust.6" mt="sm" onClick={onDelete}>
                <IconTrash size={16} />
            </ActionIcon>
        </Paper>
    );
}