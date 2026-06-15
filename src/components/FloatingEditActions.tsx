'use client';

import { Affix, Group, Button } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';

// Floating Save / Cancel actions shown while editing, so the controls stay
// reachable no matter how far down a long pattern you've scrolled.
// `formId` ties the Save button to a specific <form> via the HTML `form`
// attribute, since the Affix renders in a portal outside that form.
export function FloatingEditActions({
  formId,
  onCancel,
}: {
  formId: string;
  onCancel: () => void;
}) {
  return (
    <Affix position={{ bottom: 20, right: 20 }}>
      <Group gap="sm">
        <Button
          variant="default"
          radius="xl"
          size="md"
          leftSection={<IconX size={18} />}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form={formId}
          color="olive.7"
          radius="xl"
          size="md"
          leftSection={<IconDeviceFloppy size={18} />}
        >
          Save
        </Button>
      </Group>
    </Affix>
  );
}
