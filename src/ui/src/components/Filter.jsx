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
} from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { IconSearch, IconX, IconRefresh } from "@tabler/icons-react";

export function Filter({
  data: { query, activeFilters, logicalOperators },
  setData: { setQuery, setActiveFilters, setLogicalOperators },
  filterOptions = {}, // Object where keys are column names and values are arrays of possible values (or empty for any)
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuStep, setMenuStep] = useState(null); // null | 'key' | 'operator' | 'value'
  const [tempKey, setTempKey] = useState(null);
  const [tempOperator, setTempOperator] = useState(null);

  const ref = useClickOutside(() => {
    setShowMenu(false);
    setMenuStep(null);
    setTempKey(null);
    setTempOperator(null);
  });

  // Available operators
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

  // Get options based on current step
  const getMenuOptions = () => {
    if (menuStep === "key") {
      return Object.keys(filterOptions);
    }
    if (menuStep === "operator") {
      return operators;
    }
    if (menuStep === "value" && tempKey) {
      // If specific options provided for this key, return them
      if (
        Array.isArray(filterOptions[tempKey]) &&
        filterOptions[tempKey].length > 0
      ) {
        return filterOptions[tempKey];
      }
      // If no options (free text), we might handle this differently, but for now returned empty implies manual input which current UI doesn't fully support yet without options.
      // However, the original code implied options were always available.
      // Let's assume for 'value' step if no options are present, we might just show a "Type value..." placeholder or similar in a real app,
      // but to match the reference we'll return empty array and maybe just not show chips, relying on a future enhancement for text input.
      // For now, let's assume options are passed or we just show nothing.
      return [];
    }
    return [];
  };

  // Handle manual value input if needed (not in original strictly, but useful)
  // The original code only selected from options. We will stick to that logic to preserve behavior.

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
  const resultCountStr = ""; // Caller can handle count display if needed, or pass it in.

  return (
    <Stack gap="sm">
      <div style={{ position: "relative" }} ref={ref}>
        <TextInput
          placeholder="Search..."
          leftSection={<IconSearch size={14} />}
          rightSection={
            query.trim() || showMenu ? (
              <ActionIcon
                size="xs"
                color="gray"
                radius="sm"
                variant="subtle"
                onClick={() => {
                  setQuery("");
                  closeMenu();
                }}
              >
                <IconX size={12} />
              </ActionIcon>
            ) : null
          }
          size="sm"
          radius="sm"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onFocus={() => {
            if (!showMenu) {
              setMenuStep("key");
              setShowMenu(true);
            }
          }}
        />

        {showMenu && menuStep && (
          <Paper
            shadow="sm"
            p="xs"
            radius="sm"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: 4,
            }}
          >
            <Stack gap={6}>
              <Text size="xs" fw={500} c="dimmed">
                {menuStep === "key" && "Choose a column"}
                {menuStep === "operator" && `Choose operator for ${tempKey}`}
                {menuStep === "value" &&
                  `Choose value for ${tempKey} ${tempOperator}`}
              </Text>
              <Group gap={4} wrap="wrap">
                {getMenuOptions().map((option, idx) => (
                  <Chip
                    key={idx}
                    onClick={() => selectMenuOption(option)}
                    variant="light"
                    checked={false}
                    size="xs"
                    radius="sm"
                  >
                    {option}
                  </Chip>
                ))}
                {menuStep === "value" && (
                  <TextInput
                    placeholder="Type value and press Enter..."
                    size="xs"
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

      {hasActiveFilters && (
        <Stack gap="xs">
          <Group gap={0} wrap="wrap" align="center">
            {Object.entries(activeFilters).map(
              ([key, valueStr], filterIdx, filterArray) => {
                const values = valueStr.split(",").map((v) => v.trim());
                const isLastFilter = filterIdx === filterArray.length - 1;
                return (
                  <Group key={key} gap={4} align="center">
                    <Group gap={0}>
                      {values.map((value, idx) => (
                        <Badge
                          key={`${key}-${idx}`}
                          size="sm"
                          radius="sm"
                          variant="light"
                          rightSection={
                            <IconX
                              size={10}
                              color="red"
                              style={{ cursor: "pointer", marginLeft: 4 }}
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
                          style={{ textTransform: "none" }}
                        >
                          {key}: {value}
                        </Badge>
                      ))}
                    </Group>
                    {!isLastFilter && (
                      <Group gap={4} align="center" mr={4} ml={4}>
                        <Text size="xs" fw={500} c="dimmed">
                          {logicalOperators[key] || "AND"}
                        </Text>
                        <ActionIcon
                          size="xs"
                          variant="light"
                          onClick={() => {
                            setLogicalOperators((prev) => ({
                              ...prev,
                              [key]: prev[key] === "OR" ? "AND" : "OR",
                            }));
                          }}
                          title="Toggle AND/OR"
                        >
                          <IconRefresh
                            size={12}
                            style={{ transform: "rotate(45deg)" }}
                          />
                        </ActionIcon>
                      </Group>
                    )}
                  </Group>
                );
              }
            )}
          </Group>
          <Group gap="xs" justify="flex-end">
            <ActionIcon
              size="xs"
              variant="light"
              color="red"
              radius="sm"
              onClick={clearAllFilters}
              title="Clear all"
            >
              <IconX size={12} />
            </ActionIcon>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
