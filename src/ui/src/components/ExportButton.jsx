import { Button, Menu } from "@mantine/core";
import { IconDownload, IconFileTypeCsv, IconJson } from "@tabler/icons-react";

/**
 * ExportButton - A reusable export component with JSON/CSV menu options
 * @param {Object} props
 * @param {Array} props.data - Array of objects to export
 * @param {Array} props.columns - Array of column objects with 'name' property (optional, auto-detected if not provided)
 * @param {string} props.filename - Base filename without extension (default: 'export')
 * @param {string} props.size - Button size (default: 'xs')
 * @param {string} props.variant - Button variant (default: 'default')
 * @param {boolean} props.compact - Use compact button size (default: false)
 */
export function ExportButton({
  data = [],
  columns,
  filename = "export",
  size = "xs",
  variant = "default",
  compact = false,
}) {
  const getColumnNames = () => {
    if (columns?.length) {
      return columns.map((c) => (typeof c === "string" ? c : c.name));
    }
    if (data.length > 0) {
      return Object.keys(data[0]);
    }
    return [];
  };

  const exportAsCSV = () => {
    if (data.length === 0) return;

    const colNames = getColumnNames();
    const csv = [
      colNames.join(","),
      ...data.map((row) =>
        colNames
          .map((col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    downloadFile(`${filename}.csv`, csv, "text/csv");
  };

  const exportAsJSON = () => {
    if (data.length === 0) return;

    const json = JSON.stringify(data, null, 2);
    downloadFile(`${filename}.json`, json, "application/json");
  };

  const downloadFile = (name, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buttonSize = compact ? "compact-xs" : size;

  return (
    <Menu shadow="md" width={160}>
      <Menu.Target>
        <Button
          size={buttonSize}
          variant={variant}
          color="dark"
          leftSection={<IconDownload size={14} />}
          disabled={data.length === 0}
        >
          Export
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Export as</Menu.Label>
        <Menu.Item
          leftSection={<IconFileTypeCsv size={16} />}
          onClick={exportAsCSV}
        >
          CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconJson size={16} />} onClick={exportAsJSON}>
          JSON
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
