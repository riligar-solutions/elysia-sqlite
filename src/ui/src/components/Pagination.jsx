import { Group, Text, ActionIcon } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export const Pagination = ({ 
  page, 
  total, 
  limit = 50, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(total / limit);

  return (
    <Group justify="flex-end" gap="xs" mt="xs">
      <Text size="xs" c="dimmed">
        Page {page} of {totalPages} ({total} records)
      </Text>
      <ActionIcon
        variant="default"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <IconChevronLeft size={14} />
      </ActionIcon>
      <ActionIcon
        variant="default"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <IconChevronRight size={14} />
      </ActionIcon>
    </Group>
  );
};
