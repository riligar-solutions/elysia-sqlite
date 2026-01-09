import { Table, Checkbox, Group, Text, ScrollArea } from "@mantine/core";
import { EditableCell } from "./EditableCell";
import { ButtonDelete } from "./HoldButton";

export const DataGrid = ({
  columns,
  rows,
  pk,
  selectedRows,
  onSelectRow,
  onSelectAll,
  onSort,
  sort,
  sortDir,
  getColumnIcon,
  onDeleteRecord,
  editingCell,
  onStartEdit,
  onUpdateCell,
  onCancelEdit,
  fkMap,
  API,
  currentTable,
  getTagColor,
  isTagColumn,
}) => {
  return (
    <ScrollArea>
      <Table
        striped={false}
        highlightOnHover
        withTableBorder={false}
        verticalSpacing="xs"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40} style={{ borderBottom: "1px solid #eee" }}>
              <Checkbox
                checked={selectedRows.size === rows.length && rows.length > 0}
                indeterminate={
                  selectedRows.size > 0 && selectedRows.size < rows.length
                }
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </Table.Th>
            {columns.map((col) => (
              <Table.Th
                key={col.name}
                onClick={() => onSort(col.name)}
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
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr
              key={row[pk]}
              bg={selectedRows.has(String(row[pk])) ? "gray.0" : undefined}
            >
              <Table.Td>
                <Checkbox
                  checked={selectedRows.has(String(row[pk]))}
                  onChange={(e) => onSelectRow(String(row[pk]), e.target.checked)}
                />
              </Table.Td>
              {columns.map((col) => (
                <Table.Td key={col.name}>
                  <EditableCell
                    row={row}
                    col={col}
                    pk={pk}
                    isEditing={
                      editingCell?.rowPk === row[pk] &&
                      editingCell?.column === col.name
                    }
                    onStartEdit={onStartEdit}
                    onUpdate={onUpdateCell}
                    onCancelEdit={onCancelEdit}
                    fkMap={fkMap}
                    API={API}
                    currentTable={currentTable}
                    getTagColor={getTagColor}
                    isTagColumn={isTagColumn}
                  />
                </Table.Td>
              ))}
              <Table.Td>
                <ButtonDelete
                  type="icon"
                  onDelete={() => onDeleteRecord(row[pk])}
                  size="sm"
                  variant="subtle"
                  color="red"
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};
