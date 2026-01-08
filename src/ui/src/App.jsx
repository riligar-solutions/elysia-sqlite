import { useState, useEffect, useCallback } from "react";
import {
  AppShell,
  NavLink,
  Text,
  Group,
  ActionIcon,
  TextInput,
  Button,
  Table,
  Checkbox,
  Badge,
  Modal,
  Select,
  Textarea,
  Menu,
  Kbd,
  Box,
  Tooltip,
  useMantineColorScheme,
  ScrollArea,
  Paper,
  Divider,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { useDisclosure, useHotkeys, useLocalStorage } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDatabase,
  IconTable,
  IconPlus,
  IconRefresh,
  IconFilter,
  IconDownload,
  IconSchema,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconTerminal2,
  IconPlayerPlay,
  IconHistory,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconDots,
  IconSun,
  IconMoon,
  IconCommand,
  IconX,
  IconKey,
  IconLetterA,
  IconHash,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react";

const API = "/admin/api";

// Column type icon mapping
const getColumnIcon = (type, name) => {
  const t = (type || "").toUpperCase();
  const n = (name || "").toLowerCase();

  if (n.includes("email")) return <IconLetterA size={14} />;
  if (n.includes("date") || n.includes("time"))
    return <IconCalendar size={14} />;
  if (t.includes("INT") || t.includes("REAL") || t.includes("FLOAT"))
    return <IconHash size={14} />;
  if (t.includes("BOOL")) return <IconCheck size={14} />;
  return <IconLetterA size={14} />;
};

// Tag colors
const tagColors = [
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
];
const getTagColor = (value) => {
  if (!value) return "gray";
  const hash = String(value)
    .split("")
    .reduce((a, b) => a + b.charCodeAt(0), 0);
  return tagColors[hash % tagColors.length];
};

const isTagColumn = (name) => {
  const n = (name || "").toLowerCase();
  return (
    n.includes("status") ||
    n.includes("categoria") ||
    n.includes("category") ||
    n === "cor"
  );
};

export default function App() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === "dark";

  // State
  const [tables, setTables] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState(null);
  const [sortDir, setSortDir] = useState("ASC");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sqlMode, setSqlMode] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("");
  const [editingCell, setEditingCell] = useState(null); // { rowPk, column }

  // Persisted state
  const [favorites, setFavorites] = useLocalStorage({
    key: "sqlite-favorites",
    defaultValue: [],
  });
  const [queryHistory, setQueryHistory] = useLocalStorage({
    key: "sqlite-history",
    defaultValue: [],
  });

  // Modals
  const [newRecordOpened, { open: openNewRecord, close: closeNewRecord }] =
    useDisclosure(false);
  const [filterOpened, { open: openFilter, close: closeFilter }] =
    useDisclosure(false);
  const [schemaOpened, { open: openSchema, close: closeSchema }] =
    useDisclosure(false);
  const [exportOpened, { open: openExport, close: closeExport }] =
    useDisclosure(false);
  const [commandOpened, { open: openCommand, close: closeCommand }] =
    useDisclosure(false);
  const [historyOpened, { toggle: toggleHistory }] = useDisclosure(false);

  // Filters
  const [filters, setFilters] = useState([]);
  const [exportFormat, setExportFormat] = useState("csv");

  // Hotkeys
  useHotkeys([
    ["mod+k", () => openCommand()],
    ["escape", () => closeCommand()],
  ]);

  // Load tables
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const res = await fetch(`${API}/tables`);
      const data = await res.json();

      if (data.tables) {
        const tablesWithCount = await Promise.all(
          data.tables.map(async (name) => {
            try {
              const countRes = await fetch(`${API}/table/${name}/count`);
              const countData = await countRes.json();
              return { name, count: countData.count || 0 };
            } catch {
              return { name, count: "?" };
            }
          })
        );
        setTables(tablesWithCount);
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao carregar tabelas",
        color: "red",
      });
    }
  };

  const selectTable = async (name) => {
    setCurrentTable(name);
    setPage(1);
    setSort(null);
    setSelectedRows(new Set());
    setSearchQuery("");
    setSqlMode(false);
    setFilters([]);

    try {
      const res = await fetch(`${API}/table/${name}`);
      const data = await res.json();
      setColumns(data.columns || []);
    } catch {
      setColumns([]);
    }

    loadData(name);
  };

  const loadData = async (tableName = currentTable) => {
    if (!tableName) return;
    setLoading(true);

    const offset = (page - 1) * 50;
    let sql = `SELECT * FROM ${tableName}`;

    // Add filters
    const conditions = [];
    filters.forEach((f) => {
      if (f.column && f.value) {
        if (f.operator === "LIKE") {
          conditions.push(`${f.column} LIKE '%${f.value}%'`);
        } else {
          conditions.push(`${f.column} ${f.operator} '${f.value}'`);
        }
      }
    });

    if (searchQuery) {
      const textCols = columns.filter((c) =>
        c.type?.toUpperCase().includes("TEXT")
      );
      if (textCols.length > 0) {
        const searchConds = textCols
          .map((c) => `${c.name} LIKE '%${searchQuery}%'`)
          .join(" OR ");
        conditions.push(`(${searchConds})`);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (sort) sql += ` ORDER BY ${sort} ${sortDir}`;
    sql += ` LIMIT 50 OFFSET ${offset}`;

    try {
      const [dataRes, countRes] = await Promise.all([
        fetch(`${API}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql }),
        }),
        fetch(`${API}/table/${tableName}/count`),
      ]);

      const data = await dataRes.json();
      const count = await countRes.json();

      if (data.success) {
        setRows(data.rows || []);
        setTotal(count.count || 0);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error,
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao carregar dados",
        color: "red",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (currentTable && !sqlMode) {
      loadData();
    }
  }, [page, sort, sortDir, filters, searchQuery]);

  // Toggle favorite
  const toggleFavorite = (table) => {
    if (favorites.includes(table)) {
      setFavorites(favorites.filter((f) => f !== table));
    } else {
      setFavorites([...favorites, table]);
    }
  };

  // Run SQL query
  const runQuery = async () => {
    if (!sqlQuery.trim()) return;
    setLoading(true);

    // Add to history
    const newHistory = [
      { sql: sqlQuery, timestamp: Date.now() },
      ...queryHistory.filter((h) => h.sql !== sqlQuery),
    ].slice(0, 20);
    setQueryHistory(newHistory);

    try {
      const res = await fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.rows) {
          setRows(data.rows);
          setColumns(
            data.columns?.map((c) => ({ name: c, type: "TEXT" })) || []
          );
          setTotal(data.rows.length);
        } else {
          notifications.show({
            title: "Sucesso",
            message: data.message,
            color: "green",
          });
          loadTables();
        }
      } else {
        notifications.show({
          title: "Erro",
          message: data.error,
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao executar query",
        color: "red",
      });
    }

    setLoading(false);
  };

  // Delete record
  const deleteRecord = async (pk) => {
    if (!confirm("Excluir registro?")) return;

    const pkCol = columns.find((c) => c.pk === 1)?.name || columns[0]?.name;

    try {
      const res = await fetch(`${API}/table/${currentTable}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: pkCol, value: pk }),
      });
      const result = await res.json();

      if (result.success) {
        notifications.show({
          title: "Sucesso",
          message: "Excluído!",
          color: "green",
        });
        loadData();
        loadTables();
      } else {
        notifications.show({
          title: "Erro",
          message: result.error,
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao excluir",
        color: "red",
      });
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (!confirm(`Excluir ${selectedRows.size} registros?`)) return;

    const pkCol = columns.find((c) => c.pk === 1)?.name || columns[0]?.name;

    for (const pk of selectedRows) {
      await fetch(`${API}/table/${currentTable}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: pkCol, value: pk }),
      });
    }

    setSelectedRows(new Set());
    notifications.show({
      title: "Sucesso",
      message: "Excluídos!",
      color: "green",
    });
    loadData();
    loadTables();
  };

  // Export
  const doExport = async () => {
    let exportRows = rows;

    if (selectedRows.size > 0) {
      const pkCol = columns.find((c) => c.pk === 1)?.name || columns[0]?.name;
      exportRows = rows.filter((r) => selectedRows.has(String(r[pkCol])));
    }

    if (exportFormat === "csv") {
      const cols = Object.keys(exportRows[0] || {});
      const csv = [
        cols.join(","),
        ...exportRows.map((r) =>
          cols
            .map((c) => `"${String(r[c] || "").replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");
      downloadFile(`${currentTable}.csv`, csv, "text/csv");
    } else {
      downloadFile(
        `${currentTable}.json`,
        JSON.stringify(exportRows, null, 2),
        "application/json"
      );
    }

    closeExport();
  };

  const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({
      title: "Exportado",
      message: filename,
      color: "green",
    });
  };

  // Inline edit - update cell
  const updateCell = async (rowPk, column, newValue) => {
    const pkCol = columns.find((c) => c.pk === 1)?.name || columns[0]?.name;

    try {
      const res = await fetch(`${API}/table/${currentTable}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          column,
          value: newValue,
          pkColumn: pkCol,
          pkValue: rowPk,
        }),
      });
      const result = await res.json();

      if (result.success) {
        // Update local state
        setRows((prevRows) =>
          prevRows.map((r) =>
            String(r[pkCol]) === String(rowPk)
              ? { ...r, [column]: newValue }
              : r
          )
        );
        notifications.show({
          title: "Salvo",
          message: `${column} atualizado`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Erro",
          message: result.error,
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao atualizar",
        color: "red",
      });
    }

    setEditingCell(null);
  };

  // Render table
  const pk = columns.find((c) => c.pk === 1)?.name || columns[0]?.name;

  // Editable Cell Component with FK support
  const EditableCell = ({ row, col }) => {
    const value = row[col.name];
    const rowPk = row[pk];
    const isEditing =
      editingCell?.rowPk === rowPk && editingCell?.column === col.name;
    const isPK = col.pk === 1;
    const hasFK = !!col.fk;

    // State for FK options
    const [fkOptions, setFkOptions] = useState([]);
    const [fkLoading, setFkLoading] = useState(false);

    // Load FK options when editing starts
    useEffect(() => {
      if (isEditing && hasFK) {
        setFkLoading(true);
        fetch(
          `${API}/table/${currentTable}/fk-options?refTable=${col.fk.table}&refColumn=${col.fk.column}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setFkOptions(
                data.options.map((o) => ({
                  value: String(o.value),
                  label: `${o.label} (ID: ${o.value})`,
                }))
              );
            }
            setFkLoading(false);
          })
          .catch(() => setFkLoading(false));
      }
    }, [isEditing, hasFK]);

    if (isEditing) {
      // Foreign key - show Select
      if (hasFK) {
        return (
          <Select
            size="xs"
            autoFocus
            searchable
            data={fkOptions}
            defaultValue={value === null ? null : String(value)}
            placeholder={
              fkLoading ? "Carregando..." : `Selecione ${col.fk.table}`
            }
            onChange={(newVal) => {
              updateCell(rowPk, col.name, newVal);
            }}
            onBlur={() => setEditingCell(null)}
            styles={{
              input: {
                minHeight: "28px",
                height: "28px",
              },
            }}
          />
        );
      }

      // Regular text input
      return (
        <TextInput
          size="xs"
          autoFocus
          defaultValue={value === null ? "" : String(value)}
          onBlur={(e) => updateCell(rowPk, col.name, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateCell(rowPk, col.name, e.target.value);
            } else if (e.key === "Escape") {
              setEditingCell(null);
            }
          }}
          styles={{
            input: {
              minHeight: "28px",
              height: "28px",
              padding: "0 8px",
            },
          }}
        />
      );
    }

    if (value === null) {
      return (
        <Text
          c="dimmed"
          fs="italic"
          size="sm"
          onClick={() => !isPK && setEditingCell({ rowPk, column: col.name })}
          style={{ cursor: isPK ? "default" : "text" }}
        >
          null
        </Text>
      );
    }

    // FK column - show as link-style
    if (hasFK) {
      return (
        <Badge
          color="blue"
          variant="light"
          onClick={() => setEditingCell({ rowPk, column: col.name })}
          style={{ cursor: "pointer" }}
          leftSection={<IconKey size={10} />}
        >
          {value}
        </Badge>
      );
    }

    if (isTagColumn(col.name)) {
      return (
        <Badge
          color={getTagColor(value)}
          variant="light"
          onClick={() => setEditingCell({ rowPk, column: col.name })}
          style={{ cursor: "pointer" }}
        >
          {value}
        </Badge>
      );
    }

    return (
      <Text
        size="sm"
        onClick={() => !isPK && setEditingCell({ rowPk, column: col.name })}
        style={{
          cursor: isPK ? "default" : "text",
          padding: "4px 0",
          borderRadius: "4px",
        }}
        className={isPK ? "" : "editable-cell"}
      >
        {String(value)}
      </Text>
    );
  };

  const tableRows = rows.map((row) => (
    <Table.Tr
      key={row[pk]}
      bg={selectedRows.has(String(row[pk])) ? "blue.0" : undefined}
    >
      <Table.Td>
        <Checkbox
          checked={selectedRows.has(String(row[pk]))}
          onChange={(e) => {
            const newSelected = new Set(selectedRows);
            if (e.target.checked) {
              newSelected.add(String(row[pk]));
            } else {
              newSelected.delete(String(row[pk]));
            }
            setSelectedRows(newSelected);
          }}
        />
      </Table.Td>
      {columns.map((col) => (
        <Table.Td key={col.name}>
          <EditableCell row={row} col={col} />
        </Table.Td>
      ))}
      <Table.Td>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => deleteRecord(row[pk])}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AppShell navbar={{ width: 260, breakpoint: "sm" }} padding="md">
      <AppShell.Navbar p="xs">
        <Group justify="space-between" mb="md" px="xs">
          <Group gap="xs">
            <IconDatabase size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600}>SQLite Admin</Text>
          </Group>
          <ActionIcon variant="subtle" onClick={() => toggleColorScheme()}>
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Group>

        <NavLink
          label="SQL Runner"
          leftSection={<IconTerminal2 size={18} />}
          active={sqlMode}
          onClick={() => {
            setSqlMode(!sqlMode);
            if (!sqlMode) setCurrentTable(null);
          }}
        />

        <Divider my="sm" label="Favoritos" labelPosition="left" />

        {favorites.length === 0 ? (
          <Text size="xs" c="dimmed" px="xs">
            Nenhum favorito
          </Text>
        ) : (
          favorites.map((name) => {
            const t = tables.find((tb) => tb.name === name);
            return (
              <NavLink
                key={name}
                label={name}
                leftSection={
                  <IconStarFilled
                    size={16}
                    color="var(--mantine-color-yellow-6)"
                  />
                }
                rightSection={
                  <Badge size="xs" variant="light">
                    {t?.count || "?"}
                  </Badge>
                }
                active={currentTable === name}
                onClick={() => selectTable(name)}
              />
            );
          })
        )}

        <Divider my="sm" label="Tabelas" labelPosition="left" />

        <ScrollArea style={{ flex: 1 }}>
          {tables
            .filter((t) => !favorites.includes(t.name))
            .map((t) => (
              <NavLink
                key={t.name}
                label={t.name}
                leftSection={<IconTable size={16} />}
                rightSection={
                  <Group gap={4}>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(t.name);
                      }}
                    >
                      {favorites.includes(t.name) ? (
                        <IconStarFilled size={14} />
                      ) : (
                        <IconStar size={14} />
                      )}
                    </ActionIcon>
                    <Badge size="xs" variant="light">
                      {t.count}
                    </Badge>
                  </Group>
                }
                active={currentTable === t.name}
                onClick={() => selectTable(t.name)}
              />
            ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        {sqlMode ? (
          <Stack>
            <Text size="sm" c="dimmed">
              Database / SQL Runner
            </Text>
            <Textarea
              placeholder="SELECT * FROM tabela"
              minRows={5}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              styles={{ input: { fontFamily: "monospace" } }}
            />
            <Group>
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={runQuery}
              >
                Executar
              </Button>
              <Button
                variant="subtle"
                leftSection={<IconHistory size={16} />}
                onClick={toggleHistory}
              >
                Histórico
              </Button>
              <Group gap={4}>
                <Kbd>⌘</Kbd>
                <Kbd>Enter</Kbd>
                <Text size="xs" c="dimmed">
                  para executar
                </Text>
              </Group>
            </Group>

            {historyOpened && queryHistory.length > 0 && (
              <Paper p="sm" withBorder>
                <Stack gap="xs">
                  {queryHistory.map((h, i) => (
                    <Button
                      key={i}
                      variant="subtle"
                      size="xs"
                      justify="start"
                      onClick={() => setSqlQuery(h.sql)}
                      styles={{
                        label: {
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      }}
                    >
                      {h.sql.substring(0, 60)}...
                    </Button>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        ) : !currentTable ? (
          <Center h="100%">
            <Stack align="center" gap="xs">
              <IconTable size={48} color="var(--mantine-color-dimmed)" />
              <Text c="dimmed">Selecione uma tabela</Text>
              <Group gap={4}>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
                <Text size="xs" c="dimmed">
                  para buscar
                </Text>
              </Group>
            </Stack>
          </Center>
        ) : (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Database / {currentTable}
            </Text>

            <Group justify="space-between">
              <Group>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openNewRecord}
                >
                  Novo
                </Button>
                <Button
                  variant="subtle"
                  leftSection={<IconFilter size={16} />}
                  onClick={openFilter}
                >
                  Filtrar
                </Button>
                <ActionIcon variant="subtle" onClick={() => loadData()}>
                  <IconRefresh size={18} />
                </ActionIcon>
                <ActionIcon variant="subtle" onClick={openExport}>
                  <IconDownload size={18} />
                </ActionIcon>
                <ActionIcon variant="subtle" onClick={openSchema}>
                  <IconSchema size={18} />
                </ActionIcon>
              </Group>

              <Group>
                <TextInput
                  placeholder="Buscar..."
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  w={200}
                />
                <Text size="sm" c="dimmed">
                  {total} registros
                </Text>
                <ActionIcon
                  variant="subtle"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Text size="sm">{page}</Text>
                <ActionIcon
                  variant="subtle"
                  disabled={page >= Math.ceil(total / 50)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>
            </Group>

            {selectedRows.size > 0 && (
              <Paper p="xs" bg="blue" radius="sm">
                <Group justify="space-between">
                  <Text c="white" size="sm">
                    {selectedRows.size} selecionados
                  </Text>
                  <Group>
                    <Button
                      size="xs"
                      color="red"
                      variant="filled"
                      onClick={bulkDelete}
                    >
                      Excluir
                    </Button>
                    <Button size="xs" variant="white" onClick={openExport}>
                      Exportar
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      c="white"
                      onClick={() => setSelectedRows(new Set())}
                    >
                      Limpar
                    </Button>
                  </Group>
                </Group>
              </Paper>
            )}

            {loading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : (
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>
                        <Checkbox
                          checked={
                            selectedRows.size === rows.length && rows.length > 0
                          }
                          indeterminate={
                            selectedRows.size > 0 &&
                            selectedRows.size < rows.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(
                                new Set(rows.map((r) => String(r[pk])))
                              );
                            } else {
                              setSelectedRows(new Set());
                            }
                          }}
                        />
                      </Table.Th>
                      {columns.map((col) => (
                        <Table.Th
                          key={col.name}
                          onClick={() => {
                            if (sort === col.name) {
                              setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
                            } else {
                              setSort(col.name);
                              setSortDir("ASC");
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <Group gap={4}>
                            {getColumnIcon(col.type, col.name)}
                            <Text size="sm" fw={500}>
                              {col.name}
                            </Text>
                            {sort === col.name && (
                              <Text size="xs" c="dimmed">
                                {sortDir === "ASC" ? "↑" : "↓"}
                              </Text>
                            )}
                          </Group>
                        </Table.Th>
                      ))}
                      <Table.Th w={50}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{tableRows}</Table.Tbody>
                  <Table.Tfoot>
                    <Table.Tr>
                      <Table.Td></Table.Td>
                      {columns.map((col) => (
                        <Table.Td key={col.name}>
                          <Text size="xs" c="dimmed">
                            COUNT {rows.length}
                          </Text>
                        </Table.Td>
                      ))}
                      <Table.Td></Table.Td>
                    </Table.Tr>
                  </Table.Tfoot>
                </Table>
              </ScrollArea>
            )}
          </Stack>
        )}
      </AppShell.Main>

      {/* New Record Modal */}
      <Modal
        opened={newRecordOpened}
        onClose={closeNewRecord}
        title="Novo Registro"
      >
        <Stack>
          {columns
            .filter((c) => c.pk !== 1)
            .map((col) => (
              <TextInput
                key={col.name}
                label={`${col.name} ${col.notnull ? "*" : ""}`}
                placeholder={col.type || "TEXT"}
                id={`field-${col.name}`}
              />
            ))}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeNewRecord}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const data = {};
                columns
                  .filter((c) => c.pk !== 1)
                  .forEach((col) => {
                    const input = document.getElementById(`field-${col.name}`);
                    if (input?.value) data[col.name] = input.value;
                  });

                try {
                  const res = await fetch(
                    `${API}/table/${currentTable}/insert`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    }
                  );
                  const result = await res.json();
                  if (result.success) {
                    notifications.show({
                      title: "Sucesso",
                      message: "Registro criado!",
                      color: "green",
                    });
                    closeNewRecord();
                    loadData();
                    loadTables();
                  } else {
                    notifications.show({
                      title: "Erro",
                      message: result.error,
                      color: "red",
                    });
                  }
                } catch (err) {
                  notifications.show({
                    title: "Erro",
                    message: "Erro ao salvar",
                    color: "red",
                  });
                }
              }}
            >
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Filter Modal */}
      <Modal opened={filterOpened} onClose={closeFilter} title="Filtros">
        <Stack>
          {filters.map((f, i) => (
            <Group key={i}>
              <Select
                data={columns.map((c) => c.name)}
                value={f.column}
                onChange={(v) => {
                  const newFilters = [...filters];
                  newFilters[i].column = v;
                  setFilters(newFilters);
                }}
                placeholder="Coluna"
                style={{ flex: 1 }}
              />
              <Select
                data={[
                  { value: "=", label: "=" },
                  { value: "!=", label: "≠" },
                  { value: ">", label: ">" },
                  { value: "<", label: "<" },
                  { value: "LIKE", label: "contém" },
                ]}
                value={f.operator}
                onChange={(v) => {
                  const newFilters = [...filters];
                  newFilters[i].operator = v;
                  setFilters(newFilters);
                }}
                w={100}
              />
              <TextInput
                placeholder="Valor"
                value={f.value}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].value = e.target.value;
                  setFilters(newFilters);
                }}
                style={{ flex: 1 }}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => setFilters(filters.filter((_, j) => j !== i))}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            variant="subtle"
            leftSection={<IconPlus size={16} />}
            onClick={() =>
              setFilters([...filters, { column: "", operator: "=", value: "" }])
            }
          >
            Adicionar Filtro
          </Button>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setFilters([]);
                closeFilter();
              }}
            >
              Limpar
            </Button>
            <Button onClick={closeFilter}>Aplicar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Schema Modal */}
      <Modal
        opened={schemaOpened}
        onClose={closeSchema}
        title={`Schema: ${currentTable}`}
        size="lg"
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Coluna</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Nullable</Table.Th>
              <Table.Th>Default</Table.Th>
              <Table.Th>PK</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {columns.map((c) => (
              <Table.Tr key={c.name}>
                <Table.Td>{c.name}</Table.Td>
                <Table.Td>{c.type || "TEXT"}</Table.Td>
                <Table.Td>{c.notnull ? "NOT NULL" : "NULL"}</Table.Td>
                <Table.Td>{c.dflt_value || "-"}</Table.Td>
                <Table.Td>
                  {c.pk ? (
                    <IconKey size={16} color="var(--mantine-color-yellow-6)" />
                  ) : (
                    "-"
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>

      {/* Export Modal */}
      <Modal opened={exportOpened} onClose={closeExport} title="Exportar">
        <Stack>
          <Select
            label="Formato"
            data={[
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
            ]}
            value={exportFormat}
            onChange={setExportFormat}
          />
          <Text size="sm" c="dimmed">
            {selectedRows.size > 0
              ? `${selectedRows.size} registros selecionados`
              : `${rows.length} registros na página atual`}
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeExport}>
              Cancelar
            </Button>
            <Button onClick={doExport}>Exportar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Command Palette */}
      <Modal
        opened={commandOpened}
        onClose={closeCommand}
        withCloseButton={false}
        size="lg"
        padding={0}
        radius="md"
      >
        <TextInput
          placeholder="Buscar tabelas, comandos..."
          size="lg"
          variant="unstyled"
          p="md"
          leftSection={<IconSearch size={20} />}
          styles={{ input: { border: "none" } }}
        />
        <Divider />
        <Stack gap={0} p="xs">
          <Text size="xs" c="dimmed" px="sm" py={4}>
            Tabelas
          </Text>
          {tables.slice(0, 5).map((t) => (
            <NavLink
              key={t.name}
              label={t.name}
              leftSection={<IconTable size={16} />}
              onClick={() => {
                selectTable(t.name);
                closeCommand();
              }}
            />
          ))}
          <Text size="xs" c="dimmed" px="sm" py={4}>
            Ações
          </Text>
          <NavLink
            label="Novo registro"
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              openNewRecord();
              closeCommand();
            }}
          />
          <NavLink
            label="SQL Runner"
            leftSection={<IconTerminal2 size={16} />}
            onClick={() => {
              setSqlMode(true);
              closeCommand();
            }}
          />
          <NavLink
            label="Exportar"
            leftSection={<IconDownload size={16} />}
            onClick={() => {
              openExport();
              closeCommand();
            }}
          />
        </Stack>
      </Modal>
    </AppShell>
  );
}
