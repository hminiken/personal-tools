import { Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

// "← Back to Patterns" link at the top of every detail page.
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button component={Link} href={href} variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} mb="md" pl={0}>
      {label}
    </Button>
  );
}
