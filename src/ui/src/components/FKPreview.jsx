import { useState } from "react";
import { HoverCard, Group, Badge, Text, Center, Loader, Stack, Divider, Box } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";

export const FKPreview = ({ table, id, label, API }) => {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const loadRecord = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: `SELECT * FROM ${table} WHERE rowid = ${id} LIMIT 1`,
        }),
      });
      const data = await res.json();
      if (data.success && data.rows && data.rows.length > 0) {
        setRecord(data.rows[0]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setFetched(true);
  };

  return (
    <HoverCard width={280} shadow="md" openDelay={300} onOpen={loadRecord}>
      <HoverCard.Target>
        <Group gap={6} wrap="nowrap" style={{ cursor: "pointer" }}>
          <Badge
            variant="outline"
            color="gray"
            size="sm"
            leftSection={<IconLink size={10} />}
            styles={{ label: { fontWeight: 500 } }}
          >
            {id}
          </Badge>
          {label && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {label}
            </Text>
          )}
        </Group>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        {loading ? (
          <Center p="sm">
            <Loader size="xs" type="dots" />
          </Center>
        ) : record ? (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                {table}
              </Text>
              <Badge size="xs" variant="light">
                ID: {id}
              </Badge>
            </Group>
            <Text size="sm" fw={600} lineClamp={2}>
              {label || "Record"}
            </Text>
            <Divider />
            <Stack gap={4}>
              {Object.entries(record)
                .filter(
                  ([k]) => k !== "id" && !k.toLowerCase().includes("id")
                )
                .slice(0, 3)
                .map(([k, v]) => (
                  <Group
                    key={k}
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                  >
                    <Text size="xs" c="dimmed" style={{ minWidth: 60 }}>
                      {k}:
                    </Text>
                    <Text
                      size="xs"
                      lineClamp={1}
                      style={{ textAlign: "right" }}
                    >
                      {String(v)}
                    </Text>
                  </Group>
                ))}
            </Stack>
          </Stack>
        ) : (
          <Text size="xs" c="dimmed">
            No preview available
          </Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
