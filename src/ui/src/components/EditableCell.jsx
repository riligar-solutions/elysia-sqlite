import { useState, useEffect } from "react";
import { Text, Select, TextInput, Badge, Group } from "@mantine/core";
import { IconKey, IconLink } from "@tabler/icons-react";
import { FKPreview } from "./FKPreview";

export const EditableCell = ({ 
  row, 
  col, 
  pk, 
  isEditing, 
  onStartEdit, 
  onUpdate, 
  onCancelEdit,
  fkMap,
  API,
  currentTable,
  getTagColor,
  isTagColumn
}) => {
  const value = row[col.name];
  const rowPk = row[pk];
  const isPK = col.pk === 1;
  const hasFK = !!col.fk;

  const [fkOptions, setFkOptions] = useState([]);
  const [fkLoading, setFkLoading] = useState(false);

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
  }, [isEditing, hasFK, API, currentTable, col.fk]);

  if (isEditing) {
    if (hasFK) {
      return (
        <Select
          size="xs"
          autoFocus
          searchable
          data={fkOptions}
          defaultValue={value === null ? null : String(value)}
          placeholder={
            fkLoading ? "Loading..." : `Select ${col.fk.table}`
          }
          onChange={(newVal) => {
            onUpdate(rowPk, col.name, newVal);
          }}
          onBlur={onCancelEdit}
          styles={{
            input: {
              minHeight: "28px",
              height: "28px",
            },
          }}
          onKeyDownCapture={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancelEdit();
            }
          }}
        />
      );
    }

    return (
      <TextInput
        size="xs"
        autoFocus
        defaultValue={value === null ? "" : String(value)}
        onBlur={(e) => onUpdate(rowPk, col.name, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onUpdate(rowPk, col.name, e.target.value);
          } else if (e.key === "Escape") {
            onCancelEdit();
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
        onClick={() => !isPK && onStartEdit(rowPk, col.name)}
        style={{ cursor: isPK ? "default" : "text" }}
      >
        null
      </Text>
    );
  }

  if (hasFK) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit(rowPk, col.name);
        }}
      >
        <FKPreview
          table={col.fk.table}
          id={value}
          label={fkMap[`${col.fk.table}:${value}`]}
          API={API}
        />
      </div>
    );
  }

  if (isTagColumn(col.name)) {
    return (
      <Badge
        color={getTagColor(value)}
        variant="light"
        onClick={() => onStartEdit(rowPk, col.name)}
        style={{ cursor: "pointer" }}
      >
        {value}
      </Badge>
    );
  }

  return (
    <Text
      size="sm"
      onClick={() => !isPK && onStartEdit(rowPk, col.name)}
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
