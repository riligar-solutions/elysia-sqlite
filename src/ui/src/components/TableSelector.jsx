import { Stack, Text, NavLink, ScrollArea } from "@mantine/core";
import { IconTable } from "@tabler/icons-react";

export const TableSelector = ({ 
  tables, 
  favorites, 
  currentTable, 
  onSelectTable 
}) => {
  return (
    <ScrollArea style={{ flex: 1 }}>
      <Stack gap={0}>
        <Text
          size="xs"
          fw={500}
          c="#91918E"
          px="xs"
          mb={4}
          mt="xs"
          style={{
            textTransform: "uppercase",
            fontSize: "11px",
            letterSpacing: "0.03em",
          }}
        >
          Favorites
        </Text>
        {favorites.map((name) => (
          <NavLink
            key={name}
            label={name}
            leftSection={<IconTable size={16} />}
            active={currentTable === name}
            onClick={() => onSelectTable(name)}
            style={{ borderRadius: 6 }}
          />
        ))}

        {favorites.length === 0 && (
          <Text size="xs" c="dimmed" px="sm" py={2} fs="italic">
            No favorites
          </Text>
        )}

        <Text
          size="xs"
          fw={500}
          c="#91918E"
          px="xs"
          mb={4}
          mt="lg"
          style={{
            textTransform: "uppercase",
            fontSize: "11px",
            letterSpacing: "0.03em",
          }}
        >
          Tables
        </Text>
        {tables
          .filter((t) => !favorites.includes(t.name))
          .map((t) => (
            <NavLink
              key={t.name}
              label={t.name}
              leftSection={<IconTable size={16} />}
              active={currentTable === t.name}
              onClick={() => onSelectTable(t.name)}
              style={{ borderRadius: 6 }}
            />
          ))}
      </Stack>
    </ScrollArea>
  );
};
