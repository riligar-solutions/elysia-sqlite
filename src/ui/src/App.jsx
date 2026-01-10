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
  HoverCard,
  Switch,
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
  IconLink,
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
import { ExportButton } from "./components/ExportButton";
import { ButtonDelete } from "./components/HoldButton";
import { Onboarding } from "./components/Onboarding";
import { Login } from "./components/Login";
import { SecuritySettings } from "./components/SecuritySettings";
import { TableSelector } from "./components/TableSelector";
import { DataGrid } from "./components/DataGrid";
import { Pagination } from "./components/Pagination";

const API = "/sqlite/api";
const AUTH = "/sqlite/auth";

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

// New Record Modal Component with FK Support
const NewRecordModal = ({
  opened,
  onClose,
  columns,
  currentTable,
  onSuccess,
}) => {
  // ... (modal implementation)
  const [formData, setFormData] = useState({});
  const [fkOptionsMap, setFkOptionsMap] = useState({});
  const [loadingFk, setLoadingFk] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (opened) {
      setFormData({});
      // Load FK options for all FK columns
      const fkColumns = columns.filter((c) => c.pk !== 1 && c.fk);
      fkColumns.forEach((col) => {
        loadFkOptions(col);
      });
    }
  }, [opened, columns]);

  const loadFkOptions = async (col) => {
    if (!col.fk) return;

    setLoadingFk((prev) => ({ ...prev, [col.name]: true }));

    try {
      const res = await fetch(
        `${API}/table/${currentTable}/fk-options?refTable=${col.fk.table}&refColumn=${col.fk.column}`
      );
      const data = await res.json();

      if (data.success) {
        setFkOptionsMap((prev) => ({
          ...prev,
          [col.name]: data.options.map((o) => ({
            value: String(o.value),
            label: `${o.label} (ID: ${o.value})`,
          })),
        }));
      }
    } catch (err) {
      console.error("Error loading FK options:", err);
    }

    setLoadingFk((prev) => ({ ...prev, [col.name]: false }));
  };

  const handleFieldChange = (colName, value) => {
    setFormData((prev) => ({
      ...prev,
      [colName]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch(`${API}/table/${currentTable}/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (result.success) {
        notifications.show({
          title: "Success",
          message: "Record created!",
          color: "green",
        });
        onSuccess();
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

    setSaving(false);
  };

  const renderField = (col) => {
    const hasFK = !!col.fk;
    const isRequired = col.notnull === 1;
    const label = `${col.name}${isRequired ? " *" : ""}`;

    if (hasFK) {
      const options = fkOptionsMap[col.name] || [];
      const isLoading = loadingFk[col.name];

      return (
        <Select
          key={col.name}
          label={label}
          placeholder={isLoading ? "Loading..." : `Select ${col.fk.table}`}
          data={options}
          value={formData[col.name] || null}
          onChange={(value) => handleFieldChange(col.name, value)}
          searchable
          clearable
          disabled={isLoading}
          leftSection={<IconKey size={14} />}
        />
      );
    }

    return (
      <TextInput
        key={col.name}
        label={label}
        placeholder={col.type || "TEXT"}
        value={formData[col.name] || ""}
        onChange={(e) => handleFieldChange(col.name, e.target.value)}
      />
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New Record">
      <Stack>
        {columns.filter((c) => c.pk !== 1).map((col) => renderField(col))}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} color="gray">
            Cancel
          </Button>
          <Button color="dark" onClick={handleSave} loading={saving}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default function App() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === "dark";

  // Auth State
  const [auth, setAuth] = useState(null);

  // Security Modal
  const [securityOpened, { open: openSecurity, close: closeSecurity }] =
    useDisclosure(false);

  // ... (rest of checkAuth and useEffect)
  const checkAuth = async () => {
    try {
      const res = await fetch(`${AUTH}/status`);
      const data = await res.json();
      setAuth(data);
    } catch (e) {
      console.error("Failed to check auth status", e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH}/logout`, { method: "POST" });
      setAuth({ ...auth, authenticated: false, user: null });
      notifications.show({
        title: "Logged out",
        message: "You have been successfully logged out",
        color: "gray",
      });
    } catch (e) {
      notifications.show({
        title: "Error",
        message: "Failed to logout",
        color: "red",
      });
    }
  };

  // State
  const [tables, setTables] = useState([]);
  // ... (rest of App state)

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
  const [fkMap, setFkMap] = useState({});

  useEffect(() => {
    const resolveFks = async () => {
      if (!rows.length || !columns.length) return;

      const fkCols = columns.filter((c) => c.fk);
      if (fkCols.length === 0) return;

      const newMap = { ...fkMap };
      let hasChanges = false;

      for (const col of fkCols) {
        const idsToResolve = new Set();
        rows.forEach((row) => {
          const val = row[col.name];
          if (val != null && !newMap[`${col.fk.table}:${val}`]) {
            idsToResolve.add(val);
          }
        });

        if (idsToResolve.size > 0) {
          try {
            const res = await fetch(`${API}/resolve-fk`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                table: col.fk.table,
                idColumn: col.fk.column,
                ids: Array.from(idsToResolve),
              }),
            });
            const data = await res.json();
            if (data.success) {
              Object.entries(data.values).forEach(([id, label]) => {
                newMap[`${col.fk.table}:${id}`] = label;
              });
              hasChanges = true;
            }
          } catch (e) {
            console.error("Failed to resolve FKs", e);
          }
        }
      }

      if (hasChanges) {
        setFkMap(newMap);
      }
    };

    resolveFks();
  }, [rows, columns]);

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
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);

  // Filters
  const [filters, setFilters] = useState([]);
  const [exportFormat, setExportFormat] = useState("csv");

  // Reset SQL Runner state (preserves queryHistory)
  const resetSqlRunnerState = () => {
    setSqlQuery("");
    setAiPrompt("");
    setRows([]);
    setColumns([]);
    if (historyOpened) {
      toggleHistory();
    }
  };

  // Command palette items
  const commandActions = [
    {
      label: "Run SQL",
      icon: IconTerminal2,
      action: () => {
        resetSqlRunnerState();
        setSqlMode(true);
        closeCommand();
      },
    },
    {
      label: "View ER Diagram",
      icon: IconSitemap,
      action: () => {
        loadErd();
        closeCommand();
      },
    },
    {
      label: "Toggle Theme",
      icon: dark ? IconSun : IconMoon,
      action: () => {
        toggleColorScheme();
        closeCommand();
      },
    },
  ];

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const filteredActions = commandActions.filter((a) =>
    a.label.toLowerCase().includes(commandQuery.toLowerCase())
  );

  // Combined items for keyboard navigation
  const allItems = [
    ...filteredTables.slice(0, 8).map((t) => ({ type: "table", name: t.name })),
    ...filteredActions.map((a) => ({
      type: "action",
      label: a.label,
      action: a.action,
    })),
  ];

  const handleCommandKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCommandIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCommandIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems.length > 0) {
      e.preventDefault();
      const item = allItems[commandIndex];
      if (item.type === "table") {
        selectTable(item.name);
        setCommandQuery("");
        setCommandIndex(0);
        closeCommand();
      } else {
        item.action();
        setCommandIndex(0);
      }
    }
  };

  // Hotkeys
  useHotkeys([
    [
      "mod+k",
      () => {
        setCommandQuery("");
        setCommandIndex(0);
        openCommand();
      },
    ],
    [
      "escape",
      () => {
        closeCommand();
        setCommandQuery("");
        setCommandIndex(0);
      },
    ],
  ]);

  // Load tables
  useEffect(() => {
    if (auth?.authenticated) {
      loadTables();
    }
  }, [auth?.authenticated]);

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
    setSearchQuery("");
    setSqlMode(false);
    setFilters([]);
    resetSqlRunnerState();

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
    setFkMap({});
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

  const mainApp = (
    <AppShell navbar={{ width: 260, breakpoint: "sm" }} padding="md">
      <AppShell.Navbar
        p="xs"
        style={{
          backgroundColor: "#FBFAF8",
          borderRight: "1px solid #E8E5E0",
        }}
      >
        <Group justify="space-between" mb="lg" px="xs" mt="xs">
          <Group gap={4}>
            <IconDatabase stroke={2.5} size={24} color="#37352F" />
            <Text fw={700} size="md" c="#37352F">
              SQLite
            </Text>
          </Group>
        </Group>

        <Stack gap={4}>
          <Text
            size="xs"
            fw={500}
            c="#91918E"
            px="xs"
            mb={4}
            style={{
              textTransform: "uppercase",
              fontSize: "11px",
              letterSpacing: "0.03em",
            }}
          >
            Platform
          </Text>
          <NavLink
            label="Home"
            leftSection={<IconCommand size={16} />}
            onClick={() => {
              setCurrentTable(null);
              setSqlMode(false);
              resetSqlRunnerState();
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
              if (sqlMode) {
                // Exiting SQL Runner - reset state
                setSqlMode(false);
                resetSqlRunnerState();
              } else {
                // Entering SQL Runner
                resetSqlRunnerState();
                setSqlMode(true);
                setCurrentTable(null);
              }
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

        <Divider my="sm" color="#E8E5E0" />

        <TableSelector
          tables={tables}
          favorites={favorites}
          currentTable={currentTable}
          onSelectTable={selectTable}
        />

        <Divider my="sm" color="#E8E5E0" />

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
                  {auth?.user?.[0]?.toUpperCase() || "U"}
                </Box>
                <Box style={{ textAlign: "left" }}>
                  <Text size="sm" fw={500} lh={1.2}>
                    {auth?.user || "User"}
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
              closeMenuOnClick={false}
              onClick={() => toggleColorScheme()}
              rightSection={
                <Switch
                  checked={dark}
                  size="sm"
                  onLabel={
                    <IconMoon
                      size={12}
                      stroke={2.5}
                      color="var(--mantine-color-yellow-4)"
                    />
                  }
                  offLabel={
                    <IconSun
                      size={12}
                      stroke={2.5}
                      color="var(--mantine-color-gray-6)"
                    />
                  }
                  readOnly
                  style={{ pointerEvents: "none" }}
                />
              }
            >
              Dark Mode
            </Menu.Item>
            <Menu.Item
              leftSection={<IconSettings size={14} />}
              onClick={openSecurity}
            >
              Settings
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </AppShell.Navbar>

      <AppShell.Main>
        <SecuritySettings opened={securityOpened} onClose={closeSecurity} />
        {sqlMode ? (
          // ... (rest of AppShell content)

          // SQL MODE LAYOUT
          <Box p="xl" style={{ maxWidth: 900, margin: "0 auto" }}>
            <Group mb="xl" gap="sm">
              <IconTerminal2 size={42} />
              <Title order={1}>SQL Runner</Title>
            </Group>

            <Paper
              p="md"
              withBorder
              radius="md"
              mb="lg"
              bg={dark ? "dark.6" : "gray.0"}
              style={{
                borderColor: dark
                  ? "var(--mantine-color-dark-4)"
                  : "var(--mantine-color-gray-3)",
              }}
            >
              <Group gap="sm">
                <IconSparkles size={20} style={{ opacity: 0.6 }} />
                <TextInput
                  placeholder="Ask AI to write SQL..."
                  style={{ flex: 1 }}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAi()}
                />
                {aiLoading && <Loader size="xs" color="gray" />}
              </Group>
              <Text size="xs" c="dimmed" align="right" mt="xs">
                Press ENTER to generate your query
              </Text>
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

            {/* History */}
            {historyOpened && (
              <Paper withBorder p="md" radius="md" mt="xl">
                <Text fw={600} mb="sm">
                  Query History
                </Text>
                <Stack gap="xs">
                  {queryHistory.length === 0 ? (
                    <Text size="sm" c="dimmed" fs="italic">
                      No history yet.
                    </Text>
                  ) : (
                    queryHistory.slice(0, 10).map((h, i) => (
                      <Group key={i} justify="space-between" wrap="nowrap">
                        <Text
                          size="sm"
                          style={{
                            fontFamily: "monospace",
                            cursor: "pointer",
                            flex: 1,
                          }}
                          onClick={() => setSqlQuery(h.sql)}
                          lineClamp={1}
                        >
                          {h.sql}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="xs" c="dimmed">
                            {new Date(h.timestamp).toLocaleTimeString()}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="dark"
                            size="sm"
                            onClick={() => {
                              setSqlQuery(h.sql);
                              setTimeout(() => runQuery(), 100);
                            }}
                          >
                            <IconPlayerPlay size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    ))
                  )}
                </Stack>
              </Paper>
            )}

            {/* Results */}
            {loading ? (
              <Center py="xl">
                <Loader color="gray" type="dots" />
              </Center>
            ) : (
              rows.length > 0 &&
              sqlMode && (
                <Paper withBorder radius="md" mt="xl">
                  <Group
                    p="sm"
                    justify="space-between"
                    style={{
                      borderBottom: "1px solid var(--mantine-color-gray-3)",
                    }}
                  >
                    <Text size="sm" c="dimmed">
                      {rows.length} result(s)
                    </Text>
                    <ExportButton
                      data={rows}
                      columns={columns}
                      filename="query_results"
                      variant="subtle"
                      compact
                    />
                  </Group>
                  <ScrollArea>
                    <Table
                      striped={false}
                      highlightOnHover
                      verticalSpacing="xs"
                    >
                      <Table.Thead>
                        <Table.Tr>
                          {columns.map((col) => (
                            <Table.Th
                              key={col.name}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <Text size="xs" fw={500} c="dimmed">
                                {col.name}
                              </Text>
                            </Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {rows.map((row, idx) => (
                          <Table.Tr key={idx}>
                            {columns.map((col) => (
                              <Table.Td
                                key={col.name}
                                style={{ borderBottom: "1px solid #f5f5f5" }}
                              >
                                <Text
                                  size="sm"
                                  lineClamp={2}
                                  title={String(row[col.name])}
                                >
                                  {col.fk ? (
                                    <Group gap={6} wrap="nowrap">
                                      <Badge
                                        variant="outline"
                                        color="gray"
                                        size="sm"
                                        leftSection={<IconLink size={10} />}
                                        styles={{ label: { fontWeight: 500 } }}
                                      >
                                        {String(row[col.name])}
                                      </Badge>
                                      {fkMap[
                                        `${col.fk.table}:${row[col.name]}`
                                      ] && (
                                        <Text
                                          size="xs"
                                          c="dimmed"
                                          lineClamp={1}
                                        >
                                          {
                                            fkMap[
                                              `${col.fk.table}:${row[col.name]}`
                                            ]
                                          }
                                        </Text>
                                      )}
                                    </Group>
                                  ) : row[col.name] != null ? (
                                    String(row[col.name])
                                  ) : (
                                    <Text span c="dimmed" fs="italic">
                                      NULL
                                    </Text>
                                  )}
                                </Text>
                              </Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Paper>
              )
            )}
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
                  SQLite
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
            </Box>

            {/* TOOLBAR */}
            <Group
              justify="space-between"
              px="xl"
              py="sm"
              style={{
                borderBottom: "1px solid #E5E7EB",
                backgroundColor: "#FAFAFA",
              }}
            >
              <Group gap="xs">
                <Button
                  size="xs"
                  color="dark"
                  radius="md"
                  leftSection={<IconPlus size={14} />}
                  onClick={openNewRecord}
                  styles={{
                    root: {
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    },
                  }}
                >
                  New
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  radius="md"
                  leftSection={<IconSchema size={14} />}
                  onClick={openSchema}
                  styles={{
                    root: {
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    },
                  }}
                >
                  Structure
                </Button>
                <ExportButton
                  data={
                    selectedRows.size > 0
                      ? rows.filter((r) =>
                          selectedRows.has(
                            String(
                              r[
                                columns.find((c) => c.pk === 1)?.name ||
                                  columns[0]?.name
                              ]
                            )
                          )
                        )
                      : rows
                  }
                  columns={columns}
                  filename={currentTable}
                  variant="default"
                />
              </Group>

              <Button
                size="xs"
                variant={
                  favorites.includes(currentTable) ? "filled" : "default"
                }
                color={favorites.includes(currentTable) ? "dark" : "gray"}
                radius="md"
                leftSection={
                  favorites.includes(currentTable) ? (
                    <IconStarFilled size={14} />
                  ) : (
                    <IconStar size={14} />
                  )
                }
                onClick={() => toggleFavorite(currentTable)}
                styles={{
                  root: {
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  },
                }}
              >
                {favorites.includes(currentTable) ? "Favorited" : "Favorite"}
              </Button>
            </Group>

            {/* CONTENT */}
            <Box px="xl" py="lg">
              {/* Unified Filter Component */}
              <Box mb="md">
                <Filter
                  data={filterData}
                  setData={filterSetData}
                  filterOptions={filterOptions}
                />
              </Box>

              {/* Selection Actions Bar */}
              {selectedRows.size > 0 && (
                <Paper p="xs" bg="dark" radius="sm" mb="md">
                  <Group justify="space-between">
                    <Text c="white" size="sm">
                      {selectedRows.size} selected
                    </Text>
                    <Group>
                      <ButtonDelete
                        size="xs"
                        color="red"
                        variant="white"
                        onDelete={bulkDelete}
                      >
                        Delete
                      </ButtonDelete>
                      <ExportButton
                        data={rows.filter((r) =>
                          selectedRows.has(
                            String(
                              r[
                                columns.find((c) => c.pk === 1)?.name ||
                                  columns[0]?.name
                              ]
                            )
                          )
                        )}
                        columns={columns}
                        filename={`${currentTable}_selected`}
                        variant="default"
                      />
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

              {loading ? (
                <Center py="xl">
                  <Loader color="gray" type="dots" />
                </Center>
              ) : (
                <>
                  <DataGrid
                    columns={columns}
                    rows={filteredRows}
                    pk={pk}
                    selectedRows={selectedRows}
                    onSelectRow={(pk, checked) => {
                      const newSelected = new Set(selectedRows);
                      if (checked) {
                        newSelected.add(pk);
                      } else {
                        newSelected.delete(pk);
                      }
                      setSelectedRows(newSelected);
                    }}
                    onSelectAll={(checked) => {
                      if (checked) {
                        setSelectedRows(
                          new Set(rows.map((r) => String(r[pk])))
                        );
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    onSort={(colName) => {
                      if (sort === colName) {
                        setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
                      } else {
                        setSort(colName);
                        setSortDir("ASC");
                      }
                    }}
                    sort={sort}
                    sortDir={sortDir}
                    getColumnIcon={getColumnIcon}
                    onDeleteRecord={deleteRecord}
                    editingCell={editingCell}
                    onStartEdit={(rowPk, column) =>
                      setEditingCell({ rowPk, column })
                    }
                    onUpdateCell={updateCell}
                    onCancelEdit={() => setEditingCell(null)}
                    fkMap={fkMap}
                    API={API}
                    currentTable={currentTable}
                    getTagColor={getTagColor}
                    isTagColumn={isTagColumn}
                  />

                  <Pagination
                    page={page}
                    total={total}
                    onPageChange={setPage}
                  />
                </>
              )}
            </Box>
          </Box>
        )}
      </AppShell.Main>

      {/* New Record Modal */}
      <NewRecordModal
        opened={newRecordOpened}
        onClose={closeNewRecord}
        columns={columns}
        currentTable={currentTable}
        onSuccess={() => {
          closeNewRecord();
          loadData();
          loadTables();
        }}
      />

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
              <Table.Th>Key</Table.Th>
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
                  <Group gap={4}>
                    {c.pk ? (
                      <Tooltip label="Primary Key">
                        <IconKey size={16} />
                      </Tooltip>
                    ) : null}
                    {c.fk ? (
                      <Tooltip
                        label={`Foreign Key to ${c.fk.table}.${c.fk.column}`}
                      >
                        <IconLink
                          size={16}
                          color="var(--mantine-color-indigo-4)"
                        />
                      </Tooltip>
                    ) : null}
                    {!c.pk && !c.fk ? "-" : null}
                  </Group>
                </Table.Td>
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

      <Modal
        opened={commandOpened}
        onClose={() => {
          closeCommand();
          setCommandQuery("");
          setCommandIndex(0);
        }}
        withCloseButton={false}
        size="lg"
        padding={0}
        radius="md"
        yOffset="10vh"
      >
        <TextInput
          placeholder="Search tables, commands..."
          variant="unstyled"
          p="xs"
          value={commandQuery}
          onChange={(e) => {
            setCommandQuery(e.target.value);
            setCommandIndex(0);
          }}
          onKeyDown={handleCommandKeyDown}
          leftSection={<IconSearch size={22} />}
          styles={{ input: { border: "none" } }}
          autoFocus
        />
        <Divider />
        <Stack gap={0} p="xs" mah={400} style={{ overflow: "auto" }}>
          {filteredTables.length > 0 && (
            <>
              <Text size="xs" c="dimmed" px="sm" py={4} fw={600}>
                TABLES
              </Text>
              {filteredTables.slice(0, 8).map((t, i) => (
                <NavLink
                  key={t.name}
                  label={t.name}
                  leftSection={<IconTable size={16} />}
                  active={commandIndex === i}
                  onClick={() => {
                    selectTable(t.name);
                    setCommandQuery("");
                    setCommandIndex(0);
                    closeCommand();
                  }}
                  style={{ borderRadius: 4 }}
                />
              ))}
            </>
          )}
          {filteredActions.length > 0 && (
            <>
              <Text size="xs" c="dimmed" px="sm" py={4} fw={600} mt="xs">
                ACTIONS
              </Text>
              {filteredActions.map((action, i) => (
                <NavLink
                  key={action.label}
                  label={action.label}
                  leftSection={<action.icon size={16} />}
                  active={
                    commandIndex === filteredTables.slice(0, 8).length + i
                  }
                  style={{ borderRadius: 4 }}
                  onClick={() => {
                    action.action();
                    setCommandIndex(0);
                  }}
                />
              ))}
            </>
          )}
          {filteredTables.length === 0 && filteredActions.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No results found for "{commandQuery}"
            </Text>
          )}
        </Stack>
        <Paper bg="gray.0" p="xs" px="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              <Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> to navigate
            </Text>
            <Group gap={4}>
              <Kbd size="xs">enter</Kbd>
              <Text size="xs" c="dimmed">
                to select
              </Text>
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

  // AUTH RENDERING
  if (!auth) {
    return (
      <Center h="100vh">
        <Loader color="dark" type="dots" size="xl" />
      </Center>
    );
  }

  if (!auth.configured) {
    return <Onboarding onConfigured={checkAuth} />;
  }

  if (!auth.authenticated) {
    return <Login onLogin={checkAuth} />;
  }

  return mainApp;
}
