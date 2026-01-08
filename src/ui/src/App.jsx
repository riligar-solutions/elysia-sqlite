import { useState, useEffect, useCallback, useMemo } from "react";
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
  SimpleGrid,
  Title,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure, useHotkeys, useLocalStorage } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import mermaid from "mermaid";
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
  IconSparkles,
  IconSitemap,
  IconSettings,
  IconUser,
  IconDeviceLaptop,
  IconLogout,
  IconSelector,
  IconFileText,
} from "@tabler/icons-react";

import { useFilter } from "./hooks/useFilter";
import { Filter } from "./components/Filter";

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
const tagColors = ["gray"];
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
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
  const [recentTables, setRecentTables] = useLocalStorage({
    key: "sqlite-recents",
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
  const [erdOpened, { open: openErd, close: closeErd }] = useDisclosure(false);
  const [erdSvg, setErdSvg] = useState("");

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

    // Add to recents
    setRecentTables((prev) => {
      const filtered = prev.filter((t) => t !== name);
      return [name, ...filtered].slice(0, 5);
    });

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
    closeExport();
  };

  const askAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const res = await fetch(`${API}/ai/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();

      if (data.success) {
        setSqlQuery(data.sql);
        notifications.show({
          title: "AI",
          message: "SQL Gerado!",
          color: "blue",
          icon: <IconSparkles size={16} />,
        });
      } else {
        notifications.show({
          title: "Erro AI",
          message: data.error,
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao consultar AI",
        color: "red",
      });
    }

    setAiLoading(false);
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

  // Load and render ERD
  const loadErd = async () => {
    try {
      const res = await fetch(`${API}/meta/schema`);
      const data = await res.json();

      if (data.success) {
        // Generate Mermaid syntax
        let syntax = "erDiagram\n";

        data.schema.forEach((table) => {
          syntax += `  ${table.name} {\n`;
          table.columns.forEach((col) => {
            const type = col.type || "TEXT";
            const key = col.pk ? "PK" : col.fk ? "FK" : "";
            syntax += `    ${type} ${col.name} ${key}\n`;
          });
          syntax += "  }\n";

          // Relationships
          table.fks.forEach((fk) => {
            syntax += `  ${table.name} }o--|| ${fk.table} : "${fk.from}"\n`;
          });
        });

        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "neutral",
          securityLevel: "loose",
        });

        const { svg } = await mermaid.render("erd-graph", syntax);
        setErdSvg(svg);
        openErd();
      }
    } catch (err) {
      notifications.show({
        title: "Erro",
        message: "Erro ao gerar ERD",
        color: "red",
      });
    }
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
          color="gray"
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

  // Icon logic
  const getTableIcon = (name) => {
    if (!name) return <IconDatabase size={32} />;
    const n = name.toLowerCase();
    if (n.includes("user") || n.includes("usu")) return <IconStar size={32} />;
    if (n.includes("prod")) return <IconSparkles size={32} />;
    if (n.includes("order") || n.includes("ped"))
      return <IconTable size={32} />;
    // Deterministic random icon
    const icons = [IconDatabase, IconTable, IconSitemap, IconCommand, IconHash];
    const index = name.charCodeAt(0) % icons.length;
    const Icon = icons[index];
    return <Icon size={32} />;
  };

  // Filter Logic
  const filterKeys = useMemo(() => columns.map((c) => c.name), [columns]);

  // Create a filter options object
  const filterOptions = useMemo(() => {
    const options = {};
    columns.forEach((col) => {
      // Get unique values from current rows for this column
      const values = new Set(
        rows
          .map((r) => r[col.name])
          .filter((v) => v !== null && v !== undefined)
      );
      // Limit to 20 options to keep UI clean
      options[col.name] = Array.from(values).map(String).slice(0, 20);
    });
    return options;
  }, [columns, rows]);

  const {
    filteredItems: filteredRows,
    data: filterData,
    setData: filterSetData,
  } = useFilter(rows, filterKeys);

  const tableRows = filteredRows.map((row) => (
    <Table.Tr
      key={row[pk]}
      bg={selectedRows.has(String(row[pk])) ? "gray.0" : undefined}
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
        <Group justify="space-between" mb="lg" px="xs" mt="xs">
          <Group gap={4}>
            <IconDatabase stroke={2.5} size={24} />
            <Text fw={700} size="md">
              SQLite Admin
            </Text>
          </Group>
        </Group>

        <Stack gap={4} mb="md">
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            px="xs"
            mb={4}
            style={{ textTransform: "uppercase", fontSize: "11px" }}
          >
            Platform
          </Text>
          <NavLink
            label="Home"
            leftSection={<IconCommand size={16} />}
            onClick={() => {
              setCurrentTable(null);
              setSqlMode(false);
            }}
            style={{ borderRadius: 6 }}
            active={!currentTable && !sqlMode}
          />
          <NavLink
            label="Search"
            leftSection={<IconSearch size={16} />}
            onClick={() => openCommand()}
            style={{ borderRadius: 6 }}
          />
          <NavLink
            label="SQL Runner"
            leftSection={<IconTerminal2 size={16} />}
            active={sqlMode}
            onClick={() => {
              setSqlMode(!sqlMode);
              if (!sqlMode) setCurrentTable(null);
            }}
            style={{ borderRadius: 6 }}
          />
          <NavLink
            label="ER Diagram"
            leftSection={<IconSitemap size={16} />}
            onClick={() => loadErd()}
            style={{ borderRadius: 6 }}
          />
        </Stack>

        <Divider my="sm" />

        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            <Text
              size="xs"
              fw={600}
              c="dimmed"
              px="xs"
              mb={4}
              mt="xs"
              style={{ textTransform: "uppercase", fontSize: "11px" }}
            >
              Favorites
            </Text>
            {favorites.map((name) => {
              const t = tables.find((tb) => tb.name === name);
              return (
                <NavLink
                  key={name}
                  label={name}
                  leftSection={<IconTable size={16} />}
                  active={currentTable === name}
                  onClick={() => selectTable(name)}
                  style={{ borderRadius: 6 }}
                />
              );
            })}

            {favorites.length === 0 && (
              <Text size="xs" c="dimmed" px="sm" py={2} fs="italic">
                No favorites
              </Text>
            )}

            <Text
              size="xs"
              fw={600}
              c="dimmed"
              px="xs"
              mb={4}
              mt="lg"
              style={{ textTransform: "uppercase", fontSize: "11px" }}
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
                  onClick={() => selectTable(t.name)}
                  style={{ borderRadius: 6 }}
                />
              ))}
          </Stack>
        </ScrollArea>

        <Divider my="sm" />

        {/* User Menu */}
        <Menu shadow="md" width={200} position="right-end">
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              justify="space-between"
              size="md"
              px={8}
              py={4}
              style={{
                height: "auto",
                borderRadius: 6,
                color: "var(--mantine-color-text)",
              }}
            >
              <Group gap="xs">
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "#E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#374151",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  AD
                </Box>
                <Box style={{ textAlign: "left" }}>
                  <Text size="sm" fw={500} lh={1.2}>
                    Admin
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.2}>
                    sqlite@local
                  </Text>
                </Box>
              </Group>
              <IconSelector size={14} color="gray" />
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Application</Menu.Label>
            <Menu.Item
              leftSection={
                dark ? <IconSun size={14} /> : <IconMoon size={14} />
              }
              onClick={() => toggleColorScheme()}
            >
              Mode: {dark ? "Dark" : "Light"}
            </Menu.Item>
            <Menu.Item leftSection={<IconSettings size={14} />}>
              Settings
            </Menu.Item>
            <Menu.Item leftSection={<IconDeviceLaptop size={14} />}>
              Shortcuts
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item color="red" leftSection={<IconLogout size={14} />}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </AppShell.Navbar>

      <AppShell.Main>
        {sqlMode ? (
          // SQL MODE LAYOUT
          <Box p="xl" style={{ maxWidth: 900, margin: "0 auto" }}>
            <Group mb="xl" gap="sm">
              <IconTerminal2 size={42} />
              <Title order={1}>SQL Runner</Title>
            </Group>

            <Paper
              p="sm"
              withBorder
              bg="white"
              shadow="sm"
              radius="md"
              mb="xl"
              style={{
                borderColor: "var(--mantine-color-indigo-2)",
              }}
            >
              <Group>
                <IconSparkles size={20} color="var(--mantine-color-indigo-6)" />
                <TextInput
                  placeholder="Ask AI to write SQL..."
                  variant="unstyled"
                  style={{ flex: 1 }}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAi()}
                  styles={{
                    input: {
                      fontSize: "15px",
                      fontWeight: 500,
                    },
                  }}
                />
                {aiLoading && <Loader size="xs" color="indigo" />}
              </Group>
            </Paper>

            <Textarea
              label="Query"
              placeholder="SELECT * FROM ..."
              minRows={5}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              styles={{ input: { fontFamily: "monospace" } }}
              mb="md"
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={toggleHistory} color="gray">
                History
              </Button>
              <Button color="dark" onClick={runQuery}>
                Run Query
              </Button>
            </Group>

            {/* History & Results would go here - simplified for this view */}
          </Box>
        ) : !currentTable ? (
          // DASHBOARD / OVERVIEW (NOTION STYLE)
          <Box p="xl" style={{ maxWidth: 960, margin: "0 auto" }}>
            {/* 1. Header Area */}
            <Group align="flex-start" gap="md" mb={48} mt="xl">
              <ThemeIcon size={72} variant="transparent" c="dark">
                <IconDatabase size={72} stroke={1.3} />
              </ThemeIcon>
              <Stack gap={0} mt={4}>
                <Title order={1} fw={700} fz={40}>
                  SQLite Admin
                </Title>
                <Text c="dimmed" size="lg">
                  Manage your local database schema and data.
                </Text>
              </Stack>
            </Group>

            {/* 2. Gallery Section (Tools) */}
            <Box mb={48}>
              <Title order={3} fw={600} mb="xl" fz={18}>
                Quick Access
              </Title>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
                {/* Card: SQL Runner */}
                <Paper
                  withBorder
                  p="lg"
                  radius="md"
                  onClick={() => setSqlMode(true)}
                  style={{
                    cursor: "pointer",
                    transition: "box-shadow 0.2s",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  className="editable-cell"
                  h={140}
                  display="flex"
                >
                  <Group justify="space-between" align="flex-start">
                    <ThemeIcon variant="light" color="gray" size="lg">
                      <IconTerminal2 size={20} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text fw={600} size="md">
                      SQL Runner
                    </Text>
                    <Text size="xs" c="dimmed">
                      Run queries & AI
                    </Text>
                  </Box>
                </Paper>

                {/* Card: Search */}
                <Paper
                  withBorder
                  p="lg"
                  radius="md"
                  style={{
                    cursor: "pointer",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  className="editable-cell"
                  h={140}
                  display="flex"
                  onClick={() => openCommand()}
                >
                  <Group justify="space-between" align="flex-start">
                    <ThemeIcon variant="light" color="gray" size="lg">
                      <IconSearch size={20} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text fw={600} size="md">
                      Global Search
                    </Text>
                    <Text size="xs" c="dimmed">
                      Find anything
                    </Text>
                  </Box>
                </Paper>

                {/* Card: Schema */}
                <Paper
                  withBorder
                  p="lg"
                  radius="md"
                  style={{
                    cursor: "pointer",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  className="editable-cell"
                  h={140}
                  display="flex"
                  onClick={() => loadErd()}
                >
                  <Group justify="space-between" align="flex-start">
                    <ThemeIcon variant="light" color="gray" size="lg">
                      <IconSitemap size={20} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text fw={600} size="md">
                      ER Diagram
                    </Text>
                    <Text size="xs" c="dimmed">
                      Visual Schema
                    </Text>
                  </Box>
                </Paper>
              </SimpleGrid>
            </Box>

            {/* 3. Table Section (Recents) */}
            <Box>
              <Group mb="md" gap="xs">
                <IconTable size={18} />
                <Title order={3} fw={600} fz={18}>
                  Recent Activity
                </Title>
                <Divider orientation="vertical" />
                <Text size="sm" c="dimmed" style={{ cursor: "pointer" }}>
                  Board
                </Text>
              </Group>

              <Paper withBorder radius="sm" overflow="hidden">
                <Table verticalSpacing="xs" striped={false} highlightOnHover>
                  <Table.Thead bg="gray.0">
                    <Table.Tr>
                      <Table.Th style={{ width: "40%" }}>
                        <Group gap={4}>
                          <Text size="xs" c="dimmed">
                            Aa
                          </Text>
                          Table Name
                        </Group>
                      </Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentTables.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={3}>
                          <Text size="sm" c="dimmed" fs="italic" py="xs">
                            No recent pages visited.
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      recentTables.map((name) => (
                        <Table.Tr
                          key={name}
                          onClick={() => selectTable(name)}
                          style={{ cursor: "pointer" }}
                        >
                          <Table.Td>
                            <Group gap="sm">
                              <IconTable size={16} />
                              <Text
                                size="sm"
                                fw={500}
                                style={{ borderBottom: "1px solid #e5e7eb" }}
                              >
                                {name}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" color="gray" variant="light">
                              Table
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              color="gray"
                            >
                              Open
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Box>
          </Box>
        ) : (
          // TABLE VIEW
          <Box pt="md">
            {/* NOTION-LIKE HEADER */}
            <Box
              px="xl"
              pb="md"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
            >
              <Group align="center" gap="md" mb="xs">
                <IconTable size={32} stroke={1.5} />
                <Title order={1} style={{ fontSize: 32, fontWeight: 700 }}>
                  {currentTable}
                </Title>
              </Group>

              <Group gap="xl" mt="md">
                {/* VIEWS TABS */}
                <Group gap="sm">
                  <Button
                    variant="subtle"
                    color="dark"
                    size="sm"
                    leftSection={<IconTable size={16} />}
                    style={{ borderBottom: "2px solid black", borderRadius: 0 }}
                  >
                    Table
                  </Button>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    leftSection={<IconSchema size={16} />}
                    onClick={openSchema}
                  >
                    Structure
                  </Button>
                </Group>
              </Group>
            </Box>

            {/* TOOLBAR */}
            <Group
              justify="space-between"
              px="xl"
              py="sm"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
            >
              <Group gap="xs">
                <Button
                  size="xs"
                  color="dark"
                  leftSection={<IconPlus size={14} />}
                  onClick={openNewRecord}
                >
                  New
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconFilter size={14} />}
                  onClick={openFilter}
                >
                  Filter
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconDots size={14} />}
                >
                  Options
                </Button>
              </Group>

              <Group gap="xs">
                <TextInput
                  placeholder="Search..."
                  size="xs"
                  leftSection={<IconSearch size={12} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => toggleFavorite(currentTable)}
                >
                  {favorites.includes(currentTable) ? (
                    <IconStarFilled size={16} />
                  ) : (
                    <IconStar size={16} />
                  )}
                </ActionIcon>
              </Group>
            </Group>

            {/* CONTENT */}
            <Box px="xl" py="md">
              {selectedRows.size > 0 && (
                <Paper p="xs" bg="dark" radius="sm" mb="md">
                  <Group justify="space-between">
                    <Text c="white" size="sm">
                      {selectedRows.size} selected
                    </Text>
                    <Group>
                      <Button
                        size="xs"
                        color="red"
                        variant="white"
                        onClick={bulkDelete}
                      >
                        Delete
                      </Button>
                      <Button
                        size="xs"
                        variant="white"
                        onClick={openExport}
                        bg="transparent"
                        c="white"
                        style={{ border: "1px solid white" }}
                      >
                        Export
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        c="white"
                        onClick={() => setSelectedRows(new Set())}
                      >
                        Clear
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              )}

              {/* Filter Component */}
              <Box mb="md">
                <Filter
                  data={filterData}
                  setData={filterSetData}
                  filterOptions={filterOptions}
                />
              </Box>

              {loading ? (
                <Center py="xl">
                  <Loader color="gray" type="dots" />
                </Center>
              ) : (
                <ScrollArea>
                  <Table
                    striped={false}
                    highlightOnHover
                    withTableBorder={false}
                    verticalSpacing="xs"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th
                          w={40}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <Checkbox
                            checked={
                              selectedRows.size === rows.length &&
                              rows.length > 0
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
                                setSortDir((d) =>
                                  d === "ASC" ? "DESC" : "ASC"
                                );
                              } else {
                                setSort(col.name);
                                setSortDir("ASC");
                              }
                            }}
                            style={{
                              cursor: "pointer",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            <Group gap={4} wrap="nowrap">
                              {getColumnIcon(col.type, col.name)}
                              <Text size="xs" fw={500} c="dimmed">
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
                        <Table.Th
                          w={50}
                          style={{ borderBottom: "1px solid #eee" }}
                        ></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{tableRows}</Table.Tbody>
                    <Table.Tfoot>
                      <Table.Tr>
                        <Table.Td colSpan={columns.length + 2}>
                          <Group justify="flex-end" gap="xs" mt="xs">
                            <Text size="xs" c="dimmed">
                              Page {page} of {Math.ceil(total / 50)} ({total}{" "}
                              records)
                            </Text>
                            <ActionIcon
                              variant="default"
                              size="sm"
                              disabled={page <= 1}
                              onClick={() => setPage((p) => p - 1)}
                            >
                              <IconChevronLeft size={14} />
                            </ActionIcon>
                            <ActionIcon
                              variant="default"
                              size="sm"
                              disabled={page >= Math.ceil(total / 50)}
                              onClick={() => setPage((p) => p + 1)}
                            >
                              <IconChevronRight size={14} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tfoot>
                  </Table>
                </ScrollArea>
              )}
            </Box>
          </Box>
        )}
      </AppShell.Main>

      {/* New Record Modal */}
      <Modal
        opened={newRecordOpened}
        onClose={closeNewRecord}
        title="New Record"
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
            <Button variant="subtle" onClick={closeNewRecord} color="gray">
              Cancel
            </Button>
            <Button
              color="dark"
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
                      title: "Success",
                      message: "Record created!",
                      color: "green",
                    });
                    closeNewRecord();
                    loadData();
                    loadTables();
                  } else {
                    notifications.show({
                      title: "Error",
                      message: result.error,
                      color: "red",
                    });
                  }
                } catch (err) {
                  notifications.show({
                    title: "Error",
                    message: "Failed to save",
                    color: "red",
                  });
                }
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Filter Modal */}
      <Modal opened={filterOpened} onClose={closeFilter} title="Filter">
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
                placeholder="Column"
                style={{ flex: 1 }}
              />
              <Select
                data={[
                  { value: "=", label: "=" },
                  { value: "!=", label: "≠" },
                  { value: ">", label: ">" },
                  { value: "<", label: "<" },
                  { value: "LIKE", label: "contains" },
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
                placeholder="Value"
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
            Add Filter
          </Button>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setFilters([]);
                closeFilter();
              }}
            >
              Clear
            </Button>
            <Button onClick={closeFilter} color="dark">
              Apply
            </Button>
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
              <Table.Th>Column</Table.Th>
              <Table.Th>Type</Table.Th>
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
                <Table.Td>{c.pk ? <IconKey size={16} /> : "-"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>

      {/* Export Modal */}
      <Modal opened={exportOpened} onClose={closeExport} title="Export">
        <Stack>
          <Select
            label="Format"
            data={[
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
            ]}
            value={exportFormat}
            onChange={setExportFormat}
          />
          <Text size="sm" c="dimmed">
            {selectedRows.size > 0
              ? `${selectedRows.size} selected`
              : `${rows.length} records on current page`}
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeExport} color="gray">
              Cancel
            </Button>
            <Button onClick={doExport} color="dark">
              Export
            </Button>
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
        yOffset="10vh"
      >
        <TextInput
          placeholder="Search tables, commands..."
          size="lg"
          variant="unstyled"
          p="md"
          leftSection={<IconSearch size={22} />}
          styles={{ input: { border: "none" } }}
        />
        <Divider />
        <Stack gap={0} p="xs">
          <Text size="xs" c="dimmed" px="sm" py={4} fw={600}>
            TABLES
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
              style={{ borderRadius: 4 }}
            />
          ))}
          <Text size="xs" c="dimmed" px="sm" py={4} fw={600} mt="xs">
            ACTIONS
          </Text>
          <NavLink
            label="New Record"
            leftSection={<IconPlus size={16} />}
            style={{ borderRadius: 4 }}
            onClick={() => {
              openNewRecord();
              closeCommand();
            }}
          />
          <NavLink
            label="Run SQL"
            leftSection={<IconTerminal2 size={16} />}
            style={{ borderRadius: 4 }}
            onClick={() => {
              setSqlMode(true);
              closeCommand();
            }}
          />
          <NavLink
            label="View ER Diagram"
            style={{ borderRadius: 4 }}
            leftSection={<IconSitemap size={16} />}
            onClick={() => {
              loadErd();
              closeCommand();
            }}
          />
        </Stack>
        <Paper bg="gray.0" p="xs" px="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Search database
            </Text>
            <Group gap={4}>
              <Kbd size="xs">esc</Kbd>
              <Text size="xs" c="dimmed">
                to close
              </Text>
            </Group>
          </Group>
        </Paper>
      </Modal>

      {/* ERD Modal */}
      <Modal
        opened={erdOpened}
        onClose={closeErd}
        title="Entity Relationship Diagram"
        size="100%"
        styles={{ body: { height: "calc(100vh - 100px)", overflow: "hidden" } }}
      >
        <ScrollArea h="100%">
          <div
            dangerouslySetInnerHTML={{ __html: erdSvg }}
            style={{ textAlign: "center", minWidth: "1000px" }}
          />
        </ScrollArea>
      </Modal>
    </AppShell>
  );
}
