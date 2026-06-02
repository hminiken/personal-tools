import { Modal, Button, Group, Text } from '@mantine/core';

interface ConfirmDeleteModalProps {
    opened: boolean;
    close: () => void;
    onConfirm: () => void;
    itemName: string;
    isDeleting: boolean;
}

export function ConfirmDeleteModal({ opened, close, onConfirm, itemName, isDeleting }: ConfirmDeleteModalProps) {
    return (
        <Modal opened={opened} onClose={close} title="Confirm Deletion" centered>
            <Text size="sm" mb="xl">
                Are you absolutely sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
            </Text>
            
            <Group justify="flex-end">
                <Button variant="default" onClick={close} disabled={isDeleting}>
                    Cancel
                </Button>
                <Button color="red" onClick={onConfirm} loading={isDeleting}>
                    Yes, Delete
                </Button>
            </Group>
        </Modal>
    );
}