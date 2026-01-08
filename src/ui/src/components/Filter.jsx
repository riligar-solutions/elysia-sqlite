import { useState } from "react";
import {
  TextInput,
  Paper,
  Group,
  Badge,
  Stack,
  Text,
  Chip,
  ActionIcon,
  Button,
} from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { IconSearch, IconX, IconRefresh } from "@tabler/icons-react";

export function Filter({
  data: { query, activeFilters, logicalOperators },
  setData: { setQuery, setActiveFilters, setLogicalOperators },
  filterOptions = {},
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuStep, setMenuStep] = useState(null);
  const [tempKey, setTempKey] = useState(null);
  const [tempOperator, setTempOperator] = useState(null);

  const ref = useClickOutside(() => {
    setShowMenu(false);
    setMenuStep(null);
    setTempKey(null);
    setTempOperator(null);
  });

  const operators = [
    "=",
    "!=",
    ">",
    "<",
    ">=",
    "<=",
    "contains",
    "not_contains",
  ];

  const getMenuOptions = () => {
    if (menuStep === "key") {
      return Object.keys(filterOptions);
    }
    if (menuStep === "operator") {
      return operators;
    }
    if (menuStep === "value" && tempKey) {
      if (
        Array.isArray(filterOptions[tempKey]) &&
        filterOptions[tempKey].length > 0
      ) {
        return filterOptions[tempKey];
      }
      return [];
    }
    return [];
  };

  const selectMenuOption = (option) => {
    if (menuStep === "key") {
      setTempKey(option);
      setMenuStep("operator");
    } else if (menuStep === "operator") {
      setTempOperator(option);
      setMenuStep("value");
    } else if (menuStep === "value" && tempKey && tempOperator) {
      const filterValue = `${tempOperator} ${option}`;
      setActiveFilters((prev) => {
        const current = prev[tempKey];
        const newValue = current ? `${current},${filterValue}` : filterValue;
        return {
          ...prev,
          [tempKey]: newValue,
        };
      });
      closeMenu();
    }
  };

  const closeMenu = () => {
    setShowMenu(false);
    setMenuStep(null);
    setTempKey(null);
    setTempOperator(null);
  };

  const removeFilter = (key) => {
    setActiveFilters((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setQuery("");
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <Stack gap="xs">
      {/* Unified Search/Filter Input */}
      <div style={{ position: "relative" }} ref={ref}>
        <TextInput
          placeholder="Search or filter..."
          leftSection={<IconSearch size={14} />}
          rightSection={
            query.trim() || hasActiveFilters ? (
              <ActionIcon
                size="xs"
                color="gray"
                radius="sm"
                variant="subtle"
                onClick={clearAllFilters}
              >
                <IconX size={12} />
              </ActionIcon>
            ) : null
          }
          size="sm"
          radius="md"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onFocus={() => {
            if (!showMenu) {
              setMenuStep("key");
              setShowMenu(true);
            }
          }}
          styles={{
            input: {
              border: "1px solid #E5E5E5",
              "&:focus": {
                borderColor: "#9CA3AF",
              },
            },
          }}
        />

        {/* Filter Picker Dropdown */}
        {showMenu && menuStep && (
          <Paper
            shadow="sm"
            p="sm"
            radius="md"
            withBorder
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: 4,
            }}
          >
            <Stack gap={8}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                {menuStep === "key" && "Filter by column"}
                {menuStep === "operator" && `Operator for ${tempKey}`}
                {menuStep === "value" && `Value for ${tempKey} ${tempOperator}`}
              </Text>
              <Group gap={6} wrap="wrap">
                {getMenuOptions().map((option, idx) => (
                  <Chip
                    key={idx}
                    onClick={() => selectMenuOption(option)}
                    variant="light"
                    checked={false}
                    size="xs"
                    radius="md"
                    styles={{
                      label: {
                        cursor: "pointer",
                      },
                    }}
                  >
                    {option}
                  </Chip>
                ))}
                {menuStep === "value" && (
                  <TextInput
                    placeholder="Type value..."
                    size="xs"
                    radius="md"
                    autoFocus
                    style={{ flex: 1, minWidth: 120 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        selectMenuOption(e.currentTarget.value);
                      }
                    }}
                  />
                )}
              </Group>
            </Stack>
          </Paper>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Group gap={6} wrap="wrap" align="center">
          {Object.entries(activeFilters).map(
            ([key, valueStr], filterIdx, filterArray) => {
              const values = valueStr.split(",").map((v) => v.trim());
              const isLastFilter = filterIdx === filterArray.length - 1;
              return (
                <Group key={key} gap={4} align="center">
                  <Group gap={2}>
                    {values.map((value, idx) => (
                      <Badge
                        key={`${key}-${idx}`}
                        size="md"
                        radius="md"
                        variant="outline"
                        color="gray"
                        pr={4}
                        rightSection={
                          <IconX
                            size={12}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const newValues = values.filter(
                                (_, i) => i !== idx
                              );
                              if (newValues.length === 0) {
                                removeFilter(key);
                              } else {
                                setActiveFilters((prev) => ({
                                  ...prev,
                                  [key]: newValues.join(","),
                                }));
                              }
                            }}
                          />
                        }
                        styles={{
                          root: {
                            textTransform: "none",
                            fontWeight: 500,
                          },
                        }}
                      >
                        <Text span c="dimmed" size="xs">
                          {key}
                        </Text>{" "}
                        {value}
                      </Badge>
                    ))}
                  </Group>
                  {!isLastFilter && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setLogicalOperators((prev) => ({
                          ...prev,
                          [key]: prev[key] === "OR" ? "AND" : "OR",
                        }));
                      }}
                      title="Toggle AND/OR"
                      fw={700}
                      px={4}
                      h="auto"
                      py={2}
                      c="dimmed"
                      styles={{
                        label: {
                          fontSize: "10px",
                        },
                      }}
                    >
                      {logicalOperators[key] || "AND"}
                    </Button>
                  )}
                </Group>
              );
            }
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={clearAllFilters}
            title="Clear all"
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      )}
    </Stack>
  );
}
