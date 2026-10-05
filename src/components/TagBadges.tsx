import { Badge, Group, type MantineSize } from '@mantine/core';
import { splitTags, statusColor } from '@/utils/tags';

// One badge per tag in a comma-joined field ("Aran,Worsted" -> two badges).
export function TagBadges({
  value,
  color,
  variant = 'light',
  size = 'sm',
}: {
  value: string | null | undefined;
  color: string;
  variant?: 'light' | 'outline' | 'filled' | 'dot';
  size?: MantineSize;
}) {
  return (
    <>
      {splitTags(value).map((tag) => (
        <Badge key={tag} color={color} variant={variant} size={size} tt="none">
          {tag}
        </Badge>
      ))}
    </>
  );
}

export function StatusBadge({ status, size = 'sm' }: { status: string | null | undefined; size?: MantineSize }) {
  if (!status) return null;
  return (
    <Badge color={statusColor(status)} variant="filled" size={size}>
      {status}
    </Badge>
  );
}

// Wrapper so card badge rows share spacing everywhere.
export function BadgeRow({ children }: { children: React.ReactNode }) {
  return (
    <Group gap={6} mt={4} mb="sm">
      {children}
    </Group>
  );
}
